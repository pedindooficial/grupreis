"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api-client";

type DocumentType = "contrato" | "proposta" | "nota_fiscal" | "recibo" | "outro";
type DocumentStatus = "pendente" | "assinado" | "cancelado" | "arquivado";

const DOCUMENT_TYPES: { value: DocumentType; label: string }[] = [
  { value: "contrato", label: "Contrato" },
  { value: "proposta", label: "Proposta" },
  { value: "nota_fiscal", label: "Nota Fiscal" },
  { value: "recibo", label: "Recibo" },
  { value: "outro", label: "Outro" }
];

const DOCUMENT_STATUSES: { value: DocumentStatus; label: string; color: string }[] = [
  { value: "pendente", label: "Pendente", color: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50" },
  { value: "assinado", label: "Assinado", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50" },
  { value: "cancelado", label: "Cancelado", color: "bg-red-500/20 text-red-300 border-red-500/50" },
  { value: "arquivado", label: "Arquivado", color: "bg-slate-500/20 text-slate-300 border-slate-500/50" }
];

export default function DocumentsPage() {
  const { data: session } = useSession();
  const userRole = (session?.user as any)?.role || "user";
  const isAdmin = userRole === "admin";

  const [mode, setMode] = useState<"list" | "form">("list");
  const [documents, setDocuments] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<DocumentType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | "all">("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [form, setForm] = useState({
    title: "",
    type: "contrato" as DocumentType,
    status: "pendente" as DocumentStatus,
    description: "",
    clientId: "",
    clientName: "",
    jobId: "",
    jobTitle: "",
    signedAt: "",
    expiresAt: "",
    notes: ""
  });

  useEffect(() => {
    if (!isAdmin) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      try {
        setLoading(true);
        const [docsRes, clientsRes, jobsRes] = await Promise.all([
          apiFetch("/documents", { cache: "no-store" }),
          apiFetch("/clients", { cache: "no-store" }),
          apiFetch("/jobs", { cache: "no-store" })
        ]);

        const docsData = await docsRes.json().catch(() => null);
        const clientsData = await clientsRes.json().catch(() => null);
        const jobsData = await jobsRes.json().catch(() => null);

        setDocuments(Array.isArray(docsData?.data) ? docsData.data : []);
        setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
        setJobs(Array.isArray(jobsData?.data) ? jobsData.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [isAdmin]);

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        !search ||
        doc.title?.toLowerCase().includes(search.toLowerCase()) ||
        doc.clientName?.toLowerCase().includes(search.toLowerCase()) ||
        doc.jobTitle?.toLowerCase().includes(search.toLowerCase()) ||
        doc.fileName?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || doc.type === typeFilter;
      const matchesStatus = statusFilter === "all" || doc.status === statusFilter;
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [documents, search, typeFilter, statusFilter]);

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + " " + sizes[i];
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setSelectedFile(null);
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      Swal.fire("Atenção", "O arquivo é muito grande. Tamanho máximo: 50MB", "warning");
      e.target.value = "";
      setSelectedFile(null);
      return;
    }

    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (saving) return;

    if (!form.title.trim()) {
      Swal.fire("Atenção", "Informe o título do documento.", "warning");
      return;
    }

    if (!selectedFile && !editingId) {
      Swal.fire("Atenção", "Selecione um arquivo para upload.", "warning");
      return;
    }

    try {
      setSaving(true);

      let fileKey = "";
      let fileName = "";
      let fileSize = 0;
      let fileType = "";

      // Upload file if it's a new document or file was changed
      if (selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("category", "documents");
        if (form.clientId) formData.append("id", form.clientId);

        const uploadRes = await apiFetch("/files/upload", {
          method: "POST",
          headers: {},
          body: formData as any
        });

        const uploadData = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok || !uploadData?.data?.key) {
          Swal.fire("Erro", "Falha ao fazer upload do arquivo.", "error");
          return;
        }

        fileKey = uploadData.data.key;
        fileName = uploadData.data.filename;
        fileSize = uploadData.data.size;
        fileType = uploadData.data.contentType;
      } else if (editingId) {
        // Keep existing file data when editing without changing file
        const existingDoc = documents.find((d) => d._id === editingId);
        if (existingDoc) {
          fileKey = existingDoc.fileKey;
          fileName = existingDoc.fileName;
          fileSize = existingDoc.fileSize;
          fileType = existingDoc.fileType;
        }
      }

      const clientName =
        form.clientId && clients.find((c) => c._id === form.clientId)
          ? clients.find((c) => c._id === form.clientId)?.name
          : form.clientName || "";

      const jobTitle =
        form.jobId && jobs.find((j) => j._id === form.jobId)
          ? jobs.find((j) => j._id === form.jobId)?.title
          : form.jobTitle || "";

      const payload: any = {
        title: form.title.trim(),
        type: form.type,
        status: form.status,
        description: form.description.trim() || undefined,
        clientId: form.clientId || null,
        clientName: clientName || undefined,
        jobId: form.jobId || null,
        jobTitle: jobTitle || undefined,
        signedAt: form.signedAt || undefined,
        expiresAt: form.expiresAt || undefined,
        notes: form.notes.trim() || undefined
      };

      if (!editingId) {
        // Create new document
        payload.fileKey = fileKey;
        payload.fileName = fileName;
        payload.fileSize = fileSize;
        payload.fileType = fileType;

        const res = await apiFetch("/documents", {
          method: "POST",
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível criar documento.", "error");
          return;
        }

        setDocuments((prev) => [data.data, ...prev]);
        Swal.fire("Sucesso", "Documento criado com sucesso.", "success");
      } else {
        // Update existing document - include file info if new file was uploaded
        if (selectedFile) {
          payload.fileKey = fileKey;
          payload.fileName = fileName;
          payload.fileSize = fileSize;
          payload.fileType = fileType;
        }

        const res = await apiFetch(`/documents/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível atualizar documento.", "error");
          return;
        }

        setDocuments((prev) => prev.map((d) => (d._id === editingId ? data.data : d)));
        Swal.fire("Sucesso", "Documento atualizado com sucesso.", "success");
      }

      resetForm();
      setMode("list");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar documento.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: "",
      type: "contrato",
      status: "pendente",
      description: "",
      clientId: "",
      clientName: "",
      jobId: "",
      jobTitle: "",
      signedAt: "",
      expiresAt: "",
      notes: ""
    });
    setSelectedFile(null);
    setEditingId(null);
  };

  const handleEdit = (doc: any) => {
    setForm({
      title: doc.title || "",
      type: doc.type || "contrato",
      status: doc.status || "pendente",
      description: doc.description || "",
      clientId: doc.clientId || "",
      clientName: doc.clientName || "",
      jobId: doc.jobId || "",
      jobTitle: doc.jobTitle || "",
      signedAt: doc.signedAt ? new Date(doc.signedAt).toISOString().split("T")[0] : "",
      expiresAt: doc.expiresAt ? new Date(doc.expiresAt).toISOString().split("T")[0] : "",
      notes: doc.notes || ""
    });
    setEditingId(doc._id);
    setSelectedFile(null);
    setMode("form");
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão",
      text: "Deseja realmente excluir este documento?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/documents/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        Swal.fire("Erro", data?.error || "Não foi possível excluir documento.", "error");
        return;
      }

      setDocuments((prev) => prev.filter((d) => d._id !== id));
      Swal.fire("Sucesso", "Documento excluído com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir documento.", "error");
    }
  };

  const handleDownload = async (doc: any) => {
    try {
      Swal.fire({
        title: "Gerando link de download...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      const res = await apiFetch(`/documents/${doc._id}/download-url`, {
        cache: "no-store"
      });

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.data?.url) {
        Swal.fire("Erro", "Não foi possível gerar link de download.", "error");
        return;
      }

      Swal.close();
      window.open(data.data.url, "_blank");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao gerar link de download.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando documentos...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Documentos e Contratos</h1>
          <p className="text-sm text-slate-300 mt-1">
            Acesso restrito a administradores
          </p>
        </div>
        <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-12 text-center">
          <div className="text-red-300 font-semibold mb-2">Acesso Negado</div>
          <p className="text-slate-300">
            Você não tem permissão para acessar esta página. Apenas administradores podem visualizar e gerenciar documentos.
          </p>
        </div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-white">
              {editingId ? "Editar Documento" : "Novo Documento"}
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {editingId
                ? "Atualize as informações do documento"
                : "Adicione um novo documento ao sistema"}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setMode("list");
            }}
            className="px-4 py-2 rounded-lg border border-white/15 bg-white/5 text-sm font-semibold text-slate-200 hover:bg-white/10 transition"
          >
            Cancelar
          </button>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                placeholder="Ex: Contrato de Prestação de Serviços"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as DocumentType }))}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {DOCUMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as DocumentStatus }))}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                {DOCUMENT_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Cliente</label>
              <select
                value={form.clientId}
                onChange={(e) => {
                  const client = clients.find((c) => c._id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    clientId: e.target.value,
                    clientName: client?.name || ""
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Selecione um cliente...</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Ordem de Serviço</label>
              <select
                value={form.jobId}
                onChange={(e) => {
                  const job = jobs.find((j) => j._id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    jobId: e.target.value,
                    jobTitle: job?.title || ""
                  }));
                }}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              >
                <option value="">Selecione uma OS...</option>
                {jobs.map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title} {j.seq ? `(#${String(j.seq).padStart(6, "0")})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data de Assinatura</label>
              <input
                type="date"
                value={form.signedAt}
                onChange={(e) => setForm((f) => ({ ...f, signedAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Data de Expiração</label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Descrição do documento..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Arquivo {!editingId && <span className="text-red-400">*</span>}
            </label>
            {editingId && !selectedFile && (() => {
              const currentDoc = documents.find((d) => d._id === editingId);
              return currentDoc ? (
                <div className="mb-3 p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-emerald-300 truncate">
                        {currentDoc.fileName}
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        {formatFileSize(currentDoc.fileSize)} · {currentDoc.fileType}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownload(currentDoc)}
                      className="ml-3 px-3 py-1.5 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition"
                    >
                      Ver
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Selecione um novo arquivo abaixo para substituir este arquivo.
                  </p>
                </div>
              ) : null;
            })()}
            <input
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30"
            />
            {selectedFile && (
              <p className="mt-2 text-sm text-emerald-300">
                ✓ Novo arquivo selecionado: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </p>
            )}
            <p className="mt-1 text-xs text-slate-500">Formatos aceitos: PDF, DOC, DOCX, JPG, PNG (máx. 50MB)</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              placeholder="Observações adicionais..."
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Documento"}
            </button>
            <button
              onClick={() => {
                resetForm();
                setMode("list");
              }}
              className="px-6 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 font-semibold hover:bg-white/10 transition"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Documentos e Contratos</h1>
          <p className="text-sm text-slate-300 mt-1">
            Gerencie contratos, propostas, notas fiscais e outros documentos
          </p>
        </div>
        <button
          onClick={() => setMode("form")}
          className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
        >
          + Novo Documento
        </button>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, cliente, OS ou arquivo..."
              className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as DocumentType | "all")}
            className="px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">Todos os tipos</option>
            {DOCUMENT_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as DocumentStatus | "all")}
            className="px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          >
            <option value="all">Todos os status</option>
            {DOCUMENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {filteredDocuments.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-12 text-center">
          <p className="text-slate-300">
            {search || typeFilter !== "all" || statusFilter !== "all"
              ? "Nenhum documento encontrado com os filtros aplicados."
              : "Nenhum documento cadastrado. Clique em 'Novo Documento' para começar."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredDocuments.map((doc) => {
            const statusInfo = DOCUMENT_STATUSES.find((s) => s.value === doc.status);
            const typeInfo = DOCUMENT_TYPES.find((t) => t.value === doc.type);

            return (
              <div
                key={doc._id}
                className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-semibold text-white truncate">{doc.title}</h3>
                    <p className="text-sm text-slate-400 mt-1">{typeInfo?.label}</p>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold border ${statusInfo?.color || ""}`}
                  >
                    {statusInfo?.label}
                  </span>
                </div>

                <div className="space-y-2 text-sm text-slate-300">
                  {doc.clientName && (
                    <div>
                      <span className="text-slate-400">Cliente:</span> {doc.clientName}
                    </div>
                  )}
                  {doc.jobTitle && (
                    <div>
                      <span className="text-slate-400">OS:</span> {doc.jobTitle}
                    </div>
                  )}
                  <div>
                    <span className="text-slate-400">Arquivo:</span> {doc.fileName}
                  </div>
                  <div>
                    <span className="text-slate-400">Tamanho:</span> {formatFileSize(doc.fileSize)}
                  </div>
                  {doc.signedAt && (
                    <div>
                      <span className="text-slate-400">Assinado em:</span>{" "}
                      {new Date(doc.signedAt).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                  {doc.expiresAt && (
                    <div>
                      <span className="text-slate-400">Expira em:</span>{" "}
                      {new Date(doc.expiresAt).toLocaleDateString("pt-BR")}
                    </div>
                  )}
                </div>

                {doc.description && (
                  <p className="text-sm text-slate-400 line-clamp-2">{doc.description}</p>
                )}

                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => handleDownload(doc)}
                    className="flex-1 px-3 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/10 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/20 transition"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => handleEdit(doc)}
                    className="px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-sm font-semibold hover:bg-white/10 transition"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(doc._id)}
                    className="px-3 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
