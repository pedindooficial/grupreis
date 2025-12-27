import "@/app/globals.css";
import { useState } from "react";
import { useParams } from "react-router-dom";
import Swal from "sweetalert2";
import { MainView } from "./types";
import { DATE_FILTERS, ICONS } from "./constants";
import { statusLabel } from "./utils";
import { useOperations } from "./hooks/useOperations";
import { apiFetch } from "@/lib/api-client";
import LoadingScreen from "./_components/LoadingScreen";
import LoginScreen from "./_components/LoginScreen";
import JobCard from "./_components/JobCard";
import BottomNavigation from "./_components/BottomNavigation";
import SignatureCanvas from "@/components/SignatureCanvas";

export default function OperationTeamPage() {
  const { id: teamId } = useParams<{ id: string }>();
  
  if (!teamId) {
    return <div className="min-h-screen flex items-center justify-center text-white">Team ID não encontrado</div>;
  }
  const [view, setView] = useState<MainView>("ops");
  
  const {
    password,
    setPassword,
    authLoading,
    data,
    tab,
    setTab,
    updating,
    selectedJob,
    setSelectedJob,
    showPass,
    setShowPass,
    checkingAuth,
    dateFilter,
    setDateFilter,
    assignedJobs,
    dateFilteredJobs,
    filteredJobs,
    groupedJobsByDate,
    authWithPassword,
    handleStartJob,
    updateJobStatus,
    hasTransactionForJob,
    markAsReceived,
    handleSaveSignature,
    handleDownloadPDF,
    handleLogout,
    handleNavigateToJob
  } = useOperations(teamId);

  const handleAuth = async () => {
    await authWithPassword(password);
  };

  if (checkingAuth || authLoading) {
    return <LoadingScreen />;
  }

  if (!data) {
    return (
      <LoginScreen
        password={password}
        setPassword={setPassword}
        showPass={showPass}
        setShowPass={setShowPass}
        authLoading={authLoading}
        onLogin={handleAuth}
      />
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-3 sm:px-4 py-4 sm:py-8 text-slate-100 pb-20 sm:pb-8"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(16,185,129,0.08), transparent 35%), radial-gradient(circle at 85% 15%, rgba(59,130,246,0.08), transparent 30%), #020617"
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:gap-6">
        <div className="flex flex-col gap-1">
          <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-emerald-200">Equipe</div>
          <div className="text-xl sm:text-2xl font-semibold text-white break-words">{data.team?.name}</div>
          <div className="text-xs sm:text-sm text-slate-300">
            Painel público protegido. Atualize início e conclusão das OS atribuídas.
          </div>
        </div>

        {view === "home" ? (
          <div className="grid gap-2 sm:gap-3 grid-cols-3">
            {[
              { label: "Disponíveis", value: dateFilteredJobs.filter((j) => j.status === "pendente").length },
              { label: "Em execução", value: dateFilteredJobs.filter((j) => j.status === "em_execucao").length },
              { label: "Concluídos", value: dateFilteredJobs.filter((j) => j.status === "concluida").length }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/30"
              >
                <div className="text-[10px] sm:text-xs uppercase tracking-wide text-slate-300">{item.label}</div>
                <div className="mt-1 text-xl sm:text-2xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDateFilter(filter.key)}
                  className={`rounded-lg border px-3 sm:px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold transition touch-manipulation min-h-[44px] ${
                    dateFilter === filter.key
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-200 active:border-emerald-300/30 active:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-2 sm:gap-3 md:grid-cols-3">
              {[
                { key: "disponiveis" as const, label: "Disponíveis", desc: "Prontos para iniciar", icon: ICONS.pin },
                { key: "execucao" as const, label: "Em execução", desc: "Andamento em campo", icon: ICONS.clock },
                { key: "concluidas" as const, label: "Concluídos", desc: "Finalizados", icon: ICONS.check }
              ].map((item) => {
                const count =
                  item.key === "disponiveis"
                    ? dateFilteredJobs.filter((j) => j.status === "pendente").length
                    : item.key === "execucao"
                    ? dateFilteredJobs.filter((j) => j.status === "em_execucao").length
                    : dateFilteredJobs.filter((j) => j.status === "concluida").length;
                return (
                  <button
                    key={item.key}
                    onClick={() => setTab(item.key)}
                    className={`flex w-full items-center gap-2 sm:gap-3 rounded-xl sm:rounded-2xl border px-3 sm:px-4 py-3 sm:py-4 text-left transition touch-manipulation min-h-[60px] ${
                      tab === item.key
                        ? "border-emerald-400/50 bg-emerald-500/10"
                        : "border-white/10 bg-white/5 active:border-emerald-300/30 active:bg-white/10"
                    }`}
                  >
                    <div className="text-lg sm:text-xl text-emerald-200 flex-shrink-0">{item.icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-white">{item.label}</div>
                      <div className="text-[10px] sm:text-xs text-slate-300">{item.desc}</div>
                    </div>
                    <div className="rounded-full bg-white/10 px-2 sm:px-3 py-1 text-xs font-semibold text-white flex-shrink-0">
                      {count}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}

        {filteredJobs.length === 0 ? (
          <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 text-xs sm:text-sm text-slate-200 shadow-inner shadow-black/30">
            Nenhum serviço nesta aba.
          </div>
        ) : (
          <div className="space-y-4 sm:space-y-6 pb-20 sm:pb-0">
            {groupedJobsByDate.map((group) => (
              <div key={group.date} className="space-y-2 sm:space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="text-xs sm:text-sm font-semibold text-emerald-300 uppercase tracking-wide whitespace-nowrap">
                    {group.date}
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-[10px] sm:text-xs font-semibold text-emerald-300">
                    {group.jobs.length}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
                <div className="grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {group.jobs.map((job) => (
                    <JobCard
                      key={job._id}
                      job={job}
                      onStart={handleStartJob}
                      onComplete={(id) => updateJobStatus(id, "concluida")}
                      onReceive={markAsReceived}
                      onNavigate={handleNavigateToJob}
                      onViewDetails={setSelectedJob}
                      updating={updating}
                      hasTransaction={hasTransactionForJob}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:px-4 py-2 sm:py-4 pb-20 sm:pb-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[90vh] sm:max-h-[95vh] rounded-xl sm:rounded-2xl border border-white/10 bg-slate-900 p-3 sm:p-6 shadow-2xl overflow-y-auto my-auto">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-2 sm:gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] sm:text-xs uppercase tracking-wide text-emerald-200">
                    {statusLabel(selectedJob.status)}
                  </div>
                  <div className="text-base sm:text-lg md:text-xl font-semibold text-white break-words">{selectedJob.title}</div>
                  <div className="text-[11px] sm:text-xs md:text-sm text-slate-300 break-words">
                    {selectedJob.clientName || "Cliente não informado"} ·{" "}
                    {selectedJob.site || "Endereço não informado"}
                  </div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 sm:mt-1">
                    Data agendada: {selectedJob.plannedDate || "—"}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-full border border-white/15 px-3 py-1.5 sm:py-1 text-xs font-semibold text-slate-200 active:border-emerald-300/40 active:text-white shrink-0 touch-manipulation min-h-[36px] sm:min-h-[auto]"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-3 sm:mt-4 grid gap-2 sm:gap-3 grid-cols-1 md:grid-cols-3">
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-200">
                  <div className="text-[10px] sm:text-xs uppercase text-slate-400">Horários</div>
                  <div className="mt-1.5 sm:mt-2 space-y-1 text-[11px] sm:text-xs">
                    <div className="break-words">
                      Início:{" "}
                      {selectedJob.startedAt
                        ? new Date(selectedJob.startedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                    <div className="break-words">
                      Término:{" "}
                      {selectedJob.finishedAt
                        ? new Date(selectedJob.finishedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-200">
                  <div className="text-[10px] sm:text-xs uppercase text-slate-400">Equipe</div>
                  <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs break-words">{selectedJob.team || data.team?.name}</div>
                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1">OS #{selectedJob._id.substring(0, 8)}...</div>
                </div>
                <div className="rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 text-xs sm:text-sm text-slate-200">
                  <div className="text-[10px] sm:text-xs uppercase text-slate-400">Observações</div>
                  <div className="mt-1.5 sm:mt-2 text-[11px] sm:text-xs break-words">{selectedJob.notes || "Sem observações."}</div>
                </div>
              </div>

              <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3">
                <div className="text-xs sm:text-sm font-semibold text-white">
                  Serviços ({selectedJob.services?.length || 0})
                </div>
                <div className="mt-2 grid gap-2 grid-cols-1">
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

              {/* Receipt Section */}
              {(selectedJob.received || hasTransactionForJob(selectedJob._id)) && selectedJob.receiptFileKey && (
                <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border border-blue-400/30 bg-blue-500/10 p-2.5 sm:p-3 sm:p-4">
                  <div className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">
                    📎 Comprovante de Recebimento
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const res = await apiFetch("/files/presigned-url", {
                          method: "POST",
                          body: JSON.stringify({ key: selectedJob.receiptFileKey })
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
                    }}
                    className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2.5 sm:py-2 text-xs sm:text-sm font-semibold text-blue-300 transition active:border-blue-400 active:bg-blue-500/30 touch-manipulation min-h-[44px]"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Baixar Comprovante
                  </button>
                </div>
              )}

              {/* Signature Section */}
              <div className="mt-3 sm:mt-4 rounded-lg sm:rounded-xl border border-white/10 bg-white/5 p-2.5 sm:p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-white mb-2 sm:mb-3">
                  Assinatura do Cliente
                </div>
                {selectedJob.clientSignature ? (
                  <div className="space-y-2 sm:space-y-3">
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2 sm:p-3">
                      <div className="text-[10px] sm:text-xs text-emerald-300 mb-1.5 sm:mb-2">✓ Assinatura coletada</div>
                      <img
                        src={selectedJob.clientSignature}
                        alt="Assinatura do cliente"
                        className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
                      />
                      {selectedJob.clientSignedAt && (
                        <div className="text-[10px] sm:text-xs text-emerald-200/70 mt-1.5 sm:mt-2 text-center">
                          Assinado em: {new Date(selectedJob.clientSignedAt).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const newJob = { ...selectedJob, clientSignature: undefined, clientSignedAt: undefined };
                        setSelectedJob(newJob);
                      }}
                      className="w-full rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-3 py-2.5 sm:py-2 text-xs font-semibold text-yellow-300 transition active:border-yellow-400 active:bg-yellow-500/30 touch-manipulation min-h-[44px]"
                    >
                      Reassinar
                    </button>
                  </div>
                ) : (
                  <div className="w-full overflow-x-auto">
                    <SignatureCanvas
                      onSave={(signature) => handleSaveSignature(selectedJob._id, signature)}
                      width={typeof window !== 'undefined' && window.innerWidth < 640 ? Math.min(window.innerWidth - 40, 400) : 400}
                      height={typeof window !== 'undefined' && window.innerWidth < 640 ? 150 : 200}
                    />
                  </div>
                )}
              </div>

              <div className="mt-3 sm:mt-4 flex flex-col gap-2">
                {selectedJob.status === "pendente" && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => handleStartJob(selectedJob._id, selectedJob.title)}
                    className="w-full rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-blue-100 transition active:border-blue-300/60 active:bg-blue-500/20 disabled:opacity-60 touch-manipulation min-h-[44px]"
                  >
                    Iniciar serviço
                  </button>
                )}
                {(selectedJob.status === "em_execucao" || (selectedJob.status !== "concluida" && selectedJob.startedAt)) && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => updateJobStatus(selectedJob._id, "concluida")}
                    className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-100 transition active:border-emerald-300/60 active:bg-emerald-500/20 disabled:opacity-60 touch-manipulation min-h-[44px]"
                  >
                    Concluir serviço
                  </button>
                )}
                {selectedJob.status === "concluida" && !selectedJob.received && !hasTransactionForJob(selectedJob._id) && selectedJob.finalValue && selectedJob.finalValue > 0 && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => markAsReceived(selectedJob)}
                    className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-100 transition active:border-emerald-300/60 active:bg-emerald-500/20 disabled:opacity-60 touch-manipulation min-h-[44px]"
                  >
                    {updating === selectedJob._id ? "Processando..." : "Receber"}
                  </button>
                )}
                {(selectedJob.received || hasTransactionForJob(selectedJob._id)) && (
                  <div className="w-full rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-emerald-100 text-center min-h-[44px] flex items-center justify-center">
                    ✓ Recebido
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {selectedJob.site && (
                    <button
                      type="button"
                      onClick={() => handleNavigateToJob(selectedJob)}
                      className="w-full rounded-md border border-purple-400/40 bg-purple-500/10 px-3 sm:px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-purple-100 transition active:border-purple-300/60 active:bg-purple-500/20 touch-manipulation min-h-[44px]"
                    >
                      🚗 Rota
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDownloadPDF(selectedJob._id)}
                    className="w-full rounded-md border border-blue-400/40 bg-blue-500/10 px-3 sm:px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-blue-100 transition active:border-blue-300/60 active:bg-blue-500/20 touch-manipulation min-h-[44px]"
                  >
                    📄 PDF
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="w-full rounded-md border border-white/15 bg-white/5 px-4 py-3 sm:py-2 text-xs sm:text-sm font-semibold text-slate-100 transition active:border-emerald-300/40 active:bg-white/10 touch-manipulation min-h-[44px]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {data && (
        <BottomNavigation
          view={view}
          setView={setView}
          onLogout={handleLogout}
        />
      )}
    </div>
  );
}

