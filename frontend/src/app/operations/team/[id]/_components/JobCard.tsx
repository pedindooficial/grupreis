"use client";

import { Job, Status } from "../types";
import { statusLabel } from "../utils";

interface JobCardProps {
  job: Job;
  onStart: (jobId: string, title: string) => void;
  onComplete: (jobId: string) => void;
  onReceive: (job: Job) => void;
  onNavigate: (job: Job) => void;
  onViewDetails: (job: Job) => void;
  updating: string | null;
  hasTransaction: (jobId: string) => boolean;
}

export default function JobCard({
  job,
  onStart,
  onComplete,
  onReceive,
  onNavigate,
  onViewDetails,
  updating,
  hasTransaction
}: JobCardProps) {
  const isJobDelayed = (): boolean => {
    if (!job.plannedDate || job.status === "concluida" || job.status === "cancelada") {
      return false;
    }
    try {
      const plannedDate = new Date(job.plannedDate);
      const now = new Date();
      return plannedDate < now;
    } catch {
      return false;
    }
  };

  const delayed = isJobDelayed();

  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl border p-2.5 sm:p-3 shadow-inner shadow-black/30 ${
      delayed
        ? "border-red-400/50 bg-red-500/10"
        : "border-white/10 bg-white/5"
    }`}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="text-[9px] sm:text-[10px] uppercase tracking-wide text-emerald-200">
              {statusLabel(job.status as Status)}
            </div>
            {delayed && (
              <div className="rounded-full border border-red-400/50 bg-red-500/20 px-1.5 py-0.5 text-[8px] sm:text-[9px] font-semibold text-red-200 flex items-center gap-0.5">
                <span>⚠️</span>
                <span>Atrasado</span>
              </div>
            )}
          </div>
          <div className="text-sm sm:text-base font-semibold text-white leading-tight break-words">{job.title}</div>
          <div className="text-[10px] sm:text-[11px] text-slate-300 break-words">
            {job.plannedDate || "sem data"} · {job.site || "Endereço não informado"}
          </div>
          {delayed && job.plannedDate && (
            <div className="text-[9px] sm:text-[10px] text-red-300 mt-0.5 font-medium break-words">
              ⏰ Planejado: {new Date(job.plannedDate).toLocaleString("pt-BR", { 
                day: "2-digit", 
                month: "2-digit", 
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
              })}
            </div>
          )}
          <div className="text-[9px] sm:text-[10px] text-slate-400 break-words">
            Cliente: {job.clientName || "—"}
          </div>
        </div>
        <div className="rounded-full bg-white/10 px-1.5 sm:px-2 py-0.5 text-[9px] sm:text-[10px] font-semibold text-white flex-shrink-0">
          OS
        </div>
      </div>

      <div className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 text-[10px] sm:text-xs text-slate-200">
        <div className="font-semibold text-white text-[10px] sm:text-xs">
          Serviços ({job.services?.length || 0})
        </div>
        <ul className="mt-1 space-y-1.5 text-[10px] text-slate-300">
          {(job.services || []).slice(0, 2).map((s: any, idx: number) => {
            const diametro = s.stakeDiameter || s.diametro;
            const profundidade = s.stakeDepth || s.profundidade;
            const quantidade = s.stakeQuantity || s.quantidade;
            const hasMeasurements = diametro || profundidade || quantidade;
            
            return (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="mt-[4px] h-1 w-1 rounded-full bg-emerald-300/70 flex-shrink-0" />
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="text-white text-[10px] break-words">
                    {s.serviceType || s.service || "Serviço"}
                  </div>
                  {hasMeasurements && (
                    <div className="mt-1 px-2 py-1 rounded border border-emerald-400/40 bg-emerald-500/10">
                      <div className="flex items-center gap-2 text-[9px] font-semibold text-emerald-200">
                        {diametro && <span>Ø{diametro.toString()}cm</span>}
                        {profundidade && <span>{profundidade.toString()}m</span>}
                        {quantidade && <span>{quantidade.toString()} un</span>}
                      </div>
                    </div>
                  )}
                  <div className="text-[9px] text-slate-400 break-words">
                    {s.siteType || s.localType || "—"} · {s.soilType || "—"} · {s.access || "—"}
                  </div>
                </div>
              </li>
            );
          })}
          {job.services && job.services.length > 2 && (
            <li className="text-[9px] text-slate-400 pl-3.5">
              +{job.services.length - 2} mais
            </li>
          )}
        </ul>
      </div>

      <div className="flex flex-wrap gap-1.5 text-[9px] sm:text-[10px] text-slate-200">
        {job.startedAt && (
          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 break-words">
            Início: {new Date(job.startedAt).toLocaleDateString("pt-BR")} {new Date(job.startedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {job.finishedAt && (
          <span className="rounded-full border border-white/10 bg-white/5 px-1.5 py-0.5 break-words">
            Término: {new Date(job.finishedAt).toLocaleDateString("pt-BR")} {new Date(job.finishedAt).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-col gap-1.5">
        {job.status === "pendente" && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onStart(job._id, job.title)}
            className="w-full rounded-md border border-blue-400/40 bg-blue-500/10 px-2 py-2 text-[11px] font-semibold text-blue-100 transition active:border-blue-300/60 active:bg-blue-500/20 disabled:opacity-60 touch-manipulation min-h-[38px]"
          >
            Iniciar
          </button>
        )}
        {(job.status === "em_execucao" || (job.status !== "concluida" && job.startedAt)) && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onComplete(job._id)}
            className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-2 text-[11px] font-semibold text-emerald-100 transition active:border-emerald-300/60 active:bg-emerald-500/20 disabled:opacity-60 touch-manipulation min-h-[38px]"
          >
            Concluir
          </button>
        )}
        {job.status === "concluida" && !job.received && !hasTransaction(job._id) && job.finalValue && job.finalValue > 0 && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onReceive(job)}
            className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-2 text-[11px] font-semibold text-emerald-100 transition active:border-emerald-300/60 active:bg-emerald-500/20 disabled:opacity-60 touch-manipulation min-h-[38px]"
          >
            {updating === job._id ? "Processando..." : "Receber"}
          </button>
        )}
        {(job.received || hasTransaction(job._id)) && (
          <div className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-2 py-2 text-[11px] font-semibold text-emerald-100 text-center min-h-[38px] flex items-center justify-center">
            ✓ Recebido
          </div>
        )}
        <div className="grid grid-cols-2 gap-1.5">
          {job.status === "pendente" && job.site && (
            <button
              type="button"
              onClick={() => onNavigate(job)}
              className="w-full rounded-md border border-purple-400/40 bg-purple-500/10 px-2 py-2 text-[11px] font-semibold text-purple-100 transition active:border-purple-300/60 active:bg-purple-500/20 touch-manipulation min-h-[38px]"
            >
              Rota
            </button>
          )}
          <button
            type="button"
            onClick={() => onViewDetails(job)}
            className={`rounded-md border border-white/15 bg-white/5 px-2 py-2 text-[11px] font-semibold text-slate-100 transition active:border-emerald-300/40 active:bg-white/10 touch-manipulation min-h-[38px] ${job.status === "pendente" && job.site ? "w-full" : "w-full col-span-2"}`}
          >
            Detalhes
          </button>
        </div>
      </div>
    </div>
  );
}

