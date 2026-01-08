import { Router } from "express";
import { connectDB } from "../db";
import JobModel from "../models/Job";
import CashTransactionModel from "../models/CashTransaction";
import CashierModel from "../models/Cashier";
import TeamModel from "../models/Team";
import CatalogModel from "../models/Catalog";

const router = Router();

// Helper function to get date range
function getDateRange(range: string): { start: Date; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  const start = new Date();

  switch (range) {
    case "week":
      start.setDate(end.getDate() - 7);
      break;
    case "month":
      start.setMonth(end.getMonth() - 1);
      break;
    case "quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
    default:
      start.setMonth(end.getMonth() - 1);
  }

  start.setHours(0, 0, 0, 0);
  return { start, end };
}

// Financial Reports
router.get("/financial", async (req, res) => {
  try {
    await connectDB();
    const { range = "month" } = req.query;
    const { start, end } = getDateRange(range as string);

    // Get all transactions in date range (using date field or createdAt as fallback)
    const transactions = await CashTransactionModel.find({
      $or: [
        { date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] } },
        { createdAt: { $gte: start, $lte: end } }
      ]
    }).lean();

    // Calculate revenue and expenses
    const revenue = transactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const expenses = transactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Group by month
    const revenueByMonth: Record<string, { revenue: number; expenses: number }> = {};
    transactions.forEach((t) => {
      // Use date field if available, otherwise use createdAt
      const transactionDate = t.date ? new Date(t.date) : new Date(t.createdAt);
      const monthKey = transactionDate.toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric"
      });
      if (!revenueByMonth[monthKey]) {
        revenueByMonth[monthKey] = { revenue: 0, expenses: 0 };
      }
      if (t.type === "entrada") {
        revenueByMonth[monthKey].revenue += t.amount || 0;
      } else {
        revenueByMonth[monthKey].expenses += t.amount || 0;
      }
    });

    const revenueByMonthArray = Object.entries(revenueByMonth).map(([month, data]) => ({
      month,
      revenue: data.revenue,
      expenses: data.expenses
    }));

    // Get revenue by category (from transactions and jobs)
    const revenueByCategory: Record<string, number> = {};
    
    // Add revenue from transactions by category
    transactions.filter(t => t.type === "entrada").forEach((t) => {
      const category = t.category || "Outros";
      if (!revenueByCategory[category]) {
        revenueByCategory[category] = 0;
      }
      revenueByCategory[category] += t.amount || 0;
    });

    // Also add revenue from completed jobs
    const jobs = await JobModel.find({
      $or: [
        { finishedAt: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } }
      ],
      status: "concluida"
    }).lean();

    jobs.forEach((job) => {
      const category = "Ordens de Serviço";
      if (!revenueByCategory[category]) {
        revenueByCategory[category] = 0;
      }
      revenueByCategory[category] += job.finalValue || job.value || 0;
    });

    const revenueByCategoryArray = Object.entries(revenueByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value); // Sort by value descending

    // Calculate previous period for comparison
    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    prevStart.setDate(prevStart.getDate() - periodDays);
    prevEnd.setTime(start.getTime() - 1);

    const prevTransactions = await CashTransactionModel.find({
      $or: [
        { date: { $gte: prevStart.toISOString().split('T')[0], $lte: prevEnd.toISOString().split('T')[0] } },
        { createdAt: { $gte: prevStart, $lte: prevEnd } }
      ]
    }).lean();

    const prevRevenue = prevTransactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Payment method breakdown
    const paymentByMethod: Record<string, number> = {};
    transactions.filter(t => t.type === "entrada").forEach((t) => {
      const method = t.paymentMethod || "outro";
      if (!paymentByMethod[method]) {
        paymentByMethod[method] = 0;
      }
      paymentByMethod[method] += t.amount || 0;
    });

    const paymentByMethodArray = Object.entries(paymentByMethod)
      .map(([method, value]) => ({
        name: method === "dinheiro" ? "Dinheiro" :
              method === "pix" ? "PIX" :
              method === "transferencia" ? "Transferência" :
              method === "cartao" ? "Cartão" :
              method === "cheque" ? "Cheque" : "Outro",
        value
      }))
      .sort((a, b) => b.value - a.value);

    res.json({
      data: {
        totalRevenue: revenue,
        totalExpenses: expenses,
        netProfit: revenue - expenses,
        revenueByMonth: revenueByMonthArray,
        revenueByCategory: revenueByCategoryArray,
        paymentByMethod: paymentByMethodArray,
        revenueChange,
        totalTransactions: transactions.length,
        totalEntries: transactions.filter(t => t.type === "entrada").length,
        totalExits: transactions.filter(t => t.type === "saida").length
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/financial error", error);
    res.status(500).json({
      error: "Falha ao carregar relatórios financeiros",
      detail: error?.message || "Erro interno"
    });
  }
});

