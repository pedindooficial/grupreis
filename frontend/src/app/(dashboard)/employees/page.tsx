"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

type EmployeeStatus = "ativo" | "inativo";

export default function EmployeesPage() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [employees, setEmployees] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EmployeeStatus | "all">("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    role: "",
    email: "",
    phone: "",
    document: "",
    docRg: "",
    docCnh: "",
    docAddressProof: "",
    docCv: "",
    docRgFile: null as any,
    docCnhFile: null as any,
    docAddressProofFile: null as any,
    docCvFile: null as any,
    status: "ativo" as EmployeeStatus,
    hireDate: "",
    salary: "",
    teamId: "",
    teamName: "",
    machineId: "",
    machineName: "",
    notes: ""
  });

  const handleFile = (
    file: File | null,
    field: "docRgFile" | "docCnhFile" | "docAddressProofFile" | "docCvFile"
  ) => {
    if (!file) {
      setForm((f) => ({ ...f, [field]: null }));
      return;
    }
    const allowed = [
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg"
    ];
    if (!allowed.includes(file.type)) {
      Swal.fire("Atenção", "Formatos permitidos: PDF, Word, PNG, JPG.", "warning");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string)?.split(",")[1];
      setForm((f) => ({
        ...f,
        [field]: {
          name: file.name,
          mime: file.type,
          size: file.size,
          data: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [empRes, teamRes, machinesRes] = await Promise.all([
          apiFetch("/employees", { cache: "no-store" }),
          apiFetch("/teams", { cache: "no-store" }),
          apiFetch("/machines", { cache: "no-store" })
        ]);
        const empData = await empRes.json().catch(() => null);
        const teamData = await teamRes.json().catch(() => null);
        const machinesData = await machinesRes.json().catch(() => null);
        if (empRes.ok) {
          setEmployees(Array.isArray(empData?.data) ? empData.data : []);
        } else {
          console.error("Erro ao carregar funcionários", empData);
        }
        if (teamRes.ok) {
          setTeams(Array.isArray(teamData?.data) ? teamData.data : []);
        }
        if (machinesRes.ok) {
          setMachines(Array.isArray(machinesData?.data) ? machinesData.data : []);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return employees.filter((e) => {
      const matchesStatus = statusFilter === "all" ? true : e.status === statusFilter;
      const matchesTerm =
        term.length === 0 ||
        e.name?.toLowerCase().includes(term) ||
        e.role?.toLowerCase().includes(term) ||
        e.document?.toLowerCase().includes(term) ||
        e.teamName?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [employees, search, statusFilter]);

  const resetForm = () =>
    setForm({
      name: "",
      role: "",
      email: "",
      phone: "",
      document: "",
      docRg: "",
      docCnh: "",
      docAddressProof: "",
      docCv: "",
      docRgFile: null,
      docCnhFile: null,
      docAddressProofFile: null,
      docCvFile: null,
      status: "ativo",
      hireDate: "",
      salary: "",
      teamId: "",
      teamName: "",
      machineId: "",
      machineName: "",
      notes: ""
    });

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome do funcionário.", "warning");
      return;
    }

    const payload = {
      ...form,
      salary: form.salary ? parseFloat(form.salary) : undefined,
      docRgFile: form.docRgFile || undefined,
      docCnhFile: form.docCnhFile || undefined,
      docAddressProofFile: form.docAddressProofFile || undefined,
      docCvFile: form.docCvFile || undefined,
      teamName:
        form.teamId && teams.find((t) => t._id === form.teamId)?.name
          ? teams.find((t) => t._id === form.teamId)?.name
          : form.teamName || undefined,
      machineName:
        form.machineId && machines.find((m) => m._id === form.machineId)?.name
          ? machines.find((m) => m._id === form.machineId)?.name
          : form.machineName || undefined
    };

    try {
      setSaving(true);
      if (editingId) {
        const res = await apiFetch(`/employees/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível atualizar.", "error");
          return;
        }
        setEmployees((prev) => prev.map((e) => (e._id === editingId ? data.data : e)));
        Swal.fire("Sucesso", "Funcionário atualizado.", "success");
      } else {
        const res = await apiFetch("/employees", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível criar.", "error");
          return;
        }
        setEmployees((prev) => [data.data, ...prev]);
        Swal.fire("Sucesso", "Funcionário criado.", "success");
      }
      resetForm();
      setEditingId(null);
      setMode("list");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (emp: any) => {
    setEditingId(emp._id);
    setMode("form");
    setForm({
      name: emp.name || "",
      role: emp.role || "",
      email: emp.email || "",
      phone: emp.phone || "",
      document: emp.document || "",
      docRg: emp.docRg || "",
      docCnh: emp.docCnh || "",
      docAddressProof: emp.docAddressProof || "",
      docCv: emp.docCv || "",
      docRgFile: emp.docRgFile || null,
      docCnhFile: emp.docCnhFile || null,
      docAddressProofFile: emp.docAddressProofFile || null,
      docCvFile: emp.docCvFile || null,
      status: (emp.status || "ativo") as EmployeeStatus,
      hireDate: emp.hireDate || "",
      salary: emp.salary ? String(emp.salary) : "",
      teamId: emp.teamId || "",
      teamName: emp.teamName || "",
      machineId: emp.machineId || "",
      machineName: emp.machineName || "",
      notes: emp.notes || ""
    });
  };

  const handleDelete = async (emp: any) => {
    const confirm = await Swal.fire({
      title: "Excluir funcionário?",
      html:
        '<p>Essa ação não pode ser desfeita.</p>' +
        '<input id="swal-reason" class="swal2-input" placeholder="Motivo (obrigatório)">',
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      preConfirm: () => {
        const input = document.getElementById("swal-reason") as HTMLInputElement | null;
        const reason = input?.value.trim();
        if (!reason) {
          Swal.showValidationMessage("Informe um motivo para excluir.");
          return;
        }
        return reason;
      }
    });
    if (!confirm.isConfirmed || !confirm.value) return;
    try {
      const res = await apiFetch(`/employees/${emp._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }
      setEmployees((prev) => prev.filter((e) => e._id !== emp._id));
      Swal.fire("Sucesso", "Funcionário excluído.", "success");
      if (editingId === emp._id) {
        resetForm();
        setEditingId(null);
        setMode("list");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Funcionários</h1>
          <p className="text-sm text-slate-300">
            Cadastre colaboradores, funções, status e vincule a equipes.
          </p>
        </div>
        {mode === "list" ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, função, documento..."
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Todos</option>
              <option value="ativo">Ativos</option>
              <option value="inativo">Inativos</option>
            </select>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setMode("form");
              }}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500"
            >
              + Novo funcionário
            </button>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setMode("list");
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {mode === "form" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">
                {editingId ? "Editar funcionário" : "Novo funcionário"}
              </div>
              <p className="text-xs text-slate-300">
                Nome, função, contato, equipe e status.
              </p>
            </div>
            {editingId && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setMode("list");
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Nome</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Nome completo"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Função / Cargo</label>
              <input
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Operador, Supervisor, Financeiro..."
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">CPF/CNPJ</label>
              <input
                value={form.document}
                onChange={(e) => setForm((f) => ({ ...f, document: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Documento"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">RG (link/arquivo)</label>
                <input
                  value={form.docRg}
                  onChange={(e) => setForm((f) => ({ ...f, docRg: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="URL ou referência"
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => handleFile(e.target.files?.[0] || null, "docRgFile")}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white file:hover:bg-emerald-500/90"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">CNH (link/arquivo)</label>
                <input
                  value={form.docCnh}
                  onChange={(e) => setForm((f) => ({ ...f, docCnh: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="URL ou referência"
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => handleFile(e.target.files?.[0] || null, "docCnhFile")}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white file:hover:bg-emerald-500/90"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Comprovante de endereço</label>
                <input
                  value={form.docAddressProof}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, docAddressProof: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="URL ou referência"
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) =>
                    handleFile(e.target.files?.[0] || null, "docAddressProofFile")
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white file:hover:bg-emerald-500/90"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Currículo</label>
                <input
                  value={form.docCv}
                  onChange={(e) => setForm((f) => ({ ...f, docCv: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="URL ou referência"
                />
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                  onChange={(e) => handleFile(e.target.files?.[0] || null, "docCvFile")}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white file:mr-3 file:rounded-md file:border-0 file:bg-emerald-500/80 file:px-3 file:py-1 file:text-sm file:font-semibold file:text-white file:hover:bg-emerald-500/90"
                />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EmployeeStatus }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Data de admissão</label>
              <input
                type="date"
                value={form.hireDate}
                onChange={(e) => setForm((f) => ({ ...f, hireDate: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Salário (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.salary}
                onChange={(e) => setForm((f) => ({ ...f, salary: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="0.00"
              />
              <div className="text-[11px] text-slate-400">
                Valor mensal do salário do funcionário
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Equipe</label>
              <select
                value={form.teamId}
                onChange={(e) => {
                  const teamId = e.target.value;
                  const team = teams.find((t) => t._id === teamId);
                  setForm((f) => ({
                    ...f,
                    teamId,
                    teamName: team?.name || ""
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Sem equipe</option>
                {teams.map((t) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Máquina</label>
              <select
                value={form.machineId}
                onChange={(e) => {
                  const machineId = e.target.value;
                  const machine = machines.find((m) => m._id === machineId);
                  setForm((f) => ({
                    ...f,
                    machineId,
                    machineName: machine?.name || ""
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Sem máquina</option>
                {machines
                  .filter((m) => m.status === "ativa")
                  .map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} {m.plate ? `(${m.plate})` : ""}
                    </option>
                  ))}
              </select>
              <div className="text-[11px] text-slate-400">
                Vincule o funcionário a uma máquina ativa
              </div>
            </div>
            <div className="space-y-1 text-sm md:col-span-2">
              <label className="text-slate-200">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
                placeholder="Documentos pendentes, treinamentos, etc."
              />
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar funcionário"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="font-semibold text-white">Funcionários cadastrados</div>
          <span className="text-xs text-slate-300">
            {loading ? "Carregando..." : `${filtered.length} registro(s)`}
          </span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-slate-300">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
            <p className="text-sm">Carregando funcionários...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-4 text-slate-300">
            Nenhum funcionário cadastrado. Clique em “+ Novo funcionário” para adicionar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Função</th>
                  <th className="px-4 py-3">Documento</th>
                  <th className="px-4 py-3">E-mail</th>
                  <th className="px-4 py-3">Telefone</th>
                  <th className="px-4 py-3">Equipe</th>
                  <th className="px-4 py-3">Máquina</th>
                  <th className="px-4 py-3">Salário</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Admissão</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((emp) => (
                  <tr key={emp._id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{emp.name}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.role || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.document || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.email || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.phone || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.teamName || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{emp.machineName || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {emp.salary
                        ? new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(emp.salary)
                        : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          emp.status === "ativo"
                            ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                        }`}
                      >
                        {emp.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{emp.hireDate || "-"}</td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleEdit(emp)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(emp)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/10"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

