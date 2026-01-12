import React, { useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

interface JobFeedbackProps {
  job: any;
  isClientView?: boolean; // If true, shows form to submit feedback. If false, only displays existing feedback
  onFeedbackSubmitted?: (job: any) => void;
}

export default function JobFeedback({ job, isClientView = false, onFeedbackSubmitted }: JobFeedbackProps) {
  const [rating, setRating] = useState<number | null>(job?.clientRating ?? null);
  const [feedback, setFeedback] = useState<string>(job?.clientFeedback || "");
  const [submitting, setSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editRating, setEditRating] = useState<number | null>(job?.clientRating ?? null);
  const [editFeedback, setEditFeedback] = useState<string>(job?.clientFeedback || "");
  const [editHoveredStar, setEditHoveredStar] = useState<number | null>(null);

  const hasFeedback = job?.clientRating !== undefined && job?.clientRating !== null && job?.clientRating >= 0;
  const canSubmitFeedback = isClientView && job?.status === "concluida" && !hasFeedback;
  const canEdit = !isClientView && hasFeedback; // Only admins can edit

  const handleSubmitFeedback = async () => {
    if (rating === null || rating < 0 || rating > 5) {
      Swal.fire("Atenção", "Por favor, selecione uma avaliação de 0 a 5 estrelas.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      const res = await apiFetch(`${apiUrl}/client-protected/jobs/${job._id}/feedback`, {
        method: "POST",
        body: JSON.stringify({
          rating,
          feedback: feedback.trim() || undefined
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(error.error || "Falha ao enviar feedback");
      }

      const data = await res.json();
      Swal.fire("Sucesso", "Feedback enviado com sucesso! Obrigado pela sua avaliação.", "success");
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(data.data.job);
      }
    } catch (error: any) {
      console.error("Error submitting feedback:", error);
      Swal.fire("Erro", error.message || "Falha ao enviar feedback. Tente novamente.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateFeedback = async () => {
    if (editRating === null || editRating < 0 || editRating > 5) {
      Swal.fire("Atenção", "Por favor, selecione uma avaliação de 0 a 5 estrelas.", "warning");
      return;
    }

    setSubmitting(true);
    try {
      const res = await apiFetch(`/jobs/${job._id}/feedback`, {
        method: "PUT",
        body: JSON.stringify({
          rating: editRating,
          feedback: editFeedback.trim() || ""
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(error.error || "Falha ao atualizar feedback");
      }

      const data = await res.json();
      Swal.fire("Sucesso", "Feedback atualizado com sucesso!", "success");
      setEditing(false);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(data.data.job);
      }
    } catch (error: any) {
      console.error("Error updating feedback:", error);
      Swal.fire("Erro", error.message || "Falha ao atualizar feedback. Tente novamente.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClearFeedback = async () => {
    const result = await Swal.fire({
      title: "Remover Feedback?",
      text: "Tem certeza que deseja remover este feedback? Esta ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    setSubmitting(true);
    try {
      const res = await apiFetch(`/jobs/${job._id}/feedback`, {
        method: "PUT",
        body: JSON.stringify({
          clearFeedback: true
        })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(error.error || "Falha ao remover feedback");
      }

      const data = await res.json();
      Swal.fire("Sucesso", "Feedback removido com sucesso!", "success");
      setEditing(false);
      
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted(data.data.job);
      }
    } catch (error: any) {
      console.error("Error clearing feedback:", error);
      Swal.fire("Erro", error.message || "Falha ao remover feedback. Tente novamente.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (displayRating: number | null, interactive: boolean = false, isEditMode: boolean = false) => {
    const stars = [];
    const value = displayRating ?? 0;
    
    for (let i = 1; i <= 5; i++) {
      const isFilled = i <= value;
      stars.push(
        <span
          key={i}
          className={`text-2xl transition-all ${
            interactive
              ? "cursor-pointer hover:scale-110"
              : ""
          } ${
            isFilled
              ? "text-yellow-400"
              : "text-slate-500"
          }`}
          onClick={interactive ? () => {
            if (isEditMode) {
              setEditRating(i);
            } else {
              setRating(i);
            }
          } : undefined}
          onMouseEnter={interactive ? () => {
            if (isEditMode) {
              setEditHoveredStar(i);
            } else {
              setHoveredStar(i);
            }
          } : undefined}
          onMouseLeave={interactive ? () => {
            if (isEditMode) {
              setEditHoveredStar(null);
            } else {
              setHoveredStar(null);
            }
          } : undefined}
        >
          ★
        </span>
      );
    }
    return stars;
  };

  // Display mode (dashboard view or client view with existing feedback)
  if (hasFeedback || (!isClientView && job)) {
    // Edit mode (admin only)
    if (editing && canEdit) {
      const displayRating = editHoveredStar !== null ? editHoveredStar : editRating;
      
      return (
        <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>✏️</span>
              <span>Editar Avaliação do Cliente</span>
            </h3>
            <button
              onClick={() => {
                setEditing(false);
                setEditRating(job?.clientRating ?? null);
                setEditFeedback(job?.clientFeedback || "");
              }}
              className="text-xs text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-slate-300 mb-2">
                Avaliação (0 a 5 estrelas)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  {renderStars(displayRating, true, true)}
                </div>
                <span className="text-sm text-slate-300">
                  {displayRating !== null ? `${displayRating}/5` : "Selecione"}
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-slate-300 mb-2">
                Comentário
              </label>
              <textarea
                value={editFeedback}
                onChange={(e) => setEditFeedback(e.target.value)}
                placeholder="Edite o comentário do cliente..."
                className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                rows={4}
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={handleUpdateFeedback}
                disabled={submitting || editRating === null}
                className="flex-1 px-4 py-2 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                {submitting ? "Salvando..." : "Salvar Alterações"}
              </button>
              <button
                onClick={handleClearFeedback}
                disabled={submitting}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
              >
                Remover
              </button>
            </div>
          </div>
        </div>
      );
    }

    // View mode
    return (
      <div className="rounded-lg border border-white/10 bg-white/5 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-white flex items-center gap-2">
            <span>⭐</span>
            <span>Avaliação do Cliente</span>
          </h3>
          <div className="flex items-center gap-2">
            {job?.clientFeedbackSubmittedAt && (
              <span className="text-xs text-slate-400">
                {new Date(job.clientFeedbackSubmittedAt).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                })}
              </span>
            )}
            {canEdit && (
              <button
                onClick={() => {
                  setEditing(true);
                  setEditRating(job?.clientRating ?? null);
                  setEditFeedback(job?.clientFeedback || "");
                }}
                className="text-xs px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded transition"
                title="Editar feedback"
              >
                ✏️ Editar
              </button>
            )}
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {renderStars(job?.clientRating ?? null)}
            </div>
            <span className="text-sm text-slate-300">
              {job?.clientRating !== undefined && job?.clientRating !== null
                ? `${job.clientRating}/5 estrelas`
                : "Sem avaliação"}
            </span>
          </div>
          
          {job?.clientFeedback && job.clientFeedback.trim() && (
            <div className="rounded-lg border border-white/5 bg-slate-800/30 p-3">
              <div className="text-xs uppercase text-slate-400 mb-1">Comentário</div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap">
                {job.clientFeedback}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Submit mode (client view without feedback)
  if (canSubmitFeedback) {
    const displayRating = hoveredStar !== null ? hoveredStar : rating;
    
    return (
      <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-4">
        <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
          <span>⭐</span>
          <span>Avalie nosso serviço</span>
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-xs text-slate-300 mb-2">
              Avaliação (0 a 5 estrelas)
            </label>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1">
                {renderStars(displayRating, true)}
              </div>
              <span className="text-sm text-slate-300">
                {displayRating !== null ? `${displayRating}/5` : "Selecione"}
              </span>
            </div>
          </div>
          
          <div>
            <label className="block text-xs text-slate-300 mb-2">
              Comentários, sugestões ou parabéns à equipe (opcional)
            </label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Deixe seu comentário, sugestão ou parabéns à equipe..."
              className="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              rows={4}
            />
          </div>
          
          <button
            onClick={handleSubmitFeedback}
            disabled={submitting || rating === null}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition"
          >
            {submitting ? "Enviando..." : "Enviar Avaliação"}
          </button>
        </div>
      </div>
    );
  }

  return null;
}

