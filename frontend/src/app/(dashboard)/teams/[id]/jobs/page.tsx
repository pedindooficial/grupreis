"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";
type ViewTab = "disponiveis" | "execucao" | "concluidas";

export default function TeamJobsPage({ params }: { params: { id: string } }) {
  const teamId = params.id;
  const [team, setTeam] = useState<any>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [tab, setTab] = useState<ViewTab>("disponiveis");
  const [selectedJob, setSelectedJob] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [teamRes, jobsRes] = await Promise.all([
          apiFetch(`/teams`, { cache: "no-store" }),
          apiFetch(`/jobs`, { cache: "no-store" })
        ]);
        const teamData = await teamRes.json().catch(() => null);
        const jobsData = await jobsRes.json().catch(() => null);
        if (teamRes.ok && Array.isArray(teamData?.data)) {
          const t = teamData.data.find((x: any) => x._id === teamId);
          setTeam(t || null);
        }
        if (jobsRes.ok && Array.isArray(jobsData?.data)) {
          setJobs(jobsData.data);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [teamId]);

  const assignedJobs = useMemo(() => {
    if (!team) return [];
    return jobs.filter((j) => (j.team || "").toLowerCase() === (team.name || "").toLowerCase());
  }, [jobs, team]);

  const filteredJobs = useMemo(() => {
    if (tab === "disponiveis") return assignedJobs.filter((j) => j.status === "pendente");
    if (tab === "execucao") return assignedJobs.filter((j) => j.status === "em_execucao");
    if (tab === "concluidas") return assignedJobs.filter((j) => j.status === "concluida");
    return assignedJobs;
  }, [assignedJobs, tab]);

  const updateJobStatus = async (jobId: string, status: Status) => {
    try {
      setUpdating(jobId);
      const payload: any = { status };
      const now = new Date().toISOString();
      if (status === "em_execucao") payload.startedAt = payload.startedAt || now;
      if (status === "concluida") payload.finishedAt = payload.finishedAt || now;
      const res = await apiFetch(`/jobs/${jobId}`, {
        method: "PATCH",
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar a OS.", "error");
        return;
      }
      setJobs((prev) => prev.map((j) => (j._id === jobId ? data.data : j)));
      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob(data.data);
      }
      Swal.fire("Sucesso", "OS atualizada.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar OS.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const statusLabel = (s: Status) => {
    if (s === "pendente") return "Pendente";
    if (s === "em_execucao") return "Em execução";
    if (s === "concluida") return "Concluída";
    return "Cancelada";
  };

  if (loading) {
    return <div className="text-slate-200">Carregando...</div>;
  }

  if (!team) {
    return (
      <div className="space-y-4 text-slate-200">
        <div className="text-xl font-semibold">Equipe não encontrada</div>
        <Link href="/teams" className="text-emerald-300 underline">
          Voltar para equipes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-wide text-emerald-200">Equipe</div>
          <h1 className="text-2xl font-semibold text-white">{team.name}</h1>
          <div className="text-sm text-slate-300">
            Área de operação mobile-friendly: veja serviços disponíveis, em execução e concluídos.
          </div>
        </div>
        <Link
          href="/teams"
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
        >
          Voltar
        </Link>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {([
          { key: "disponiveis", label: "Disponíveis", desc: "Prontos para iniciar", icon: "📍" },
          { key: "execucao", label: "Em execução", desc: "Andamento em campo", icon: "⏱️" },
          { key: "concluidas", label: "Concluídos", desc: "Finalizados", icon: "✅" }
        ] as { key: ViewTab; label: string; desc: string; icon: string }[]).map((item) => {
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
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                tab === item.key
                  ? "border-emerald-400/50 bg-emerald-500/10"
                  : "border-white/10 bg-white/5 hover:border-emerald-300/30 hover:bg-white/10"
              }`}
            >
              <div className="text-xl">{item.icon}</div>
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

      {filteredJobs.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-sm text-slate-200 shadow-inner shadow-black/30">
          Nenhum serviço nesta aba.
        </div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <div
              key={job._id}
              className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-sm uppercase tracking-wide text-emerald-200">
                    {statusLabel(job.status)}
                  </div>
                  <div className="text-lg font-semibold text-white">{job.title}</div>
                  <div className="text-xs text-slate-300">
                    {job.plannedDate || "sem data"} · {job.site || "Endereço não informado"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Cliente: {job.clientName || "—"}
                  </div>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                  OS
                </div>
              </div>

              <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                <div className="font-semibold text-white">Serviços ({job.services?.length || 0})</div>
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
                  Término: {job.finishedAt ? new Date(job.finishedAt).toLocaleString("pt-BR") : "—"}
                </span>
              </div>

              <div className="mt-auto flex flex-wrap gap-2">
                {job.status === "pendente" && (
                  <button
                    type="button"
                    disabled={updating === job._id}
                    onClick={() => updateJobStatus(job._id, "em_execucao")}
                    className="flex-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    Iniciar
                  </button>
                )}
                {job.status !== "concluida" && (
                  <button
                    type="button"
                    disabled={updating === job._id}
                    onClick={() => updateJobStatus(job._id, "concluida")}
                    className="flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Concluir
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-4xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-emerald-200">
                  {statusLabel(selectedJob.status)}
                </div>
                <div className="text-xl font-semibold text-white">{selectedJob.title}</div>
                <div className="text-sm text-slate-300">
                  {selectedJob.clientName || "Cliente não informado"} ·{" "}
                  {selectedJob.site || "Endereço não informado"}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  Data agendada: {selectedJob.plannedDate || "—"}
                </div>
              </div>
              <button
                onClick={() => setSelectedJob(null)}
                className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <div className="text-xs uppercase text-slate-400">Horários</div>
                <div className="mt-2 space-y-1 text-sm">
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
                <div className="mt-2 text-sm">{selectedJob.team || team.name}</div>
                <div className="text-xs text-slate-400">OS #{selectedJob._id}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                <div className="text-xs uppercase text-slate-400">Observações</div>
                <div className="mt-2 text-sm">{selectedJob.notes || "Sem observações."}</div>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-sm font-semibold text-white">
                Serviços ({selectedJob.services?.length || 0})
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                {(selectedJob.services || []).map((s: any, idx: number) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"
                  >
                    <div className="font-semibold text-white">
                      {s.serviceType || s.service || "Serviço"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Local: {s.siteType || s.localType || "—"} · Solo: {s.soilType || "—"} · Acesso:{" "}
                      {s.access || "—"}
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

            <div className="mt-4 flex flex-wrap gap-2">
              {selectedJob.status === "pendente" && (
                <button
                  type="button"
                  disabled={updating === selectedJob._id}
                  onClick={() => updateJobStatus(selectedJob._id, "em_execucao")}
                  className="rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                >
                  Iniciar serviço
                </button>
              )}
              {selectedJob.status !== "concluida" && (
                <button
                  type="button"
                  disabled={updating === selectedJob._id}
                  onClick={() => updateJobStatus(selectedJob._id, "concluida")}
                  className="rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                >
                  Concluir serviço
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedJob(null)}
                className="rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


