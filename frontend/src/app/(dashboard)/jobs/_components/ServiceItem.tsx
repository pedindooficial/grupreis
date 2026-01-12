import React from "react";
import { SERVICES, LOCAL_TYPES, SOIL_TYPES, CATALOG_DIAMETERS, ACCESS_TYPES, SERVICE_DEFAULT_CATS } from "../constants";
import { mapSoilTypeToCatalog, mapAccessToCatalog, calculateServicePrice } from "../utils";

interface ServiceItemProps {
  service: any;
  index: number;
  isExpanded: boolean;
  canRemove: boolean;
  catalogItems: any[];
  onToggleExpand: () => void;
  onRemove: () => void;
  onUpdate: (updates: Partial<any>) => void;
}

export default function ServiceItem({
  service: srv,
  index: idx,
  isExpanded,
  canRemove,
  catalogItems,
  onToggleExpand,
  onRemove,
  onUpdate
}: ServiceItemProps) {
  const handleServiceTypeChange = (value: string) => {
    const catalogItem = catalogItems.find((item) => item._id === value);
    
    if (catalogItem) {
      // Using catalog item
      onUpdate({
        catalogId: catalogItem._id,
        service: catalogItem.name,
        categories: catalogItem.category ? [catalogItem.category] : [],
        value: "", // Will be calculated based on diameter/soil
        discountPercent: "",
        diametro: "",
        soilType: "",
        executionTime: 0 // Initialize execution time
      });
    } else {
      // Using legacy service
      const code = value.split(" ")[0];
      onUpdate({
        catalogId: undefined,
        service: value,
        categories: SERVICE_DEFAULT_CATS[code] || [],
        executionTime: 0 // Initialize execution time for legacy services
      });
    }
  };

  const handleFieldChange = (field: string, value: string, shouldCalculatePrice = false) => {
    if (shouldCalculatePrice) {
      const catalogItem = catalogItems.find((item) => item._id === srv.catalogId);
      const priceData = calculateServicePrice(
        catalogItem,
        field === "diametro" ? value : srv.diametro,
        field === "soilType" ? value : srv.soilType,
        field === "access" ? value : srv.access,
        field === "quantidade" ? value : srv.quantidade,
        field === "profundidade" ? value : srv.profundidade
      );
      onUpdate({
        [field]: value,
        value: priceData.value,
        executionTime: priceData.executionTime
      });
    } else {
      onUpdate({ [field]: value });
    }
  };

  // Get base price per meter and execution time from catalog variation
  const catalogItem = catalogItems.find((item) => item._id === srv.catalogId);
  let basePricePerMeter = null;
  let executionTimePerMeter = null;
  
  if (catalogItem && srv.diametro && srv.soilType && srv.access) {
    const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
    const catalogAccess = mapAccessToCatalog(srv.access);
    const diameterNum = parseInt(srv.diametro, 10);
    
    const priceVariation = catalogItem.priceVariations?.find(
      (pv: any) =>
        pv.diameter === diameterNum &&
        pv.soilType === catalogSoilType &&
        pv.access === catalogAccess
    );
    
    if (priceVariation) {
      basePricePerMeter = priceVariation.price;
      executionTimePerMeter = priceVariation.executionTime;
    }
  }
  
  // Calculate total execution time for this service
  const quantity = parseFloat(srv.quantidade) || 0;
  const depth = parseFloat(srv.profundidade) || 0;
  const totalExecutionMinutes = executionTimePerMeter && quantity > 0 && depth > 0
    ? executionTimePerMeter * quantity * depth
    : null;
  
  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);
    if (hours > 0) {
      return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
    }
    return `${mins}min`;
  };

  // Show formula if we have all required values
  const hasCatalogItem = !!catalogItem;
  const hasDiameter = !!srv.diametro;
  const hasSoilType = !!srv.soilType;
  const hasAccess = !!srv.access;
  const hasQuantity = !!srv.quantidade && parseFloat(srv.quantidade) > 0;
  const hasProfundidade = !!srv.profundidade && parseFloat(srv.profundidade) > 0;
  
  const hasBasePrice = (() => {
    if (!hasCatalogItem || !hasDiameter || !hasSoilType || !hasAccess) return false;
    const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
    const catalogAccess = mapAccessToCatalog(srv.access);
    const diameterNum = parseInt(srv.diametro, 10);
    const priceVariation = catalogItem.priceVariations?.find(
      (pv: any) =>
        pv.diameter === diameterNum &&
        pv.soilType === catalogSoilType &&
        pv.access === catalogAccess
    );
    return !!priceVariation;
  })();

  const showFormula = hasCatalogItem && hasBasePrice && hasQuantity && hasProfundidade;
  let formulaText = null;
  if (showFormula) {
    const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
    const catalogAccess = mapAccessToCatalog(srv.access);
    const diameterNum = parseInt(srv.diametro, 10);
    const priceVariation = catalogItem.priceVariations?.find(
      (pv: any) =>
        pv.diameter === diameterNum &&
        pv.soilType === catalogSoilType &&
        pv.access === catalogAccess
    );
    
    if (priceVariation) {
      const qty = parseFloat(srv.quantidade) || 0;
      const dep = parseFloat(srv.profundidade) || 0;
      const basePrice = priceVariation.price || 0;
      const calculatedValue = (qty * dep) * basePrice;
      
      formulaText = (
        <div className="text-[10px] sm:text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-600/50">
          ({qty} × {dep}) × {basePrice.toFixed(2)} = {calculatedValue.toFixed(2)}
        </div>
      );
    }
  }

  // Group catalog items by category
  const groupedByCategory = catalogItems.reduce((acc: Record<string, typeof catalogItems>, item: any) => {
    const category = item.category || "Sem categoria";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {});
  
  const sortedCategories = Object.keys(groupedByCategory).sort();

  const finalValue = (() => {
    const value = srv.value ? parseFloat(srv.value) : 0;
    const discountPercent = srv.discountPercent ? parseFloat(srv.discountPercent) : 0;
    const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
    return value - discountValue;
  })();

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:p-4 space-y-3">
      <div className="flex items-center justify-between text-sm text-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggleExpand}
            className="flex items-center gap-1.5 text-xs sm:text-sm hover:text-emerald-300 transition"
          >
            <svg
              className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>Serviço #{idx + 1}</span>
            {srv.service && (
              <span className="text-slate-400 text-xs">- {srv.service.substring(0, 30)}{srv.service.length > 30 ? "..." : ""}</span>
            )}
          </button>
        </div>
        <div className="flex items-center gap-2">
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-md border border-white/10 px-2 py-1 text-[10px] sm:text-xs font-semibold text-red-100 hover:border-red-400/50 hover:text-red-100"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Tipo de serviço</label>
              <select
                value={srv.catalogId || srv.service}
                onChange={(e) => handleServiceTypeChange(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione um serviço</option>
                {catalogItems.length > 0 && (
                  <optgroup label="Catálogo">
                    {sortedCategories.flatMap((category) =>
                      groupedByCategory[category].map((item: any) => (
                        <option key={item._id} value={item._id}>
                          {category} — {item.name}
                        </option>
                      ))
                    )}
                  </optgroup>
                )}
                <optgroup label="Serviços Legados">
                  {SERVICES.map((s) => (
                    <option key={s.value} value={`${s.value} - ${s.label}`}>
                      {s.group} — {s.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de local</label>
              <select
                key={`localType-${srv.id}-${srv.localType || 'empty'}`}
                value={srv.localType || ""}
                onChange={(e) => handleFieldChange("localType", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione</option>
                {LOCAL_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de solo</label>
              <select
                key={`soilType-${srv.id}-${srv.soilType || 'empty'}`}
                value={srv.soilType || ""}
                onChange={(e) => handleFieldChange("soilType", e.target.value, true)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione</option>
                {SOIL_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Acesso para máquina</label>
              <select
                key={`access-${srv.id}-${srv.access || 'empty'}`}
                value={srv.access || ""}
                onChange={(e) => handleFieldChange("access", e.target.value, true)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione</option>
                {ACCESS_TYPES.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Categorias</label>
              <div className="flex flex-wrap gap-2">
                {(srv.categories && srv.categories.length > 0 ? srv.categories : ["—"]).map(
                  (cat: string) => (
                    <span
                      key={cat}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100"
                    >
                      {cat}
                    </span>
                  )
                )}
              </div>
            </div>

            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 sm:col-span-2">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200 text-xs sm:text-sm">Diâmetro (25–120 cm)</label>
                {srv.catalogId ? (
                  <select
                    key={`diametro-${srv.id}-${srv.diametro || 'empty'}`}
                    value={srv.diametro || ""}
                    onChange={(e) => handleFieldChange("diametro", e.target.value, true)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  >
                    <option value="">Selecione</option>
                    {CATALOG_DIAMETERS.map((d) => (
                      <option key={d} value={d}>
                        {d} cm
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    min={25}
                    max={120}
                    value={srv.diametro}
                    onChange={(e) => handleFieldChange("diametro", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="cm"
                  />
                )}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200 text-xs sm:text-sm">Profundidade (1–18 m)</label>
                <input
                  type="number"
                  min={1}
                  max={18}
                  value={srv.profundidade}
                  onChange={(e) => handleFieldChange("profundidade", e.target.value, true)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="m"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200 text-xs sm:text-sm">Quantidade</label>
                <input
                  type="number"
                  min={1}
                  value={srv.quantidade}
                  onChange={(e) => handleFieldChange("quantidade", e.target.value, true)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Qtd"
                />
              </div>
            </div>

            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">
                SPT / Diagnóstico do Solo (resumo ou link)
              </label>
              <textarea
                value={srv.sptInfo}
                onChange={(e) => handleFieldChange("sptInfo", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Cole o laudo SPT, link ou resumo"
              />
              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                <label className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 cursor-pointer">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      onUpdate({ sptFileName: file.name });
                    }}
                  />
                  Anexar SPT (pdf/word)
                </label>
                <span className="text-slate-200">
                  {srv.sptFileName ? `Arquivo: ${srv.sptFileName}` : "Nenhum arquivo selecionado"}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Observações do serviço</label>
              <textarea
                value={srv.observacoes}
                onChange={(e) => handleFieldChange("observacoes", e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Detalhes específicos deste serviço"
              />
            </div>
          </div>

          {/* Valores do Serviço Individual */}
          <div className="sm:col-span-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs sm:text-sm font-semibold text-emerald-200">Valores deste Serviço</div>
              {formulaText}
            </div>
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-4">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Preço Base/m (R$)</label>
                <div className="w-full rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-100">
                  {basePricePerMeter !== null
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(basePricePerMeter)
                    : "—"}
                </div>
              </div>
              
              <div className="space-y-1 text-sm">
                <label className="text-slate-200 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tempo/m
                </label>
                <div className="w-full rounded-lg border border-purple-400/50 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-purple-100">
                  {executionTimePerMeter !== null && executionTimePerMeter !== undefined
                    ? `${executionTimePerMeter} min/m`
                    : "—"}
                </div>
              </div>
              
              <div className="space-y-1 text-sm sm:col-span-2">
                <label className="text-slate-200 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Tempo Total Estimado (este serviço)
                </label>
                <div className="w-full rounded-lg border border-orange-400/50 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-100">
                  {totalExecutionMinutes !== null
                    ? formatTime(totalExecutionMinutes)
                    : "—"}
                </div>
                <div className="text-[10px] text-slate-400">
                  {totalExecutionMinutes !== null && executionTimePerMeter
                    ? `${quantity} × ${depth}m × ${executionTimePerMeter} min/m = ${totalExecutionMinutes.toFixed(0)} min`
                    : "Preencha todos os campos para calcular"}
                </div>
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Valor (R$)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={srv.value || ""}
                  onChange={(e) => handleFieldChange("value", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Desconto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={srv.discountPercent || ""}
                  onChange={(e) => handleFieldChange("discountPercent", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Valor Final (R$)</label>
                <div className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(finalValue)}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