// Jobs/OS Reports
router.get("/jobs", async (req, res) => {
  try {
    await connectDB();
    const { range = "month" } = req.query;
    const { start, end } = getDateRange(range as string);

    const jobs = await JobModel.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    // Group by status
    const byStatus: Record<string, number> = {};
    jobs.forEach((job) => {
      const status = job.status || "pendente";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });

    const byStatusArray = Object.entries(byStatus).map(([status, count]) => ({
      status: status === "pendente" ? "Pendente" :
              status === "em_execucao" ? "Em Execução" :
              status === "concluida" ? "Concluída" :
              status === "cancelada" ? "Cancelada" : status,
      count
    }));

    // Group by month
    const byMonth: Record<string, number> = {};
    jobs.forEach((job) => {
      const monthKey = new Date(job.createdAt || job.plannedDate || new Date()).toLocaleDateString("pt-BR", {
        month: "short",
        year: "numeric"
      });
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    const byMonthArray = Object.entries(byMonth).map(([month, count]) => ({
      month,
      count
    }));

    // Calculate completion rate
    const total = jobs.length;
    const completed = jobs.filter((j) => j.status === "concluida").length;
    const completionRate = total > 0 ? (completed / total) * 100 : 0;

    res.json({
      data: {
        total,
        completed,
        pending: jobs.filter((j) => j.status === "pendente" || j.status === "em_execucao").length,
        byStatus: byStatusArray,
        byMonth: byMonthArray,
        completionRate
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/jobs error", error);
    res.status(500).json({
      error: "Falha ao carregar relatórios de OS",
      detail: error?.message || "Erro interno"
    });
  }
});

// Team Reports
router.get("/teams", async (req, res) => {
  try {
    await connectDB();
    const { range = "month" } = req.query;
    const { start, end } = getDateRange(range as string);

    const teams = await TeamModel.find().lean();
    const jobs = await JobModel.find({
      createdAt: { $gte: start, $lte: end }
    }).lean();

    // Calculate performance per team
    const performance = teams.map((team) => {
      const teamJobs = jobs.filter((j) => j.teamId?.toString() === team._id.toString());
      const completed = teamJobs.filter((j) => j.status === "concluida").length;
      const pending = teamJobs.filter((j) => j.status === "pendente" || j.status === "em_execucao").length;

      return {
        name: team.name,
        completed,
        pending,
        total: teamJobs.length
      };
    }).filter((p) => p.total > 0); // Only show teams with jobs

    res.json({
      data: {
        totalTeams: teams.length,
        activeTeams: teams.filter((t) => t.status === "ativa").length,
        performance
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/teams error", error);
    res.status(500).json({
      error: "Falha ao carregar relatórios de equipes",
      detail: error?.message || "Erro interno"
    });
  }
});

// KPIs
router.get("/kpis", async (req, res) => {
  try {
    await connectDB();
    const { range = "month" } = req.query;
    const { start, end } = getDateRange(range as string);

    // Financial KPIs
    const transactions = await CashTransactionModel.find({
      $or: [
        { date: { $gte: start.toISOString().split('T')[0], $lte: end.toISOString().split('T')[0] } },
        { createdAt: { $gte: start, $lte: end } }
      ]
    }).lean();

    const totalRevenue = transactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    // Previous period for comparison
    const prevStart = new Date(start);
    const prevEnd = new Date(end);
    const periodDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    prevStart.setDate(prevStart.getDate() - periodDays);
    prevEnd.setTime(start.getTime() - 1);

    const prevTransactions = await CashTransactionModel.find({
      $or: [
        { date: { $gte: prevStart.toISOString().split('T')[0], $lte: prevEnd.toISOString().split('T')[0] } },
        { createdAt: { $gte: prevStart, $lte: prevEnd } }
      ]
    }).lean();

    const prevRevenue = prevTransactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;

    // Jobs KPIs - Get all jobs in the date range (not just created, but also finished in range)
    const jobs = await JobModel.find({
      $or: [
        { createdAt: { $gte: start, $lte: end } },
        { finishedAt: { $gte: start, $lte: end } }
      ]
    }).lean();

    const completedJobs = jobs.filter((j) => j.status === "concluida").length;
    const totalJobs = jobs.length;
    const completionRate = totalJobs > 0 ? (completedJobs / totalJobs) * 100 : 0;

    // Average ticket - calculate from completed jobs with value
    const completedJobsWithValue = jobs.filter(
      (j) => j.status === "concluida" && (j.finalValue || j.value)
    );
    const totalValue = completedJobsWithValue.reduce(
      (sum, j) => sum + (j.finalValue || j.value || 0),
      0
    );
    const averageTicket = completedJobsWithValue.length > 0 ? totalValue / completedJobsWithValue.length : 0;

    // Team KPIs
    const teams = await TeamModel.find().lean();
    const activeTeams = teams.filter((t) => t.status === "ativa").length;

    res.json({
      data: {
        totalRevenue,
        revenueChange,
        completedJobs,
        completionRate,
        averageTicket,
        totalTeams: teams.length,
        activeTeams
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/kpis error", error);
    res.status(500).json({
      error: "Falha ao carregar KPIs",
      detail: error?.message || "Erro interno"
    });
  }
});

// Service Profitability Report
router.get("/services", async (req, res) => {
  try {
    await connectDB();
    const { range = "month" } = req.query;
    const { start, end } = getDateRange(range as string);

    // Get all completed jobs in date range
    const jobs = await JobModel.find({
      $or: [
        { finishedAt: { $gte: start, $lte: end } },
        { createdAt: { $gte: start, $lte: end } }
      ],
      status: "concluida"
    }).lean();

    // Aggregate services by catalogId or service name
    const serviceProfitability: Record<string, {
      catalogId?: string;
      serviceName: string;
      totalRevenue: number;
      totalCount: number;
      averageValue: number;
      jobsCount: number;
    }> = {};

    // Get all catalog items for name lookup
    const catalogItems = await CatalogModel.find().lean();
    const catalogMap = new Map(catalogItems.map(item => [item._id.toString(), item]));

    // Track unique jobs per service
    const serviceJobsMap = new Map<string, Set<string>>();

    jobs.forEach((job) => {
      if (!job.services || !Array.isArray(job.services)) return;
      const jobId = job._id?.toString() || "";

      job.services.forEach((service: any) => {
        // Use catalogId if available, otherwise use service name
        const key = service.catalogId 
          ? service.catalogId.toString() 
          : `custom_${service.service || "Sem nome"}`;
        
        const catalogItem = service.catalogId ? catalogMap.get(service.catalogId.toString()) : null;
        const serviceName = catalogItem?.name || service.service || "Serviço sem nome";

        if (!serviceProfitability[key]) {
          serviceProfitability[key] = {
            catalogId: service.catalogId?.toString(),
            serviceName,
            totalRevenue: 0,
            totalCount: 0,
            averageValue: 0,
            jobsCount: 0
          };
          serviceJobsMap.set(key, new Set());
        }

        const serviceValue = service.finalValue || service.value || 0;
        serviceProfitability[key].totalRevenue += serviceValue;
        serviceProfitability[key].totalCount += 1;
        
        // Track unique jobs
        const jobsSet = serviceJobsMap.get(key)!;
        jobsSet.add(jobId);
      });
    });

    // Set jobsCount from the tracked sets
    serviceJobsMap.forEach((jobsSet, key) => {
      if (serviceProfitability[key]) {
        serviceProfitability[key].jobsCount = jobsSet.size;
      }
    });

    // Calculate averages and convert to array
    const serviceProfitabilityArray = Object.values(serviceProfitability)
      .map((service) => ({
        ...service,
        averageValue: service.totalCount > 0 ? service.totalRevenue / service.totalCount : 0
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue) // Sort by total revenue descending
      .slice(0, 10); // Top 10 most profitable services

    res.json({
      data: {
        services: serviceProfitabilityArray,
        totalServices: Object.keys(serviceProfitability).length
      }
    });
  } catch (error: any) {
    console.error("GET /api/reports/services error", error);
    res.status(500).json({
      error: "Falha ao carregar relatórios de serviços",
      detail: error?.message || "Erro interno"
    });
  }
});

export default router;

