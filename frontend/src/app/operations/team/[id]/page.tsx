import "@/app/globals.css";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { MainView } from "./types";
import { DATE_FILTERS, ICONS } from "./constants";
import { statusLabel } from "./utils";
import { useOperations } from "./hooks/useOperations";
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
              { label: "Disponíveis", value: dateFilteredJobs.filter((j) => j.status === "pendente").length },
              { label: "Em execução", value: dateFilteredJobs.filter((j) => j.status === "em_execucao").length },
              { label: "Concluídos", value: dateFilteredJobs.filter((j) => j.status === "concluida").length }
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
          <>
            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {DATE_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDateFilter(filter.key)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    dateFilter === filter.key
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/30 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
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
          </>
        )}

        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-inner shadow-black/30">
            Nenhum serviço nesta aba.
          </div>
        ) : (
          <div className="space-y-6 pb-20 sm:pb-0">
            {groupedJobsByDate.map((group) => (
              <div key={group.date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
                    {group.date}
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {group.jobs.length}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:px-4 py-4 pb-20 sm:pb-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[85vh] sm:max-h-[95vh] rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 shadow-2xl overflow-y-auto my-auto">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">
                    {statusLabel(selectedJob.status)}
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

              {/* Signature Section */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-white mb-3">
                  Assinatura do Cliente
                </div>
                {selectedJob.clientSignature ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                      <div className="text-xs text-emerald-300 mb-2">✓ Assinatura coletada</div>
                      <img
                        src={selectedJob.clientSignature}
                        alt="Assinatura do cliente"
                        className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
                      />
                      {selectedJob.clientSignedAt && (
                        <div className="text-xs text-emerald-200/70 mt-2 text-center">
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
                      className="w-full rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-500/30"
                    >
                      Reassinar
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <SignatureCanvas
                      onSave={(signature) => handleSaveSignature(selectedJob._id, signature)}
                      width={400}
                      height={200}
                    />
                  </div>
                )}
              </div>

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
                {selectedJob.status === "concluida" && !selectedJob.received && !hasTransactionForJob(selectedJob._id) && selectedJob.finalValue && selectedJob.finalValue > 0 && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => markAsReceived(selectedJob)}
                    className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    {updating === selectedJob._id ? "Processando..." : "Receber"}
                  </button>
                )}
                {(selectedJob.received || hasTransactionForJob(selectedJob._id)) && (
                  <div className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 text-center">
                    ✓ Recebido
                  </div>
                )}
                {selectedJob.site && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToJob(selectedJob)}
                    className="w-full sm:w-auto rounded-md border border-purple-400/40 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                  >
                    🚗 Rota
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedJob._id)}
                  className="w-full sm:w-auto rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20"
                >
                  📄 Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedJob(null)}
                  className="w-full sm:w-auto rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
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

