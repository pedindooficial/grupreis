"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

type TeamStatus = "ativa" | "inativa";

export default function TeamsPage() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [teams, setTeams] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TeamStatus | "all">("all");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingTeam, setViewingTeam] = useState<any | null>(null);
  const [form, setForm] = useState({
    name: "",
    leader: "",
    status: "ativa" as TeamStatus,
    membersText: "",
    selectedEmployeeIds: [] as string[],
    notes: ""
  });

  useEffect(() => {
    const load = async () => {
      try {
        const [teamsRes, employeesRes] = await Promise.all([
          fetch("/api/teams", { cache: "no-store" }),
          fetch("/api/employees", { cache: "no-store" })
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
      notes: ""
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
        employeeIds: form.selectedEmployeeIds
      };
      if (editingId) {
        const res = await fetch(`/api/teams/${editingId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
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
        const res = await fetch("/api/teams", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
      const employeesRes = await fetch("/api/employees", { cache: "no-store" });
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
      notes: team.notes || ""
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
      const res = await fetch(`/api/teams/${team._id}`, { method: "DELETE" });
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

  const handleGenerateLink = async (team: any) => {
    const result = await Swal.fire({
      title: "Gerar link de operação",
      html:
        '<p class="text-sm text-slate-200">Defina uma senha para a equipe acessar o painel público.</p>' +
        '<input id="swal-pass" type="password" class="swal2-input" placeholder="Senha (mín. 4 dígitos)">',
      showCancelButton: true,
      confirmButtonText: "Gerar",
      cancelButtonText: "Cancelar",
      preConfirm: () => {
        const input = document.getElementById("swal-pass") as HTMLInputElement | null;
        const pass = input?.value.trim();
        if (!pass || pass.length < 4) {
          Swal.showValidationMessage("Informe uma senha com pelo menos 4 dígitos.");
          return;
        }
        return pass;
      }
    });
    if (!result.isConfirmed || !result.value) return;

    try {
      const password = result.value as string;
      const res = await fetch(`/api/teams/${team._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generateLink", password })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível gerar o link.", "error");
        return;
      }
      const link = data?.data?.link;
      const pwd = data?.data?.password;
      const updatedTeam = data?.data?.team;
      if (updatedTeam?._id) {
        setTeams((prev) => prev.map((t) => (t._id === updatedTeam._id ? updatedTeam : t)));
      }
      if (link && pwd) {
        Swal.fire({
          title: "Link de operação gerado",
          html: `
            <div class="text-left text-sm">
              <div><strong>Equipe:</strong> ${team.name}</div>
              <div class="mt-2"><strong>Link:</strong> <a href="${link}" target="_blank" class="text-emerald-400">${link}</a></div>
              <div class="mt-1"><strong>Senha:</strong> <span class="text-white font-semibold">${pwd}</span></div>
              <div class="mt-2 text-slate-300 text-xs">Compartilhe o link e a senha com a equipe. Um novo link substitui o anterior.</div>
            </div>
          `,
          icon: "success"
        });
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao gerar link.", "error");
    }
  };

  const handleCopyLink = (team: any) => {
    if (!team.operationToken) {
      Swal.fire("Atenção", "Gere o link primeiro.", "warning");
      return;
    }
    const base = typeof window !== "undefined" ? window.location.origin : "";
    const link = `${base}/operations/${team.operationToken}`;
    copyToClipboard(link, "Link copiado.");
  };

  const handleCopyPass = (team: any) => {
    if (!team.operationPass) {
      Swal.fire("Atenção", "Gere o link primeiro.", "warning");
      return;
    }
    copyToClipboard(team.operationPass, "Senha copiada.");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-white">Equipes</h1>
          <p className="text-sm text-slate-300">
            Crie equipes, defina líder, status e membros. Todos os dados ficam salvos no banco.
          </p>
        </div>
        {mode === "list" ? (
          <div className="flex gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome ou líder"
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
            <button
              onClick={() => {
                resetForm();
                setEditingId(null);
                setMode("form");
              }}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500"
            >
              + Nova equipe
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
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Cancelar edição
              </button>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Nome da equipe</label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Equipe de Campo 01"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Líder / Responsável</label>
              <input
                value={form.leader}
                onChange={(e) => setForm((f) => ({ ...f, leader: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Nome do líder"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as TeamStatus }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Equipamento, região, turno..."
              />
            </div>
            <div className="space-y-2 text-sm md:col-span-2">
              <div className="flex items-center justify-between">
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
                    className="text-xs text-emerald-400 hover:text-emerald-300 transition"
                  >
                    {form.selectedEmployeeIds.length ===
                    employees.filter((e) => e.status === "ativo").length
                      ? "Desmarcar todos"
                      : "Selecionar todos"}
                  </button>
                )}
              </div>
              <div className="rounded-lg border border-white/10 bg-slate-900/60 p-4 max-h-[300px] overflow-y-auto">
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
                            className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition ${
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
                              className="h-4 w-4 rounded border-white/20 bg-slate-800 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : editingId ? "Salvar alterações" : "Criar equipe"}
            </button>
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div className="font-semibold text-white">Equipes cadastradas</div>
          <span className="text-xs text-slate-300">{filtered.length} registro(s)</span>
        </div>
        {filtered.length === 0 ? (
          <div className="px-6 py-4 text-slate-300">
            Nenhuma equipe cadastrada. Crie uma nova equipe no formulário acima.
          </div>
        ) : (
          <div className="overflow-x-auto">
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
                  const origin =
                    typeof window !== "undefined" ? window.location.origin : "";
                  const opLink = team.operationToken
                    ? `${origin}/operations/${team.operationToken}`
                    : null;
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
                            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                          >
                            Editar
                          </button>
                          <Link
                            href={`/teams/${team._id}/jobs`}
                            onClick={(e) => e.stopPropagation()}
                            className="rounded-md border border-emerald-400/50 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/80 hover:bg-emerald-500/20"
                          >
                            Serviços
                          </Link>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleGenerateLink(team);
                            }}
                            className="rounded-md border border-blue-400/50 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-100 transition hover:border-blue-300/80 hover:bg-blue-500/20"
                          >
                            Gerar link operação
                          </button>
                          {team.operationToken && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyLink(team);
                              }}
                              className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10"
                            >
                              Copiar link
                            </button>
                          )}
                          {team.operationPass && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopyPass(team);
                              }}
                              className="rounded-md border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/60 hover:bg-white/10"
                            >
                              Copiar senha
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(team);
                            }}
                            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/10"
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
        )}
      </div>

      {/* Modal de Detalhes da Equipe */}
      {viewingTeam && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setViewingTeam(null)}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-white">{viewingTeam.name}</h2>
                <p className="text-sm text-slate-300">Detalhes da equipe</p>
              </div>
              <button
                onClick={() => setViewingTeam(null)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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

              {viewingTeam.operationToken && (
                <div>
                  <label className="text-xs text-slate-400 mb-2 block">Link de Operação</label>
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-3">
                    <div className="text-sm text-blue-100 break-all">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/operations/${viewingTeam.operationToken}`
                        : ""}
                    </div>
                    {viewingTeam.operationPass && (
                      <div className="text-xs text-slate-300 mt-2">
                        Senha: <span className="font-semibold text-white">{viewingTeam.operationPass}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

