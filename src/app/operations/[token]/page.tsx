"use client";

import "@/app/globals.css";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import RouteMap from "./_components/RouteMap";

type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";
type ViewTab = "disponiveis" | "execucao" | "concluidas";
type MainView = "home" | "ops";

const ICONS = {
  pin: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  clock: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  home: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 11 9-8 9 8" />
      <path d="M4 10v10h5v-6h6v6h5V10" />
    </svg>
  ),
  ops: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  ),
  exit: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4v18h-4" />
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
    </svg>
  )
};

export default function OperationPublicPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true); // Inicia como true para verificar autenticação
  const [data, setData] = useState<{ team: any; jobs: any[] } | null>(null);
  const [tab, setTab] = useState<ViewTab>("disponiveis");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [view, setView] = useState<MainView>("ops");
  const [checkingAuth, setCheckingAuth] = useState(true); // Flag para verificar se está checando autenticação
  const [showRoute, setShowRoute] = useState(false);
  const [routeJobId, setRouteJobId] = useState<string | null>(null); // ID do job para mostrar rota
  const [headquartersAddress, setHeadquartersAddress] = useState<string>("");
  const storageKey = `ops-auth-${token}`;

  const authWithPassword = async (pass: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    if (!pass.trim()) {
      if (!silent) Swal.fire("Atenção", "Informe a senha de acesso.", "warning");
      setCheckingAuth(false);
      setAuthLoading(false);
      return;
    }
    try {
      setAuthLoading(true);
      const res = await fetch(`/api/operations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        localStorage.removeItem(storageKey);
        setCheckingAuth(false);
        if (!silent) Swal.fire("Erro", json?.error || "Link ou senha inválidos.", "error");
        return;
      }
      setPassword(pass);
      setData(json.data);
      localStorage.setItem(storageKey, JSON.stringify({ pass }));
      setCheckingAuth(false);
      if (!silent) Swal.fire("Liberado", "Painel carregado.", "success");
    } catch (err) {
      console.error(err);
      setCheckingAuth(false);
      if (!silent) Swal.fire("Erro", "Falha ao autenticar.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async () => {
    await authWithPassword(password);
  };

  const assignedJobs = useMemo(() => data?.jobs || [], [data]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    if (tab === "disponiveis") return assignedJobs.filter((j) => j.status === "pendente");
    if (tab === "execucao") return assignedJobs.filter((j) => j.status === "em_execucao");
    if (tab === "concluidas") return assignedJobs.filter((j) => j.status === "concluida");
    return assignedJobs;
  }, [assignedJobs, tab, data]);

  const statusLabel = (s: Status) => {
    if (s === "pendente") return "Pendente";
    if (s === "em_execucao") return "Em execução";
    if (s === "concluida") return "Concluída";
    return "Cancelada";
  };

  const handleStartJob = async (jobId: string, jobTitle: string) => {
    const result = await Swal.fire({
      title: "Confirmar Início",
      html: `
        <div class="text-left">
          <p class="mb-3 text-slate-300">Deseja realmente iniciar este serviço?</p>
          <div class="bg-slate-800/50 rounded-lg p-3 mb-3">
            <p class="text-sm font-semibold text-white mb-1">${jobTitle}</p>
            <p class="text-xs text-slate-400">Ao confirmar, o serviço será marcado como "Em execução" e o horário de início será registrado.</p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, iniciar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "bg-slate-800 border border-slate-700",
        title: "text-white",
        htmlContainer: "text-slate-300",
        confirmButton: "bg-blue-500 hover:bg-blue-600",
        cancelButton: "bg-slate-600 hover:bg-slate-700"
      }
    });

    if (result.isConfirmed) {
      await updateJobStatus(jobId, "em_execucao");
    }
  };

  const updateJobStatus = async (jobId: string, status: Status) => {
    if (!data) return;
    try {
      setUpdating(jobId);
      const payload: any = { token, password, status };
      const now = new Date().toISOString();
      if (status === "em_execucao") payload.startedAt = now;
      if (status === "concluida") payload.finishedAt = now;
      const res = await fetch(`/api/operations/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", json?.error || "Não foi possível atualizar.", "error");
        return;
      }
      setData((prev) =>
        prev
          ? { ...prev, jobs: prev.jobs.map((j: any) => (j._id === jobId ? json.data : j)) }
          : prev
      );
      if (selectedJob?._id === jobId) setSelectedJob(json.data);
      Swal.fire("Sucesso", "Status atualizado.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    setData(null);
    setPassword("");
    setSelectedJob(null);
    setView("ops");
  };

  useEffect(() => {
    setData(null);
    setSelectedJob(null);
    setPassword("");
    setCheckingAuth(true);
    setAuthLoading(true);
    // tenta reabrir com senha armazenada
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.pass) {
          authWithPassword(parsed.pass, { silent: true });
          return; // Não mostra tela de login se tem senha armazenada
        }
      }
    } catch (err) {
      console.error(err);
    }
    // Se não tem senha armazenada, mostra tela de login
    setCheckingAuth(false);
    setAuthLoading(false);
  }, [token]);

  useEffect(() => {
    // Carregar endereço da sede quando o componente montar
    const loadHeadquarters = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.data?.headquartersAddress) {
          setHeadquartersAddress(data.data.headquartersAddress);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadHeadquarters();
  }, []);

  // Mostra loading enquanto verifica autenticação
  if (checkingAuth || authLoading) {
    return (
      <div
        className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-40 -top-40 h-72 w-72 rounded-full bg-emerald-500/20 blur-[110px]" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-blue-500/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto flex max-w-lg flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <Image
                src="/logoreis.png"
                alt="Reis Fundações"
                width={42}
                height={42}
                className="rounded-lg object-contain"
                priority
              />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                Painel da equipe
              </div>
              <div className="text-2xl font-semibold text-white">Acessar operação</div>
              <p className="text-sm text-slate-300">
                Digite a senha fornecida pelo administrador para abrir as ordens de serviço desta equipe.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/40">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Senha de acesso
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Informe a senha"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-emerald-300/50 hover:text-white"
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-blue-600 disabled:opacity-60"
            >
              {authLoading ? "Verificando..." : "Entrar"}
            </button>
            <div className="text-[11px] text-slate-400">
              O link permanece válido até que um novo link seja gerado pelo administrador. Não compartilhe com terceiros.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(16,185,129,0.08), transparent 35%), radial-gradient(circle at 85% 15%, rgba(59,130,246,0.08), transparent 30%), #020617"
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wide text-emerald-200">Equipe</div>
          <div className="text-2xl font-semibold text-white">{data.team?.name}</div>
          <div className="text-sm text-slate-300">
            Painel público protegido. Atualize início e conclusão das OS atribuídas.
          </div>
        </div>

        {view === "home" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Disponíveis", value: assignedJobs.filter((j) => j.status === "pendente").length },
              { label: "Em execução", value: assignedJobs.filter((j) => j.status === "em_execucao").length },
              { label: "Concluídos", value: assignedJobs.filter((j) => j.status === "concluida").length }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
              >
                <div className="text-xs uppercase tracking-wide text-slate-300">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {([
              { key: "disponiveis", label: "Disponíveis", desc: "Prontos para iniciar", icon: ICONS.pin },
              { key: "execucao", label: "Em execução", desc: "Andamento em campo", icon: ICONS.clock },
              { key: "concluidas", label: "Concluídos", desc: "Finalizados", icon: ICONS.check }
            ] as { key: ViewTab; label: string; desc: string; icon: JSX.Element }[]).map((item) => {
              const count =
                item.key === "disponiveis"
                  ? assignedJobs.filter((j) => j.status === "pendente").length
                  : item.key === "execucao"
                  ? assignedJobs.filter((j) => j.status === "em_execucao").length
                  : assignedJobs.filter((j) => j.status === "concluida").length;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    tab === item.key
                      ? "border-emerald-400/50 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-emerald-300/30 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xl text-emerald-200">{item.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-slate-300">{item.desc}</div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-inner shadow-black/30">
            Nenhum serviço nesta aba.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 pb-20 sm:pb-0">
            {filteredJobs.map((job) => (
              <div
                key={job._id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-200">
                      {statusLabel(job.status as Status)}
                    </div>
                    <div className="text-lg font-semibold text-white leading-tight">{job.title}</div>
                    <div className="text-xs text-slate-300">
                      {job.plannedDate || "sem data"} · {job.site || "Endereço não informado"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Cliente: {job.clientName || "—"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                    OS
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  <div className="font-semibold text-white">
                    Serviços ({job.services?.length || 0})
                  </div>
                  <ul className="mt-1 space-y-1 text-[11px] text-slate-300">
                    {(job.services || []).slice(0, 3).map((s: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                        <div className="space-y-0.5">
                          <div className="text-white">
                            {s.serviceType || s.service || "Serviço"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Local: {s.siteType || s.localType || "—"} · Solo: {s.soilType || "—"} ·
                            Acesso: {s.access || "—"}
                          </div>
                        </div>
                      </li>
                    ))}
                    {job.services?.length > 3 && (
                      <li className="text-[11px] text-slate-400">
                        +{job.services.length - 3} mais
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Início: {job.startedAt ? new Date(job.startedAt).toLocaleString("pt-BR") : "—"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Término:{" "}
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleString("pt-BR") : "—"}
                  </span>
                </div>

                <div className="mt-auto flex flex-col sm:flex-row flex-wrap gap-2">
                  {job.status === "pendente" && (
                    <button
                      type="button"
                      disabled={updating === job._id}
                      onClick={() => handleStartJob(job._id, job.title)}
                      className="w-full sm:flex-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                    >
                      Iniciar
                    </button>
                  )}
                  {(job.status === "em_execucao" || (job.status !== "concluida" && job.startedAt)) && (
                    <button
                      type="button"
                      disabled={updating === job._id}
                      onClick={() => updateJobStatus(job._id, "concluida")}
                      className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      Concluir
                    </button>
                  )}
                  {job.status === "pendente" && job.site && headquartersAddress && (
                    <button
                      type="button"
                      onClick={() => setRouteJobId(job._id)}
                      className="w-full sm:flex-1 rounded-md border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                    >
                      Rota
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:px-4 py-4 pb-20 sm:pb-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[85vh] sm:max-h-[95vh] rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 shadow-2xl overflow-y-auto my-auto">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">
                    {statusLabel(selectedJob.status as Status)}
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-white break-words">{selectedJob.title}</div>
                  <div className="text-xs sm:text-sm text-slate-300 break-words">
                    {selectedJob.clientName || "Cliente não informado"} ·{" "}
                    {selectedJob.site || "Endereço não informado"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Data agendada: {selectedJob.plannedDate || "—"}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white shrink-0"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Horários</div>
                  <div className="mt-2 space-y-1 text-xs sm:text-sm">
                    <div>
                      Início:{" "}
                      {selectedJob.startedAt
                        ? new Date(selectedJob.startedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                    <div>
                      Término:{" "}
                      {selectedJob.finishedAt
                        ? new Date(selectedJob.finishedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Equipe</div>
                  <div className="mt-2 text-xs sm:text-sm">{selectedJob.team || data.team?.name}</div>
                  <div className="text-xs text-slate-400">OS #{selectedJob._id}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Observações</div>
                  <div className="mt-2 text-xs sm:text-sm break-words">{selectedJob.notes || "Sem observações."}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs sm:text-sm font-semibold text-white">
                  Serviços ({selectedJob.services?.length || 0})
                </div>
                <div className="mt-2 grid gap-2 grid-cols-1 md:grid-cols-2">
                  {(selectedJob.services || []).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"
                    >
                      <div className="font-semibold text-white">
                        {s.serviceType || s.service || "Serviço"}
                      </div>
                      <div className="text-xs text-slate-400">
                        Local: {s.siteType || s.localType || "—"} · Solo: {s.soilType || "—"} ·
                        Acesso: {s.access || "—"}
                      </div>
                      {s.categories && s.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-emerald-200">
                          {s.categories.map((c: string) => (
                            <span key={c} className="rounded-full bg-emerald-500/10 px-2 py-1">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      {(s.stakeDiameter || s.diametro) && (
                        <div className="mt-1 text-xs text-slate-300">
                          Estacas: Ø{(s.stakeDiameter || s.diametro || "").toString()}cm ·{" "}
                          {(s.stakeDepth || s.profundidade || "").toString()}m ·{" "}
                          {(s.stakeQuantity || s.quantidade || "").toString()} un
                        </div>
                      )}
                      {(s.sptInfo || s.sptFileName) && (
                        <div className="mt-1 text-xs text-slate-300">
                          SPT/Diagnóstico: {s.sptInfo || s.sptFileName}
                        </div>
                      )}
                      {s.observacoes && (
                        <div className="mt-1 text-xs text-slate-300">Obs.: {s.observacoes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {showRoute && selectedJob.site && headquartersAddress && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs sm:text-sm font-semibold text-white">Rota da Sede até o Local</div>
                    <button
                      type="button"
                      onClick={() => setShowRoute(false)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white"
                    >
                      Fechar mapa
                    </button>
                  </div>
                  <div className="w-full h-64 rounded-lg overflow-hidden bg-slate-800">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyAUoyCSevBWa4CkeDcBuYd-R0mbR2NtpIs&origin=${encodeURIComponent(headquartersAddress)}&destination=${encodeURIComponent(selectedJob.site)}&mode=driving`}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                {selectedJob.status === "pendente" && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => handleStartJob(selectedJob._id, selectedJob.title)}
                    className="w-full sm:w-auto rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    Iniciar serviço
                  </button>
                )}
                {(selectedJob.status === "em_execucao" || (selectedJob.status !== "concluida" && selectedJob.startedAt)) && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => updateJobStatus(selectedJob._id, "concluida")}
                    className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Concluir serviço
                  </button>
                )}
                {selectedJob.site && headquartersAddress && (
                  <button
                    type="button"
                    onClick={() => setShowRoute(!showRoute)}
                    className="w-full sm:w-auto rounded-md border border-purple-400/40 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                  >
                    {showRoute ? "Ocultar Rota" : "Ver Rota"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    setShowRoute(false);
                  }}
                  className="w-full sm:w-auto rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Rota - Focado em Mobile */}
        {routeJobId && headquartersAddress && (() => {
          const jobForRoute = filteredJobs.find((j) => j._id === routeJobId);
          if (!jobForRoute || !jobForRoute.site) return null;
          
          return (
            <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">Rota de Navegação</div>
                  <div className="text-sm font-semibold text-white truncate">{jobForRoute.title}</div>
                  <div className="text-xs text-slate-400 truncate">{jobForRoute.site}</div>
                </div>
                <button
                  onClick={() => setRouteJobId(null)}
                  className="ml-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white shrink-0"
                >
                  Fechar
                </button>
              </div>

              {/* Mapa de Rota - Usando Google Maps JavaScript API */}
              <div className="flex-1 relative min-h-0 overflow-hidden">
                <RouteMap
                  origin={headquartersAddress}
                  destination={jobForRoute.site}
                  jobTitle={jobForRoute.title}
                />
              </div>

              {/* Footer com informações */}
              <div className="border-t border-white/10 bg-slate-900 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400 mb-1">Origem</div>
                    <div className="text-white font-medium truncate">{headquartersAddress}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Destino</div>
                    <div className="text-white font-medium truncate">{jobForRoute.site}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {data && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
            <button
              onClick={() => setView("home")}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 ${
                view === "home" ? "text-white" : "text-slate-300"
              }`}
            >
              <span className="text-base text-emerald-200">{ICONS.home}</span>
              <span className="text-[11px] font-semibold">Início</span>
            </button>
            <button
              onClick={() => setView("ops")}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 ${
                view === "ops" ? "text-white" : "text-slate-300"
              }`}
            >
              <span className="text-base text-emerald-200">{ICONS.ops}</span>
              <span className="text-[11px] font-semibold">Operação</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-red-200 hover:text-red-100"
            >
              <span className="text-base">{ICONS.exit}</span>
              <span className="text-[11px] font-semibold">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


