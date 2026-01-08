"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch, apiUrl } from "@/lib/api-client";

type TransactionType = "entrada" | "saida";
type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";
type DateFilterType = "yesterday" | "today" | "thisWeek" | "thisMonth" | "thisYear" | "custom" | "all";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" }
];

const CATEGORIES = [
  "Pagamento de serviço",
  "Recebimento de cliente",
  "Despesa operacional",
  "Combustível",
  "Manutenção",
  "Salário",
  "Material",
  "Outro"
];

export default function CashPage() {
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilterType>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCashier, setCurrentCashier] = useState<any | null>(null);
  const [cashierLoading, setCashierLoading] = useState(false);
  const [cashiers, setCashiers] = useState<any[]>([]);

  const [form, setForm] = useState({
    type: "entrada" as TransactionType,
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    clientId: "",
    jobId: "",
    employeeId: "",
    paymentMethod: "dinheiro" as PaymentMethod,
    category: "",
    notes: ""
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [clientsRes, jobsRes, employeesRes, transactionsRes, cashierRes, cashiersRes] = await Promise.all([
          apiFetch("/clients", { cache: "no-store" }),
          apiFetch("/jobs", { cache: "no-store" }),
          apiFetch("/employees", { cache: "no-store" }),
          apiFetch("/cash", { cache: "no-store" }),
          apiFetch("/cashiers/current", { cache: "no-store" }),
          apiFetch("/cashiers?status=fechado", { cache: "no-store" })
        ]);

        const clientsData = await clientsRes.json().catch(() => null);
        const jobsData = await jobsRes.json().catch(() => null);
        const employeesData = await employeesRes.json().catch(() => null);
        const transactionsData = await transactionsRes.json().catch(() => null);
        const cashierData = await cashierRes.json().catch(() => null);
        const cashiersData = await cashiersRes.json().catch(() => null);

        setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
        setJobs(Array.isArray(jobsData?.data) ? jobsData.data : []);
        setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
        setTransactions(Array.isArray(transactionsData?.data) ? transactionsData.data : []);
        setCurrentCashier(cashierData?.data || null);
        setCashiers(Array.isArray(cashiersData?.data) ? cashiersData.data : []);
      } catch (err) {
        console.error("Erro ao carregar dados", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Helper function to get date range based on filter type
  const getDateRange = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    
    switch (dateFilter) {
      case "yesterday": {
        const start = new Date(now);
        start.setDate(start.getDate() - 1);
        const end = new Date(start);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "today": {
        const start = new Date(now);
        const end = new Date(now);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "thisWeek": {
        const start = new Date(now);
        const dayOfWeek = start.getDay();
        const diff = start.getDate() - dayOfWeek; // Sunday is 0
        start.setDate(diff);
        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "thisMonth": {
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "thisYear": {
        const start = new Date(now.getFullYear(), 0, 1);
        const end = new Date(now.getFullYear(), 11, 31);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      case "custom": {
        if (!customStartDate || !customEndDate) {
          return null;
        }
        const start = new Date(customStartDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        return { start, end };
      }
      default:
        return null; // "all" - no filter
    }
  }, [dateFilter, customStartDate, customEndDate]);

  // Helper function to parse date string in various formats
  const parseDate = (dateString: string | undefined | null): Date | null => {
    if (!dateString) return null;
    
    try {
      // Handle ISO format: "2026-01-13T06:00:00.000Z" or "2026-01-13T06:00"
      if (dateString.includes("T")) {
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Handle DD-MM-YYYY or DD/MM/YYYY format: "13-01-2026" or "13/01/2026"
      const ddmmyyyyMatch = dateString.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
      if (ddmmyyyyMatch) {
        const [, day, month, year] = ddmmyyyyMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Handle YYYY-MM-DD format: "2026-01-13"
      const yyyymmddMatch = dateString.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (yyyymmddMatch) {
        const [, year, month, day] = yyyymmddMatch;
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        if (!isNaN(date.getTime())) {
          return date;
        }
      }
      
      // Fallback to standard Date parsing
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date;
      }
      
      return null;
    } catch {
      return null;
    }
  };

  // Helper function to check if a date is within range
  const isDateInRange = (dateString: string | undefined | null, dateRange: { start: Date; end: Date } | null): boolean => {
    if (!dateRange || !dateString) {
      // If no filter, include it. If filter exists but no date, exclude it.
      return !dateRange;
    }
    
    const date = parseDate(dateString);
    if (!date) return false;
    
    // Normalize to date-only (remove time)
    const normalizedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const normalizedStart = new Date(dateRange.start.getFullYear(), dateRange.start.getMonth(), dateRange.start.getDate());
    const normalizedEnd = new Date(dateRange.end.getFullYear(), dateRange.end.getMonth(), dateRange.end.getDate());
    
    return normalizedDate >= normalizedStart && normalizedDate <= normalizedEnd;
  };

  const filtered = useMemo(() => {
    let filtered = transactions;

    // Filter by date range
    if (getDateRange) {
      filtered = filtered.filter((t) => isDateInRange(t.date, getDateRange));
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter((t) => t.type === typeFilter);
    }

    if (search.trim()) {
      const term = search.trim().toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.description?.toLowerCase().includes(term) ||
          t.clientName?.toLowerCase().includes(term) ||
          t.jobTitle?.toLowerCase().includes(term) ||
          t.category?.toLowerCase().includes(term)
      );
    }

    return filtered;
  }, [transactions, getDateRange, typeFilter, search]);

  // Serviços realizados com sucesso (OS concluídas) - filtered by date
  const completedJobs = useMemo(() => {
    let filtered = jobs.filter((j) => j.status === "concluida");
    
    // Filter by date range if date filter is active
    if (getDateRange) {
      filtered = filtered.filter((j) => {
        // Check if any of the job dates fall within the range
        return (
          isDateInRange(j.plannedDate, getDateRange) ||
          isDateInRange(j.createdAt, getDateRange) ||
          isDateInRange(j.startedAt, getDateRange) ||
          isDateInRange(j.finishedAt, getDateRange)
        );
      });
    }
    
    return filtered;
  }, [jobs, getDateRange]);

  const totalServicesValue = useMemo(() => {
    return completedJobs.reduce((sum, job) => sum + (job.finalValue || job.value || 0), 0);
  }, [completedJobs]);

  // Valores pendentes (OS pendentes ou em execução) - filtered by date
  const pendingJobs = useMemo(() => {
    let filtered = jobs.filter((j) => j.status === "pendente" || j.status === "em_execucao");
    
    // Filter by date range if date filter is active
    if (getDateRange) {
      filtered = filtered.filter((j) => {
        // Check if any of the job dates fall within the range
        return (
          isDateInRange(j.plannedDate, getDateRange) ||
          isDateInRange(j.createdAt, getDateRange) ||
          isDateInRange(j.startedAt, getDateRange) ||
          isDateInRange(j.finishedAt, getDateRange)
        );
      });
    }
    
    return filtered;
  }, [jobs, getDateRange]);

  const totalPendingValue = useMemo(() => {
    return pendingJobs.reduce((sum, job) => sum + (job.finalValue || job.value || 0), 0);
  }, [pendingJobs]);

  // Estatísticas de pagamento (using filtered transactions)
  const paymentStats = useMemo(() => {
    const byMethod = filtered.reduce((acc, t) => {
      const method = t.paymentMethod || "outro";
      if (!acc[method]) {
        acc[method] = { entrada: 0, saida: 0 };
      }
      if (t.type === "entrada") {
        acc[method].entrada += t.amount || 0;
      } else {
        acc[method].saida += t.amount || 0;
      }
      return acc;
    }, {} as Record<string, { entrada: number; saida: number }>);

    return byMethod;
  }, [filtered]);

  // Pagamentos de salário (using filtered transactions)
  const salaryPayments = useMemo(() => {
    return filtered.filter(
      (t) => t.type === "saida" && (t.category === "Salário" || t.description?.toLowerCase().includes("salário"))
    );
  }, [filtered]);

  const totalSalaryPaid = useMemo(() => {
    return salaryPayments.reduce((sum, t) => sum + (t.amount || 0), 0);
  }, [salaryPayments]);

  const totalEmployeesSalary = useMemo(() => {
    return employees
      .filter((e) => e.status === "ativo")
      .reduce((sum, e) => sum + (e.salary || 0), 0);
  }, [employees]);

  const today = new Date().toISOString().split("T")[0];
  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => t.date === today);
  }, [transactions, today]);

  const stats = useMemo(() => {
    const todayEntradas = todayTransactions
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todaySaidas = todayTransactions
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const todaySaldo = todayEntradas - todaySaidas;

    const totalEntradas = filtered
      .filter((t) => t.type === "entrada")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaidas = filtered
      .filter((t) => t.type === "saida")
      .reduce((sum, t) => sum + (t.amount || 0), 0);
    const totalSaldo = totalEntradas - totalSaidas;

    return {
      todayEntradas,
      todaySaidas,
      todaySaldo,
      totalEntradas,
      totalSaidas,
      totalSaldo
    };
  }, [todayTransactions, filtered]);

  const resetForm = () => {
    setForm({
      type: "entrada",
      amount: "",
      description: "",
      date: new Date().toISOString().split("T")[0],
      clientId: "",
      jobId: "",
      employeeId: "",
      paymentMethod: "dinheiro",
      category: "",
      notes: ""
    });
  };

  const startNew = () => {
    resetForm();
    setMode("form");
    setSelected(null);
  };

  const saveTransaction = async () => {
    if (saving) return;

    if (!currentCashier || currentCashier.status !== "aberto") {
      Swal.fire(
        "Caixa Fechado",
        "Abra um caixa antes de registrar transações.",
        "warning"
      );
      return;
    }

    if (!form.description.trim()) {
      Swal.fire("Atenção", "Informe a descrição da transação.", "warning");
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      Swal.fire("Atenção", "Informe um valor válido maior que zero.", "warning");
      return;
    }

    if (!form.date) {
      Swal.fire("Atenção", "Informe a data da transação.", "warning");
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch("/cash", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount),
          clientId: form.clientId || null,
          jobId: form.jobId || null
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar a transação.", "error");
        return;
      }

      setTransactions((prev) => [data.data, ...prev]);
      
      // Refresh cashier to update balance
      const cashierRes = await apiFetch("/cashiers/current", { cache: "no-store" });
      const cashierData = await cashierRes.json().catch(() => null);
      if (cashierData?.data) {
        setCurrentCashier(cashierData.data);
      }
      
      resetForm();
      setMode("list");
      Swal.fire("Sucesso", "Transação salva com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar transação.", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id: string) => {
    const confirm = await Swal.fire({
      title: "Excluir transação?",
      text: "Essa ação não pode ser desfeita.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444"
    });

    if (!confirm.isConfirmed) return;

    try {
      const res = await apiFetch(`/cash/${id}`, {
        method: "DELETE"
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }

      Swal.fire("Sucesso", "Transação excluída.", "success");
      setTransactions((prev) => prev.filter((t) => t._id !== id));
      if (selected?._id === id) {
        setSelected(null);
        setMode("list");
      }
      
      // Refresh cashier to update balance
      const cashierRes = await apiFetch("/cashiers/current", { cache: "no-store" });
      const cashierData = await cashierRes.json().catch(() => null);
      if (cashierData?.data) {
        setCurrentCashier(cashierData.data);
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir transação.", "error");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("pt-BR");
  };

  const formatDateTime = (dateStr: string | Date) => {
    if (!dateStr) return "-";
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return date.toLocaleString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const openCashier = async () => {
    const result = await Swal.fire({
      title: "Abrir Caixa",
      html: `
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-300">Informe o saldo inicial do caixa.</p>
          <input id="swal-opening-balance" type="number" step="0.01" min="0" value="0" class="swal2-input" placeholder="Saldo inicial (R$)">
          <input id="swal-opened-by" type="text" class="swal2-input" placeholder="Aberto por (opcional)">
          <textarea id="swal-notes" class="swal2-textarea" placeholder="Observações (opcional)"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Abrir Caixa",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      preConfirm: () => {
        const balanceInput = document.getElementById("swal-opening-balance") as HTMLInputElement;
        const openedByInput = document.getElementById("swal-opened-by") as HTMLInputElement;
        const notesInput = document.getElementById("swal-notes") as HTMLTextAreaElement;
        const balance = parseFloat(balanceInput?.value || "0");
        if (isNaN(balance) || balance < 0) {
          Swal.showValidationMessage("Informe um saldo inicial válido (≥ 0)");
          return;
        }
        return {
          openingBalance: balance,
          openedBy: openedByInput?.value.trim() || undefined,
          notes: notesInput?.value.trim() || undefined
        };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      setCashierLoading(true);
      const res = await apiFetch("/cashiers/open", {
        method: "POST",
        body: JSON.stringify(result.value)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível abrir o caixa.", "error");
        return;
      }

      setCurrentCashier({ ...data.data, currentBalance: result.value.openingBalance });
      Swal.fire("Sucesso", "Caixa aberto com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao abrir caixa.", "error");
    } finally {
      setCashierLoading(false);
    }
  };

  const closeCashier = async () => {
    if (!currentCashier) return;

    const result = await Swal.fire({
      title: "Fechar Caixa",
      html: `
        <div class="space-y-4 text-left">
          <div class="rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-3 shadow-xl shadow-black/40">
            <p class="text-xs sm:text-sm text-slate-300 mb-2">
              Revise as informações abaixo antes de encerrar o caixa.
            </p>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm">
              <div class="space-y-1">
                <div class="text-[11px] uppercase tracking-wide text-slate-400">Saldo atual</div>
                <div class="text-base font-semibold text-emerald-300">
                  R$ ${(currentCashier.currentBalance || 0).toFixed(2).replace(".", ",")}
                </div>
              </div>
              <div class="space-y-1">
                <div class="text-[11px] uppercase tracking-wide text-slate-400">Aberto em</div>
                <div class="text-xs text-slate-200">
                  ${currentCashier.openedAt ? new Date(currentCashier.openedAt).toLocaleString("pt-BR") : "-"}
                </div>
              </div>
            </div>
          </div>

          <div class="space-y-3">
            <div>
              <label for="swal-closing-balance" class="block text-[11px] font-medium text-slate-300 mb-1">
                Saldo final do caixa (R$)
              </label>
              <input
                id="swal-closing-balance"
                type="number"
                step="0.01"
                min="0"
                value="${currentCashier.currentBalance || 0}"
                class="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60"
                placeholder="Saldo final do caixa"
              />
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label for="swal-closed-by" class="block text-[11px] font-medium text-slate-300 mb-1">
                  Fechado por <span class="text-slate-500">(opcional)</span>
                </label>
                <input
                  id="swal-closed-by"
                  type="text"
                  class="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60"
                  placeholder="Nome do responsável"
                />
              </div>
              <div>
                <label class="block text-[11px] font-medium text-slate-300 mb-1">
                  Observações <span class="text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="swal-notes"
                  rows="3"
                  class="w-full rounded-lg border border-white/10 bg-slate-900/80 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:border-emerald-400/60 resize-none"
                  placeholder="Anote qualquer detalhe importante sobre o fechamento"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Fechar Caixa",
      cancelButtonText: "Cancelar",
      buttonsStyling: false,
      customClass: {
        // Dark modal container with padding so the content doesn't look like it's floating
        popup:
          "bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/70 !p-4 sm:!p-6",
        title: "text-base sm:text-lg font-semibold text-white mb-1",
        htmlContainer: "px-1 pb-1",
        confirmButton:
          "inline-flex justify-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-2 focus:ring-red-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 mr-2",
        cancelButton:
          "inline-flex justify-center rounded-lg border border-white/15 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-slate-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
      },
      preConfirm: () => {
        const balanceInput = document.getElementById("swal-closing-balance") as HTMLInputElement;
        const closedByInput = document.getElementById("swal-closed-by") as HTMLInputElement;
        const notesInput = document.getElementById("swal-notes") as HTMLTextAreaElement;
        const balance = parseFloat(balanceInput?.value || "0");
        if (isNaN(balance) || balance < 0) {
          Swal.showValidationMessage("Informe um saldo final válido (≥ 0)");
          return;
        }
        return {
          closingBalance: balance,
          closedBy: closedByInput?.value.trim() || undefined,
          notes: notesInput?.value.trim() || undefined
        };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      setCashierLoading(true);
      const res = await apiFetch("/cashiers/close", {
        method: "POST",
        body: JSON.stringify(result.value)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível fechar o caixa.", "error");
        return;
      }

      setCurrentCashier(data.data);

      const cashierId = data?.data?._id;

      await Swal.fire({
        title: "Caixa fechado com sucesso",
        text: "Deseja gerar o relatório em PDF para impressão?",
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "Gerar PDF",
        cancelButtonText: "Fechar",
        buttonsStyling: false,
        customClass: {
          popup:
            "bg-slate-950/95 border border-white/10 rounded-2xl shadow-2xl shadow-black/70 !p-4 sm:!p-5",
          title: "text-base sm:text-lg font-semibold text-white mb-1",
          htmlContainer: "text-xs sm:text-sm text-slate-200",
          confirmButton:
            "inline-flex justify-center rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg hover:from-emerald-600 hover:to-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/60 focus:ring-offset-2 focus:ring-offset-slate-900 mr-2",
          cancelButton:
            "inline-flex justify-center rounded-lg border border-white/15 bg-slate-800/80 px-4 py-2 text-sm font-medium text-slate-100 hover:bg-slate-700/80 focus:outline-none focus:ring-2 focus:ring-slate-500/60 focus:ring-offset-2 focus:ring-offset-slate-900"
        }
      }).then((resultAlert) => {
        if (resultAlert.isConfirmed && cashierId) {
          // Open PDF report in a new tab for printing
          window.open(apiUrl(`/cashiers/${cashierId}/pdf`), "_blank");
        }
      });
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao fechar caixa.", "error");
    } finally {
      setCashierLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Financeiro</h1>
        <p className="text-xs sm:text-sm text-slate-300">
            Controle financeiro completo: serviços realizados, pagamentos, salários e movimentações.
            {dateFilter !== "all" && getDateRange && (
              <span className="ml-2 text-emerald-300">
                • Filtro: {dateFilter === "yesterday" && "Ontem"}
                {dateFilter === "today" && "Hoje"}
                {dateFilter === "thisWeek" && "Esta Semana"}
                {dateFilter === "thisMonth" && "Este Mês"}
                {dateFilter === "thisYear" && "Este Ano"}
                {dateFilter === "custom" && getDateRange && `${customStartDate} até ${customEndDate}`}
              </span>
            )}
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={startNew}
            disabled={!currentCashier || currentCashier.status !== "aberto"}
            className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2.5 sm:py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation active:scale-95"
          >
            + Nova transação
          </button>
        )}
      </div>

      {/* Filtros - Moved to top */}
      {mode === "list" && (
        <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-4 py-3">
          {/* Search and Type Filter */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, cliente ou OS"
              className="w-full sm:flex-1 sm:min-w-64 rounded-md border border-white/10 bg-slate-900/60 px-3 py-2.5 sm:py-2 text-sm text-white outline-none placeholder:text-slate-400 transition focus:border-emerald-400/60 touch-manipulation"
            />
            <div className="relative flex-1 sm:flex-none min-w-[140px]">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full appearance-none rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 sm:py-2 pr-7 text-xs sm:text-sm font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400 touch-manipulation"
              >
                <option value="all">Todos os tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
                ▼
              </span>
            </div>
            {(dateFilter !== "all" || typeFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setDateFilter("all");
                  setCustomStartDate("");
                  setCustomEndDate("");
                  setTypeFilter("all");
                  setSearch("");
                }}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2.5 sm:py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
              >
                Limpar
              </button>
            )}
          </div>
          
          {/* Date Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-300 font-medium">Filtrar por data:</span>
            <button
              onClick={() => setDateFilter("all")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "all"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setDateFilter("yesterday")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "yesterday"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Ontem
            </button>
            <button
              onClick={() => setDateFilter("today")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "today"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Hoje
            </button>
            <button
              onClick={() => setDateFilter("thisWeek")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "thisWeek"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Esta Semana
            </button>
            <button
              onClick={() => setDateFilter("thisMonth")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "thisMonth"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Este Mês
            </button>
            <button
              onClick={() => setDateFilter("thisYear")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "thisYear"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Este Ano
            </button>
            <button
              onClick={() => setDateFilter("custom")}
              className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
                dateFilter === "custom"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                  : "bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10"
              }`}
            >
              Personalizado
            </button>
            
            {dateFilter === "custom" && (
              <div className="flex gap-2 items-center">
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
                <span className="text-xs text-slate-400">até</span>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-xs text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Cashier Status */}
      {mode === "list" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 flex-shrink-0 rounded-full ${
                    currentCashier?.status === "aberto"
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-slate-500"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-white">
                    Caixa: {currentCashier?.status === "aberto" ? "Aberto" : "Fechado"}
                  </div>
                  {currentCashier && (
                    <div className="text-xs text-slate-300 break-words">
                      {currentCashier.status === "aberto"
                        ? `Aberto em ${formatDateTime(currentCashier.openedAt)}`
                        : `Fechado em ${formatDateTime(currentCashier.closedAt || "")}`}
                      {currentCashier.openedBy && ` por ${currentCashier.openedBy}`}
                    </div>
                  )}
                </div>
              </div>
              {currentCashier?.status === "aberto" && (
                <div className="mt-2 text-base sm:text-lg font-semibold text-emerald-300">
                  Saldo Atual: {formatCurrency(currentCashier.currentBalance || 0)}
                </div>
              )}
              {currentCashier?.status === "fechado" && currentCashier.closingBalance !== undefined && (
                <div className="mt-2 text-sm text-slate-300">
                  Saldo Final: {formatCurrency(currentCashier.closingBalance)}
                </div>
              )}
            </div>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {(!currentCashier || currentCashier.status === "fechado") && (
                <button
                  onClick={openCashier}
                  disabled={cashierLoading}
                  className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 sm:py-2 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation active:scale-95"
                >
                  {cashierLoading ? "Abrindo..." : "Abrir Caixa"}
                </button>
              )}
              {currentCashier?.status === "aberto" && (
                <button
                  onClick={closeCashier}
                  disabled={cashierLoading}
                  className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2.5 sm:py-2 text-sm font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50 touch-manipulation active:scale-95"
                >
                  {cashierLoading ? "Fechando..." : "Fechar Caixa"}
                </button>
              )}
            </div>
          </div>
          {(!currentCashier || currentCashier.status === "fechado") && (
            <div className="mt-3 rounded-lg border border-yellow-400/30 bg-yellow-500/10 px-3 py-2 text-xs text-yellow-200">
              ⚠️ Abra um caixa para registrar transações financeiras.
            </div>
          )}
        </div>
      )}

      {/* Cashiers history / PDF reports */}
      {mode === "list" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 mb-3">
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-white">Histórico de Caixas</h2>
              <p className="text-[10px] sm:text-xs text-slate-400">
                Veja o caixa atual e caixas anteriores e gere relatórios em PDF.
              </p>
            </div>
          </div>

          {(!currentCashier && cashiers.length === 0) && (
            <div className="text-xs sm:text-sm text-slate-400 py-4 text-center">
              Nenhum caixa registrado até o momento.
            </div>
          )}

          {(currentCashier || cashiers.length > 0) && (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {currentCashier && (
                <div className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="space-y-0.5 text-[11px] sm:text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-semibold text-emerald-200">
                        Caixa atual ({currentCashier.status === "aberto" ? "aberto" : "fechado"})
                      </span>
                    </div>
                    <div className="text-slate-200">
                      Aberto em:{" "}
                      <span className="font-medium">
                        {currentCashier.openedAt
                          ? new Date(currentCashier.openedAt).toLocaleString("pt-BR")
                          : "-"}
                      </span>
                    </div>
                    <div className="text-slate-300">
                      Saldo:{" "}
                      <span className="font-semibold text-emerald-300">
                        {formatCurrency(
                          currentCashier.status === "aberto"
                            ? currentCashier.currentBalance || currentCashier.openingBalance || 0
                            : currentCashier.closingBalance ?? currentCashier.openingBalance ?? 0
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!currentCashier?._id) return;
                        window.open(apiUrl(`/cashiers/${currentCashier._id}/pdf`), "_blank");
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/60 bg-emerald-500/10 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-emerald-200 hover:bg-emerald-500/20 transition"
                    >
                      <span>📄</span>
                      <span>Relatório PDF</span>
                    </button>
                  </div>
                </div>
              )}

              {cashiers.length > 0 && (
                <div className="space-y-1.5 mt-1">
                  {cashiers.map((c) => (
                    <div
                      key={c._id}
                      className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[11px] sm:text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-slate-500" />
                          <span className="font-semibold text-slate-100">
                            Caixa fechado
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Aberto em:{" "}
                          <span className="font-medium">
                            {c.openedAt ? new Date(c.openedAt).toLocaleString("pt-BR") : "-"}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Fechado em:{" "}
                          <span className="font-medium">
                            {c.closedAt ? new Date(c.closedAt).toLocaleString("pt-BR") : "-"}
                          </span>
                        </div>
                        <div className="text-slate-300">
                          Saldo final:{" "}
                          <span className="font-semibold text-emerald-300">
                            {formatCurrency(c.closingBalance ?? c.openingBalance ?? 0)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (!c._id) return;
                            window.open(apiUrl(`/cashiers/${c._id}/pdf`), "_blank");
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-white/20 bg-white/5 px-3 py-1.5 text-[11px] sm:text-xs font-medium text-slate-100 hover:bg-white/10 transition"
                        >
                          <span>📄</span>
                          <span>Relatório PDF</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {mode === "list" && (
        <>
          {/* Resumo Geral */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-3 sm:p-4 shadow-lg shadow-black/30">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-emerald-200">
                Serviços Realizados
              </div>
              <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-emerald-100">
                {formatCurrency(totalServicesValue)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-emerald-200/70">
                {completedJobs.length} OS concluída(s)
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-3 sm:p-4 shadow-lg shadow-black/30">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-blue-200">
                Total de Entradas
              </div>
              <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-blue-100">
                {formatCurrency(stats.totalEntradas)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-blue-200/70">
                {filtered.filter((t) => t.type === "entrada").length} transação(ões)
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/20 to-red-600/10 p-3 sm:p-4 shadow-lg shadow-black/30">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-red-200">
                Total de Saídas
              </div>
              <div className="mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold text-red-100">
                {formatCurrency(stats.totalSaidas)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-red-200/70">
                {filtered.filter((t) => t.type === "saida").length} transação(ões)
              </div>
            </div>

            <div
              className={`rounded-xl sm:rounded-2xl border border-white/10 p-3 sm:p-4 shadow-lg shadow-black/30 ${
                stats.totalSaldo >= 0
                  ? "bg-gradient-to-br from-purple-500/20 to-purple-600/10"
                  : "bg-gradient-to-br from-orange-500/20 to-orange-600/10"
              }`}
            >
              <div
                className={`text-[10px] sm:text-[11px] uppercase tracking-wide ${
                  stats.totalSaldo >= 0 ? "text-purple-200" : "text-orange-200"
                }`}
              >
                Saldo Total
              </div>
              <div
                className={`mt-1 sm:mt-2 text-xl sm:text-3xl font-semibold ${
                  stats.totalSaldo >= 0 ? "text-purple-100" : "text-orange-100"
                }`}
              >
                {formatCurrency(stats.totalSaldo)}
              </div>
              <div
                className={`mt-0.5 sm:mt-1 text-[10px] sm:text-xs ${
                  stats.totalSaldo >= 0 ? "text-purple-200/70" : "text-orange-200/70"
                }`}
              >
                {filtered.length} transação(ões) no período
              </div>
            </div>
          </div>

          {/* Estatísticas de Salários e Valores Pendentes */}
          <div className="grid gap-3 sm:gap-4 grid-cols-2 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400">
                Folha de Pagamento (Ativos)
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-yellow-300">
                {formatCurrency(totalEmployeesSalary)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-300">
                {employees.filter((e) => e.status === "ativo").length} funcionário(s) ativo(s)
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400">
                Salários Pagos
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-orange-300">
                {formatCurrency(totalSalaryPaid)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-300">
                {salaryPayments.length} pagamento(s) registrado(s)
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-3 sm:p-4 shadow-inner shadow-black/20">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-yellow-200">
                Valores Pendentes
              </div>
              <div className="mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold text-yellow-100">
                {formatCurrency(totalPendingValue)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-yellow-200/70">
                {pendingJobs.length} OS pendente(s) ou em execução
              </div>
            </div>

            <div className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
              <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400">
                Saldo do Dia (Hoje)
              </div>
              <div
                className={`mt-1 sm:mt-2 text-lg sm:text-2xl font-semibold ${
                  stats.todaySaldo >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {formatCurrency(stats.todaySaldo)}
              </div>
              <div className="mt-0.5 sm:mt-1 text-[10px] sm:text-xs text-slate-300">
                {todayTransactions.length} transação(ões) hoje
              </div>
            </div>
          </div>

          {/* Estatísticas de Pagamento por Método */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4 shadow-inner shadow-black/20">
            <div className="mb-3 sm:mb-4 text-sm font-semibold text-white">
              Estatísticas de Pagamento por Método
            </div>
            <div className="grid gap-2 sm:gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(paymentStats).map(([method, stats]) => {
                const methodLabel = PAYMENT_METHODS.find((p) => p.value === method)?.label || method;
                const statsTyped = stats as { entrada: number; saida: number };
                const saldo = statsTyped.entrada - statsTyped.saida;
                return (
                  <div
                    key={method}
                    className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                  >
                    <div className="font-semibold text-white">{methodLabel}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-300">
                        <span>Entradas:</span>
                        <span>{formatCurrency(statsTyped.entrada)}</span>
                      </div>
                      <div className="flex justify-between text-red-300">
                        <span>Saídas:</span>
                        <span>{formatCurrency(statsTyped.saida)}</span>
                      </div>
                      <div className="flex justify-between border-t border-white/10 pt-1 text-slate-200">
                        <span>Saldo:</span>
                        <span className={saldo >= 0 ? "text-emerald-300" : "text-red-300"}>
                          {formatCurrency(saldo)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
              {!loading && Object.keys(paymentStats).length === 0 && (
                <div className="col-span-full text-center text-sm text-slate-400">
                  Nenhuma transação registrada ainda
                </div>
              )}
            </div>
          </div>

          {/* Lista de Transações */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-white/5 px-3 sm:px-6 py-3 sm:py-4 gap-2">
              <div className="font-semibold text-white text-sm sm:text-base">Movimentações Financeiras</div>
              <span className="text-xs text-slate-300">
                {loading ? "Carregando..." : `${filtered.length} registro(s)`}
              </span>
            </div>
            {loading ? (
              <div className="px-3 sm:px-6 py-8 text-center text-slate-300">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
                <p className="text-sm">Carregando transações...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 sm:px-6 py-4 text-slate-300 text-sm">
                Nenhuma transação encontrada. Clique em "+ Nova transação" para adicionar.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Tipo</th>
                        <th className="px-4 py-3">Descrição</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">OS</th>
                        <th className="px-4 py-3">Forma de pagamento</th>
                        <th className="px-4 py-3 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((t) => (
                        <tr
                          key={t._id}
                          className="border-t border-white/5 hover:bg-white/5 cursor-pointer transition"
                          onClick={() => {
                            setSelected(t);
                            setMode("detail");
                          }}
                        >
                          <td className="px-4 py-3 text-slate-200">
                            {formatDate(t.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap ${
                                t.type === "entrada"
                                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                                  : "border-red-400/50 bg-red-500/20 text-red-100"
                              }`}
                            >
                              {t.type === "entrada" ? "Entrada" : "Saída"}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-white">
                            <div className="flex items-center gap-2">
                              <span>{t.description || "-"}</span>
                              {t.receiptFileKey && (
                                <span className="text-blue-400" title="Comprovante anexado">
                                  📎
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {t.clientName || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {t.jobTitle ? (
                              <span className="text-xs">{t.jobTitle.substring(0, 30)}...</span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {PAYMENT_METHODS.find((p) => p.value === t.paymentMethod)?.label || t.paymentMethod || "-"}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-semibold ${
                              t.type === "entrada" ? "text-emerald-300" : "text-red-300"
                            }`}
                          >
                            {t.type === "entrada" ? "+" : "-"}
                            {formatCurrency(t.amount || 0)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-3">
                  {filtered.map((t) => (
                    <div
                      key={t._id}
                      className="rounded-lg border border-white/10 bg-white/5 p-3 space-y-2"
                      onClick={() => {
                        setSelected(t);
                        setMode("detail");
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold whitespace-nowrap ${
                                t.type === "entrada"
                                  ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
                                  : "border-red-400/50 bg-red-500/20 text-red-100"
                              }`}
                            >
                              {t.type === "entrada" ? "Entrada" : "Saída"}
                            </span>
                            {t.receiptFileKey && (
                              <span className="text-blue-400 text-xs" title="Comprovante anexado">
                                📎
                              </span>
                            )}
                          </div>
                          <h3 className="text-sm font-semibold text-white mt-1 break-words">
                            {t.description || "-"}
                          </h3>
                          <p className="text-xs text-slate-300 mt-0.5">{formatDate(t.date)}</p>
                        </div>
                        <div
                          className={`text-right font-semibold text-sm ${
                            t.type === "entrada" ? "text-emerald-300" : "text-red-300"
                          }`}
                        >
                          {t.type === "entrada" ? "+" : "-"}
                          {formatCurrency(t.amount || 0)}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-white/5">
                        {t.clientName && (
                          <div>
                            <span className="text-slate-400">Cliente:</span>
                            <p className="text-slate-200 break-words">{t.clientName}</p>
                          </div>
                        )}
                        {t.jobTitle && (
                          <div>
                            <span className="text-slate-400">OS:</span>
                            <p className="text-slate-200 break-words">{t.jobTitle}</p>
                          </div>
                        )}
                        {t.paymentMethod && (
                          <div>
                            <span className="text-slate-400">Pagamento:</span>
                            <p className="text-slate-200">
                              {PAYMENT_METHODS.find((p) => p.value === t.paymentMethod)?.label || t.paymentMethod}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {mode === "form" && (
        <div className="space-y-4 sm:space-y-5 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-semibold text-white">Nova transação</div>
              <p className="text-xs text-slate-300">
                Registre uma entrada ou saída financeira vinculada a cliente, OS ou funcionário.
        </p>
      </div>
            <button
              onClick={() => {
                setMode("list");
                resetForm();
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de transação *</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as TransactionType }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="entrada">Entrada</option>
                <option value="saida">Saída</option>
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Data *</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Valor (R$) *</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Forma de pagamento *</label>
              <select
                value={form.paymentMethod}
                onChange={(e) =>
                  setForm((f) => ({ ...f, paymentMethod: e.target.value as PaymentMethod }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Descrição *</label>
              <input
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="Ex: Pagamento de serviço de perfuração"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="">Selecione uma categoria</option>
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Cliente</label>
              <select
                value={form.clientId}
                onChange={(e) => {
                  setForm((f) => ({ ...f, clientId: e.target.value }));
                  if (e.target.value) {
                    const client = clients.find((c) => c._id === e.target.value);
                    if (client) {
                      const clientJobs = jobs.filter(
                        (j) => j.clientId === e.target.value || j.clientName === client.name
                      );
                      if (clientJobs.length === 1) {
                        setForm((f) => ({ ...f, jobId: clientJobs[0]._id }));
                      }
                    }
                  }
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="">Selecione um cliente (opcional)</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Ordem de Serviço</label>
              <select
                value={form.jobId}
                onChange={(e) => setForm((f) => ({ ...f, jobId: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              >
                <option value="">Selecione uma OS (opcional)</option>
                {(form.clientId
                  ? jobs.filter(
                      (j) => j.clientId === form.clientId || j.clientName === clients.find((c) => c._id === form.clientId)?.name
                    )
                  : jobs
                ).map((j) => (
                  <option key={j._id} value={j._id}>
                    {j.title || `OS #${j.seq || j._id}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 sm:py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                rows={3}
                placeholder="Informações adicionais sobre a transação"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveTransaction}
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-3 sm:py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation active:scale-95"
            >
              {saving ? "Salvando..." : "Salvar transação"}
            </button>
          </div>
        </div>
      )}

      {mode === "detail" && selected && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-semibold text-white break-words">{selected.description}</div>
              <div className="text-xs text-slate-300">
                {formatDate(selected.date)} •{" "}
                {selected.type === "entrada" ? "Entrada" : "Saída"}
              </div>
            </div>
            <button
              onClick={() => {
                setMode("list");
                setSelected(null);
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
            >
              Fechar
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Valor</div>
              <div
                className={`text-lg font-semibold ${
                  selected.type === "entrada" ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {selected.type === "entrada" ? "+" : "-"}
                {formatCurrency(selected.amount || 0)}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Forma de pagamento</div>
              <div className="text-white">
                {PAYMENT_METHODS.find((p) => p.value === selected.paymentMethod)?.label ||
                  selected.paymentMethod ||
                  "-"}
              </div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Categoria</div>
              <div className="text-white">{selected.category || "-"}</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Cliente</div>
              <div className="text-white">{selected.clientName || "-"}</div>
            </div>

            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
              <div className="text-[11px] uppercase text-slate-400">Ordem de Serviço</div>
              <div className="text-white">{selected.jobTitle || "-"}</div>
            </div>

            {selected.notes && (
              <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
                <div className="text-[11px] uppercase text-slate-400">Observações</div>
                <div className="text-white">{selected.notes}</div>
              </div>
            )}

            {selected.receiptFileKey && (
              <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
                <div className="text-[11px] uppercase text-blue-300 mb-2 flex items-center gap-1">
                  📎 Comprovante Anexado
                </div>
                <button
                  onClick={async () => {
                    try {
                      const res = await apiFetch("/files/presigned-url", {
                        method: "POST",
                        body: JSON.stringify({ key: selected.receiptFileKey })
                      });
                      const data = await res.json();
                      if (res.ok && data?.data?.url) {
                        window.open(data.data.url, "_blank");
                      } else {
                        Swal.fire("Erro", "Não foi possível baixar o comprovante", "error");
                      }
                    } catch (err) {
                      console.error("Erro ao baixar comprovante:", err);
                      Swal.fire("Erro", "Não foi possível baixar o comprovante", "error");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-3 sm:py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30 touch-manipulation active:scale-95"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar Comprovante
                </button>
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  );
}

