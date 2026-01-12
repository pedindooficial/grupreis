import React from "react";
import { Status } from "../constants";

interface JobsFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: Status | "all";
  setStatusFilter: (value: Status | "all") => void;
  dateFilter: "all" | "ontem" | "hoje" | "amanha" | "esse_mes" | "esse_ano" | "custom";
  setDateFilter: (value: "all" | "ontem" | "hoje" | "amanha" | "esse_mes" | "esse_ano" | "custom") => void;
  tempCustomDateStart: string;
  setTempCustomDateStart: (value: string) => void;
  tempCustomDateEnd: string;
  setTempCustomDateEnd: (value: string) => void;
  customDateStart: string;
  customDateEnd: string;
  setCustomDateStart: (value: string) => void;
  setCustomDateEnd: (value: string) => void;
}

export default function JobsFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  dateFilter,
  setDateFilter,
  tempCustomDateStart,
  setTempCustomDateStart,
  tempCustomDateEnd,
  setTempCustomDateEnd,
  customDateStart,
  customDateEnd,
  setCustomDateStart,
  setCustomDateEnd
}: JobsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-4 py-3">
      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Buscar por título, cliente ou obra"
        className="w-full sm:w-64 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 px-2 py-3 sm:px-0 touch-manipulation"
      />
      <div className="flex items-center gap-2 text-xs text-slate-200">
        <span className="hidden sm:inline">Status:</span>
        <div className="relative flex-1 sm:flex-initial">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full sm:w-auto appearance-none rounded-md border border-white/10 bg-slate-900 px-3 py-3 pr-7 text-xs font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400 touch-manipulation"
          >
            <option value="all">Todos</option>
            <option value="pendente">Pendente</option>
            <option value="em_execucao">Em execução</option>
            <option value="concluida">Concluída</option>
            <option value="cancelada">Cancelada</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
            ▼
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-slate-200">
        <span className="hidden sm:inline">Data:</span>
        <div className="relative flex-1 sm:flex-initial">
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as any);
              if (e.target.value !== "custom") {
                setCustomDateStart("");
                setCustomDateEnd("");
                setTempCustomDateStart("");
                setTempCustomDateEnd("");
              } else {
                // Initialize temp dates with current applied dates when switching to custom
                setTempCustomDateStart(customDateStart);
                setTempCustomDateEnd(customDateEnd);
              }
            }}
            className="w-full sm:w-auto appearance-none rounded-md border border-white/10 bg-slate-900 px-3 py-3 pr-7 text-xs font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400 touch-manipulation"
          >
            <option value="all">Todas</option>
            <option value="ontem">Ontem</option>
            <option value="hoje">Hoje</option>
            <option value="amanha">Amanhã</option>
            <option value="esse_mes">Esse Mês</option>
            <option value="esse_ano">Esse ano</option>
            <option value="custom">Período personalizado</option>
          </select>
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
            ▼
          </span>
        </div>
      </div>
      {dateFilter === "custom" && (
        <div className="flex items-center gap-2 text-xs text-slate-200">
          <input
            type="date"
            value={tempCustomDateStart}
            onChange={(e) => setTempCustomDateStart(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-xs text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400 touch-manipulation"
            placeholder="Data inicial"
          />
          <span className="text-slate-400">até</span>
          <input
            type="date"
            value={tempCustomDateEnd}
            onChange={(e) => setTempCustomDateEnd(e.target.value)}
            className="w-full sm:w-auto rounded-md border border-white/10 bg-slate-900 px-3 py-3 text-xs text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400 touch-manipulation"
            placeholder="Data final"
          />
          <button
            onClick={() => {
              setCustomDateStart(tempCustomDateStart);
              setCustomDateEnd(tempCustomDateEnd);
            }}
            disabled={!tempCustomDateStart || !tempCustomDateEnd}
            className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-3 text-xs font-semibold text-emerald-300 transition hover:bg-emerald-500/30 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation active:scale-95"
          >
            Buscar
          </button>
        </div>
      )}
    </div>
  );
}

