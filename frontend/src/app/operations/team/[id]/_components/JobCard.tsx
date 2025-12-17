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
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
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
          {job.services && job.services.length > 3 && (
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

      <div className="mt-auto flex flex-col sm:flex-row flex-wrap gap-2">
        {job.status === "pendente" && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onStart(job._id, job.title)}
            className="w-full sm:flex-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
          >
            Iniciar
          </button>
        )}
        {(job.status === "em_execucao" || (job.status !== "concluida" && job.startedAt)) && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onComplete(job._id)}
            className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
          >
            Concluir
          </button>
        )}
        {job.status === "concluida" && !job.received && !hasTransaction(job._id) && job.finalValue && job.finalValue > 0 && (
          <button
            type="button"
            disabled={updating === job._id}
            onClick={() => onReceive(job)}
            className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
          >
            {updating === job._id ? "Processando..." : "Receber"}
          </button>
        )}
        {(job.received || hasTransaction(job._id)) && (
          <div className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 text-center">
            ✓ Recebido
          </div>
        )}
        {job.status === "pendente" && job.site && (
          <button
            type="button"
            onClick={() => onNavigate(job)}
            className="w-full sm:flex-1 rounded-md border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
          >
            Rota
          </button>
        )}
        <button
          type="button"
          onClick={() => onViewDetails(job)}
          className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
        >
          Ver detalhes
        </button>
      </div>
    </div>
  );
}

