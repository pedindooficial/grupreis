import React from "react";
import { Status, STATUS_LABEL, STATUS_COLORS } from "../constants";
import { formatDateTime } from "../utils";

interface JobsListProps {
  jobs: any[];
  loading: boolean;
  onJobClick: (job: any) => void;
  hasTransactionForJob: (jobId: string | undefined) => boolean;
  markAsReceived: (job: any, e?: React.MouseEvent) => void;
}

export default function JobsList({
  jobs,
  loading,
  onJobClick,
  hasTransactionForJob,
  markAsReceived
}: JobsListProps) {
  if (loading) {
    return (
      <div className="px-3 sm:px-6 py-6 text-center text-slate-300 text-sm">
        <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
        <p>Carregando ordens de serviço...</p>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="px-3 sm:px-6 py-4 text-slate-300 text-sm">
        Nenhuma ordem de serviço encontrada.
      </div>
    );
  }

  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase text-slate-300">
            <tr>
              <th className="px-4 py-3">Título</th>
              <th className="px-4 py-3">Serviços</th>
              <th className="px-4 py-3">Cliente</th>
              <th className="px-4 py-3">Obra</th>
              <th className="px-4 py-3">Equipe</th>
              <th className="px-4 py-3">Data</th>
              <th className="px-4 py-3">Valor</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((job) => (
              <tr
                key={job._id}
                className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                onClick={() => onJobClick(job)}
              >
                <td className="px-4 py-3 text-white">{job.title}</td>
                <td className="px-4 py-3 text-slate-200">
                  {job.services?.length
                    ? job.services.map((s: any) => s.service).filter(Boolean).join(", ")
                    : "-"}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {job.clientName || job.client || "-"}
                </td>
                <td className="px-4 py-3 text-slate-200">{job.site || "-"}</td>
                <td className="px-4 py-3 text-slate-200">{job.team || "-"}</td>
                <td className="px-4 py-3 text-slate-200">
                  {formatDateTime(job.plannedDate)}
                </td>
                <td className="px-4 py-3 text-slate-200">
                  {job.finalValue !== undefined && job.finalValue !== null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(job.finalValue)
                    : job.value !== undefined && job.value !== null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(job.value)
                    : "-"}
                  {job.discountPercent && job.discountPercent > 0 && (
                    <div className="text-xs text-emerald-300">
                      -{job.discountPercent}%
                    </div>
                  )}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap text-center ${
                      STATUS_COLORS[job.status as Status] || "bg-white/5 text-white border-white/10"
                    }`}>
                      {STATUS_LABEL[job.status as Status] || "-"}
                    </span>
                    {job.status === "concluida" && !hasTransactionForJob(job._id) && job.finalValue && job.finalValue > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          markAsReceived(job, e);
                        }}
                        className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 whitespace-nowrap hover:bg-emerald-500/30 transition"
                      >
                        Receber
                      </button>
                    )}
                    {hasTransactionForJob(job._id) && (
                      <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                        ✓ Recebido
                      </span>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden space-y-3 p-3">
        {jobs.map((job) => (
          <div
            key={job._id}
            onClick={() => onJobClick(job)}
            className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 cursor-pointer active:bg-white/10 transition"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white truncate">{job.title}</div>
                <div className="text-xs text-slate-400 mt-1">
                  {formatDateTime(job.plannedDate) || "Sem data"}
                </div>
              </div>
              <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                STATUS_COLORS[job.status as Status] || "bg-white/5 text-white border-white/10"
              }`}>
                {STATUS_LABEL[job.status as Status] || "-"}
              </span>
            </div>
            
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <span className="text-slate-400 shrink-0">Cliente:</span>
                <span className="text-slate-200 flex-1">{job.clientName || job.client || "-"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 shrink-0">Obra:</span>
                <span className="text-slate-200 flex-1 line-clamp-2">{job.site || "-"}</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-slate-400 shrink-0">Equipe:</span>
                <span className="text-slate-200 flex-1">{job.team || "-"}</span>
              </div>
              {job.services?.length > 0 && (
                <div className="flex items-start gap-2">
                  <span className="text-slate-400 shrink-0">Serviços:</span>
                  <span className="text-slate-200 flex-1 line-clamp-2">
                    {job.services.map((s: any) => s.service).filter(Boolean).slice(0, 2).join(", ")}
                    {job.services.length > 2 && ` +${job.services.length - 2} mais`}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between pt-2 border-t border-white/10">
                <span className="text-slate-400">Valor:</span>
                <div className="text-right">
                  <div className="text-emerald-300 font-semibold">
                    {job.finalValue !== undefined && job.finalValue !== null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(job.finalValue)
                      : job.value !== undefined && job.value !== null
                      ? new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(job.value)
                      : "-"}
                  </div>
                  {job.discountPercent && job.discountPercent > 0 && (
                    <div className="text-[10px] text-emerald-300">
                      -{job.discountPercent}%
                    </div>
                  )}
                </div>
              </div>
              {job.status === "concluida" && (
                <div className="pt-2 border-t border-white/10">
                  {!hasTransactionForJob(job._id) && job.finalValue && job.finalValue > 0 ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        markAsReceived(job);
                      }}
                      className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                    >
                      Receber
                    </button>
                  ) : hasTransactionForJob(job._id) ? (
                    <div className="text-center text-xs text-emerald-300 font-semibold">
                      ✓ Recebido
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

