"use client";

import "@/app/globals.css";
import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import SignatureCanvas from "@/components/SignatureCanvas";
import { apiFetch } from "@/lib/api-client";
import type { Budget } from "@/models/Budget";

export default function PublicBudgetPage() {
  const { token } = useParams<{ token: string }>();
  const [budget, setBudget] = useState<Budget | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSignature, setShowSignature] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [signature, setSignature] = useState<string>("");

  useEffect(() => {
    if (token) {
      loadBudget();
    }
  }, [token]);

  const loadBudget = async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`/budgets/public/${token}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setBudget(data.data);
      } else {
        Swal.fire("Erro", "Orçamento não encontrado", "error");
      }
    } catch (err) {
      console.error("Error loading budget:", err);
      Swal.fire("Erro", "Falha ao carregar orçamento", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    if (!budget || !signature) {
      Swal.fire("Atenção", "Por favor, assine o orçamento", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch(`/budgets/public/${token}/approve`, {
        method: "POST",
        body: JSON.stringify({ signature })
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        Swal.fire("Sucesso", "Orçamento aprovado com sucesso!", "success");
        await loadBudget(); // Reload to show updated status
        setShowSignature(false);
        setSignature("");
      } else {
        Swal.fire("Erro", data?.error || "Falha ao aprovar orçamento", "error");
      }
    } catch (err) {
      console.error("Error approving budget:", err);
      Swal.fire("Erro", "Falha ao aprovar orçamento", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!budget || !rejectionReason.trim()) {
      Swal.fire("Atenção", "Por favor, informe o motivo da rejeição", "warning");
      return;
    }

    try {
      setSubmitting(true);
      const res = await apiFetch(`/budgets/public/${token}/reject`, {
        method: "POST",
        body: JSON.stringify({ rejectionReason: rejectionReason.trim() })
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        Swal.fire("Sucesso", "Orçamento rejeitado", "success");
        await loadBudget(); // Reload to show updated status
        setShowRejectForm(false);
        setRejectionReason("");
      } else {
        Swal.fire("Erro", data?.error || "Falha ao rejeitar orçamento", "error");
      }
    } catch (err) {
      console.error("Error rejecting budget:", err);
      Swal.fire("Erro", "Falha ao rejeitar orçamento", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "-";
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-emerald-400" />
          <p className="text-slate-300">Carregando orçamento...</p>
        </div>
      </div>
    );
  }

  if (!budget) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <p className="text-xl font-semibold text-red-400">Orçamento não encontrado</p>
          <p className="text-slate-300 mt-2">O link pode estar inválido ou expirado.</p>
        </div>
      </div>
    );
  }

  const isProcessed = budget.approved || budget.rejected;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-white mb-2">{budget.title || `Orçamento #${budget.seq}`}</h1>
          <p className="text-slate-300">Cliente: {budget.clientName}</p>
          {budget.validUntil && (
            <p className="text-sm text-slate-400 mt-1">Válido até: {formatDate(budget.validUntil)}</p>
          )}
        </div>

        {/* Status Badge */}
        {isProcessed && (
          <div className="mb-6 text-center">
            {budget.approved ? (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40">
                <span className="text-2xl">✅</span>
                <span className="text-emerald-300 font-semibold">Orçamento Aprovado</span>
                {budget.clientSignedAt && (
                  <span className="text-sm text-emerald-200/70">
                    em {new Date(budget.clientSignedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40">
                <span className="text-2xl">❌</span>
                <span className="text-red-300 font-semibold">Orçamento Rejeitado</span>
                {budget.rejectedAt && (
                  <span className="text-sm text-red-200/70">
                    em {new Date(budget.rejectedAt).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Budget Details */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 mb-6">
          <h2 className="text-xl font-semibold text-white mb-4">Serviços</h2>
          <div className="space-y-4">
            {budget.services.map((service, idx) => (
              <div key={idx} className="rounded-lg border border-white/10 bg-slate-900/50 p-4">
                <div className="font-semibold text-white mb-2">{service.service}</div>
                <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
                  {service.diametro && <div>Diâmetro: {service.diametro}</div>}
                  {service.profundidade && <div>Profundidade: {service.profundidade}</div>}
                  {service.quantidade && <div>Quantidade: {service.quantidade}</div>}
                  {service.localType && <div>Tipo de Local: {service.localType}</div>}
                  {service.soilType && <div>Tipo de Solo: {service.soilType}</div>}
                  {service.access && <div>Acesso: {service.access}</div>}
                </div>
                {service.finalValue && (
                  <div className="mt-2 text-lg font-semibold text-emerald-300">
                    {formatCurrency(service.finalValue)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-6 pt-6 border-t border-white/10">
            <div className="space-y-2">
              {budget.value && (
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(budget.value)}</span>
                </div>
              )}
              {budget.travelPrice && budget.travelPrice > 0 && (
                <div className="flex justify-between text-slate-300">
                  <span>Deslocamento:</span>
                  <span>{formatCurrency(budget.travelPrice)}</span>
                </div>
              )}
              {budget.discountValue && budget.discountValue > 0 && (
                <div className="flex justify-between text-red-300">
                  <span>Desconto ({budget.discountPercent}%):</span>
                  <span>-{formatCurrency(budget.discountValue)}</span>
                </div>
              )}
              {budget.finalValue && (
                <div className="flex justify-between text-xl font-bold text-white pt-2 border-t border-white/10">
                  <span>Total:</span>
                  <span className="text-emerald-300">{formatCurrency(budget.finalValue)}</span>
                </div>
              )}
            </div>
          </div>

          {budget.notes && (
            <div className="mt-6 pt-6 border-t border-white/10">
              <h3 className="font-semibold text-white mb-2">Observações</h3>
              <p className="text-slate-300 whitespace-pre-wrap">{budget.notes}</p>
            </div>
          )}

          {budget.rejectionReason && (
            <div className="mt-6 pt-6 border-t border-red-500/30">
              <h3 className="font-semibold text-red-300 mb-2">Motivo da Rejeição</h3>
              <p className="text-red-200/80 whitespace-pre-wrap">{budget.rejectionReason}</p>
            </div>
          )}
        </div>

        {/* Approval Actions */}
        {!budget.approved && (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            {budget.rejected ? (
              <div className="mb-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-yellow-200 text-sm">
                  Este orçamento foi rejeitado anteriormente. Você pode aprová-lo agora caso tenha mudado de ideia ou se um desconto foi aplicado.
                </p>
              </div>
            ) : (
              <h2 className="text-xl font-semibold text-white mb-4">Aprovar ou Rejeitar Orçamento</h2>
            )}
            
            {!showSignature && !showRejectForm && (
              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => {
                    setShowSignature(true);
                    setShowRejectForm(false);
                  }}
                  className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-white font-semibold shadow-lg transition hover:from-emerald-600 hover:to-emerald-700"
                >
                  {budget.rejected ? "✅ Aprovar Orçamento (Após Rejeição)" : "✅ Aprovar Orçamento"}
                </button>
                {!budget.rejected && (
                  <button
                    onClick={() => {
                      setShowRejectForm(true);
                      setShowSignature(false);
                    }}
                    className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-white font-semibold shadow-lg transition hover:from-red-600 hover:to-red-700"
                  >
                    ❌ Rejeitar Orçamento
                  </button>
                )}
              </div>
            )}

            {showSignature && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Assinatura Digital</h3>
                {signature ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-500/30 bg-white p-4">
                      <img 
                        src={signature} 
                        alt="Assinatura" 
                        className="max-w-full h-auto"
                      />
                    </div>
                    <div className="flex gap-4">
                      <button
                        onClick={handleApprove}
                        disabled={submitting}
                        className="flex-1 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-6 py-3 text-white font-semibold shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {submitting ? "Processando..." : "Confirmar Aprovação"}
                      </button>
                      <button
                        onClick={() => {
                          setSignature("");
                        }}
                        className="px-6 py-3 rounded-lg border border-white/10 bg-white/5 text-white font-semibold transition hover:bg-white/10"
                      >
                        Reassinar
                      </button>
                      <button
                        onClick={() => {
                          setShowSignature(false);
                          setSignature("");
                        }}
                        className="px-6 py-3 rounded-lg border border-white/10 bg-white/5 text-white font-semibold transition hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg border border-white/10 bg-white p-4">
                    <SignatureCanvas 
                      onSave={(sig) => setSignature(sig)}
                      width={400}
                      height={200}
                    />
                  </div>
                )}
              </div>
            )}

            {showRejectForm && (
              <div className="space-y-4">
                <h3 className="font-semibold text-white">Motivo da Rejeição</h3>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Informe o motivo da rejeição do orçamento..."
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-4 py-3 text-white placeholder-slate-400 outline-none focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-500/40"
                  rows={4}
                />
                <div className="flex gap-4">
                  <button
                    onClick={handleReject}
                    disabled={submitting || !rejectionReason.trim()}
                    className="flex-1 rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-white font-semibold shadow-lg transition hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "Processando..." : "Confirmar Rejeição"}
                  </button>
                  <button
                    onClick={() => {
                      setShowRejectForm(false);
                      setRejectionReason("");
                    }}
                    className="px-6 py-3 rounded-lg border border-white/10 bg-white/5 text-white font-semibold transition hover:bg-white/10"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Signature Display */}
        {budget.approved && budget.clientSignature && (
          <div className="mt-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
            <h3 className="font-semibold text-emerald-300 mb-3">Assinatura do Cliente</h3>
            <div className="rounded-lg border border-emerald-500/20 bg-white p-4">
              <img 
                src={budget.clientSignature} 
                alt="Assinatura do cliente" 
                className="max-w-full h-auto"
              />
            </div>
            {budget.clientSignedAt && (
              <p className="text-sm text-emerald-200/70 mt-2">
                Assinado em {new Date(budget.clientSignedAt).toLocaleString("pt-BR")}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

