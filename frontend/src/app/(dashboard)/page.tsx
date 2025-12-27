import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
type Job = {
  _id?: string;
  status?: string;
  plannedDate?: string;
  value?: number;
  finalValue?: number;
  discountPercent?: number;
  discountValue?: number;
  clientName?: string;
  createdAt?: string;
  startedAt?: string;
  finishedAt?: string;
  title?: string;
  services?: any[];
  team?: string;
};

export default function Home() {
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [machines, setMachines] = useState<any[]>([]);
  const [equipment, setEquipment] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [maintenanceRecords, setMaintenanceRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null); // null = all teams

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [
          clientsRes,
          jobsRes,
          employeesRes,
          teamsRes,
          machinesRes,
          equipmentRes,
          transactionsRes,
          maintenanceRes
        ] = await Promise.all([
          apiFetch("/clients", { cache: "no-store" }),
          apiFetch("/jobs", { cache: "no-store" }),
          apiFetch("/employees", { cache: "no-store" }),
          apiFetch("/teams", { cache: "no-store" }),
          apiFetch("/machines", { cache: "no-store" }),
          apiFetch("/equipment", { cache: "no-store" }),
          apiFetch("/cash", { cache: "no-store" }),
          apiFetch("/maintenance", { cache: "no-store" })
        ]);

        const clientsData = await clientsRes.json().catch(() => null);
        const jobsData = await jobsRes.json().catch(() => null);
        const employeesData = await employeesRes.json().catch(() => null);
        const teamsData = await teamsRes.json().catch(() => null);
        const machinesData = await machinesRes.json().catch(() => null);
        const equipmentData = await equipmentRes.json().catch(() => null);
        const transactionsData = await transactionsRes.json().catch(() => null);
        const maintenanceData = await maintenanceRes.json().catch(() => null);

        setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
        setJobs(Array.isArray(jobsData?.data) ? jobsData.data : []);
        setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
        setTeams(Array.isArray(teamsData?.data) ? teamsData.data : []);
        setMachines(Array.isArray(machinesData?.data) ? machinesData.data : []);
        setEquipment(Array.isArray(equipmentData?.data) ? equipmentData.data : []);
        setTransactions(Array.isArray(transactionsData?.data) ? transactionsData.data : []);
        setMaintenanceRecords(Array.isArray(maintenanceData?.data) ? maintenanceData.data : []);
      } catch (err) {
        console.error("Erro ao carregar dados do dashboard", err);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  // Filter jobs by selected team
  const filteredJobs = useMemo(() => {
    if (!selectedTeam) return jobs;
    return jobs.filter((j) => j.team === selectedTeam);
  }, [jobs, selectedTeam]);

  const stats = useMemo(() => {
    const totalJobs = filteredJobs.length;
    const jobsActive = filteredJobs.filter((j) => j.status === "em_execucao").length;
    const jobsPending = filteredJobs.filter((j) => j.status === "pendente").length;
    const jobsDone = filteredJobs.filter((j) => j.status === "concluida").length;
    const jobsCanceled = filteredJobs.filter((j) => j.status === "cancelada").length;

    // Serviços concluídos com dados de tempo
    const completedJobs = filteredJobs.filter((j) => j.status === "concluida" && j.startedAt && j.finishedAt);
    
    // Calcular tempos de execução
    const executionTimes = completedJobs.map((j) => {
      const start = new Date(j.startedAt!).getTime();
      const finish = new Date(j.finishedAt!).getTime();
      return finish - start; // em milissegundos
    });

    const totalExecutionTime = executionTimes.reduce((sum, time) => sum + time, 0);
    const avgExecutionTime = executionTimes.length > 0 ? totalExecutionTime / executionTimes.length : 0;
    const minExecutionTime = executionTimes.length > 0 ? Math.min(...executionTimes) : 0;
    const maxExecutionTime = executionTimes.length > 0 ? Math.max(...executionTimes) : 0;

    // Converter para horas, minutos, segundos
    const formatDuration = (ms: number) => {
      const hours = Math.floor(ms / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      if (hours > 0) return `${hours}h ${minutes}min`;
      if (minutes > 0) return `${minutes}min ${seconds}s`;
      return `${seconds}s`;
    };

    // Valores financeiros das OS
    const totalValue = filteredJobs.reduce((sum, j) => sum + (j.value || 0), 0);
    const completedValue = filteredJobs
      .filter((j) => j.status === "concluida")
      .reduce((sum, j) => sum + (j.finalValue || j.value || 0), 0);
    const pendingValue = filteredJobs
      .filter((j) => j.status === "pendente" || j.status === "em_execucao")
      .reduce((sum, j) => sum + (j.finalValue || j.value || 0), 0);

    // Funcionários
    const activeEmployees = employees.filter((e) => e.status === "ativo").length;
    const totalSalary = employees
      .filter((e) => e.status === "ativo")
      .reduce((sum, e) => sum + (e.salary || 0), 0);

    // Equipes
    const activeTeams = teams.filter((t) => t.status === "ativa").length;

    // Máquinas
    const activeMachines = machines.filter((m) => m.status === "ativa").length;
    const operatingMachines = machines.filter((m) => m.statusOperational === "operando").length;

    // Equipamentos
    const activeEquipment = equipment.filter((e) => e.status === "ativo").length;

    // Transações financeiras
    const today = new Date().toISOString().split("T")[0];
    const todayTransactions = transactions.filter((t) => t.date === today);
    const todayEntradas = todayTransactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todaySaidas = todayTransactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todaySaldo = todayEntradas - todaySaidas;

    const totalEntradas = transactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaidas = transactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaldo = totalEntradas - totalSaidas;

    return {
      totalJobs,
      jobsActive,
      jobsPending,
      jobsDone,
      jobsCanceled,
      totalValue,
      completedValue,
      pendingValue,
      activeEmployees,
      totalSalary,
      activeTeams,
      activeMachines,
      operatingMachines,
      activeEquipment,
      todayEntradas,
      todaySaidas,
      todaySaldo,
      totalEntradas,
      totalSaidas,
      totalSaldo,
      completedJobsWithTime: completedJobs.length,
      totalExecutionTime,
      avgExecutionTime,
      minExecutionTime,
      maxExecutionTime,
      formatDuration
    };
  }, [filteredJobs, employees, teams, machines, equipment, transactions]);

  const weekData = useMemo(() => {
    const days = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const counts = Array(7).fill(0);
    filteredJobs.forEach((j) => {
      if (j.plannedDate) {
        const d = new Date(j.plannedDate);
        const dow = isNaN(d.getTime()) ? null : d.getDay();
        if (dow !== null) counts[dow] += 1;
      }
    });
    const max = Math.max(1, ...counts);
    return days.map((label, idx) => ({
      label,
      value: counts[idx],
      pct: Math.round((counts[idx] / max) * 100)
    }));
  }, [filteredJobs]);

  const monthData = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }).map((_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      return {
        key: `${d.getFullYear()}-${d.getMonth()}`,
        label: d.toLocaleString("pt-BR", { month: "short" }),
        count: 0,
        value: 0
      };
    });
    const map = new Map(months.map((m) => [m.key, m]));
    filteredJobs.forEach((j) => {
      if (j.plannedDate) {
        const d = new Date(j.plannedDate);
        if (!isNaN(d.getTime())) {
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          const item = map.get(key);
          if (item) {
            item.count += 1;
            item.value += j.finalValue || j.value || 0;
          }
        }
      }
    });
    const data = Array.from(map.values());
    const maxCount = Math.max(1, ...data.map((m) => m.count));
    const maxValue = Math.max(1, ...data.map((m) => m.value));
    return data.map((m) => ({
      ...m,
      pct: Math.round((m.count / maxCount) * 100),
      valuePct: Math.round((m.value / maxValue) * 100)
    }));
  }, [filteredJobs]);

  const recentJobs = useMemo(() => {
    return filteredJobs
      .sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5);
  }, [filteredJobs]);

  const topClients = useMemo(() => {
    const clientMap = new Map<string, { name: string; count: number; value: number }>();
    filteredJobs.forEach((j) => {
      if (j.clientName) {
        const existing = clientMap.get(j.clientName) || { name: j.clientName, count: 0, value: 0 };
        existing.count += 1;
        existing.value += j.finalValue || j.value || 0;
        clientMap.set(j.clientName, existing);
      }
    });
    return Array.from(clientMap.values())
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  }, [filteredJobs]);

  // Estatísticas de tempo por período
  const executionTimeByPeriod = useMemo(() => {
    const completedJobs = filteredJobs.filter((j) => j.status === "concluida" && j.startedAt && j.finishedAt);
    const now = new Date();
    const periods = {
      hoje: { count: 0, totalTime: 0 },
      semana: { count: 0, totalTime: 0 },
      mes: { count: 0, totalTime: 0 },
      total: { count: 0, totalTime: 0 }
    };

    completedJobs.forEach((j) => {
      const finishDate = new Date(j.finishedAt!);
      const startTime = new Date(j.startedAt!).getTime();
      const finishTime = finishDate.getTime();
      const duration = finishTime - startTime;

      periods.total.count += 1;
      periods.total.totalTime += duration;

      const daysDiff = (now.getTime() - finishTime) / (1000 * 60 * 60 * 24);
      if (daysDiff <= 1) {
        periods.hoje.count += 1;
        periods.hoje.totalTime += duration;
      }
      if (daysDiff <= 7) {
        periods.semana.count += 1;
        periods.semana.totalTime += duration;
      }
      if (daysDiff <= 30) {
        periods.mes.count += 1;
        periods.mes.totalTime += duration;
      }
    });

    return periods;
  }, [filteredJobs]);

  // Taxa de conclusão
  const completionRate = useMemo(() => {
    const total = filteredJobs.length;
    const completed = filteredJobs.filter((j) => j.status === "concluida").length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [filteredJobs]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-300">Carregando dados...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-emerald-100">
            Visão geral do painel
          </div>
          <h1 className="mt-3 text-3xl font-semibold leading-tight text-white md:text-4xl">
            Dashboard consolidado
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            KPIs gerais, serviços, financeiro, funcionários e recursos. Dados em tempo real.
          </p>
        </div>
      </div>

      {/* KPIs Principais */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-blue-300/40">
          <div className="text-[11px] uppercase tracking-wide text-blue-200">Ordens de Serviço</div>
          <div className="mt-2 text-3xl font-semibold text-blue-100">{stats.totalJobs}</div>
          <div className="mt-1 text-xs text-blue-200/70">
            {stats.jobsActive} em execução • {stats.jobsPending} pendentes
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-4 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-emerald-300/40">
          <div className="text-[11px] uppercase tracking-wide text-emerald-200">
            Valor Total (OS)
          </div>
          <div className="mt-2 text-3xl font-semibold text-emerald-100">
            {formatCurrency(stats.totalValue)}
          </div>
          <div className="mt-1 text-xs text-emerald-200/70">
            {formatCurrency(stats.completedValue)} concluídas
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-purple-500/20 to-purple-600/10 p-4 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-purple-300/40">
          <div className="text-[11px] uppercase tracking-wide text-purple-200">
            Saldo Financeiro
          </div>
          <div
            className={`mt-2 text-3xl font-semibold ${
              stats.totalSaldo >= 0 ? "text-purple-100" : "text-red-100"
            }`}
          >
            {formatCurrency(stats.totalSaldo)}
          </div>
          <div className="mt-1 text-xs text-purple-200/70">
            {formatCurrency(stats.todaySaldo)} hoje
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-4 shadow-lg shadow-black/30 transition hover:-translate-y-1 hover:border-orange-300/40">
          <div className="text-[11px] uppercase tracking-wide text-orange-200">Funcionários</div>
          <div className="mt-2 text-3xl font-semibold text-orange-100">{stats.activeEmployees}</div>
          <div className="mt-1 text-xs text-orange-200/70">
            Folha: {formatCurrency(stats.totalSalary)}
          </div>
        </div>
      </div>

      {/* KPIs Secundários */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Clientes</div>
          <div className="mt-2 text-2xl font-semibold text-white">{clients.length}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Equipes Ativas</div>
          <div className="mt-2 text-2xl font-semibold text-white">{stats.activeTeams}</div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Máquinas</div>
          <div className="mt-2 text-2xl font-semibold text-white">
            {stats.activeMachines} ({stats.operatingMachines} operando)
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Equipamentos</div>
          <div className="mt-2 text-2xl font-semibold text-white">{stats.activeEquipment}</div>
        </div>
      </div>

      {/* Gráficos e Estatísticas */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Serviços por dia da semana</div>
              <div className="text-xs text-slate-300">Distribuição das OS pela data agendada</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {weekData.map((d) => (
              <div key={d.label} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span>{d.label}</span>
                  <span className="text-slate-200">{d.value}</span>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-emerald-400 to-blue-500"
                    style={{ width: `${d.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-white">Serviços por mês (últimos 6)</div>
              <div className="text-xs text-slate-300">Quantidade e valores</div>
            </div>
          </div>
          <div className="mt-4 space-y-3">
            {monthData.map((m) => (
              <div key={m.key} className="space-y-1">
                <div className="flex justify-between text-xs text-slate-300">
                  <span className="uppercase">{m.label}</span>
                  <div className="flex gap-3">
                    <span className="text-slate-200">{m.count} OS</span>
                    <span className="text-emerald-300 font-semibold">
                      {formatCurrency(m.value)}
                    </span>
                  </div>
                </div>
                <div className="h-2 rounded-full bg-slate-800">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-blue-400 to-emerald-500"
                    style={{ width: `${m.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* OS Recentes e Top Clientes */}
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
          <div className="mb-4 text-sm font-semibold text-white">OS Recentes</div>
          <div className="space-y-2">
            {recentJobs.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhuma OS cadastrada</div>
            ) : (
              recentJobs.map((job) => (
                <div
                  key={job._id}
                  className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white text-xs">
                        {job.clientName || "Cliente não informado"}
                      </div>
                      <div className="text-xs text-slate-400 mt-1">
                        {job.plannedDate || "Sem data"}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className={`text-xs font-semibold px-2 py-1 rounded ${
                          job.status === "concluida"
                            ? "bg-emerald-500/20 text-emerald-300"
                            : job.status === "em_execucao"
                            ? "bg-blue-500/20 text-blue-300"
                            : job.status === "pendente"
                            ? "bg-yellow-500/20 text-yellow-300"
                            : "bg-red-500/20 text-red-300"
                        }`}
                      >
                        {job.status === "concluida"
                          ? "Concluída"
                          : job.status === "em_execucao"
                          ? "Em execução"
                          : job.status === "pendente"
                          ? "Pendente"
                          : "Cancelada"}
                      </div>
                      {(job.finalValue || job.value) && (
                        <div className="text-xs text-emerald-300 mt-1 font-semibold">
                          {formatCurrency(job.finalValue || job.value || 0)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
          <div className="mb-4 text-sm font-semibold text-white">Top 5 Clientes</div>
          <div className="space-y-2">
            {topClients.length === 0 ? (
              <div className="text-sm text-slate-400">Nenhum cliente com serviços</div>
            ) : (
              topClients.map((client, idx) => (
                <div
                  key={idx}
                  className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/20 text-xs font-semibold text-emerald-300">
                        {idx + 1}
                      </div>
                      <div>
                        <div className="font-semibold text-white text-xs">{client.name}</div>
                        <div className="text-xs text-slate-400">{client.count} OS</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-semibold text-emerald-300">
                        {formatCurrency(client.value)}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Estatísticas de Tempo de Execução */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-white">Estatísticas de Execução</div>
            <div className="text-xs text-slate-300">Análise de tempo de execução dos serviços concluídos</div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-300">Filtrar por equipe:</label>
            <select
              value={selectedTeam || ""}
              onChange={(e) => setSelectedTeam(e.target.value || null)}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="">Todas as equipes</option>
              {teams
                .filter((t) => t.status === "ativa")
                .map((team) => (
                  <option key={team._id} value={team.name}>
                    {team.name}
                  </option>
                ))}
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-4">
          <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
            <div className="text-[11px] uppercase tracking-wide text-emerald-300">Serviços com Tempo</div>
            <div className="mt-2 text-2xl font-semibold text-emerald-100">
              {stats.completedJobsWithTime}
            </div>
            <div className="mt-1 text-xs text-emerald-200/70">
              de {stats.jobsDone} concluídos
            </div>
          </div>
          <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
            <div className="text-[11px] uppercase tracking-wide text-blue-300">Tempo Médio</div>
            <div className="mt-2 text-2xl font-semibold text-blue-100">
              {stats.formatDuration(stats.avgExecutionTime)}
            </div>
            <div className="mt-1 text-xs text-blue-200/70">
              por serviço
            </div>
          </div>
          <div className="rounded-lg border border-purple-500/20 bg-purple-500/10 p-4">
            <div className="text-[11px] uppercase tracking-wide text-purple-300">Tempo Total</div>
            <div className="mt-2 text-2xl font-semibold text-purple-100">
              {stats.formatDuration(stats.totalExecutionTime)}
            </div>
            <div className="mt-1 text-xs text-purple-200/70">
              tempo acumulado
            </div>
          </div>
          <div className="rounded-lg border border-orange-500/20 bg-orange-500/10 p-4">
            <div className="text-[11px] uppercase tracking-wide text-orange-300">Taxa de Conclusão</div>
            <div className="mt-2 text-2xl font-semibold text-orange-100">
              {completionRate}%
            </div>
            <div className="mt-1 text-xs text-orange-200/70">
              {stats.jobsDone} de {stats.totalJobs} serviços
            </div>
          </div>
        </div>
        
        {/* Tempo por Período */}
        <div className="grid gap-4 md:grid-cols-4 mt-4 pt-4 border-t border-white/10">
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Hoje</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {executionTimeByPeriod.hoje.count > 0 
                ? stats.formatDuration(executionTimeByPeriod.hoje.totalTime / executionTimeByPeriod.hoje.count)
                : "—"}
            </div>
            <div className="text-xs text-slate-400">{executionTimeByPeriod.hoje.count} serviço(s)</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Esta Semana</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {executionTimeByPeriod.semana.count > 0
                ? stats.formatDuration(executionTimeByPeriod.semana.totalTime / executionTimeByPeriod.semana.count)
                : "—"}
            </div>
            <div className="text-xs text-slate-400">{executionTimeByPeriod.semana.count} serviço(s)</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Este Mês</div>
            <div className="mt-1 text-lg font-semibold text-white">
              {executionTimeByPeriod.mes.count > 0
                ? stats.formatDuration(executionTimeByPeriod.mes.totalTime / executionTimeByPeriod.mes.count)
                : "—"}
            </div>
            <div className="text-xs text-slate-400">{executionTimeByPeriod.mes.count} serviço(s)</div>
          </div>
          <div className="text-center">
            <div className="text-[11px] uppercase tracking-wide text-slate-400">Variação</div>
            <div className="mt-1 text-xs font-semibold text-white">
              <div>Mín: {stats.formatDuration(stats.minExecutionTime)}</div>
              <div className="mt-1">Máx: {stats.formatDuration(stats.maxExecutionTime)}</div>
            </div>
            <div className="text-xs text-slate-400">tempo de execução</div>
          </div>
        </div>
      </div>

      {/* Estatísticas Financeiras */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Entradas (Hoje)</div>
          <div className="mt-2 text-2xl font-semibold text-emerald-300">
            {formatCurrency(stats.todayEntradas)}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Total: {formatCurrency(stats.totalEntradas)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Saídas (Hoje)</div>
          <div className="mt-2 text-2xl font-semibold text-red-300">
            {formatCurrency(stats.todaySaidas)}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            Total: {formatCurrency(stats.totalSaidas)}
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="text-[11px] uppercase tracking-wide text-slate-400">Valor Pendente</div>
          <div className="mt-2 text-2xl font-semibold text-yellow-300">
            {formatCurrency(stats.pendingValue)}
          </div>
          <div className="mt-1 text-xs text-slate-300">
            OS em andamento
          </div>
        </div>
      </div>

      {/* Manutenção Section */}
      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-orange-100">
              Gestão de Manutenção
            </div>
            <h2 className="mt-3 text-2xl font-semibold leading-tight text-white md:text-3xl">
              Manutenções
            </h2>
            <p className="mt-1 text-sm text-slate-300">
              Visão geral de manutenções de equipamentos e máquinas
            </p>
          </div>
        </div>

        {/* Maintenance Stats */}
        {(() => {
          const getDaysUntil = (dateString: string): number => {
            if (!dateString) return Infinity;
            try {
              let maintenanceDate: Date;
              if (dateString.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
                const [day, month, year] = dateString.split('/').map(Number);
                maintenanceDate = new Date(year, month - 1, day);
              } else if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
                maintenanceDate = new Date(dateString);
              } else {
                maintenanceDate = new Date(dateString);
              }
              if (isNaN(maintenanceDate.getTime())) return Infinity;
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              maintenanceDate.setHours(0, 0, 0, 0);
              const diffTime = maintenanceDate.getTime() - today.getTime();
              return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } catch {
              return Infinity;
            }
          };

          const formatDate = (dateString: string | undefined | null): string => {
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

          // Get all items with nextMaintenance dates
          const allItemsWithMaintenance = [
            ...equipment.filter((e) => e.nextMaintenance && e.status === "ativo").map((e) => ({
              ...e,
              type: "equipment" as const,
              itemName: e.name
            })),
            ...machines.filter((m) => m.nextMaintenance && m.status === "ativa").map((m) => ({
              ...m,
              type: "machine" as const,
              itemName: m.name
            }))
          ];

          // Check maintenance history for nextMaintenanceDate
          const itemsWithEffectiveDates = allItemsWithMaintenance.map((item) => {
            // Find most recent maintenance record for this item
            const itemMaintenance = maintenanceRecords
              .filter((m) => m.itemId === item._id && m.itemType === item.type)
              .sort((a, b) => {
                const dateA = new Date(a.date).getTime();
                const dateB = new Date(b.date).getTime();
                return dateB - dateA;
              });

            // Use nextMaintenanceDate from most recent maintenance record if available
            const effectiveNextMaintenance = itemMaintenance.find((m) => m.nextMaintenanceDate)?.nextMaintenanceDate || item.nextMaintenance;

            return {
              ...item,
              effectiveNextMaintenance,
              daysUntil: getDaysUntil(effectiveNextMaintenance)
            };
          });

          const upcomingMaintenance = itemsWithEffectiveDates
            .filter((item) => item.daysUntil <= 30 && item.daysUntil >= -7)
            .sort((a, b) => a.daysUntil - b.daysUntil);

          const overdueMaintenance = itemsWithEffectiveDates
            .filter((item) => item.daysUntil < 0)
            .sort((a, b) => a.daysUntil - b.daysUntil);

          const recentMaintenance = maintenanceRecords
            .filter((m) => {
              const maintenanceDate = new Date(m.date).getTime();
              const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);
              return maintenanceDate >= thirtyDaysAgo;
            })
            .sort((a, b) => {
              const dateA = new Date(a.date).getTime();
              const dateB = new Date(b.date).getTime();
              return dateB - dateA;
            })
            .slice(0, 5);

          const totalMaintenanceCost = maintenanceRecords
            .filter((m) => m.cost && m.cost > 0)
            .reduce((sum, m) => sum + (m.cost || 0), 0);

          const thisMonthMaintenanceCost = maintenanceRecords
            .filter((m) => {
              if (!m.cost || m.cost <= 0) return false;
              const maintenanceDate = new Date(m.date);
              const now = new Date();
              return maintenanceDate.getMonth() === now.getMonth() && maintenanceDate.getFullYear() === now.getFullYear();
            })
            .reduce((sum, m) => sum + (m.cost || 0), 0);

          return (
            <>
              {/* Maintenance KPIs */}
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4 mb-6">
                <div className="rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/20 to-orange-600/10 p-4 shadow-lg shadow-black/30">
                  <div className="text-[11px] uppercase tracking-wide text-orange-200">Manutenções Próximas</div>
                  <div className="mt-2 text-3xl font-semibold text-orange-100">{upcomingMaintenance.length}</div>
                  <div className="mt-1 text-xs text-orange-200/70">
                    {overdueMaintenance.length > 0 && `${overdueMaintenance.length} atrasada(s)`}
                  </div>
                </div>
                <div className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/20 to-red-600/10 p-4 shadow-lg shadow-black/30">
                  <div className="text-[11px] uppercase tracking-wide text-red-200">Manutenções Atrasadas</div>
                  <div className="mt-2 text-3xl font-semibold text-red-100">{overdueMaintenance.length}</div>
                  <div className="mt-1 text-xs text-red-200/70">
                    Requer atenção imediata
                  </div>
                </div>
                <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-4 shadow-lg shadow-black/30">
                  <div className="text-[11px] uppercase tracking-wide text-emerald-200">Custo Total</div>
                  <div className="mt-2 text-3xl font-semibold text-emerald-100">
                    {formatCurrency(totalMaintenanceCost)}
                  </div>
                  <div className="mt-1 text-xs text-emerald-200/70">
                    {formatCurrency(thisMonthMaintenanceCost)} este mês
                  </div>
                </div>
                <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 shadow-lg shadow-black/30">
                  <div className="text-[11px] uppercase tracking-wide text-blue-200">Registros</div>
                  <div className="mt-2 text-3xl font-semibold text-blue-100">{maintenanceRecords.length}</div>
                  <div className="mt-1 text-xs text-blue-200/70">
                    Total de manutenções
                  </div>
                </div>
              </div>

              {/* Upcoming and Recent Maintenance */}
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
                  <div className="mb-4 text-sm font-semibold text-white">Manutenções Próximas (30 dias)</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {upcomingMaintenance.length === 0 ? (
                      <div className="text-sm text-slate-400">Nenhuma manutenção próxima</div>
                    ) : (
                      upcomingMaintenance.map((item) => (
                        <div
                          key={`${item.type}-${item._id}`}
                          className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white text-xs">
                                {item.itemName || item.name}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {item.type === "equipment" ? "Equipamento" : "Máquina"}
                              </div>
                            </div>
                            <div className="text-right">
                              <div
                                className={`text-xs font-semibold px-2 py-1 rounded ${
                                  item.daysUntil < 0
                                    ? "bg-red-500/20 text-red-300"
                                    : item.daysUntil <= 7
                                    ? "bg-orange-500/20 text-orange-300"
                                    : "bg-yellow-500/20 text-yellow-300"
                                }`}
                              >
                                {item.daysUntil < 0
                                  ? `${Math.abs(item.daysUntil)} dias atrasado`
                                  : item.daysUntil === 0
                                  ? "Hoje"
                                  : item.daysUntil === 1
                                  ? "Amanhã"
                                  : `Em ${item.daysUntil} dias`}
                              </div>
                              <div className="text-xs text-slate-300 mt-1">
                                {formatDate(item.effectiveNextMaintenance)}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30">
                  <div className="mb-4 text-sm font-semibold text-white">Manutenções Recentes</div>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {recentMaintenance.length === 0 ? (
                      <div className="text-sm text-slate-400">Nenhuma manutenção recente</div>
                    ) : (
                      recentMaintenance.map((record) => (
                        <div
                          key={record._id}
                          className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-semibold text-white text-xs">
                                {record.itemName || "Item"}
                              </div>
                              <div className="text-xs text-slate-400 mt-1">
                                {record.itemType === "equipment" ? "Equipamento" : "Máquina"} • {formatDate(record.date)}
                              </div>
                              {record.type && (
                                <div className="text-xs text-blue-300 mt-1">
                                  {record.type}
                                </div>
                              )}
                            </div>
                            <div className="text-right">
                              {record.cost && record.cost > 0 && (
                                <div className="text-xs font-semibold text-emerald-300">
                                  {formatCurrency(record.cost)}
                                </div>
                              )}
                              {record.vendor && (
                                <div className="text-xs text-slate-400 mt-1">
                                  {record.vendor}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
