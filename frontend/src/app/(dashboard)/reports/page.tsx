"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

const COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value);
};

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"week" | "month" | "quarter" | "year">("month");
  
  // Financial Data
  const [financialData, setFinancialData] = useState<any>(null);
  const [revenueByMonth, setRevenueByMonth] = useState<any[]>([]);
  const [expensesByMonth, setExpensesByMonth] = useState<any[]>([]);
  const [paymentByMethod, setPaymentByMethod] = useState<any[]>([]);
  
  // Jobs/OS Data
  const [jobsData, setJobsData] = useState<any>(null);
  const [jobsByStatus, setJobsByStatus] = useState<any[]>([]);
  const [jobsByMonth, setJobsByMonth] = useState<any[]>([]);
  const [completionRate, setCompletionRate] = useState(0);
  
  // Team Data
  const [teamsData, setTeamsData] = useState<any>(null);
  const [teamPerformance, setTeamPerformance] = useState<any[]>([]);
  
  // Services Data
  const [servicesData, setServicesData] = useState<any>(null);
  const [serviceProfitability, setServiceProfitability] = useState<any[]>([]);
  
  // KPI Data
  const [kpis, setKpis] = useState<any>(null);

  useEffect(() => {
    loadReportsData();
  }, [dateRange]);

  const loadReportsData = async () => {
    try {
      setLoading(true);
      const [financialRes, jobsRes, teamsRes, servicesRes, kpisRes] = await Promise.all([
        apiFetch(`/reports/financial?range=${dateRange}`, { cache: "no-store" }),
        apiFetch(`/reports/jobs?range=${dateRange}`, { cache: "no-store" }),
        apiFetch(`/reports/teams?range=${dateRange}`, { cache: "no-store" }),
        apiFetch(`/reports/services?range=${dateRange}`, { cache: "no-store" }),
        apiFetch(`/reports/kpis?range=${dateRange}`, { cache: "no-store" })
      ]);

      const financialData = await financialRes.json().catch(() => null);
      const jobsData = await jobsRes.json().catch(() => null);
      const teamsData = await teamsRes.json().catch(() => null);
      const servicesData = await servicesRes.json().catch(() => null);
      const kpisData = await kpisRes.json().catch(() => null);

      if (financialRes.ok && financialData?.data) {
        setFinancialData(financialData.data);
        setRevenueByMonth(financialData.data.revenueByMonth || []);
        setExpensesByMonth(financialData.data.expensesByMonth || []);
        setPaymentByMethod(financialData.data.paymentByMethod || []);
      }

      if (jobsRes.ok && jobsData?.data) {
        setJobsData(jobsData.data);
        setJobsByStatus(jobsData.data.byStatus || []);
        setJobsByMonth(jobsData.data.byMonth || []);
        setCompletionRate(jobsData.data.completionRate || 0);
      }

      if (teamsRes.ok && teamsData?.data) {
        setTeamsData(teamsData.data);
        setTeamPerformance(teamsData.data.performance || []);
      }

      if (servicesRes.ok && servicesData?.data) {
        setServicesData(servicesData.data);
        setServiceProfitability(servicesData.data.services || []);
      }

      if (kpisRes.ok && kpisData?.data) {
        setKpis(kpisData.data);
      }
    } catch (err) {
      console.error("Error loading reports:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
          <p className="text-sm text-slate-300">Carregando relatórios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Relatórios</h1>
          <p className="text-sm text-slate-400 mt-1">
            Análise detalhada de métricas e desempenho
          </p>
        </div>
        <div className="flex gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as any)}
            className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
          >
            <option value="week">Última Semana</option>
            <option value="month">Último Mês</option>
            <option value="quarter">Último Trimestre</option>
            <option value="year">Último Ano</option>
          </select>
        </div>
      </div>

      {/* KPIs */}
      {kpis && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="text-xs text-emerald-300/80 mb-1">Receita Total</div>
            <div className="text-2xl font-bold text-emerald-300">
              {formatCurrency(kpis.totalRevenue || 0)}
            </div>
            <div className="text-xs text-emerald-200/60 mt-1">
              {kpis.revenueChange ? (
                <span className={kpis.revenueChange >= 0 ? "text-emerald-300" : "text-red-300"}>
                  {kpis.revenueChange >= 0 ? "↑" : "↓"} {Math.abs(kpis.revenueChange)}%
                </span>
              ) : null}
            </div>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="text-xs text-blue-300/80 mb-1">OS Concluídas</div>
            <div className="text-2xl font-bold text-blue-300">
              {kpis.completedJobs || 0}
            </div>
            <div className="text-xs text-blue-200/60 mt-1">
              {kpis.completionRate ? `${kpis.completionRate.toFixed(1)}% de conclusão` : null}
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
            <div className="text-xs text-purple-300/80 mb-1">Equipes Ativas</div>
            <div className="text-2xl font-bold text-purple-300">
              {kpis.activeTeams || 0}
            </div>
            <div className="text-xs text-purple-200/60 mt-1">
              {kpis.totalTeams ? `${kpis.totalTeams} total` : null}
            </div>
          </div>
          <div className="rounded-xl border border-orange-500/30 bg-orange-500/10 p-4">
            <div className="text-xs text-orange-300/80 mb-1">Ticket Médio</div>
            <div className="text-2xl font-bold text-orange-300">
              {formatCurrency(kpis.averageTicket || 0)}
            </div>
            <div className="text-xs text-orange-200/60 mt-1">
              Por ordem de serviço
            </div>
          </div>
        </div>
      )}

      {/* Financial Summary Cards */}
      {financialData && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="text-xs text-emerald-300/80 mb-1">Receita Total</div>
            <div className="text-2xl font-bold text-emerald-300">
              {formatCurrency(financialData.totalRevenue || 0)}
            </div>
          </div>
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
            <div className="text-xs text-red-300/80 mb-1">Despesas Total</div>
            <div className="text-2xl font-bold text-red-300">
              {formatCurrency(financialData.totalExpenses || 0)}
            </div>
          </div>
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4">
            <div className="text-xs text-blue-300/80 mb-1">Lucro Líquido</div>
            <div className="text-2xl font-bold text-blue-300">
              {formatCurrency(financialData.netProfit || 0)}
            </div>
          </div>
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-4">
            <div className="text-xs text-purple-300/80 mb-1">Transações</div>
            <div className="text-2xl font-bold text-purple-300">
              {financialData.totalTransactions || 0}
            </div>
            <div className="text-xs text-purple-200/60 mt-1">
              {financialData.totalEntries || 0} entradas • {financialData.totalExits || 0} saídas
            </div>
          </div>
        </div>
      )}

      {/* Financial Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue vs Expenses */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Receita vs Despesas</h2>
          {revenueByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    border: "1px solid #334155", 
                    borderRadius: "8px",
                    color: "#ffffff",
                    padding: "12px"
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                  formatter={(value: any) => formatCurrency(value)}
                />
                <Legend 
                  wrapperStyle={{ color: "#e2e8f0" }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} name="Receita" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Despesas" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-400 py-12">Sem dados disponíveis</div>
          )}
        </div>

        {/* Revenue by Category */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Receita por Categoria</h2>
          {financialData?.revenueByCategory && financialData.revenueByCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={financialData.revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {financialData.revenueByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ 
                    backgroundColor: "#0f172a", 
                    border: "1px solid #334155", 
                    borderRadius: "8px",
                    color: "#ffffff",
                    padding: "12px"
                  }}
                  itemStyle={{ color: "#e2e8f0" }}
                  labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                  formatter={(value: any, name: any) => [
                    formatCurrency(value),
                    name || "Categoria"
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-400 py-12">Sem dados disponíveis</div>
          )}
        </div>
      </div>

      {/* Payment Method Chart */}
      {paymentByMethod.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Receita por Método de Pagamento</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={paymentByMethod}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #334155", 
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "12px"
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                formatter={(value: any) => formatCurrency(value)}
              />
              <Bar dataKey="value" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Jobs/OS Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Jobs by Status */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Ordens de Serviço por Status</h2>
          {jobsByStatus.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="status" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #334155", 
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "12px"
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
              />
              <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-400 py-12">Sem dados disponíveis</div>
          )}
        </div>

        {/* Jobs by Month */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">OS por Mês</h2>
          {jobsByMonth.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={jobsByMonth}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="month" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #334155", 
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "12px"
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
              />
              <Bar dataKey="count" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center text-slate-400 py-12">Sem dados disponíveis</div>
          )}
        </div>
      </div>

      {/* Completion Rate */}
      <div className="rounded-xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Taxa de Conclusão</h2>
        <div className="flex items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-slate-300">Progresso</span>
              <span className="text-lg font-bold text-emerald-300">{completionRate.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-slate-800 rounded-full h-6 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${completionRate}%` }}
              >
                {completionRate > 10 && (
                  <span className="text-xs font-semibold text-white">{completionRate.toFixed(0)}%</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Performance */}
      {teamPerformance.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Desempenho das Equipes</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={teamPerformance} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis type="number" stroke="#9ca3af" />
              <YAxis dataKey="name" type="category" stroke="#9ca3af" width={120} />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #334155", 
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "12px"
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
              />
              <Bar dataKey="completed" fill="#10b981" name="Concluídas" />
              <Bar dataKey="pending" fill="#f59e0b" name="Pendentes" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Service Profitability */}
      {serviceProfitability.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            Serviços Mais Lucrativos
            {servicesData?.totalServices && (
              <span className="text-sm font-normal text-slate-400 ml-2">
                (Top 10 de {servicesData.totalServices} serviços)
              </span>
            )}
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={serviceProfitability} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                type="number" 
                stroke="#9ca3af" 
                tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
              />
              <YAxis 
                dataKey="serviceName" 
                type="category" 
                stroke="#9ca3af" 
                width={200}
                tick={{ fontSize: 12 }}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: "#0f172a", 
                  border: "1px solid #334155", 
                  borderRadius: "8px",
                  color: "#ffffff",
                  padding: "12px"
                }}
                itemStyle={{ color: "#e2e8f0" }}
                labelStyle={{ color: "#ffffff", fontWeight: "bold", marginBottom: "4px" }}
                formatter={(value: any, name: string) => {
                  if (name === "totalRevenue") {
                    return [formatCurrency(value), "Receita Total"];
                  } else if (name === "averageValue") {
                    return [formatCurrency(value), "Ticket Médio"];
                  } else if (name === "totalCount") {
                    return [value, "Quantidade"];
                  }
                  return [value, name];
                }}
              />
              <Legend 
                wrapperStyle={{ color: "#e2e8f0" }}
              />
              <Bar dataKey="totalRevenue" fill="#10b981" name="Receita Total" />
              <Bar dataKey="averageValue" fill="#3b82f6" name="Ticket Médio" />
            </BarChart>
          </ResponsiveContainer>
          
          {/* Service Details Table */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-slate-300 font-semibold">Serviço</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">Receita Total</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">Ticket Médio</th>
                  <th className="text-right py-3 px-4 text-slate-300 font-semibold">Quantidade</th>
                </tr>
              </thead>
              <tbody>
                {serviceProfitability.map((service: any, index: number) => (
                  <tr key={index} className="border-b border-white/5 hover:bg-white/5 transition">
                    <td className="py-3 px-4 text-white font-medium">{service.serviceName}</td>
                    <td className="py-3 px-4 text-right text-emerald-300 font-semibold">
                      {formatCurrency(service.totalRevenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-blue-300">
                      {formatCurrency(service.averageValue)}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-300">
                      {service.totalCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

