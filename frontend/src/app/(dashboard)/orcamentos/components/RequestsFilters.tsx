import { STATUS_LABELS, OrcamentoRequestStatus } from "../constants";

interface RequestsFiltersProps {
  search: string;
  setSearch: (value: string) => void;
  statusFilter: OrcamentoRequestStatus | "all";
  setStatusFilter: (value: OrcamentoRequestStatus | "all") => void;
  showArchived: boolean;
  setShowArchived: (value: boolean) => void;
}

export default function RequestsFilters({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  showArchived,
  setShowArchived
}: RequestsFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-3">
      <div className="flex-1">
        <input
          type="text"
          placeholder="Buscar por nome, telefone, email ou endereço..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
        />
      </div>
      <select
        value={statusFilter}
        onChange={(e) => setStatusFilter(e.target.value as OrcamentoRequestStatus | "all")}
        className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
      >
        <option value="all">Todos os status</option>
        {Object.entries(STATUS_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-2 px-3 py-2.5 rounded-lg border border-white/10 bg-slate-900/60 cursor-pointer hover:bg-slate-900/80 transition">
        <input
          type="checkbox"
          checked={showArchived}
          onChange={(e) => setShowArchived(e.target.checked)}
          className="w-4 h-4 rounded border-white/20 bg-slate-800 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0"
        />
        <span className="text-sm text-white">Mostrar arquivados</span>
      </label>
    </div>
  );
}

