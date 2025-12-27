"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

type EquipStatus = "ativo" | "inativo";
type EquipType = "equipamento" | "epi" | "ferramenta";

import MaintenanceHistory from "./_components/MaintenanceHistory";

export default function EquipmentPage() {
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EquipStatus | "all">("all");
  const [typeFilter, setTypeFilter] = useState<EquipType | "all">("all");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingItem, setViewingItem] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    type: "equipamento" as EquipType,
    category: "",
    patrimony: "",
    serialNumber: "",
    status: "ativo" as EquipStatus,
    quantity: "1",
    unit: "un",
    assignedTo: "",
    location: "",
    nextMaintenance: "",
    nextMaintenanceType: "",
    nextMaintenanceDetails: "",
    notes: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/equipment", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar equipamentos", data);
          return;
        }
        setItems(Array.isArray(data?.data) ? data.data : []);
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
    return items.filter((it) => {
      const matchesStatus = statusFilter === "all" ? true : it.status === statusFilter;
      const matchesType = typeFilter === "all" ? true : it.type === typeFilter;
      const matchesTerm =
        term.length === 0 ||
        it.name?.toLowerCase().includes(term) ||
        it.patrimony?.toLowerCase().includes(term) ||
        it.serialNumber?.toLowerCase().includes(term) ||
        it.category?.toLowerCase().includes(term);
      return matchesStatus && matchesType && matchesTerm;
    });
  }, [items, search, statusFilter, typeFilter]);

  const resetForm = () =>
    setForm({
      name: "",
      type: "equipamento",
      category: "",
      patrimony: "",
      serialNumber: "",
      status: "ativo",
      quantity: "1",
      unit: "un",
      assignedTo: "",
      location: "",
      nextMaintenance: "",
      nextMaintenanceType: "",
      nextMaintenanceDetails: "",
      notes: ""
    });

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome do equipamento/EPI.", "warning");
      return;
    }

    const payload = {
      name: form.name,
      type: form.type,
      category: form.category,
      patrimony: form.patrimony,
      serialNumber: form.serialNumber,
      status: form.status,
      quantity: form.quantity ? Number(form.quantity) : undefined,
      unit: form.unit,
      assignedTo: form.assignedTo,
      location: form.location,
        nextMaintenance: form.nextMaintenance,
        nextMaintenanceType: form.nextMaintenanceType || undefined,
        nextMaintenanceDetails: form.nextMaintenanceDetails || undefined,
      notes: form.notes
    };

    try {
      setSaving(true);
      if (editingId) {
        const res = await apiFetch(`/equipment/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível atualizar.", "error");
          return;
        }
        setItems((prev) => prev.map((i) => (i._id === editingId ? data.data : i)));
        Swal.fire("Sucesso", "Registro atualizado.", "success");
      } else {
        const res = await apiFetch("/equipment", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível criar.", "error");
          return;
        }
        setItems((prev) => [data.data, ...prev]);
        Swal.fire("Sucesso", "Registro criado.", "success");
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

  const handleEdit = (item: any) => {
    setEditingId(item._id);
    setMode("form");
    setForm({
      name: item.name || "",
      type: (item.type || "equipamento") as EquipType,
      category: item.category || "",
      patrimony: item.patrimony || "",
      serialNumber: item.serialNumber || "",
      status: (item.status || "ativo") as EquipStatus,
      quantity: item.quantity?.toString() || "1",
      unit: item.unit || "un",
      assignedTo: item.assignedTo || "",
      location: item.location || "",
        nextMaintenance: item.nextMaintenance || "",
        nextMaintenanceType: item.nextMaintenanceType || "",
        nextMaintenanceDetails: item.nextMaintenanceDetails || "",
      notes: item.notes || ""
    });
  };

  const handleDelete = async (item: any) => {
    const confirm = await Swal.fire({
      title: "Excluir item?",
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
      const res = await apiFetch(`/equipment/${item._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }
      setItems((prev) => prev.filter((i) => i._id !== item._id));
      Swal.fire("Sucesso", "Registro excluído.", "success");
      if (editingId === item._id) {
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
          <h1 className="text-2xl font-semibold text-white">Equipamentos e EPIs</h1>
          <p className="text-sm text-slate-300">
            Cadastre equipamentos, EPIs e ferramentas. Controle status, quantidade e alocação.
          </p>
        </div>
        {mode === "list" ? (
          <div className="flex flex-wrap gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, patrimônio, série..."
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Todos</option>
              <option value="equipamento">Equipamentos</option>
              <option value="epi">EPIs</option>
              <option value="ferramenta">Ferramentas</option>
            </select>
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
              + Novo item
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
                {editingId ? "Editar item" : "Novo item"}
              </div>
              <p className="text-xs text-slate-300">
                Nome, tipo, status, quantidade e identificação (patrimônio/série).
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
                placeholder="Capacete, Botina, Furadeira..."
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo</label>
              <select
                value={form.type}
                onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as EquipType }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="equipamento">Equipamento</option>
                <option value="epi">EPI</option>
                <option value="ferramenta">Ferramenta</option>
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Categoria</label>
              <input
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="EPI / Ferramenta elétrica / Transporte..."
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Patrimônio</label>
              <input
                value={form.patrimony}
                onChange={(e) => setForm((f) => ({ ...f, patrimony: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Código interno"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Nº de série</label>
              <input
                value={form.serialNumber}
                onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Número de série"
              />
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Quantidade</label>
                <input
                  type="number"
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="1"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Unidade</label>
                <input
                  value={form.unit}
                  onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="un, par, kit..."
                />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as EquipStatus }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="ativo">Ativo</option>
                <option value="inativo">Inativo</option>
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Alocado para</label>
              <input
                value={form.assignedTo}
                onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Equipe, funcionário ou obra"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Localização</label>
              <input
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Almoxarifado, caminhão, obra..."
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Próxima manutenção</label>
              <input
                type="date"
                value={form.nextMaintenance}
                onChange={(e) => setForm((f) => ({ ...f, nextMaintenance: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de manutenção</label>
              <select
                value={form.nextMaintenanceType}
                onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceType: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione o tipo</option>
                <option value="Troca de óleo">Troca de óleo</option>
                <option value="Revisão geral">Revisão geral</option>
                <option value="Calibração">Calibração</option>
                <option value="Troca de filtros">Troca de filtros</option>
                <option value="Lubrificação">Lubrificação</option>
                <option value="Inspeção">Inspeção</option>
                <option value="Limpeza">Limpeza</option>
                <option value="Reparo">Reparo</option>
                <option value="Substituição de peças">Substituição de peças</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="space-y-1 text-sm md:col-span-2">
              <label className="text-slate-200">Detalhes da manutenção</label>
              <textarea
                value={form.nextMaintenanceDetails}
                onChange={(e) => setForm((f) => ({ ...f, nextMaintenanceDetails: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
                placeholder="Detalhes específicos sobre a manutenção a ser realizada (ex: trocar óleo do motor, revisar sistema hidráulico, calibrar instrumentos...)"
              />
            </div>
            <div className="space-y-1 text-sm md:col-span-2">
              <label className="text-slate-200">Observações gerais</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
                placeholder="Observações gerais sobre o item, uso, restrições..."
              />
            </div>
          </div>

          {/* Maintenance History - Only show when editing existing item */}
          {editingId && (
            <div className="mt-6 border-t border-white/10 pt-6">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white mb-2">Histórico de Manutenção</h3>
                <p className="text-xs text-slate-400">Gerencie todas as manutenções realizadas neste item</p>
              </div>
              <MaintenanceHistory
                itemId={editingId}
                itemType="equipment"
                itemName={form.name || "Item"}
                onMaintenanceAdded={() => {
                  // Reload items to update nextMaintenance if it was updated
                  const load = async () => {
                    try {
                      const res = await apiFetch("/equipment", { cache: "no-store" });
                      const data = await res.json().catch(() => null);
                      if (res.ok && data?.data) {
                        setItems(Array.isArray(data.data) ? data.data : []);
                        // Update form with latest data if still editing
                        if (editingId) {
                          const updated = data.data.find((i: any) => i._id === editingId);
                          if (updated) {
                            setForm({
                              name: updated.name || "",
                              type: (updated.type || "equipamento") as EquipType,
                              category: updated.category || "",
                              patrimony: updated.patrimony || "",
                              serialNumber: updated.serialNumber || "",
                              status: (updated.status || "ativo") as EquipStatus,
                              quantity: updated.quantity?.toString() || "1",
                              unit: updated.unit || "un",
                              assignedTo: updated.assignedTo || "",
                              location: updated.location || "",
                              nextMaintenance: updated.nextMaintenance || "",
                              nextMaintenanceType: updated.nextMaintenanceType || "",
                              nextMaintenanceDetails: updated.nextMaintenanceDetails || "",
                              notes: updated.notes || ""
                            });
                          }
                        }
                      }
                    } catch (err) {
                      console.error(err);
                    }
                  };
                  load();
                }}
              />
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar item"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="font-semibold text-white">Itens cadastrados</div>
          <span className="text-xs text-slate-300">
            {loading ? "Carregando..." : `${filtered.length} registro(s)`}
          </span>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-center text-slate-300">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
            <p className="text-sm">Carregando equipamentos...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-6 py-4 text-slate-300">
            Nenhum item cadastrado. Clique em “+ Novo item” para adicionar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-4 py-3">Nome</th>
                  <th className="px-4 py-3">Tipo</th>
                  <th className="px-4 py-3">Patrimônio</th>
                  <th className="px-4 py-3">Série</th>
                  <th className="px-4 py-3">Qtd</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Alocado</th>
                  <th className="px-4 py-3">Local</th>
                  <th className="px-4 py-3">Próx. manutenção</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((item) => (
                  <tr key={item._id} className="border-t border-white/5 hover:bg-white/5">
                    <td className="px-4 py-3 text-white">{item.name}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {item.type === "epi"
                        ? "EPI"
                        : item.type === "ferramenta"
                        ? "Ferramenta"
                        : "Equipamento"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">{item.patrimony || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{item.serialNumber || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {item.quantity || 0} {item.unit || "un"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          item.status === "ativo"
                            ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                        }`}
                      >
                        {item.status === "ativo" ? "Ativo" : "Inativo"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-200">{item.assignedTo || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{item.location || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {item.nextMaintenance || "-"}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      <div className="flex justify-end gap-2 flex-wrap">
                        <button
                          type="button"
                          onClick={() => {
                            setViewingItem(item);
                            setMode("detail");
                          }}
                          className="rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                        >
                          Manutenção
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setViewingItem(item);
                            setMode("detail");
                          }}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-500/10"
                        >
                          Detalhes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
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

      {/* Detail View */}
      {mode === "detail" && viewingItem && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between mb-6">
            <div>
              <div className="text-lg font-semibold text-white">{viewingItem.name}</div>
              <div className="text-xs text-slate-400 mt-1">
                {viewingItem.type === "epi"
                  ? "EPI"
                  : viewingItem.type === "ferramenta"
                  ? "Ferramenta"
                  : "Equipamento"}
                {viewingItem.patrimony && ` • Patrimônio: ${viewingItem.patrimony}`}
                {viewingItem.serialNumber && ` • Série: ${viewingItem.serialNumber}`}
              </div>
            </div>
            <button
              onClick={() => {
                setViewingItem(null);
                setMode("list");
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
            >
              Voltar
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2 mb-6">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Status</div>
              <div className="text-sm font-semibold text-white">
                {viewingItem.status === "ativo" ? "Ativo" : "Inativo"}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <div className="text-xs text-slate-400 uppercase mb-1">Quantidade</div>
              <div className="text-sm font-semibold text-white">
                {viewingItem.quantity || 0} {viewingItem.unit || "un"}
              </div>
            </div>
            {viewingItem.location && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Localização</div>
                <div className="text-sm font-semibold text-white">{viewingItem.location}</div>
              </div>
            )}
            {viewingItem.assignedTo && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Alocado para</div>
                <div className="text-sm font-semibold text-white">{viewingItem.assignedTo}</div>
              </div>
            )}
            {viewingItem.nextMaintenance && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <div className="text-xs text-slate-400 uppercase mb-1">Próxima Manutenção</div>
                <div className="text-sm font-semibold text-white">{viewingItem.nextMaintenance}</div>
                {viewingItem.nextMaintenanceType && (
                  <div className="text-xs text-slate-300 mt-1">{viewingItem.nextMaintenanceType}</div>
                )}
              </div>
            )}
            {viewingItem.nextMaintenanceDetails && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:col-span-2">
                <div className="text-xs text-slate-400 uppercase mb-1">Detalhes da Próxima Manutenção</div>
                <div className="text-sm text-slate-200">{viewingItem.nextMaintenanceDetails}</div>
              </div>
            )}
            {viewingItem.notes && (
              <div className="rounded-lg border border-white/10 bg-white/5 p-3 md:col-span-2">
                <div className="text-xs text-slate-400 uppercase mb-1">Observações</div>
                <div className="text-sm text-slate-200 whitespace-pre-wrap">{viewingItem.notes}</div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 pt-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-white mb-2">Histórico de Manutenção</h3>
              <p className="text-xs text-slate-400">Gerencie todas as manutenções realizadas neste item</p>
            </div>
            <MaintenanceHistory
              itemId={viewingItem._id}
              itemType="equipment"
              itemName={viewingItem.name}
              onMaintenanceAdded={() => {
                // Reload items to update nextMaintenance if it was updated
                const load = async () => {
                  try {
                    const res = await apiFetch("/equipment", { cache: "no-store" });
                    const data = await res.json().catch(() => null);
                    if (res.ok && data?.data) {
                      setItems(Array.isArray(data.data) ? data.data : []);
                      // Update viewingItem with latest data
                      const updated = data.data.find((i: any) => i._id === viewingItem._id);
                      if (updated) setViewingItem(updated);
                    }
                  } catch (err) {
                    console.error(err);
                  }
                };
                load();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

