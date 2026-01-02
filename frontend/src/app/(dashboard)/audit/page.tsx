"use client";

import { useState, useEffect } from "react";
import { apiFetch } from "@/lib/api-client";
import { Audit } from "@/models/Audit";

const ACTION_LABELS: Record<string, string> = {
  create: "Criar",
  update: "Atualizar",
  delete: "Excluir",
  view: "Visualizar",
  download: "Download",
  login: "Login",
  logout: "Logout",
  upload: "Upload",
  other: "Outro"
};

const RESOURCE_LABELS: Record<string, string> = {
  document: "Documento",
  user: "Usuário",
  client: "Cliente",
  job: "Ordem de Serviço",
  employee: "Funcionário",
  team: "Equipe",
  machine: "Máquina",
  equipment: "Equipamento",
  transaction: "Transação",
  cashier: "Caixa",
  file: "Arquivo",
  other: "Outro"
};

export default function AuditPage() {
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    resource: "",
    action: "",
    userId: ""
  });

  useEffect(() => {
    loadAudits();
  }, [filters]);

  const loadAudits = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.resource) params.append("resource", filters.resource);
      if (filters.action) params.append("action", filters.action);
      if (filters.userId) params.append("userId", filters.userId);

      const res = await apiFetch(`/audit?${params.toString()}`);
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setAudits(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return "-";
    const d = new Date(date);
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(d);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando logs de auditoria...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Auditoria</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">Registro de todas as ações realizadas no sistema</p>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Recurso</label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters((f) => ({ ...f, resource: e.target.value }))}
              className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
            >
              <option value="">Todos</option>
              {Object.entries(RESOURCE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Ação</label>
            <select
              value={filters.action}
              onChange={(e) => setFilters((f) => ({ ...f, action: e.target.value }))}
              className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
            >
              <option value="">Todas</option>
              {Object.entries(ACTION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">Usuário</label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters((f) => ({ ...f, userId: e.target.value }))}
              placeholder="ID do usuário..."
              className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
            />
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-800/50 border-b border-white/10">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Data/Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Usuário
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Ação
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Recurso
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Detalhes
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {audits.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    Nenhum log de auditoria encontrado
                  </td>
                </tr>
              ) : (
                audits.map((audit) => (
                  <tr key={audit._id?.toString()} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-sm text-slate-300 whitespace-nowrap">
                      {formatDate(audit.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      <div>
                        <div className="font-medium">{audit.userName || audit.userEmail || "-"}</div>
                        {audit.userEmail && audit.userName && (
                          <div className="text-xs text-slate-400">{audit.userEmail}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span
                        className={`inline-flex px-2 py-1 rounded-full text-xs font-semibold ${
                          audit.action === "create"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : audit.action === "update"
                            ? "bg-blue-500/20 text-blue-300"
                            : audit.action === "delete"
                            ? "bg-red-500/20 text-red-300"
                            : audit.action === "download" || audit.action === "view"
                            ? "bg-purple-500/20 text-purple-300"
                            : "bg-slate-500/20 text-slate-300"
                        }`}
                      >
                        {ACTION_LABELS[audit.action] || audit.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-300">
                      <div>
                        <div className="font-medium">
                          {RESOURCE_LABELS[audit.resource] || audit.resource}
                        </div>
                        {audit.resourceName && (
                          <div className="text-xs text-slate-400 truncate max-w-xs">
                            {audit.resourceName}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-400">
                      <div className="max-w-md truncate" title={audit.details}>
                        {audit.details || "-"}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden space-y-3 p-3">
          {audits.length === 0 ? (
            <div className="px-4 py-8 text-center text-slate-400 text-sm">
              Nenhum log de auditoria encontrado
            </div>
          ) : (
            audits.map((audit) => (
              <div
                key={audit._id?.toString()}
                className="rounded-lg border border-white/10 bg-slate-800/30 p-3 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs text-slate-400 mb-1">
                      {formatDate(audit.createdAt)}
                    </div>
                    <div className="text-sm font-semibold text-white break-words">
                      {audit.userName || audit.userEmail || "-"}
                    </div>
                    {audit.userEmail && audit.userName && (
                      <div className="text-xs text-slate-400 break-words">{audit.userEmail}</div>
                    )}
                  </div>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-[10px] font-semibold flex-shrink-0 ${
                      audit.action === "create"
                        ? "bg-emerald-500/20 text-emerald-300"
                        : audit.action === "update"
                        ? "bg-blue-500/20 text-blue-300"
                        : audit.action === "delete"
                        ? "bg-red-500/20 text-red-300"
                        : audit.action === "download" || audit.action === "view"
                        ? "bg-purple-500/20 text-purple-300"
                        : "bg-slate-500/20 text-slate-300"
                    }`}
                  >
                    {ACTION_LABELS[audit.action] || audit.action}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div>
                    <span className="text-slate-400">Recurso:</span>
                    <span className="text-slate-200 ml-1 font-medium">
                      {RESOURCE_LABELS[audit.resource] || audit.resource}
                    </span>
                  </div>
                  {audit.resourceName && (
                    <div className="break-words">
                      <span className="text-slate-400">Nome:</span>
                      <span className="text-slate-200 ml-1">{audit.resourceName}</span>
                    </div>
                  )}
                  {audit.details && (
                    <div className="break-words pt-1 border-t border-white/5">
                      <span className="text-slate-400">Detalhes:</span>
                      <p className="text-slate-300 mt-0.5">{audit.details}</p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

