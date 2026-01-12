import React from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import { Status, STATUS_LABEL } from "../constants";
import { formatDateTime } from "../utils";
import JobFeedback from "./JobFeedback";

interface JobDetailProps {
  job: any;
  hasTransactionForJob: (jobId: string | undefined) => boolean;
  onEdit: () => void;
  onClose: () => void;
  onMarkAsReceived: () => void;
  onCancel: (reason: string) => Promise<void>;
  onDelete: () => Promise<void>;
  onUpdateJob: (updates: Partial<any>) => void;
}

export default function JobDetail({
  job: selected,
  hasTransactionForJob,
  onEdit,
  onClose,
  onMarkAsReceived,
  onCancel,
  onDelete,
  onUpdateJob
}: JobDetailProps) {
  const handleDownloadPDF = () => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    const pdfUrl = `${apiUrl}/jobs/${selected._id}/pdf`;
    window.open(pdfUrl, "_blank");
  };

  const handleCancel = async () => {
    const { value: formValues } = await Swal.fire({
      title: "Cancelar Serviço",
      html: `
        <div class="text-left">
          <p class="mb-4 text-slate-300">Tem certeza que deseja cancelar esta OS?</p>
          <label class="block text-sm text-slate-300 mb-2">Motivo do cancelamento:</label>
          <textarea 
            id="cancellationReason" 
            class="swal2-textarea bg-slate-800 text-white border-slate-600 rounded p-2 w-full" 
            placeholder="Digite o motivo do cancelamento..."
            rows="4"
          ></textarea>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, cancelar",
      cancelButtonText: "Não",
      focusConfirm: false,
      preConfirm: () => {
        const reason = (document.getElementById("cancellationReason") as HTMLTextAreaElement)?.value;
        if (!reason || reason.trim() === "") {
          Swal.showValidationMessage("Por favor, informe o motivo do cancelamento");
          return false;
        }
        return { reason: reason.trim() };
      },
      customClass: {
        popup: "bg-slate-800 border border-slate-700",
        title: "text-white",
        htmlContainer: "text-slate-300",
        confirmButton: "bg-red-500 hover:bg-red-600",
        cancelButton: "bg-slate-600 hover:bg-slate-700"
      }
    });

    if (formValues && formValues.reason) {
      await onCancel(formValues.reason);
    }
  };

  const handleDelete = async () => {
    const result = await Swal.fire({
      title: "Excluir OS Cancelada",
      html: `
        <div class="text-left">
          <p class="mb-4 text-slate-300">Tem certeza que deseja excluir permanentemente esta OS?</p>
          <p class="text-sm text-red-300">⚠️ Esta ação não pode ser desfeita!</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "bg-slate-800 border border-slate-700",
        title: "text-white",
        htmlContainer: "text-slate-300",
        confirmButton: "bg-red-500 hover:bg-red-600",
        cancelButton: "bg-slate-600 hover:bg-slate-700"
      }
    });

    if (result.isConfirmed) {
      await onDelete();
    }
  };

  const handleDownloadReceipt = async (receiptFileKey: string) => {
    try {
      const res = await apiFetch("/files/presigned-url", {
        method: "POST",
        body: JSON.stringify({ key: receiptFileKey })
      });
      const data = await res.json();
      if (res.ok && data?.data?.url) {
        window.open(data.data.url, "_blank");
      } else {
        Swal.fire("Erro", "Não foi possível baixar o comprovante", "error");
      }
    } catch (err) {
      console.error("Erro ao baixar comprovante:", err);
      Swal.fire("Erro", "Não foi possível baixar o comprovante", "error");
    }
  };

  // Calculate execution time display
  const totalMinutes = selected.estimatedDuration || 0;
  let timeText = null;
  let expectedEndTime = null;
  
  if (totalMinutes > 0) {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    timeText = hours > 0 
      ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
      : `${mins}min`;
    
    if (selected.plannedDate) {
      try {
        const startDate = new Date(selected.plannedDate);
        if (!isNaN(startDate.getTime())) {
          const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);
          expectedEndTime = endDate.toLocaleString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
          });
        }
      } catch (e) {
        // ignore
      }
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg font-semibold text-white break-words">{selected.title}</div>
          <div className="text-xs text-slate-300 mt-1">
            {STATUS_LABEL[selected.status as Status]}
          </div>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <button
            onClick={handleDownloadPDF}
            className="w-full sm:w-auto rounded-lg border border-blue-400/50 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30"
          >
            📄 Baixar PDF
          </button>
          {selected.status !== "cancelada" && (
            <button
              onClick={onEdit}
              className="w-full sm:w-auto rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/30"
            >
              ✏️ Editar
            </button>
          )}
          {selected.status === "concluida" && !hasTransactionForJob(selected._id) && selected.finalValue && selected.finalValue > 0 && (
            <button
              onClick={onMarkAsReceived}
              className="w-full sm:w-auto rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/30"
            >
              Receber
            </button>
          )}
          {hasTransactionForJob(selected._id) && (
            <div className="w-full sm:w-auto rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 text-center">
              ✓ Recebido
            </div>
          )}
          {selected.status !== "cancelada" && selected.status !== "concluida" && (
            <button
              onClick={handleCancel}
              className="w-full sm:w-auto rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/20"
            >
              Cancelar Serviço
            </button>
          )}
          {selected.status === "cancelada" && (
            <button
              onClick={handleDelete}
              className="w-full sm:w-auto rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/20"
            >
              🗑️ Excluir
            </button>
          )}
          <button
            onClick={onClose}
            className="w-full sm:w-auto rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
          >
            Fechar
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Serviço principal</div>
          <div className="text-white">
            {selected.services?.[0]?.service || "-"}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Cliente</div>
          <div className="text-white">
            {selected.clientName || selected.client || "-"}
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Obra</div>
          <div className="text-white">{selected.site || "-"}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Equipe</div>
          <div className="text-white">{selected.team || "-"}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Data</div>
          <div className="text-white">{formatDateTime(selected.plannedDate)}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
          <div className="text-[11px] uppercase text-slate-400">Valor Total</div>
          <div className="text-white font-semibold">
            {selected.finalValue !== undefined && selected.finalValue !== null
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(selected.finalValue)
              : selected.value
              ? new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(selected.value)
              : "-"}
          </div>
        </div>
        
        {/* Travel/Displacement Information */}
        {selected.travelDistanceKm && selected.travelDistanceKm > 0 && (
          <>
            {selected.selectedAddress && (
              <div className="sm:col-span-2 rounded-lg border border-blue-400/30 bg-blue-500/5 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-blue-300 flex items-center gap-1">
                  <span>📍</span>
                  Endereço Utilizado
                </div>
                <div className="text-blue-100 text-xs mt-0.5">{selected.selectedAddress}</div>
              </div>
            )}
            <div className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-blue-300 flex items-center gap-1">
                <span>🚗</span>
                Distância
              </div>
              <div className="text-blue-100 font-semibold">{selected.travelDistanceKm} km</div>
            </div>
            <div className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-blue-300">Deslocamento</div>
              <div className="text-blue-100 font-semibold">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(selected.travelPrice)}
              </div>
              <div className="text-[10px] text-blue-200/60 mt-0.5">
                {selected.travelDescription}
              </div>
            </div>
          </>
        )}
        
        {/* Execution Time Information */}
        {timeText && (
          <>
            <div className="rounded-lg border border-orange-400/50 bg-orange-500/10 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-orange-300 flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Tempo Estimado
              </div>
              <div className="text-orange-100 font-semibold">{timeText}</div>
              <div className="text-[10px] text-orange-200/70 mt-1">
                Duração total estimada
              </div>
            </div>
            
            {expectedEndTime && (
              <div className="rounded-lg border border-purple-400/50 bg-purple-500/10 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-purple-300 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Término Previsto
                </div>
                <div className="text-purple-100 font-semibold">{expectedEndTime}</div>
                <div className="text-[10px] text-purple-200/70 mt-1">
                  Data + tempo estimado
                </div>
              </div>
            )}
          </>
        )}
        {hasTransactionForJob(selected._id) && (
          <>
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-emerald-300">Status de Recebimento</div>
              <div className="text-emerald-300 font-semibold">✓ Recebido</div>
              {selected.receivedAt && (
                <div className="text-xs text-emerald-200/70 mt-1">
                  {new Date(selected.receivedAt).toLocaleString("pt-BR")}
                </div>
              )}
              <div className="text-xs text-emerald-200/70 mt-1">
                Transação registrada no caixa
              </div>
            </div>
            {selected.receipt && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-slate-400">Recibo/Comprovante</div>
                <div className="text-white">{selected.receipt}</div>
              </div>
            )}
            {selected.receiptFileKey && (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-blue-300 mb-2 flex items-center gap-1">
                  📎 Comprovante Anexado
                </div>
                <button
                  onClick={() => handleDownloadReceipt(selected.receiptFileKey)}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar Comprovante
                </button>
              </div>
            )}
          </>
        )}
        {selected.discountPercent && selected.discountPercent > 0 ? (
          <>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Desconto</div>
              <div className="text-red-300 font-semibold">
                {selected.discountPercent}% ({new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(selected.discountValue || 0)})
              </div>
            </div>
            <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-emerald-300">Valor Final</div>
              <div className="text-emerald-100 font-semibold text-lg">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(selected.finalValue || selected.value || 0)}
              </div>
            </div>
          </>
        ) : (
          <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
            <div className="text-[11px] uppercase text-emerald-300">Valor Final</div>
            <div className="text-emerald-100 font-semibold text-lg">
              {selected.value
                ? new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(selected.value)
                : "-"}
            </div>
          </div>
        )}
        <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
          <div className="text-[11px] uppercase text-slate-400">Observações gerais</div>
          <div className="text-white">{selected.notes || "-"}</div>
        </div>
        {selected.status === "cancelada" && selected.cancellationReason && (
          <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
            <div className="text-[11px] uppercase text-red-300">Motivo do Cancelamento</div>
            <div className="text-red-200 mt-1">{selected.cancellationReason}</div>
          </div>
        )}
      </div>

      <div className="mt-4 sm:mt-5 space-y-3">
        <div className="text-sm font-semibold text-white">
          Serviços detalhados ({(selected.services || []).length})
        </div>
        {(selected.services || []).map((srv: any, idx: number) => {
          const quantity = parseFloat(srv.quantidade) || 0;
          const depth = parseFloat(srv.profundidade) || 0;
          const totalMinutes = srv.executionTime ? srv.executionTime * quantity * depth : 0;
          const hours = Math.floor(totalMinutes / 60);
          const mins = Math.round(totalMinutes % 60);
          const serviceTimeText = hours > 0 
            ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
            : `${mins}min`;

          return (
            <div
              key={srv.id || idx}
              className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between text-xs text-slate-300 mb-3 pb-3 border-b border-white/10">
                <span>Serviço #{idx + 1}</span>
                <span>{srv.service || "-"}</span>
              </div>
              
              {(srv.value !== undefined && srv.value !== null) || (srv.finalValue !== undefined && srv.finalValue !== null) ? (
                <div className="mb-3 p-2 sm:p-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300">Valor Total</div>
                      <div className="text-emerald-100 font-semibold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(srv.value || 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-slate-400">Desconto</div>
                      <div className="text-slate-300 font-semibold">
                        {srv.discountPercent && srv.discountPercent > 0 ? `${srv.discountPercent}%` : "0%"}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-emerald-300">Valor Final</div>
                      <div className="text-emerald-100 font-semibold">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL"
                        }).format(srv.finalValue !== undefined && srv.finalValue !== null ? srv.finalValue : (srv.value || 0))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="mb-3 p-3 rounded-lg border border-slate-600/30 bg-slate-800/10">
                  <div className="text-xs text-slate-400 text-center">
                    Nenhum valor informado para este serviço
                  </div>
                </div>
              )}
              
              {srv.executionTime && srv.quantidade && srv.profundidade && (
                <div className="mb-3 p-2 sm:p-3 rounded-lg border border-orange-400/30 bg-orange-500/10">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-[10px] uppercase text-orange-300 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tempo/metro
                      </div>
                      <div className="text-orange-100 font-semibold">{srv.executionTime} min/m</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-orange-300 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tempo Total Estimado
                      </div>
                      <div className="text-orange-100 font-semibold text-base">{serviceTimeText}</div>
                      <div className="text-[9px] text-orange-200/70 mt-0.5">
                        {quantity} × {depth}m × {srv.executionTime} min/m
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2">
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Local</div>
                  <div className="text-white text-xs sm:text-sm">{srv.localType || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Solo</div>
                  <div className="text-white text-xs sm:text-sm">{srv.soilType || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Acesso</div>
                  <div className="text-white text-xs sm:text-sm break-words">{srv.access || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Diâmetro</div>
                  <div className="text-white text-xs sm:text-sm">{srv.diametro || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Profundidade</div>
                  <div className="text-white text-xs sm:text-sm">{srv.profundidade || "-"}</div>
                </div>
                <div>
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Quantidade</div>
                  <div className="text-white text-xs sm:text-sm">{srv.quantidade || "-"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Categorias</div>
                  <div className="text-white text-xs sm:text-sm break-words">
                    {srv.categories?.length ? srv.categories.join(", ") : "-"}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">SPT / Diagnóstico</div>
                  <div className="text-white text-xs sm:text-sm break-words">{srv.sptInfo || "-"}</div>
                </div>
                <div className="sm:col-span-2">
                  <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Observações do serviço</div>
                  <div className="text-white text-xs sm:text-sm break-words">{srv.observacoes || "-"}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Signature Section */}
      <div className="mt-4 sm:mt-5 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="text-sm font-semibold text-white mb-3">
          Assinatura do Cliente
        </div>
        {selected.clientSignature ? (
          <div className="space-y-3">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
              <div className="text-xs text-emerald-300 mb-2">✓ Assinatura coletada</div>
              <img
                src={selected.clientSignature}
                alt="Assinatura do cliente"
                className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
              />
              {selected.clientSignedAt && (
                <div className="text-xs text-emerald-200/70 mt-2 text-center">
                  Assinado em: {new Date(selected.clientSignedAt).toLocaleString("pt-BR")}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-lg border border-white/20 bg-slate-800/50 p-4 text-center">
            <div className="text-sm text-slate-400">
              Nenhuma assinatura coletada ainda.
            </div>
            <div className="text-xs text-slate-500 mt-1">
              A assinatura pode ser coletada na página de operações públicas.
            </div>
          </div>
        )}
      </div>

      {/* Client Feedback Section - Show if job is completed OR has feedback */}
      {(selected.status === "concluida" || selected.clientRating !== undefined) && (
        <div className="mt-4 sm:mt-5">
          <JobFeedback
            job={selected}
            isClientView={false}
            onFeedbackSubmitted={(updatedJob) => {
              onUpdateJob(updatedJob);
            }}
          />
        </div>
      )}
    </div>
  );
}

