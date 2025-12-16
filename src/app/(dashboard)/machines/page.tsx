"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type MachineStatus = "ativa" | "inativa";
type MachineOpStatus = "operando" | "manutencao" | "parada" | "inativa";
type MachineUseType = "leve" | "medio" | "pesado";

// Função para formatar data no formato brasileiro (dd/mm/yyyy)
const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString || dateString.trim() === "") return "-";
  try {
    // Se estiver no formato YYYY-MM-DD, formata diretamente
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split("-");
      return `${day}/${month}/${year}`;
    }
    // Tenta parsear como data
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

export default function MachinesPage() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [machines, setMachines] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<MachineStatus | "all">("all");
  const [opStatusFilter, setOpStatusFilter] = useState<MachineOpStatus | "all">("all");
  const [useTypeFilter, setUseTypeFilter] = useState<MachineUseType | "all">("all");
  const [employees, setEmployees] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingMachine, setViewingMachine] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    plate: "",
    model: "",
    year: "",
    chassi: "",
    renavam: "",
    category: "",
    ownerCompany: "",
    internalCode: "",
    fuelType: "",
    fuelAverage: "",
    fuelUnit: "L/h",
    tankCapacityL: "",
    consumptionKmPerL: "",
    useType: "medio" as MachineUseType,
    autonomyEstimated: "",
    hourmeterStart: "",
    odometerKm: "",
    weightKg: "",
    loadCapacityKg: "",
    status: "ativa" as MachineStatus,
    statusOperational: "operando" as MachineOpStatus,
    lastMaintenance: "",
    nextMaintenance: "",
    maintenanceType: "preventiva",
    maintenanceVendor: "",
    maintenanceCostAvg: "",
    requiredLicense: "",
    mandatoryTraining: false,
    checklistRequired: false,
    lastInspection: "",
    laudoValidity: "",
    operatorId: "",
    operatorName: "",
    notes: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/machines", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar máquinas", data);
          return;
        }
        setMachines(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const loadEmployees = async () => {
      try {
        const res = await fetch("/api/employees", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && Array.isArray(data?.data)) {
          setEmployees(data.data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadEmployees();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return machines.filter((m) => {
      const matchesStatus = statusFilter === "all" ? true : m.status === statusFilter;
      const matchesOpStatus =
        opStatusFilter === "all" ? true : m.statusOperational === opStatusFilter;
      const matchesUseType = useTypeFilter === "all" ? true : m.useType === useTypeFilter;
      const matchesTerm =
        term.length === 0 ||
        m.name?.toLowerCase().includes(term) ||
        m.plate?.toLowerCase().includes(term) ||
        m.fuelType?.toLowerCase().includes(term);
      return matchesStatus && matchesOpStatus && matchesUseType && matchesTerm;
    });
  }, [machines, search, statusFilter, opStatusFilter, useTypeFilter]);

  const resetForm = () =>
    setForm({
      name: "",
      plate: "",
      model: "",
      year: "",
      chassi: "",
      renavam: "",
      category: "",
      ownerCompany: "",
      internalCode: "",
      fuelType: "",
      fuelAverage: "",
      fuelUnit: "L/h",
      tankCapacityL: "",
      consumptionKmPerL: "",
      useType: "medio",
      autonomyEstimated: "",
      hourmeterStart: "",
      odometerKm: "",
      weightKg: "",
      loadCapacityKg: "",
      status: "ativa",
      statusOperational: "operando",
      lastMaintenance: "",
      nextMaintenance: "",
      maintenanceType: "preventiva",
      maintenanceVendor: "",
      maintenanceCostAvg: "",
      requiredLicense: "",
      mandatoryTraining: false,
      checklistRequired: false,
      lastInspection: "",
      laudoValidity: "",
      operatorId: "",
      operatorName: "",
      notes: ""
    });

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome da máquina.", "warning");
      return;
    }

    const payload = {
      ...form,
      year: form.year ? Number(form.year) : undefined,
      fuelAverage: form.fuelAverage ? Number(form.fuelAverage) : undefined,
      tankCapacityL: form.tankCapacityL ? Number(form.tankCapacityL) : undefined,
      consumptionKmPerL: form.consumptionKmPerL ? Number(form.consumptionKmPerL) : undefined,
      autonomyEstimated: form.autonomyEstimated ? Number(form.autonomyEstimated) : undefined,
      hourmeterStart: form.hourmeterStart ? Number(form.hourmeterStart) : undefined,
      odometerKm: form.odometerKm ? Number(form.odometerKm) : undefined,
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      loadCapacityKg: form.loadCapacityKg ? Number(form.loadCapacityKg) : undefined,
      maintenanceCostAvg: form.maintenanceCostAvg ? Number(form.maintenanceCostAvg) : undefined,
      operatorName:
        form.operatorId && employees.find((e) => e._id === form.operatorId)?.name
          ? employees.find((e) => e._id === form.operatorId)?.name
          : form.operatorName || ""
    };

    try {
      setSaving(true);
      if (editingId) {
        const res = await fetch(`/api/machines/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível atualizar.", "error");
          return;
        }
        setMachines((prev) => prev.map((m) => (m._id === editingId ? data.data : m)));
        Swal.fire("Sucesso", "Máquina atualizada.", "success");
      } else {
        const res = await fetch("/api/machines", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível criar.", "error");
          return;
        }
        setMachines((prev) => [data.data, ...prev]);
        Swal.fire("Sucesso", "Máquina criada.", "success");
      }
      resetForm();
      setEditingId(null);
      setMode("list");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar máquina.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (machine: any) => {
    setEditingId(machine._id);
    setMode("form");
    setForm({
      name: machine.name || "",
      plate: machine.plate || "",
      model: machine.model || "",
      year: machine.year?.toString() || "",
      chassi: machine.chassi || "",
      renavam: machine.renavam || "",
      category: machine.category || "",
      ownerCompany: machine.ownerCompany || "",
      internalCode: machine.internalCode || "",
      fuelType: machine.fuelType || "",
      fuelAverage: machine.fuelAverage?.toString() || "",
      fuelUnit: machine.fuelUnit || "L/h",
      tankCapacityL: machine.tankCapacityL?.toString() || "",
      consumptionKmPerL: machine.consumptionKmPerL?.toString() || "",
      useType: (machine.useType || "medio") as MachineUseType,
      autonomyEstimated: machine.autonomyEstimated?.toString() || "",
      hourmeterStart: machine.hourmeterStart?.toString() || "",
      odometerKm: machine.odometerKm?.toString() || "",
      weightKg: machine.weightKg?.toString() || "",
      loadCapacityKg: machine.loadCapacityKg?.toString() || "",
      status: (machine.status || "ativa") as MachineStatus,
      statusOperational: (machine.statusOperational || "operando") as MachineOpStatus,
      lastMaintenance: machine.lastMaintenance || "",
      nextMaintenance: machine.nextMaintenance || "",
      maintenanceType: machine.maintenanceType || "preventiva",
      maintenanceVendor: machine.maintenanceVendor || "",
      maintenanceCostAvg: machine.maintenanceCostAvg?.toString() || "",
      requiredLicense: machine.requiredLicense || "",
      mandatoryTraining: !!machine.mandatoryTraining,
      checklistRequired: !!machine.checklistRequired,
      lastInspection: machine.lastInspection || "",
      laudoValidity: machine.laudoValidity || "",
      operatorId: machine.operatorId || "",
      operatorName: machine.operatorName || "",
      notes: machine.notes || ""
    });
  };

  const handleViewMachine = (machine: any) => {
    setViewingMachine(machine);
  };

  const handleChangeStatus = async (machine: any, newStatus: "ativa" | "manutencao") => {
    try {
      const updatePayload: any = {};
      
      if (newStatus === "ativa") {
        updatePayload.status = "ativa";
        updatePayload.statusOperational = "operando";
      } else if (newStatus === "manutencao") {
        updatePayload.statusOperational = "manutencao";
        // Mantém o status atual (ativa ou inativa)
      }
      
      const res = await fetch(`/api/machines/${machine._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatePayload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar o status.", "error");
        return;
      }
      setMachines((prev) => prev.map((m) => (m._id === machine._id ? data.data : m)));
      setViewingMachine(data.data);
      Swal.fire("Sucesso", "Status atualizado com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar status.", "error");
    }
  };

  const handleDelete = async (machine: any) => {
    const confirm = await Swal.fire({
      title: "Excluir máquina?",
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
      const res = await fetch(`/api/machines/${machine._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }
      setMachines((prev) => prev.filter((m) => m._id !== machine._id));
      Swal.fire("Sucesso", "Máquina excluída.", "success");
      if (editingId === machine._id) {
        resetForm();
        setEditingId(null);
        setMode("list");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir máquina.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Máquinas</h1>
          <p className="text-sm text-slate-300">
            Cadastre máquinas, combustível, peso e capacidade. Dados salvos no banco.
          </p>
        </div>
        {mode === "list" ? (
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, placa ou combustível"
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Todos</option>
              <option value="ativa">Ativas</option>
              <option value="inativa">Inativas</option>
            </select>
            <select
              value={opStatusFilter}
              onChange={(e) => setOpStatusFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Op. todos</option>
              <option value="operando">Operando</option>
              <option value="manutencao">Em manutenção</option>
              <option value="parada">Parada</option>
              <option value="inativa">Inativa</option>
            </select>
            <select
              value={useTypeFilter}
              onChange={(e) => setUseTypeFilter(e.target.value as any)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Uso todos</option>
              <option value="leve">Leve</option>
              <option value="medio">Médio</option>
              <option value="pesado">Pesado</option>
            </select>
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setMode("form");
              }}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500"
            >
              + Nova máquina
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
          <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">
                {editingId ? "Editar máquina" : "Nova máquina"}
              </div>
              <p className="text-xs text-slate-300">
                Nome, placa, combustível, consumo, peso e capacidade.
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
              <label className="text-slate-200">Nome da máquina</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Perfuratriz SD-400"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Placa</label>
              <input
                value={form.plate}
                onChange={(e) => setForm((f) => ({ ...f, plate: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="ABC-1234"
              />
            </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Modelo</label>
            <input
              value={form.model}
              onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Modelo"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Ano de fabricação</label>
            <input
              type="number"
              value={form.year}
              onChange={(e) => setForm((f) => ({ ...f, year: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="2024"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Chassi</label>
            <input
              value={form.chassi}
              onChange={(e) => setForm((f) => ({ ...f, chassi: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Chassi"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Renavam</label>
            <input
              value={form.renavam}
              onChange={(e) => setForm((f) => ({ ...f, renavam: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Renavam"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Categoria</label>
            <input
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Caminhão, Perfuratriz, Escavadeira, Apoio..."
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Empresa proprietária</label>
            <input
              value={form.ownerCompany}
              onChange={(e) => setForm((f) => ({ ...f, ownerCompany: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Reis Fundações"
            />
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Código interno</label>
            <input
              value={form.internalCode}
              onChange={(e) => setForm((f) => ({ ...f, internalCode: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="RF-CP-001"
            />
          </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de combustível</label>
              <select
                value={form.fuelType}
                onChange={(e) => setForm((f) => ({ ...f, fuelType: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione</option>
                <option value="Diesel">Diesel</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Elétrico">Elétrico</option>
                <option value="GNV">GNV</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Capacidade do tanque (L)</label>
                <input
                  type="number"
                  value={form.tankCapacityL}
                  onChange={(e) => setForm((f) => ({ ...f, tankCapacityL: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 200"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Consumo (L/h)</label>
                <input
                  type="number"
                  value={form.fuelAverage}
                  onChange={(e) => setForm((f) => ({ ...f, fuelAverage: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 12"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Consumo (km/L)</label>
                <input
                  type="number"
                  value={form.consumptionKmPerL}
                  onChange={(e) => setForm((f) => ({ ...f, consumptionKmPerL: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 4"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Unidade de consumo</label>
                <input
                  value={form.fuelUnit}
                  onChange={(e) => setForm((f) => ({ ...f, fuelUnit: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="L/h, L/100km..."
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Tipo de uso</label>
                <select
                  value={form.useType}
                  onChange={(e) => setForm((f) => ({ ...f, useType: e.target.value as MachineUseType }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                >
                  <option value="leve">Leve</option>
                  <option value="medio">Médio</option>
                  <option value="pesado">Pesado</option>
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Autonomia estimada (km)</label>
                <input
                  type="number"
                  value={form.autonomyEstimated}
                  onChange={(e) => setForm((f) => ({ ...f, autonomyEstimated: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 400"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Horímetro inicial</label>
                <input
                  type="number"
                  value={form.hourmeterStart}
                  onChange={(e) => setForm((f) => ({ ...f, hourmeterStart: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Horas"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Odômetro (km)</label>
                <input
                  type="number"
                  value={form.odometerKm}
                  onChange={(e) => setForm((f) => ({ ...f, odometerKm: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Quilometragem atual"
                />
              </div>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Peso (kg)</label>
                <input
                  type="number"
                  value={form.weightKg}
                  onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 5000"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Capacidade de carga (kg)</label>
                <input
                  type="number"
                  value={form.loadCapacityKg}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, loadCapacityKg: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: 2000"
                />
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as MachineStatus }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status operacional</label>
              <select
                value={form.statusOperational}
                onChange={(e) =>
                  setForm((f) => ({ ...f, statusOperational: e.target.value as MachineOpStatus }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="operando">Operando</option>
                <option value="manutencao">Em manutenção</option>
                <option value="parada">Parada</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
          </div>

          {/* Seção de Manutenção */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Manutenção</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Última Manutenção</label>
                <input
                  type="date"
                  value={form.lastMaintenance}
                  onChange={(e) => setForm((f) => ({ ...f, lastMaintenance: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Próxima Manutenção</label>
                <input
                  type="date"
                  value={form.nextMaintenance}
                  onChange={(e) => setForm((f) => ({ ...f, nextMaintenance: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Tipo de Manutenção</label>
                <select
                  value={form.maintenanceType}
                  onChange={(e) => setForm((f) => ({ ...f, maintenanceType: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                >
                  <option value="preventiva">Preventiva</option>
                  <option value="corretiva">Corretiva</option>
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Fornecedor de Manutenção</label>
                <input
                  value={form.maintenanceVendor}
                  onChange={(e) => setForm((f) => ({ ...f, maintenanceVendor: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Nome do fornecedor"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Custo Médio de Manutenção (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.maintenanceCostAvg}
                  onChange={(e) => setForm((f) => ({ ...f, maintenanceCostAvg: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Seção de Licenças e Treinamentos */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Licenças e Treinamentos</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Licença Necessária</label>
                <input
                  value={form.requiredLicense}
                  onChange={(e) => setForm((f) => ({ ...f, requiredLicense: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Ex: Categoria D ou E"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Treinamento Obrigatório</label>
                <select
                  value={form.mandatoryTraining ? "sim" : "nao"}
                  onChange={(e) => setForm((f) => ({ ...f, mandatoryTraining: e.target.value === "sim" }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Checklist Obrigatório</label>
                <select
                  value={form.checklistRequired ? "sim" : "nao"}
                  onChange={(e) => setForm((f) => ({ ...f, checklistRequired: e.target.value === "sim" }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                >
                  <option value="nao">Não</option>
                  <option value="sim">Sim</option>
                </select>
              </div>
            </div>
          </div>

          {/* Seção de Inspeções */}
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-4">
            <h3 className="text-sm font-semibold text-white mb-4">Inspeções</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Última Inspeção</label>
                <input
                  type="date"
                  value={form.lastInspection}
                  onChange={(e) => setForm((f) => ({ ...f, lastInspection: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Validade do Laudo</label>
                <input
                  type="date"
                  value={form.laudoValidity}
                  onChange={(e) => setForm((f) => ({ ...f, laudoValidity: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
              </div>
            </div>
          </div>

          {/* Observações */}
          <div className="mt-6 space-y-1 text-sm">
            <label className="text-slate-200">Observações</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              rows={3}
              placeholder="Combustível preferencial, manutenção, etc."
            />
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar máquina"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="font-semibold text-white">Máquinas cadastradas</div>
          <span className="text-xs text-slate-300">{filtered.length} registro(s)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-4 text-slate-300">
            Nenhuma máquina cadastrada. Clique em “+ Nova máquina” para adicionar.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/5 text-xs uppercase text-slate-300">
                <tr>
                  <th className="px-4 py-3">Máquina</th>
                  <th className="px-4 py-3">Placa</th>
                  <th className="px-4 py-3">Combustível</th>
                  <th className="px-4 py-3">Consumo</th>
                  <th className="px-4 py-3">Peso (kg)</th>
                  <th className="px-4 py-3">Carga (kg)</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Operacional</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((machine) => (
                  <tr 
                    key={machine._id} 
                    className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                    onClick={() => handleViewMachine(machine)}
                  >
                    <td className="px-4 py-3 text-white">{machine.name}</td>
                    <td className="px-4 py-3 text-slate-200">{machine.plate || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">{machine.fuelType || "-"}</td>
                    <td className="px-4 py-3 text-slate-200">
                      {machine.fuelAverage
                        ? `${machine.fuelAverage} ${machine.fuelUnit || "L/h"}`
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {machine.weightKg ? `${machine.weightKg} kg` : "-"}
                    </td>
                    <td className="px-4 py-3 text-slate-200">
                      {machine.loadCapacityKg ? `${machine.loadCapacityKg} kg` : "-"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          machine.status === "ativa"
                            ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                        }`}
                      >
                        {machine.status === "ativa" ? "Ativa" : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${
                          machine.statusOperational === "operando"
                            ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : machine.statusOperational === "manutencao"
                            ? "border border-blue-400/40 bg-blue-500/10 text-blue-100"
                            : machine.statusOperational === "parada"
                            ? "border border-yellow-400/40 bg-yellow-500/10 text-yellow-100"
                            : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                        }`}
                      >
                        {machine.statusOperational === "operando"
                          ? "Operando"
                          : machine.statusOperational === "manutencao"
                          ? "Em manutenção"
                          : machine.statusOperational === "parada"
                          ? "Parada"
                          : "Inativa"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-200">
                      <div className="flex justify-end gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleEdit(machine)}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(machine)}
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

      {/* Modal de Detalhes da Máquina */}
      {viewingMachine && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setViewingMachine(null)}>
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-white">{viewingMachine.name}</h2>
                <p className="text-sm text-slate-300 mt-1">Detalhes da máquina</p>
              </div>
              <button
                onClick={() => setViewingMachine(null)}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
            </div>

            {/* Informações Básicas */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Informações Básicas</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Placa</div>
                  <div className="text-white font-semibold">{viewingMachine.plate || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Modelo</div>
                  <div className="text-white font-semibold">{viewingMachine.model || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Ano</div>
                  <div className="text-white font-semibold">{viewingMachine.year || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Categoria</div>
                  <div className="text-white font-semibold">{viewingMachine.category || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Chassi</div>
                  <div className="text-white font-semibold">{viewingMachine.chassi || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Renavam</div>
                  <div className="text-white font-semibold">{viewingMachine.renavam || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Empresa Proprietária</div>
                  <div className="text-white font-semibold">{viewingMachine.ownerCompany || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Código Interno</div>
                  <div className="text-white font-semibold">{viewingMachine.internalCode || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Tipo de Uso</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.useType === "leve" ? "Leve" : viewingMachine.useType === "medio" ? "Médio" : viewingMachine.useType === "pesado" ? "Pesado" : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de Combustível */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Combustível e Consumo</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Tipo de Combustível</div>
                  <div className="text-white font-semibold">{viewingMachine.fuelType || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Consumo</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.fuelAverage
                      ? `${viewingMachine.fuelAverage} ${viewingMachine.fuelUnit || "L/h"}`
                      : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Capacidade do Tanque</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.tankCapacityL ? `${viewingMachine.tankCapacityL} L` : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Consumo (km/L)</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.consumptionKmPerL ? `${viewingMachine.consumptionKmPerL} km/L` : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Autonomia Estimada</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.autonomyEstimated ? `${viewingMachine.autonomyEstimated} km` : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de Peso e Capacidade */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Peso e Capacidade</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Peso</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.weightKg ? `${viewingMachine.weightKg} kg` : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Capacidade de Carga</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.loadCapacityKg ? `${viewingMachine.loadCapacityKg} kg` : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Informações de Medidores */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Medidores</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Horímetro Inicial</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.hourmeterStart !== undefined && viewingMachine.hourmeterStart !== null
                      ? `${viewingMachine.hourmeterStart} horas`
                      : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Odômetro (km)</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.odometerKm !== undefined && viewingMachine.odometerKm !== null
                      ? `${viewingMachine.odometerKm} km`
                      : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Status</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Status</div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        viewingMachine.status === "ativa"
                          ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                      }`}
                    >
                      {viewingMachine.status === "ativa" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Status Operacional</div>
                  <div>
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        viewingMachine.statusOperational === "operando"
                          ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : viewingMachine.statusOperational === "manutencao"
                          ? "border border-blue-400/40 bg-blue-500/10 text-blue-100"
                          : viewingMachine.statusOperational === "parada"
                          ? "border border-yellow-400/40 bg-yellow-500/10 text-yellow-100"
                          : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                      }`}
                    >
                      {viewingMachine.statusOperational === "operando"
                        ? "Operando"
                        : viewingMachine.statusOperational === "manutencao"
                        ? "Em manutenção"
                        : viewingMachine.statusOperational === "parada"
                        ? "Parada"
                        : "Inativa"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Manutenção */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Manutenção</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Última Manutenção</div>
                  <div className="text-white font-semibold">{formatDate(viewingMachine.lastMaintenance)}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Próxima Manutenção</div>
                  <div className="text-white font-semibold">{formatDate(viewingMachine.nextMaintenance)}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Tipo de Manutenção</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.maintenanceType === "preventiva" ? "Preventiva" : viewingMachine.maintenanceType === "corretiva" ? "Corretiva" : "-"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Fornecedor de Manutenção</div>
                  <div className="text-white font-semibold">{viewingMachine.maintenanceVendor || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Custo Médio de Manutenção</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.maintenanceCostAvg !== undefined && viewingMachine.maintenanceCostAvg !== null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(viewingMachine.maintenanceCostAvg)
                      : "-"}
                  </div>
                </div>
              </div>
            </div>

            {/* Licenças e Treinamentos */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Licenças e Treinamentos</h3>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Licença Necessária</div>
                  <div className="text-white font-semibold">{viewingMachine.requiredLicense || "-"}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Treinamento Obrigatório</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.mandatoryTraining ? "Sim" : "Não"}
                  </div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Checklist Obrigatório</div>
                  <div className="text-white font-semibold">
                    {viewingMachine.checklistRequired ? "Sim" : "Não"}
                  </div>
                </div>
              </div>
            </div>

            {/* Inspeções */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Inspeções</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Última Inspeção</div>
                  <div className="text-white font-semibold">{formatDate(viewingMachine.lastInspection)}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                  <div className="text-[11px] uppercase text-slate-400 mb-1">Validade do Laudo</div>
                  <div className="text-white font-semibold">{formatDate(viewingMachine.laudoValidity)}</div>
                </div>
              </div>
            </div>

            {/* Operador e Observações */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-white mb-4 pb-2 border-b border-white/10">Operador e Observações</h3>
              <div className="grid gap-4 md:grid-cols-2">
                {viewingMachine.operatorName && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3">
                    <div className="text-[11px] uppercase text-slate-400 mb-1">Operador</div>
                    <div className="text-white font-semibold">{viewingMachine.operatorName}</div>
                  </div>
                )}
                {viewingMachine.notes && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 md:col-span-2">
                    <div className="text-[11px] uppercase text-slate-400 mb-1">Observações</div>
                    <div className="text-white text-sm whitespace-pre-wrap">{viewingMachine.notes}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Ações de Status */}
            <div className="border-t border-white/10 pt-6">
              <div className="text-sm font-semibold text-white mb-4">Alterar Status</div>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleChangeStatus(viewingMachine, "ativa")}
                  className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/20"
                >
                  Marcar como Ativa
                </button>
                <button
                  onClick={() => handleChangeStatus(viewingMachine, "manutencao")}
                  className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/20"
                >
                  Marcar como Manutenção
                </button>
                <button
                  onClick={() => {
                    handleEdit(viewingMachine);
                    setViewingMachine(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                >
                  Editar Máquina
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


