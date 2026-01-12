import React, { useState } from "react";
import ServiceItem from "./ServiceItem";
import NFEUpload from "./NFEUpload";
import JobFeedback from "./JobFeedback";
import { convertToISO, convertFromISO, mapSoilTypeToCatalog, mapAccessToCatalog } from "../utils";

interface JobFormProps {
  mode: "form" | "edit";
  form: any;
  setForm: React.Dispatch<React.SetStateAction<any>>;
  clients: any[];
  teams: any[];
  catalogItems: any[];
  expandedServices: Set<string>;
  setExpandedServices: React.Dispatch<React.SetStateAction<Set<string>>>;
  availability: any;
  checkingAvailability: boolean;
  calculatingDistance: boolean;
  onCancel: () => void;
  onSave: () => void;
  onCalculateTravelPrice: () => void;
  saving: boolean;
  selectedJob?: any; // The full job object (for edit mode, to access feedback)
  onFeedbackUpdated?: (updatedJob: any) => void; // Callback when feedback is updated
}

export default function JobForm({
  mode,
  form,
  setForm,
  clients,
  teams,
  catalogItems,
  expandedServices,
  setExpandedServices,
  availability,
  checkingAvailability,
  calculatingDistance,
  onCancel,
  onSave,
  onCalculateTravelPrice,
  saving,
  selectedJob,
  onFeedbackUpdated
}: JobFormProps) {
  const handleAddService = () => {
    setForm((f: any) => ({
      ...f,
      services: [
        ...f.services,
        {
          id: crypto.randomUUID(),
          service: "",
          catalogId: undefined,
          localType: "",
          soilType: "",
          sptInfo: "",
          access: "",
          categories: [],
          diametro: "",
          profundidade: "",
          quantidade: "",
          observacoes: "",
          sptFileName: "",
          value: "",
          discountPercent: "",
          executionTime: 0
        }
      ]
    }));
  };

  const handleServiceUpdate = (serviceId: string, updates: Partial<any>) => {
    setForm((f: any) => ({
      ...f,
      services: f.services.map((s: any) =>
        s.id === serviceId ? { ...s, ...updates } : s
      )
    }));
  };

  const handleServiceRemove = (serviceId: string) => {
    setForm((f: any) => ({
      ...f,
      services: f.services.filter((s: any) => s.id !== serviceId)
    }));
  };

  const handleToggleServiceExpand = (serviceId: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  // Calculate total execution time for all services
  let totalMinutes = 0;
  let hasAnyTime = false;
  
  form.services.forEach((srv: any) => {
    const catalogItem = catalogItems.find((item) => item._id === srv.catalogId);
    if (catalogItem && srv.diametro && srv.soilType && srv.access && srv.quantidade && srv.profundidade) {
      const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
      const catalogAccess = mapAccessToCatalog(srv.access);
      const diameterNum = parseInt(srv.diametro, 10);
      
      const priceVariation = catalogItem.priceVariations?.find(
        (pv: any) =>
          pv.diameter === diameterNum &&
          pv.soilType === catalogSoilType &&
          pv.access === catalogAccess
      );
      
      if (priceVariation?.executionTime) {
        const quantity = parseFloat(srv.quantidade) || 0;
        const depth = parseFloat(srv.profundidade) || 0;
        totalMinutes += priceVariation.executionTime * quantity * depth;
        hasAnyTime = true;
      }
    }
  });
  
  const timeText = hasAnyTime && totalMinutes > 0 ? (() => {
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    return hours > 0 
      ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
      : `${mins}min`;
  })() : null;

  const finalValue = (() => {
    const value = form.value ? parseFloat(form.value) : 0;
    const discountPercent = form.discountPercent ? parseFloat(form.discountPercent) : 0;
    const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
    return value - discountValue;
  })();

  const discountValue = (() => {
    const value = form.value ? parseFloat(form.value) : 0;
    const discountPercent = form.discountPercent ? parseFloat(form.discountPercent) : 0;
    return discountPercent > 0 ? (value * discountPercent) / 100 : 0;
  })();

  return (
    <div className="space-y-4 sm:space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-base sm:text-lg font-semibold text-white">
            {mode === "edit" ? "Editar OS" : "Nova OS"}
          </div>
          <p className="text-xs text-slate-300 mt-1">
            {mode === "edit" 
              ? "Atualize os dados e salve as alterações." 
              : "Preencha os dados. A OS será salva e listada abaixo."}
          </p>
        </div>
        <button
          onClick={onCancel}
          className="w-full sm:w-auto rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
        >
          Cancelar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <label className="text-slate-200">Cliente</label>
          <select
            value={form.clientId}
            onChange={(e) => {
              const client = clients.find((c) => c._id === e.target.value);
              setForm((f: any) => ({
                ...f,
                clientId: e.target.value,
                site: "" // Clear address to allow selection
              }));
            }}
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
          >
            <option value="">Selecione um cliente</option>
            {clients.map((c) => (
              <option key={c._id} value={c._id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="text-[11px] text-slate-400">
            Vincule a OS a um cliente/empresa existente.
          </div>
        </div>
        <div className="space-y-1 text-sm">
          <label className="text-slate-200">Endereço da Obra</label>
          {form.clientId ? (() => {
            const selectedClient = clients.find((c) => c._id === form.clientId);
            const addresses = selectedClient?.addresses && Array.isArray(selectedClient.addresses) && selectedClient.addresses.length > 0
              ? selectedClient.addresses
              : (selectedClient?.addressStreet || selectedClient?.address
                ? [{
                    label: "Endereço Principal",
                    address: selectedClient.address || `${selectedClient.addressStreet || ""} ${selectedClient.addressNumber || ""}`.trim(),
                    addressStreet: selectedClient.addressStreet || "",
                    addressNumber: selectedClient.addressNumber || "",
                    addressNeighborhood: selectedClient.addressNeighborhood || "",
                    addressCity: selectedClient.addressCity || "",
                    addressState: selectedClient.addressState || "",
                    addressZip: selectedClient.addressZip || ""
                  }]
                : []);
            
            return addresses.length > 0 ? (
              <select
                value={form.site}
                onChange={(e) => setForm((f: any) => ({ ...f, site: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="">Selecione um endereço</option>
                {addresses.map((addr: any, index: number) => {
                  const addrLabel = addr.label || `Endereço ${index + 1}`;
                  const addrFull = addr.address || [
                    [addr.addressStreet, addr.addressNumber].filter(Boolean).join(", "),
                    addr.addressNeighborhood,
                    [addr.addressCity, addr.addressState].filter(Boolean).join(" - "),
                    addr.addressZip
                  ].filter((v) => v && v.trim().length > 0).join(", ");
                  return (
                    <option key={index} value={addrFull}>
                      {addrLabel} - {addrFull}
                    </option>
                  );
                })}
              </select>
            ) : (
              <input
                value={form.site}
                onChange={(e) => setForm((f: any) => ({ ...f, site: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Endereço completo da obra"
              />
            );
          })() : (
            <input
              value={form.site}
              onChange={(e) => setForm((f: any) => ({ ...f, site: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Endereço completo da obra"
            />
          )}
        </div>
        <div className="space-y-1 text-sm">
          <label className="text-slate-200">Título da OS</label>
          <input
            value={form.title}
            onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            placeholder="Ex: Perfuração de Estacas - Obra XYZ"
          />
        </div>
        <div className="space-y-1 text-sm">
          <label className="text-slate-200">Equipe</label>
          <select
            value={form.teamId}
            onChange={(e) => {
              const selectedTeam = teams.find((t) => {
                const teamIdStr = typeof t._id === 'string' ? t._id : (t._id?.toString?.() || String(t._id));
                return teamIdStr === e.target.value;
              });
              setForm((f: any) => ({
                ...f,
                teamId: e.target.value,
                team: selectedTeam?.name || ""
              }));
            }}
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
          >
            <option value="">Selecione uma equipe</option>
            {teams.map((t) => {
              const teamIdStr = typeof t._id === 'string' ? t._id : (t._id?.toString?.() || String(t._id));
              return (
                <option key={teamIdStr} value={teamIdStr}>
                  {t.name}
                </option>
              );
            })}
          </select>
          <div className="text-[11px] text-slate-400">
            Equipes cadastradas em /teams.
          </div>
          {checkingAvailability && (
            <div className="text-xs text-blue-300 flex items-center gap-1">
              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
              Verificando disponibilidade...
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="text-sm font-semibold text-white">
            Serviços (múltiplos) — selecione e detalhe
          </div>
          <button
            type="button"
            onClick={handleAddService}
            className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation active:scale-95"
          >
            + Adicionar serviço
          </button>
        </div>

        <div className="space-y-4">
          {form.services.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/40 px-3 py-3 text-xs text-slate-300">
              Nenhum serviço adicionado. Clique em "+ Adicionar serviço" para inserir
              o primeiro tipo.
            </div>
          ) : null}

          {form.services.map((srv: any, idx: number) => (
            <ServiceItem
              key={srv.id}
              service={srv}
              index={idx}
              isExpanded={expandedServices.has(srv.id)}
              canRemove={form.services.length > 1}
              catalogItems={catalogItems}
              onToggleExpand={() => handleToggleServiceExpand(srv.id)}
              onRemove={() => handleServiceRemove(srv.id)}
              onUpdate={(updates) => handleServiceUpdate(srv.id, updates)}
            />
          ))}
        </div>
      </div>

      {/* Seção de Valores Financeiros */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex items-center justify-between mb-3 sm:mb-4">
          <div className="text-sm font-semibold text-white">Valores do Serviço</div>
          {timeText && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-400/50">
              <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs font-semibold text-orange-200">
                Tempo Total: {timeText}
              </span>
            </div>
          )}
        </div>

        {/* Travel/Displacement Section */}
        <div className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-blue-200">🚗 Deslocamento</h4>
            {form.clientId && (
              <button
                type="button"
                onClick={onCalculateTravelPrice}
                disabled={calculatingDistance}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {calculatingDistance ? "Calculando..." : "📍 Calcular"}
              </button>
            )}
          </div>
          
          {!form.clientId && (
            <div className="text-xs text-slate-400">
              Selecione um cliente para calcular o deslocamento automaticamente.
            </div>
          )}
          
          {form.travelDistanceKm > 0 && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Distância:</span>
                <span className="text-white font-semibold">{form.travelDistanceKm} km</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Preço:</span>
                <span className="text-emerald-300 font-semibold">
                  R$ {form.travelPrice.toFixed(2)}
                </span>
              </div>
              <div className="text-xs text-slate-400 pt-1 border-t border-blue-400/20">
                {form.travelDescription}
              </div>
            </div>
          )}
        </div>

        <div className="mb-2 text-xs text-slate-400">
          O valor total é calculado automaticamente a partir dos valores dos serviços individuais{form.travelPrice > 0 ? " + deslocamento" : ""}.
        </div>
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Valor Total (R$) *</label>
            <input
              type="number"
              step="0.01"
              min="0"
              value={form.value}
              onChange={(e) => setForm((f: any) => ({ ...f, value: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="0.00"
              readOnly={form.services.some((s: any) => s.value && s.value.trim() !== "")}
            />
            {form.services.some((s: any) => s.value && s.value.trim() !== "") && (
              <div className="text-[10px] text-emerald-300 mt-1">
                Calculado automaticamente
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Desconto (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="100"
              value={form.discountPercent}
              onChange={(e) => setForm((f: any) => ({ ...f, discountPercent: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="0.00"
              readOnly={form.services.some((s: any) => s.value && s.value.trim() !== "")}
            />
            {form.services.some((s: any) => s.value && s.value.trim() !== "") && (
              <div className="text-[10px] text-emerald-300 mt-1">
                Calculado automaticamente
              </div>
            )}
          </div>
          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Valor Final (R$)</label>
            <div className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
              {new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL"
              }).format(finalValue)}
            </div>
            {discountValue > 0 && (
              <div className="text-xs text-slate-400">
                Desconto: {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL"
                }).format(discountValue)}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1 text-sm">
          <label className="text-slate-200">Data e hora agendada</label>
          <input
            type="datetime-local"
            value={convertFromISO(form.plannedDate)}
            onChange={(e) => {
              const isoValue = convertToISO(e.target.value);
              setForm((f: any) => ({ ...f, plannedDate: isoValue }));
            }}
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
          />
          {form.team && form.plannedDate && availability && (
            <div className="mt-2 space-y-2">
              {availability.durationText && (
                <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-400/30 rounded p-2">
                  ⏱️ Duração estimada: <strong>{availability.durationText}</strong>
                </div>
              )}
              {availability.available.length > 0 ? (
                <div>
                  <div className="text-xs text-emerald-300 mb-1">Horários disponíveis neste dia:</div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                    {availability.available.map((time: string) => (
                      <span
                        key={time}
                        className="px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded text-xs cursor-pointer hover:bg-emerald-500/30"
                        onClick={() => {
                          const datePart = form.plannedDate.split("T")[0];
                          const [hours, minutes] = time.split(":");
                          const newDateTime = `${datePart}T${hours}:${minutes}`;
                          const isoValue = convertToISO(newDateTime);
                          setForm((f: any) => ({ ...f, plannedDate: isoValue }));
                        }}
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded p-2">
                  ⚠️ Nenhum horário disponível para esta equipe neste dia.
                </div>
              )}
              {availability.booked.length > 0 && (
                <details className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">
                  <summary className="cursor-pointer font-semibold">
                    ⚠️ {availability.booked.length} horário(s) ocupado(s) - Ver detalhes
                  </summary>
                  <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {availability.booked.map((time: string) => (
                      <span
                        key={time}
                        className="px-2 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded text-xs"
                      >
                        {time}
                      </span>
                    ))}
                  </div>
                  <p className="text-[10px] text-amber-200/70 mt-2">
                    Estes horários têm conflito com outras OSs já agendadas para esta equipe.
                  </p>
                </details>
              )}
            </div>
          )}
        </div>
        <div className="space-y-1 text-sm sm:col-span-2">
          <label className="text-slate-200">Observações gerais da OS</label>
          <textarea
            value={form.notes}
            onChange={(e) => setForm((f: any) => ({ ...f, notes: e.target.value }))}
            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            rows={3}
          />
        </div>
      </div>

      {/* NFE File Upload Section */}
      <NFEUpload
        nfeFileKey={form.nfeFileKey}
        nfeFile={form.nfeFile}
        onFileChange={(file) => setForm((f: any) => ({ ...f, nfeFile: file }))}
        onFileKeyChange={(key) => setForm((f: any) => ({ ...f, nfeFileKey: key }))}
      />

      {/* Client Feedback Section - Only show in edit mode if job has feedback or is completed */}
      {mode === "edit" && selectedJob && (selectedJob.status === "concluida" || selectedJob.clientRating !== undefined) && (
        <div className="mt-4 sm:mt-5">
          <JobFeedback
            job={selectedJob}
            isClientView={false}
            onFeedbackSubmitted={(updatedJob) => {
              if (onFeedbackUpdated) {
                onFeedbackUpdated(updatedJob);
              }
            }}
          />
        </div>
      )}

      <div className="flex justify-end pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation active:scale-95"
        >
          {saving 
            ? (mode === "edit" ? "Atualizando..." : "Salvando...") 
            : (mode === "edit" ? "Atualizar OS" : "Salvar OS")}
        </button>
      </div>
    </div>
  );
}

