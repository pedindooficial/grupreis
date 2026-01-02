import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

type TeamStatus = "ativa" | "inativa";

export default function TeamsPage() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "all">("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTeam, setViewingTeam] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    leader: "",
    status: "ativa" as TeamStatus,
    membersText: "",
    selectedEmployeeIds: [] as string[],
    notes: "",
    operationPass: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [teamsRes, employeesRes] = await Promise.all([
          apiFetch("/teams", { cache: "no-store" }),
          apiFetch("/employees", { cache: "no-store" })
        ]);
        const teamsData = await teamsRes.json().catch(() => null);
        const employeesData = await employeesRes.json().catch(() => null);
        if (teamsRes.ok) {
          setTeams(Array.isArray(teamsData?.data) ? teamsData.data : []);
        } else {
          console.error("Erro ao carregar equipes", teamsData);
        }
        if (employeesRes.ok) {
          setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
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
    return teams.filter((t) => {
      const matchesStatus = statusFilter === "all" ? true : t.status === statusFilter;
      const matchesTerm =
        term.length === 0 ||
        t.name?.toLowerCase().includes(term) ||
        t.leader?.toLowerCase().includes(term);
      return matchesStatus && matchesTerm;
    });
  }, [teams, search, statusFilter]);

  const resetForm = () =>
    setForm({
      name: "",
      leader: "",
      status: "ativa",
      membersText: "",
      selectedEmployeeIds: [],
      notes: "",
      operationPass: ""
    });

  const membersFromText = (text: string) =>
    text
      .split(/[\n,;]+/)
      .map((m) => m.trim())
      .filter((m) => m.length > 0);

  const handleSubmit = async () => {
    if (saving) return;
    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome da equipe.", "warning");
      return;
    }
    
    // Combinar funcionários selecionados com membros em texto
    const selectedEmployeeNames = form.selectedEmployeeIds
      .map((id) => employees.find((e) => e._id === id)?.name)
      .filter(Boolean);
    const textMembers = membersFromText(form.membersText);
    const allMembers = [...selectedEmployeeNames, ...textMembers];
    
    if (allMembers.length === 0) {
      Swal.fire("Atenção", "Adicione ao menos um membro (selecione funcionários ou digite nomes).", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: form.name,
        leader: form.leader,
        status: form.status,
        notes: form.notes,
        members: allMembers,
        employeeIds: form.selectedEmployeeIds,
        operationPass: form.operationPass || undefined
      };
      if (editingId) {
        const res = await apiFetch(`/teams/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível atualizar a equipe.", "error");
          return;
        }
        setTeams((prev) => prev.map((t) => (t._id === editingId ? data.data : t)));
        Swal.fire("Sucesso", "Equipe atualizada.", "success");
      } else {
        const res = await apiFetch("/teams", {
          method: "POST",
          body: JSON.stringify(payload)
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível criar a equipe.", "error");
          return;
        }
        setTeams((prev) => [data.data, ...prev]);
        Swal.fire("Sucesso", "Equipe criada.", "success");
      }
      
      // Recarregar funcionários para atualizar vinculações
      const employeesRes = await apiFetch("/employees", { cache: "no-store" });
      const employeesData = await employeesRes.json().catch(() => null);
      if (employeesRes.ok) {
        setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
      }
      
      resetForm();
      setEditingId(null);
      setMode("list");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar equipe.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (team: any) => {
    setEditingId(team._id);
    setMode("form");
    
    // Buscar funcionários que já estão vinculados a esta equipe
    const teamEmployeeIds = employees
      .filter((e) => e.teamId === team._id)
      .map((e) => e._id);
    
    // Separar membros que são funcionários dos que são apenas texto
    const teamMembers = Array.isArray(team.members) ? team.members : [];
    const textOnlyMembers = teamMembers.filter(
      (m: string) => !employees.some((e) => e.name === m && e.teamId === team._id)
    );
    
    setForm({
      name: team.name || "",
      leader: team.leader || "",
      status: (team.status || "ativa") as TeamStatus,
      membersText: textOnlyMembers.join("\n"),
      selectedEmployeeIds: teamEmployeeIds,
      notes: team.notes || "",
      operationPass: team.operationPass || ""
    });
  };

  const handleDelete = async (team: any) => {
    const confirm = await Swal.fire({
      title: "Excluir equipe?",
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
      const res = await apiFetch(`/teams/${team._id}`, { method: "DELETE" });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }
      setTeams((prev) => prev.filter((t) => t._id !== team._id));
      Swal.fire("Sucesso", "Equipe excluída.", "success");
      if (editingId === team._id) {
        resetForm();
        setEditingId(null);
        setMode("list");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir equipe.", "error");
    }
  };

  const copyToClipboard = async (text: string, successMsg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      Swal.fire("Copiado", successMsg, "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Não foi possível copiar.", "error");
    }
  };

  const handleCopyLink = (team: any) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/operations/team/${team._id}`;
    copyToClipboard(link, "Link copiado.");
  };

  const handleCopyPass = (team: any) => {
    if (!team.operationPass) {
      Swal.fire("Atenção", "Configure a senha primeiro na edição da equipe.", "warning");
      return;
    }
    copyToClipboard(team.operationPass, "Senha copiada.");
  };

  const handleLocateTeam = async (team: any) => {
    try {
      const res = await apiFetch(`/teams/${team._id}/location`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      
      if (!res.ok || !data?.data) {
        Swal.fire({
          title: "Localização indisponível",
          text: "A equipe ainda não compartilhou sua localização. Certifique-se de que o painel de operações está aberto em um dispositivo com GPS ativado.",
          icon: "info",
          confirmButtonText: "OK"
        });
        return;
      }

      const location = data.data;
      const timestamp = new Date(location.timestamp);
      const timeAgo = Math.floor((Date.now() - timestamp.getTime()) / 1000 / 60); // minutes ago
      
      let timeText = "";
      if (timeAgo < 1) {
        timeText = "Agora mesmo";
      } else if (timeAgo < 60) {
        timeText = `${timeAgo} minuto${timeAgo > 1 ? "s" : ""} atrás`;
      } else {
        const hoursAgo = Math.floor(timeAgo / 60);
        timeText = `${hoursAgo} hora${hoursAgo > 1 ? "s" : ""} atrás`;
      }

      const mapUrl = `https://www.google.com/maps?q=${location.latitude},${location.longitude}`;
      
      Swal.fire({
        title: `📍 Localização da Equipe: ${team.name}`,
        html: `
          <div class="text-left space-y-3">
            ${location.address ? `
              <div>
                <div class="text-xs text-slate-500 mb-1">Endereço:</div>
                <div class="text-sm font-semibold text-slate-800">${location.address}</div>
              </div>
            ` : ""}
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <div class="text-slate-500">Latitude:</div>
                <div class="font-mono text-slate-800">${location.latitude.toFixed(6)}</div>
              </div>
              <div>
                <div class="text-slate-500">Longitude:</div>
                <div class="font-mono text-slate-800">${location.longitude.toFixed(6)}</div>
              </div>
            </div>
            <div>
              <div class="text-xs text-slate-500">Última atualização:</div>
              <div class="text-sm text-slate-700">${timeText}</div>
            </div>
            <div class="pt-2 border-t border-slate-200">
              <a href="${mapUrl}" target="_blank" class="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition text-sm font-semibold">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Abrir no Google Maps
              </a>
            </div>
          </div>
        `,
        icon: "info",
        width: 500,
        confirmButtonText: "Fechar"
      });
    } catch (err) {
      console.error(err);
      Swal.fire({
        title: "Localização indisponível",
        text: "Não foi possível obter a localização da equipe.",
        icon: "error"
      });
    }
  };

  const handleShowLinkInfo = (team: any) => {
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/operations/team/${team._id}`;
    
    if (!team.operationPass) {
      Swal.fire({
        title: "Link de Operação",
        html: `
          <div class="text-left text-sm">
            <div class="p-3 mb-3 bg-yellow-50 border border-yellow-200 rounded">
              <p class="text-yellow-800">⚠️ Senha não configurada</p>
              <p class="text-xs text-yellow-700 mt-1">Configure a senha na edição da equipe para permitir acesso ao painel.</p>
            </div>
            <div><strong>Equipe:</strong> ${team.name}</div>
            <div class="mt-2"><strong>Link permanente:</strong></div>
            <div class="text-xs text-slate-600 break-all mt-1">${link}</div>
          </div>
        `,
        icon: "warning"
      });
      return;
    }
    
    Swal.fire({
      title: "Link de Operação",
      html: `
        <div class="text-left text-sm">
          <div><strong>Equipe:</strong> ${team.name}</div>
          <div class="mt-2"><strong>Link permanente:</strong></div>
          <div class="mt-1 p-2 bg-gray-50 rounded break-all">
            <a href="${link}" target="_blank" class="text-emerald-600 text-xs">${link}</a>
          </div>
          <div class="mt-3"><strong>Senha:</strong> <span class="text-gray-900 font-mono">${team.operationPass}</span></div>
          <div class="mt-3 text-slate-600 text-xs p-2 bg-blue-50 border border-blue-200 rounded">
            ℹ️ Este link é permanente. Compartilhe com a equipe. A senha pode ser alterada na edição da equipe.
          </div>
        </div>
      `,
      icon: "info",
      width: 600
    });
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Equipes</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Crie equipes, defina líder, status e membros. Todos os dados ficam salvos no banco.
          </p>
        </div>
        {mode === "list" ? (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou líder"
              className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
            />
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="flex-1 sm:flex-none rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="all">Todos</option>
                <option value="ativa">Ativas</option>
                <option value="inativa">Inativas</option>
              </select>
              <button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setMode("form");
                }}
                className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2.5 sm:py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 touch-manipulation active:scale-95"
              >
                + Nova equipe
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setMode("list");
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
            >
              Cancelar
            </button>
          </div>
        )}
      </div>

      {mode === "form" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-semibold text-white">
                {editingId ? "Editar equipe" : "Nova equipe"}
              </div>
              <p className="text-xs text-slate-300">
                Nome, líder, status e membros (um por linha).
              </p>
            </div>
            {editingId && (
              <button
                onClick={() => {
                  resetForm();
                  setEditingId(null);
                  setMode("list");
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-3 sm:gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Nome da equipe</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="Equipe de Campo 01"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Líder / Responsável</label>
              <input
                value={form.leader}
                onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="Nome do líder"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TeamStatus }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="ativa">Ativa</option>
                <option value="inativa">Inativa</option>
              </select>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Observações</label>
              <input
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="Equipamento, região, turno..."
              />
            </div>
            <div className="space-y-1 text-sm md:col-span-2">
              <label className="text-slate-200">Senha do Painel de Operações</label>
              <input
                type="password"
                value={form.operationPass}
                onChange={(e) => setForm((f) => ({ ...f, operationPass: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="Senha para acesso ao painel público (mínimo 4 caracteres)"
              />
              <div className="text-[11px] text-slate-400">
                Esta senha será usada pela equipe para acessar o painel de operações. Deixe em branco para não permitir acesso.
              </div>
            </div>
            <div className="space-y-2 text-sm md:col-span-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <label className="text-slate-200 font-semibold">Funcionários da Equipe</label>
                {employees.filter((e) => e.status === "ativo").length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const activeEmployees = employees
                        .filter((e) => e.status === "ativo")
                        .map((e) => e._id);
                      if (form.selectedEmployeeIds.length === activeEmployees.length) {
                        setForm((f) => ({ ...f, selectedEmployeeIds: [] }));
                      } else {
                        setForm((f) => ({ ...f, selectedEmployeeIds: activeEmployees }));
                      }
                    }}
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition touch-manipulation active:scale-95"
                  >
                    {form.selectedEmployeeIds.length ===
                    employees.filter((e) => e.status === "ativo").length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-3 sm:p-4 max-h-[300px] overflow-y-auto">
                {employees.filter((e) => e.status === "ativo").length === 0 ? (
                  <div className="text-sm text-slate-400 text-center py-4">
                    Nenhum funcionário ativo cadastrado
                  </div>
                ) : (
                  <div className="space-y-2">
                    {employees
                      .filter((e) => e.status === "ativo")
                      .map((emp) => {
                        const isSelected = form.selectedEmployeeIds.includes(emp._id);
                        const isInOtherTeam = emp.teamId && emp.teamId !== editingId;
                        const otherTeamName = isInOtherTeam
                          ? teams.find((t) => t._id === emp.teamId)?.name || "Outra equipe"
                          : "";
                        return (
                          <label
                            key={emp._id}
                            className={`flex items-center gap-3 rounded-lg border p-2.5 sm:p-3 cursor-pointer transition touch-manipulation ${
                              isSelected
                                ? "border-emerald-400/50 bg-emerald-500/20"
                                : "border-white/10 bg-white/5 hover:border-emerald-400/30 hover:bg-emerald-500/10"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setForm((f) => ({
                                    ...f,
                                    selectedEmployeeIds: [...f.selectedEmployeeIds, emp._id]
                                  }));
                                } else {
                                  setForm((f) => ({
                                    ...f,
                                    selectedEmployeeIds: f.selectedEmployeeIds.filter((id) => id !== emp._id)
                                  }));
                                }
                              }}
                              className="h-4 w-4 sm:h-5 sm:w-5 rounded border-white/20 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                            />
                            <div className="flex-1">
                              <div className="font-semibold text-white">{emp.name}</div>
                              <div className="text-xs text-slate-300 mt-0.5">
                                {emp.role && <span>Cargo: {emp.role}</span>}
                                {emp.role && emp.phone && <span className="mx-2">•</span>}
                                {emp.phone && <span>Tel: {emp.phone}</span>}
                              </div>
                              {isInOtherTeam && (
                                <div className="text-xs text-orange-400 mt-1">
                                  ⚠ Já está na equipe: {otherTeamName}
                                </div>
                              )}
                            </div>
                          </label>
                        );
                      })}
                  </div>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Funcionários selecionados serão automaticamente vinculados à equipe.
                {form.selectedEmployeeIds.length > 0 && (
                  <span className="text-emerald-400 ml-1 font-semibold">
                    {form.selectedEmployeeIds.length} selecionado(s)
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1 text-sm md:col-span-2">
              <label className="text-slate-200">Outros Membros (texto livre - um por linha)</label>
              <textarea
                value={form.membersText}
                onChange={(e) => setForm((f) => ({ ...f, membersText: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                rows={3}
                placeholder={"João Silva\nMaria Souza\nCarlos Pereira"}
              />
              <div className="text-[11px] text-slate-400">
                Para membros que não são funcionários cadastrados. Separe por quebras de linha, vírgula ou ponto e vírgula.
              </div>
            </div>
          </div>

          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-3 sm:py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation active:scale-95"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar equipe"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 px-3 sm:px-6 py-3 sm:py-4 gap-2">
          <div className="font-semibold text-white text-sm sm:text-base">Equipes cadastradas</div>
          <span className="text-xs text-slate-300">
            {loading ? "Carregando..." : `${filtered.length} registro(s)`}
          </span>
        </div>
        {loading ? (
          <div className="px-3 sm:px-6 py-8 text-center text-slate-300">
            <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
            <p className="text-sm">Carregando equipes...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 sm:px-6 py-4 text-slate-300 text-sm">
            Nenhuma equipe cadastrada. Crie uma nova equipe no formulário acima.
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase text-slate-300">
                  <tr>
                    <th className="px-4 py-3">Equipe</th>
                    <th className="px-4 py-3">Líder</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Membros</th>
                    <th className="px-4 py-3">Observações</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((team) => {
                    return (
                      <tr
                        key={team._id}
                        className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                        onClick={() => setViewingTeam(team)}
                      >
                        <td className="px-4 py-3 text-white">
                          <div className="font-semibold">{team.name}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-200">{team.leader || "-"}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${
                              team.status === "ativa"
                                ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                                : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                            }`}
                          >
                            {team.status === "ativa" ? "Ativa" : "Inativa"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {(() => {
                            const teamEmployees = employees.filter((e) => e.teamId === team._id);
                            const totalMembers = Array.isArray(team.members) ? team.members.length : 0;
                            if (teamEmployees.length > 0 || totalMembers > 0) {
                              return (
                                <span className="text-emerald-300 font-semibold">
                                  {totalMembers} membro(s)
                                </span>
                              );
                            }
                            return "-";
                          })()}
                        </td>
                        <td className="px-4 py-3 text-slate-200 truncate max-w-xs">
                          {team.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-200">
                          <div className="flex flex-col items-end gap-2">
                            <div className="flex flex-wrap justify-end gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(team);
                              }}
                              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation active:scale-95"
                            >
                              Editar
                            </button>
                            <Link
                              to={`/teams/${team._id}/jobs`}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/80 hover:bg-emerald-500/20 touch-manipulation active:scale-95"
                            >
                              Serviços
                            </Link>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleShowLinkInfo(team);
                              }}
                              className="rounded-md border border-blue-400/50 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100 transition hover:border-blue-300/80 hover:bg-blue-500/20 touch-manipulation active:scale-95"
                            >
                              Ver link
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(team);
                              }}
                              className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10 touch-manipulation active:scale-95"
                            >
                              Copiar link
                            </button>
                            {team.operationPass && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCopyPass(team);
                                }}
                                className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10 touch-manipulation active:scale-95"
                              >
                                Copiar senha
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleLocateTeam(team);
                              }}
                              className="rounded-md border border-purple-400/50 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-100 transition hover:border-purple-300/80 hover:bg-purple-500/20 touch-manipulation active:scale-95"
                            >
                              Localizar Equipe
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(team);
                              }}
                              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/10 touch-manipulation active:scale-95"
                            >
                              Excluir
                            </button>
                          </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-3 p-3">
              {filtered.map((team) => {
                const teamEmployees = employees.filter((e) => e.teamId === team._id);
                const totalMembers = Array.isArray(team.members) ? team.members.length : 0;
                return (
                  <div
                    key={team._id}
                    className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-3"
                    onClick={() => setViewingTeam(team)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-white">{team.name}</h3>
                        {team.leader && (
                          <p className="text-xs text-slate-300 mt-0.5">Líder: {team.leader}</p>
                        )}
                      </div>
                      <span
                        className={`flex-shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold ${
                          team.status === "ativa"
                            ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                            : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                        }`}
                      >
                        {team.status === "ativa" ? "Ativa" : "Inativa"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {totalMembers > 0 && (
                        <div>
                          <span className="text-slate-400">Membros:</span>
                          <p className="text-emerald-300 font-semibold">{totalMembers} membro(s)</p>
                        </div>
                      )}
                      {team.notes && (
                        <div className="col-span-2">
                          <span className="text-slate-400">Observações:</span>
                          <p className="text-slate-200 break-words">{team.notes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-white/5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(team);
                        }}
                        className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation active:scale-95"
                      >
                        Editar
                      </button>
                      <Link
                        to={`/teams/${team._id}/jobs`}
                        onClick={(e) => e.stopPropagation()}
                        className="flex-1 rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/80 hover:bg-emerald-500/20 touch-manipulation active:scale-95"
                      >
                        Serviços
                      </Link>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleShowLinkInfo(team);
                        }}
                        className="flex-1 rounded-md border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/80 hover:bg-blue-500/20 touch-manipulation active:scale-95"
                      >
                        Ver link
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyLink(team);
                        }}
                        className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10 touch-manipulation active:scale-95"
                      >
                        Copiar link
                      </button>
                      {team.operationPass && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyPass(team);
                          }}
                          className="flex-1 rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10 touch-manipulation active:scale-95"
                        >
                          Copiar senha
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleLocateTeam(team);
                        }}
                        className="flex-1 rounded-md border border-purple-400/50 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/80 hover:bg-purple-500/20 touch-manipulation active:scale-95"
                      >
                        Localizar Equipe
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(team);
                        }}
                        className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/10 touch-manipulation active:scale-95"
                      >
                        Excluir
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal de Detalhes da Equipe */}
      {viewingTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-3 sm:p-4"
          onClick={() => setViewingTeam(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-lg sm:text-xl font-semibold text-white">{viewingTeam.name}</h2>
                <p className="text-xs sm:text-sm text-slate-300">Detalhes da equipe</p>
              </div>
              <button
                onClick={() => setViewingTeam(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-400">Líder / Responsável</label>
                  <div className="text-sm text-white mt-1">{viewingTeam.leader || "-"}</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400">Status</label>
                  <div className="mt-1">
                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        viewingTeam.status === "ativa"
                          ? "border border-emerald-400/40 bg-emerald-500/10 text-emerald-100"
                          : "border border-orange-400/40 bg-orange-500/10 text-orange-100"
                      }`}
                    >
                      {viewingTeam.status === "ativa" ? "Ativa" : "Inativa"}
                    </span>
                  </div>
                </div>
              </div>

              {viewingTeam.notes && (
                <div>
                  <label className="text-xs text-slate-400">Observações</label>
                  <div className="text-sm text-white mt-1">{viewingTeam.notes}</div>
                </div>
              )}

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Funcionários Vinculados</label>
                {(() => {
                  const teamEmployees = employees.filter((e) => e.teamId === viewingTeam._id);
                  if (teamEmployees.length > 0) {
                    return (
                      <div className="space-y-2">
                        {teamEmployees.map((emp) => (
                          <div
                            key={emp._id}
                            className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-semibold text-emerald-100">{emp.name}</div>
                                {emp.role && (
                                  <div className="text-xs text-slate-300 mt-1">Cargo: {emp.role}</div>
                                )}
                                {emp.phone && (
                                  <div className="text-xs text-slate-400 mt-1">Telefone: {emp.phone}</div>
                                )}
                                {emp.email && (
                                  <div className="text-xs text-slate-400 mt-1">Email: {emp.email}</div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return <div className="text-sm text-slate-400">Nenhum funcionário vinculado</div>;
                })()}
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Todos os Membros</label>
                {Array.isArray(viewingTeam.members) && viewingTeam.members.length > 0 ? (
                  <div className="space-y-1">
                    {viewingTeam.members.map((member: string, idx: number) => {
                      const isEmployee = employees.some(
                        (e) => e.teamId === viewingTeam._id && e.name === member
                      );
                      return (
                        <div
                          key={idx}
                          className={`rounded-lg border p-2 text-sm ${
                            isEmployee
                              ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100"
                              : "border-white/10 bg-white/5 text-slate-200"
                          }`}
                        >
                          {member} {isEmployee && <span className="text-xs">(Funcionário)</span>}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">Nenhum membro cadastrado</div>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-2 block">Link de Operação (Permanente)</label>
                <div className={`rounded-lg border p-3 ${
                  viewingTeam.operationPass 
                    ? "border-blue-400/30 bg-blue-500/10"
                    : "border-yellow-400/30 bg-yellow-500/10"
                }`}>
                  <div className={`text-sm break-all ${
                    viewingTeam.operationPass ? "text-blue-100" : "text-yellow-100"
                  }`}>
                    {typeof window !== "undefined"
                      ? `${window.location.origin}/operations/team/${viewingTeam._id}`
                      : ""}
                  </div>
                  {viewingTeam.operationPass ? (
                    <div className="text-xs text-slate-300 mt-2">
                      Senha: <span className="font-semibold text-white">{viewingTeam.operationPass}</span>
                    </div>
                  ) : (
                    <div className="text-xs text-yellow-200 mt-2">
                      ⚠️ Configure a senha na edição da equipe para permitir acesso
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

