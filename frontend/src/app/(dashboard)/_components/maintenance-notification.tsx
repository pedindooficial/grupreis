import { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { apiFetch } from "@/lib/api-client";

interface MaintenanceItem {
  _id: string;
  name: string;
  type: "equipment" | "machine";
  nextMaintenance: string;
  status?: string;
  // Full item data for details
  fullData?: any;
}

export default function MaintenanceNotification() {
  const [items, setItems] = useState<MaintenanceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MaintenanceItem | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate days until maintenance
  const getDaysUntil = (dateString: string): number => {
    if (!dateString) return Infinity;
    try {
      const maintenanceDate = new Date(dateString);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      maintenanceDate.setHours(0, 0, 0, 0);
      const diffTime = maintenanceDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch {
      return Infinity;
    }
  };

  // Filter items that need maintenance (within 30 days or overdue)
  const getMaintenanceAlerts = (equipment: any[], machines: any[]): MaintenanceItem[] => {
    const alerts: MaintenanceItem[] = [];

    // Check equipment
    equipment.forEach((item) => {
      if (item.nextMaintenance && item.status === "ativo") {
        const daysUntil = getDaysUntil(item.nextMaintenance);
        if (daysUntil <= 30 && daysUntil >= -7) {
          // Within 30 days or up to 7 days overdue
          alerts.push({
            _id: item._id,
            name: item.name,
            type: "equipment",
            nextMaintenance: item.nextMaintenance,
            status: item.status,
            fullData: item // Store full data for details
          });
        }
      }
    });

    // Check machines
    machines.forEach((item) => {
      if (item.nextMaintenance && item.status === "ativa") {
        const daysUntil = getDaysUntil(item.nextMaintenance);
        if (daysUntil <= 30 && daysUntil >= -7) {
          // Within 30 days or up to 7 days overdue
          alerts.push({
            _id: item._id,
            name: item.name,
            type: "machine",
            nextMaintenance: item.nextMaintenance,
            status: item.status,
            fullData: item // Store full data for details
          });
        }
      }
    });

    // Sort by urgency (overdue first, then by days until)
    return alerts.sort((a, b) => {
      const daysA = getDaysUntil(a.nextMaintenance);
      const daysB = getDaysUntil(b.nextMaintenance);
      if (daysA < 0 && daysB >= 0) return -1;
      if (daysA >= 0 && daysB < 0) return 1;
      return daysA - daysB;
    });
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [equipmentRes, machinesRes] = await Promise.all([
          apiFetch("/equipment", { cache: "no-store" }),
          apiFetch("/machines", { cache: "no-store" })
        ]);

        const equipmentData = await equipmentRes.json().catch(() => null);
        const machinesData = await machinesRes.json().catch(() => null);

        const equipment = Array.isArray(equipmentData?.data) ? equipmentData.data : [];
        const machines = Array.isArray(machinesData?.data) ? machinesData.data : [];

        const alerts = getMaintenanceAlerts(equipment, machines);
        setItems(alerts);
      } catch (err) {
        console.error("Erro ao carregar dados de manutenção:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
    // Refresh every 5 minutes
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDropdown]);

  const formatDate = (dateString: string): string => {
    if (!dateString) return "-";
    try {
      if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = dateString.split("-");
        return `${day}/${month}/${year}`;
      }
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric"
        });
      }
      return dateString;
    } catch {
      return dateString;
    }
  };

  const getUrgencyColor = (daysUntil: number): string => {
    if (daysUntil < 0) return "text-red-400"; // Overdue
    if (daysUntil <= 7) return "text-orange-400"; // Urgent (within 7 days)
    if (daysUntil <= 15) return "text-yellow-400"; // Warning (within 15 days)
    return "text-blue-400"; // Info (within 30 days)
  };

  const getUrgencyLabel = (daysUntil: number): string => {
    if (daysUntil < 0) return `${Math.abs(daysUntil)} dia(s) atrasado`;
    if (daysUntil === 0) return "Hoje";
    if (daysUntil === 1) return "Amanhã";
    return `Em ${daysUntil} dia(s)`;
  };

  const count = items.length;

  if (loading) {
    return null;
  }

  if (count === 0) {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative flex items-center justify-center rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white touch-manipulation min-h-[44px] min-w-[44px]"
        title="Manutenções próximas"
      >
        <svg
          className="h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth="2"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {count > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full z-[100] mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-white/10 bg-slate-900 shadow-2xl">
          <div className="border-b border-white/10 p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-white">Manutenções Próximas</div>
              <button
                onClick={() => setShowDropdown(false)}
                className="text-slate-400 hover:text-white"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <div className="mt-1 text-xs text-slate-400">
              {count} item{count !== 1 ? "s" : ""} precisando de atenção
            </div>
          </div>
          <div className="max-h-[60vh] sm:max-h-96 overflow-y-auto">
            {items.length === 0 ? (
              <div className="p-4 text-center text-xs sm:text-sm text-slate-400">
                Nenhuma manutenção próxima
              </div>
            ) : (
              items.map((item) => {
                const daysUntil = getDaysUntil(item.nextMaintenance);
                const urgencyColor = getUrgencyColor(daysUntil);
                const urgencyLabel = getUrgencyLabel(daysUntil);

                return (
                  <button
                    key={`${item.type}-${item._id}`}
                    onClick={() => {
                      setSelectedItem(item);
                      setShowDetailModal(true);
                      setShowDropdown(false);
                    }}
                    className="w-full text-left border-b border-white/5 p-3 transition hover:bg-white/5 active:bg-white/10 touch-manipulation min-h-[60px]"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] sm:text-xs font-semibold text-slate-400 uppercase">
                            {item.type === "equipment" ? "Equipamento" : "Máquina"}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-semibold ${urgencyColor}`}>
                            {urgencyLabel}
                          </span>
                        </div>
                        <div className="mt-1 text-xs sm:text-sm font-medium text-white break-words">{item.name}</div>
                        <div className="mt-1 text-[10px] sm:text-xs text-slate-400 break-words">
                          Próxima manutenção: {formatDate(item.nextMaintenance)}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <svg
                          className="h-4 w-4 text-slate-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
          {items.length > 0 && (
            <div className="border-t border-white/10 p-3 space-y-2">
              <Link
                to="/equipment"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-xs font-semibold text-emerald-400 transition hover:text-emerald-300 active:text-emerald-200 touch-manipulation min-h-[44px] flex items-center justify-center"
              >
                Ver todos os equipamentos →
              </Link>
              <Link
                to="/machines"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-xs font-semibold text-blue-400 transition hover:text-blue-300 active:text-blue-200 touch-manipulation min-h-[44px] flex items-center justify-center"
              >
                Ver todas as máquinas →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Detail Modal - Rendered via Portal at document body level */}
      {mounted && showDetailModal && selectedItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-start justify-center bg-black/70 p-4 pt-6 sm:pt-8 md:items-center overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 shadow-2xl max-h-[calc(100vh-2rem)] sm:max-h-[90vh] my-auto overflow-y-auto">
            <div className="border-b border-white/10 p-4 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className={`rounded-lg p-1.5 sm:p-2 flex-shrink-0 ${
                      selectedItem.type === "equipment" 
                        ? "bg-emerald-500/20" 
                        : "bg-blue-500/20"
                    }`}>
                      {selectedItem.type === "equipment" ? (
                        <svg className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 15h16l-2 5H6l-2-5Z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 15V9l6-4 6 4v6" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 17H2l-1-4h18l-1 4h-3" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17v-4" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17v-4" />
                        </svg>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs sm:text-sm font-semibold text-slate-400 uppercase">
                        {selectedItem.type === "equipment" ? "Equipamento" : "Máquina"}
                      </div>
                      <div className="text-lg sm:text-xl font-bold text-white break-words">{selectedItem.fullData?.name || selectedItem.name}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white flex-shrink-0 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {/* Urgency Alert */}
              {(() => {
                const daysUntil = getDaysUntil(selectedItem.nextMaintenance);
                const urgencyColor = getUrgencyColor(daysUntil);
                const urgencyLabel = getUrgencyLabel(daysUntil);
                const isOverdue = daysUntil < 0;
                const isUrgent = daysUntil <= 7;
                const maintenanceType = selectedItem.fullData?.nextMaintenanceType;
                const maintenanceDetails = selectedItem.fullData?.nextMaintenanceDetails;

                return (
                  <div className={`rounded-lg border p-3 sm:p-4 ${
                    isOverdue 
                      ? "border-red-500/50 bg-red-500/10" 
                      : isUrgent
                      ? "border-orange-500/50 bg-orange-500/10"
                      : "border-yellow-500/50 bg-yellow-500/10"
                  }`}>
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className={`text-xl sm:text-2xl flex-shrink-0 ${urgencyColor}`}>
                        {isOverdue ? "⚠️" : isUrgent ? "🔔" : "📅"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs sm:text-sm font-semibold ${urgencyColor}`}>
                          {isOverdue ? "Manutenção Atrasada" : isUrgent ? "Manutenção Urgente" : "Manutenção Próxima"}
                        </div>
                        <div className="text-xs text-slate-300 mt-1 break-words">
                          {urgencyLabel} • Data: {formatDate(selectedItem.nextMaintenance)}
                        </div>
                        {maintenanceType && (
                          <div className="mt-2 text-xs sm:text-sm">
                            <span className="font-semibold text-slate-200">Tipo: </span>
                            <span className="text-slate-300">{maintenanceType}</span>
                          </div>
                        )}
                        {maintenanceDetails && (
                          <div className="mt-2 text-xs text-slate-300 break-words">
                            <span className="font-semibold text-slate-200">Detalhes: </span>
                            {maintenanceDetails}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Item Details */}
              <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2">
                {selectedItem.type === "equipment" ? (
                  <>
                    {selectedItem.fullData?.patrimony && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Patrimônio</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.patrimony}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.serialNumber && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Número de Série</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.serialNumber}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.type && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Tipo</div>
                        <div className="mt-1 text-sm font-semibold text-white capitalize">{selectedItem.fullData.type}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.category && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Categoria</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.category}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.location && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Localização</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.location}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.assignedTo && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Alocado para</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.assignedTo}</div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {selectedItem.fullData?.plate && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Placa</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.plate}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.model && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Modelo</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.model}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.internalCode && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Código Interno</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.internalCode}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.lastMaintenance && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Última Manutenção</div>
                        <div className="mt-1 text-sm font-semibold text-white">{formatDate(selectedItem.fullData.lastMaintenance)}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.maintenanceVendor && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Fornecedor de Manutenção</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.maintenanceVendor}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.operatorName && (
                      <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                        <div className="text-xs text-slate-400 uppercase">Operador</div>
                        <div className="mt-1 text-sm font-semibold text-white">{selectedItem.fullData.operatorName}</div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Maintenance Details Section */}
              {(selectedItem.fullData?.nextMaintenanceType || selectedItem.fullData?.nextMaintenanceDetails) && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 sm:p-4">
                  <div className="text-xs sm:text-sm font-semibold text-blue-300 mb-3">Detalhes da Manutenção</div>
                  <div className="space-y-2">
                    {selectedItem.fullData?.nextMaintenanceType && (
                      <div>
                        <div className="text-xs text-slate-400 uppercase mb-1">Tipo de Manutenção</div>
                        <div className="text-xs sm:text-sm text-blue-200 font-medium">{selectedItem.fullData.nextMaintenanceType}</div>
                      </div>
                    )}
                    {selectedItem.fullData?.nextMaintenanceDetails && (
                      <div>
                        <div className="text-xs text-slate-400 uppercase mb-1">Detalhes Específicos</div>
                        <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap break-words">{selectedItem.fullData.nextMaintenanceDetails}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedItem.fullData?.notes && (
                <div className="rounded-lg border border-white/10 bg-white/5 p-3 sm:p-4">
                  <div className="text-xs text-slate-400 uppercase mb-2">Observações Gerais</div>
                  <div className="text-xs sm:text-sm text-slate-200 whitespace-pre-wrap break-words">{selectedItem.fullData.notes}</div>
                </div>
              )}

              {/* Instructions */}
              <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 sm:p-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="text-xl sm:text-2xl flex-shrink-0">📋</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs sm:text-sm font-semibold text-blue-300 mb-2">O que fazer:</div>
                    <ol className="space-y-2 text-xs sm:text-sm text-slate-200">
                      {selectedItem.fullData?.nextMaintenanceType && (
                        <li className="flex gap-2">
                          <span className="text-blue-400 font-bold flex-shrink-0">1.</span>
                          <span className="break-words">
                            Prepare o item para <strong className="text-blue-200">{selectedItem.fullData.nextMaintenanceType}</strong>
                            {selectedItem.fullData?.nextMaintenanceDetails && `: ${selectedItem.fullData.nextMaintenanceDetails}`}
                          </span>
                        </li>
                      )}
                      {!selectedItem.fullData?.nextMaintenanceType && (
                        <li className="flex gap-2">
                          <span className="text-blue-400 font-bold flex-shrink-0">1.</span>
                          <span className="break-words">Verifique a disponibilidade do item para manutenção</span>
                        </li>
                      )}
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold flex-shrink-0">{selectedItem.fullData?.nextMaintenanceType ? "2." : "2."}</span>
                        <span className="break-words">Agende a manutenção com o fornecedor ou equipe técnica</span>
                      </li>
                      <li className="flex gap-2">
                        <span className="text-blue-400 font-bold flex-shrink-0">{selectedItem.fullData?.nextMaintenanceType ? "3." : "3."}</span>
                        <span className="break-words">Atualize a data da próxima manutenção após a conclusão</span>
                      </li>
                      {(() => {
                        const daysUntil = getDaysUntil(selectedItem.nextMaintenance);
                        if (daysUntil < 0) {
                          return (
                            <li className="flex gap-2">
                              <span className="text-red-400 font-bold flex-shrink-0">⚠️</span>
                              <span className="text-red-300 font-semibold break-words">URGENTE: Este item está atrasado. Priorize a manutenção imediatamente.</span>
                            </li>
                          );
                        }
                        if (daysUntil <= 7) {
                          return (
                            <li className="flex gap-2">
                              <span className="text-orange-400 font-bold flex-shrink-0">⚠️</span>
                              <span className="text-orange-300 font-semibold break-words">Manutenção urgente. Agende o mais rápido possível.</span>
                            </li>
                          );
                        }
                        return null;
                      })()}
                    </ol>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4 border-t border-white/10">
                <Link
                  to={selectedItem.type === "equipment" ? "/equipment" : "/machines"}
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                  }}
                  className="flex-1 rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-4 py-3 text-center text-xs sm:text-sm font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/20 touch-manipulation min-h-[44px] flex items-center justify-center"
                >
                  Ver Detalhes Completos
                </Link>
                <button
                  onClick={() => {
                    setShowDetailModal(false);
                    setSelectedItem(null);
                  }}
                  className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-slate-200 transition hover:bg-white/10 touch-manipulation min-h-[44px]"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

