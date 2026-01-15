import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

interface MaintenanceRecord {
  _id: string;
  date: string;
  type: string;
  details?: string;
  cost?: number;
  vendor?: string;
  performedBy?: string;
  nextMaintenanceDate?: string;
  nextMaintenanceType?: string;
  notes?: string;
  isDone?: boolean;
}

interface MaintenanceHistoryProps {
  itemId: string;
  itemType: "equipment" | "machine";
  itemName: string;
  onMaintenanceAdded?: () => void;
}

export default function MaintenanceHistory({
  itemId,
  itemType,
  itemName,
  onMaintenanceAdded
}: MaintenanceHistoryProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: new Date().toISOString().split("T")[0],
    type: "",
    details: "",
    cost: "",
    vendor: "",
    performedBy: "",
    nextMaintenanceDate: "",
    nextMaintenanceType: "",
    notes: "",
    isDone: false
  });

  const formatDate = (dateString: string | undefined | null): string => {
    if (!dateString) return "-";
    try {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (value: number | undefined): string => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  useEffect(() => {
    loadMaintenanceHistory();
  }, [itemId]);

  const loadMaintenanceHistory = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/maintenance/item/${itemId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setMaintenanceRecords(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de manutenção:", err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      date: new Date().toISOString().split("T")[0],
      type: "",
      details: "",
      cost: "",
      vendor: "",
      performedBy: "",
      nextMaintenanceDate: "",
      nextMaintenanceType: "",
      notes: "",
      isDone: false
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.date || !form.type.trim()) {
      Swal.fire("Atenção", "Data e tipo de manutenção são obrigatórios.", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        itemId,
        itemType,
        date: form.date,
        type: form.type.trim()
      };

      if (form.details.trim()) payload.details = form.details.trim();
      if (form.cost) payload.cost = parseFloat(form.cost);
      if (form.vendor.trim()) payload.vendor = form.vendor.trim();
      if (form.performedBy.trim()) payload.performedBy = form.performedBy.trim();
      if (form.nextMaintenanceDate) payload.nextMaintenanceDate = form.nextMaintenanceDate;
      if (form.nextMaintenanceType.trim()) payload.nextMaintenanceType = form.nextMaintenanceType.trim();
      if (form.notes.trim()) payload.notes = form.notes.trim();
      payload.isDone = form.isDone;

      const res = editingId
        ? await apiFetch(`/maintenance/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await apiFetch("/maintenance", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar.", "error");
        return;
      }

      Swal.fire("Sucesso", editingId ? "Manutenção atualizada." : "Manutenção registrada.", "success");
      resetForm();
      loadMaintenanceHistory();
      if (onMaintenanceAdded) onMaintenanceAdded();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar manutenção.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (record: MaintenanceRecord) => {
    setEditingId(record._id);
    setForm({
      date: record.date || new Date().toISOString().split("T")[0],
      type: record.type || "",
      details: record.details || "",
      cost: record.cost?.toString() || "",
      vendor: record.vendor || "",
      performedBy: record.performedBy || "",
      nextMaintenanceDate: record.nextMaintenanceDate || "",
      nextMaintenanceType: record.nextMaintenanceType || "",
      notes: record.notes || "",
      isDone: record.isDone || false
    });
    setShowForm(true);
  };

  const handleRepeat = (record: MaintenanceRecord) => {
    // Create a new maintenance entry based on the existing one
    setEditingId(null);
    setForm({
      date: new Date().toISOString().split("T")[0], // Use today's date for new entry
      type: record.type || "",
      details: "",
      cost: "",
      vendor: record.vendor || "",
      performedBy: record.performedBy || "",
      nextMaintenanceDate: "",
      nextMaintenanceType: record.nextMaintenanceType || "",
      notes: "",
      isDone: false
    });
    setShowForm(true);
  };

  const handleToggleDone = async (record: MaintenanceRecord) => {
    try {
      setSaving(true);
      const payload: any = {
        itemId,
        itemType,
        date: record.date,
        type: record.type
      };

      if (record.details) payload.details = record.details;
      if (record.cost) payload.cost = record.cost;
      if (record.vendor) payload.vendor = record.vendor;
      if (record.performedBy) payload.performedBy = record.performedBy;
      if (record.nextMaintenanceDate) payload.nextMaintenanceDate = record.nextMaintenanceDate;
      if (record.nextMaintenanceType) payload.nextMaintenanceType = record.nextMaintenanceType;
      if (record.notes) payload.notes = record.notes;
      payload.isDone = !record.isDone;

      const res = await apiFetch(`/maintenance/${record._id}`, {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar.", "error");
        return;
      }

      loadMaintenanceHistory();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar status.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (recordId: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão?",
      text: "Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        setSaving(true);
        const res = await apiFetch(`/maintenance/${recordId}`, {
          method: "DELETE"
        });

        if (!res.ok) {
          const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
          throw new Error(error.error || "Falha ao excluir");
        }

        Swal.fire("Excluído!", "Registro de manutenção excluído.", "success");
        loadMaintenanceHistory();
      } catch (err: any) {
        console.error(err);
        Swal.fire("Erro", err.message || "Falha ao excluir.", "error");
      } finally {
        setSaving(false);
      }
    }
  };

  const maintenanceTypes = [
    "Troca de óleo",
    "Revisão geral",
    "Calibração",
    "Troca de filtros",
    "Lubrificação",
    "Inspeção",
    "Limpeza",
    "Reparo",
    "Substituição de peças",
    "Troca de pneus",
    "Alinhamento e balanceamento",
    "Outro"
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="text-sm font-semibold text-white">Histórico de Manutenção</div>
          <div className="text-xs text-slate-400">Registros de manutenções realizadas</div>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-emerald-700 hover:shadow-emerald-500/40 flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nova Manutenção
        </button>
      </div>

      {showForm && (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-white">
              {editingId ? "Editar Manutenção" : "Nova Manutenção"}
            </div>
            <button
              onClick={resetForm}
              className="text-slate-400 hover:text-white text-xs"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Data da Manutenção *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de Manutenção *</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione o tipo</option>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Custo (R$)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.cost}
                onChange={(e) => setForm((f) => ({ ...f, cost: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Fornecedor/Responsável</label>
              <input
                value={form.vendor}
                onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Nome do fornecedor ou equipe"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Realizado por</label>
              <input
                value={form.performedBy}
                onChange={(e) => setForm((f) => ({ ...f, performedBy: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Nome do técnico/funcionário"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Próxima Manutenção</label>
              <input
                type="date"
                value={form.nextMaintenanceDate}
                onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDate: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo da Próxima Manutenção</label>
              <select
                value={form.nextMaintenanceType}
                onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceType: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione o tipo</option>
                {maintenanceTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Detalhes</label>
              <textarea
                value={form.details}
                onChange={(e) => setForm((f) => ({ ...f, details: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
                placeholder="Detalhes sobre o que foi feito na manutenção..."
              />
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={2}
                placeholder="Observações adicionais..."
              />
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDone}
                  onChange={(e) => setForm((f) => ({ ...f, isDone: e.target.checked }))}
                  className="w-4 h-4 rounded border-white/20 bg-slate-900/60 text-emerald-500 focus:ring-emerald-500/40 focus:ring-2"
                />
                <span className="text-slate-200">Manutenção concluída</span>
              </label>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={resetForm}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Registrar Manutenção"}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-4 text-slate-400 text-sm">Carregando histórico...</div>
      ) : maintenanceRecords.length === 0 ? (
        <div className="rounded-lg border border-white/10 bg-white/5 p-4 text-center text-sm text-slate-400">
          Nenhum registro de manutenção. Clique em "+ Nova Manutenção" para adicionar.
        </div>
      ) : (
        <div className="space-y-2">
          {maintenanceRecords.map((record) => (
            <div
              key={record._id}
              className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="text-xs sm:text-sm font-semibold text-white">{record.type}</div>
                    <div className="text-xs text-slate-400">{formatDate(record.date)}</div>
                    {record.isDone && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Concluída
                      </span>
                    )}
                    {!record.isDone && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/30">
                        Pendente
                      </span>
                    )}
                    {record.cost && record.cost > 0 && (
                      <div className="text-xs text-emerald-300 font-semibold">
                        {formatCurrency(record.cost)}
                      </div>
                    )}
                  </div>
                  {record.details && (
                    <div className="mt-2 text-xs sm:text-sm text-slate-300 break-words">
                      {record.details}
                    </div>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-400">
                    {record.vendor && (
                      <span>Fornecedor: {record.vendor}</span>
                    )}
                    {record.performedBy && (
                      <span>Realizado por: {record.performedBy}</span>
                    )}
                    {record.nextMaintenanceDate && (
                      <span className="text-blue-300">
                        Próxima: {formatDate(record.nextMaintenanceDate)}
                        {record.nextMaintenanceType && ` (${record.nextMaintenanceType})`}
                      </span>
                    )}
                  </div>
                  {record.notes && (
                    <div className="mt-2 text-xs text-slate-400 italic break-words">
                      {record.notes}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 flex-shrink-0 flex-wrap">
                  <button
                    onClick={() => handleToggleDone(record)}
                    disabled={saving}
                    className={`rounded-md border px-2 py-1 text-xs font-semibold transition ${
                      record.isDone
                        ? "border-orange-500/40 bg-orange-500/10 text-orange-200 hover:border-orange-400/60 hover:bg-orange-500/20"
                        : "border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:border-emerald-400/60 hover:bg-emerald-500/20"
                    } disabled:cursor-not-allowed disabled:opacity-60`}
                    title={record.isDone ? "Marcar como pendente" : "Marcar como concluída"}
                  >
                    {record.isDone ? "Pendente" : "Concluir"}
                  </button>
                  <button
                    onClick={() => handleRepeat(record)}
                    className="rounded-md border border-blue-500/40 bg-blue-500/10 px-2 py-1 text-xs font-semibold text-blue-200 transition hover:border-blue-400/60 hover:bg-blue-500/20"
                    title="Criar nova manutenção baseada nesta"
                  >
                    Repetir
                  </button>
                  <button
                    onClick={() => handleEdit(record)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(record._id)}
                    className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/10"
                  >
                    Excluir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

