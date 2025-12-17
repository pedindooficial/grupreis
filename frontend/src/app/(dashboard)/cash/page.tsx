"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

type TransactionType = "entrada" | "saida";
type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";

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
  const [dateFilter, setDateFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TransactionType | "all">("all");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentCashier, setCurrentCashier] = useState<any | null>(null);
  const [cashierLoading, setCashierLoading] = useState(false);

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
        const [clientsRes, jobsRes, employeesRes, transactionsRes, cashierRes] = await Promise.all([
          apiFetch("/clients", { cache: "no-store" }),
          apiFetch("/jobs", { cache: "no-store" }),
          apiFetch("/employees", { cache: "no-store" }),
          apiFetch("/cash", { cache: "no-store" }),
          apiFetch("/cashiers/current", { cache: "no-store" })
        ]);

        const clientsData = await clientsRes.json().catch(() => null);
        const jobsData = await jobsRes.json().catch(() => null);
        const employeesData = await employeesRes.json().catch(() => null);
        const transactionsData = await transactionsRes.json().catch(() => null);
        const cashierData = await cashierRes.json().catch(() => null);

        setClients(Array.isArray(clientsData?.data) ? clientsData.data : []);
        setJobs(Array.isArray(jobsData?.data) ? jobsData.data : []);
        setEmployees(Array.isArray(employeesData?.data) ? employeesData.data : []);
        setTransactions(Array.isArray(transactionsData?.data) ? transactionsData.data : []);
        setCurrentCashier(cashierData?.data || null);
      } catch (err) {
        console.error("Erro ao carregar dados", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const filtered = useMemo(() => {
    let filtered = transactions;

    if (dateFilter) {
      filtered = filtered.filter((t) => t.date === dateFilter);
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
  }, [transactions, dateFilter, typeFilter, search]);

  // Serviços realizados com sucesso (OS concluídas)
  const completedJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "concluida");
  }, [jobs]);

  const totalServicesValue = useMemo(() => {
    return completedJobs.reduce((sum, job) => sum + (job.finalValue || job.value || 0), 0);
  }, [completedJobs]);

  // Valores pendentes (OS pendentes ou em execução)
  const pendingJobs = useMemo(() => {
    return jobs.filter((j) => j.status === "pendente" || j.status === "em_execucao");
  }, [jobs]);

  const totalPendingValue = useMemo(() => {
    return pendingJobs.reduce((sum, job) => sum + (job.finalValue || job.value || 0), 0);
  }, [pendingJobs]);

  // Estatísticas de pagamento
  const paymentStats = useMemo(() => {
    const byMethod = transactions.reduce((acc, t) => {
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
  }, [transactions]);

  // Pagamentos de salário
  const salaryPayments = useMemo(() => {
    return transactions.filter(
      (t) => t.type === "saida" && (t.category === "Salário" || t.description?.toLowerCase().includes("salário"))
    );
  }, [transactions]);

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
        <div class="text-left space-y-3">
          <p class="text-sm text-slate-300">Confirme o saldo final do caixa.</p>
          <input id="swal-closing-balance" type="number" step="0.01" min="0" value="${currentCashier.currentBalance || 0}" class="swal2-input" placeholder="Saldo final (R$)">
          <input id="swal-closed-by" type="text" class="swal2-input" placeholder="Fechado por (opcional)">
          <textarea id="swal-notes" class="swal2-textarea" placeholder="Observações (opcional)"></textarea>
        </div>
      `,
      showCancelButton: true,
      confirmButtonText: "Fechar Caixa",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
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
      Swal.fire("Sucesso", "Caixa fechado com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao fechar caixa.", "error");
    } finally {
      setCashierLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
          <h1 className="text-2xl font-semibold text-white">Financeiro</h1>
        <p className="text-sm text-slate-300">
            Controle financeiro completo: serviços realizados, pagamentos, salários e movimentações.
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={startNew}
            disabled={!currentCashier || currentCashier.status !== "aberto"}
            className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + Nova transação
          </button>
        )}
      </div>

      {/* Cashier Status */}
      {mode === "list" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex-1 min-w-64">
              <div className="flex items-center gap-3">
                <div
                  className={`h-3 w-3 rounded-full ${
                    currentCashier?.status === "aberto"
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-slate-500"
                  }`}
                />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Caixa: {currentCashier?.status === "aberto" ? "Aberto" : "Fechado"}
                  </div>
                  {currentCashier && (
                    <div className="text-xs text-slate-300">
                      {currentCashier.status === "aberto"
                        ? `Aberto em ${formatDateTime(currentCashier.openedAt)}`
                        : `Fechado em ${formatDateTime(currentCashier.closedAt || "")}`}
                      {currentCashier.openedBy && ` por ${currentCashier.openedBy}`}
                    </div>
                  )}
                </div>
              </div>
              {currentCashier?.status === "aberto" && (
                <div className="mt-2 text-lg font-semibold text-emerald-300">
                  Saldo Atual: {formatCurrency(currentCashier.currentBalance || 0)}
                </div>
              )}
              {currentCashier?.status === "fechado" && currentCashier.closingBalance !== undefined && (
                <div className="mt-2 text-sm text-slate-300">
                  Saldo Final: {formatCurrency(currentCashier.closingBalance)}
                </div>
              )}
            </div>
            <div className="flex gap-2">
              {(!currentCashier || currentCashier.status === "fechado") && (
                <button
                  onClick={openCashier}
                  disabled={cashierLoading}
                  className="rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {cashierLoading ? "Abrindo..." : "Abrir Caixa"}
                </button>
              )}
              {currentCashier?.status === "aberto" && (
                <button
                  onClick={closeCashier}
                  disabled={cashierLoading}
                  className="rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-red-600 hover:to-red-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {mode === "list" && (
        <>
          {/* Resumo Geral */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-500/20 to-emerald-600/10 p-4 shadow-lg shadow-black/30">
              <div className="text-[11px] uppercase tracking-wide text-emerald-200">
                Serviços Realizados
              </div>
              <div className="mt-2 text-3xl font-semibold text-emerald-100">
                {formatCurrency(totalServicesValue)}
              </div>
              <div className="mt-1 text-xs text-emerald-200/70">
                {completedJobs.length} OS concluída(s)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-blue-600/10 p-4 shadow-lg shadow-black/30">
              <div className="text-[11px] uppercase tracking-wide text-blue-200">
                Total de Entradas
              </div>
              <div className="mt-2 text-3xl font-semibold text-blue-100">
                {formatCurrency(stats.totalEntradas)}
              </div>
              <div className="mt-1 text-xs text-blue-200/70">
                {filtered.filter((t) => t.type === "entrada").length} transação(ões)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-red-500/20 to-red-600/10 p-4 shadow-lg shadow-black/30">
              <div className="text-[11px] uppercase tracking-wide text-red-200">
                Total de Saídas
              </div>
              <div className="mt-2 text-3xl font-semibold text-red-100">
                {formatCurrency(stats.totalSaidas)}
              </div>
              <div className="mt-1 text-xs text-red-200/70">
                {filtered.filter((t) => t.type === "saida").length} transação(ões)
              </div>
            </div>

            <div
              className={`rounded-2xl border border-white/10 p-4 shadow-lg shadow-black/30 ${
                stats.totalSaldo >= 0
                  ? "bg-gradient-to-br from-purple-500/20 to-purple-600/10"
                  : "bg-gradient-to-br from-orange-500/20 to-orange-600/10"
              }`}
            >
              <div
                className={`text-[11px] uppercase tracking-wide ${
                  stats.totalSaldo >= 0 ? "text-purple-200" : "text-orange-200"
                }`}
              >
                Saldo Total
              </div>
              <div
                className={`mt-2 text-3xl font-semibold ${
                  stats.totalSaldo >= 0 ? "text-purple-100" : "text-orange-100"
                }`}
              >
                {formatCurrency(stats.totalSaldo)}
              </div>
              <div
                className={`mt-1 text-xs ${
                  stats.totalSaldo >= 0 ? "text-purple-200/70" : "text-orange-200/70"
                }`}
              >
                {filtered.length} transação(ões) no período
              </div>
            </div>
          </div>

          {/* Estatísticas de Salários e Valores Pendentes */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Folha de Pagamento (Ativos)
              </div>
              <div className="mt-2 text-2xl font-semibold text-yellow-300">
                {formatCurrency(totalEmployeesSalary)}
              </div>
              <div className="mt-1 text-xs text-slate-300">
                {employees.filter((e) => e.status === "ativo").length} funcionário(s) ativo(s)
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Salários Pagos
              </div>
              <div className="mt-2 text-2xl font-semibold text-orange-300">
                {formatCurrency(totalSalaryPaid)}
              </div>
              <div className="mt-1 text-xs text-slate-300">
                {salaryPayments.length} pagamento(s) registrado(s)
              </div>
            </div>

            <div className="rounded-2xl border border-yellow-400/30 bg-gradient-to-br from-yellow-500/20 to-yellow-600/10 p-4 shadow-inner shadow-black/20">
              <div className="text-[11px] uppercase tracking-wide text-yellow-200">
                Valores Pendentes
              </div>
              <div className="mt-2 text-2xl font-semibold text-yellow-100">
                {formatCurrency(totalPendingValue)}
              </div>
              <div className="mt-1 text-xs text-yellow-200/70">
                {pendingJobs.length} OS pendente(s) ou em execução
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
              <div className="text-[11px] uppercase tracking-wide text-slate-400">
                Saldo do Dia (Hoje)
              </div>
              <div
                className={`mt-2 text-2xl font-semibold ${
                  stats.todaySaldo >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                {formatCurrency(stats.todaySaldo)}
              </div>
              <div className="mt-1 text-xs text-slate-300">
                {todayTransactions.length} transação(ões) hoje
              </div>
            </div>
          </div>

          {/* Estatísticas de Pagamento por Método */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20">
            <div className="mb-4 text-sm font-semibold text-white">
              Estatísticas de Pagamento por Método
            </div>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {Object.entries(paymentStats).map(([method, stats]) => {
                const methodLabel = PAYMENT_METHODS.find((p) => p.value === method)?.label || method;
                const saldo = stats.entrada - stats.saida;
                return (
                  <div
                    key={method}
                    className="rounded-lg border border-white/10 bg-slate-900/50 p-3 text-sm"
                  >
                    <div className="font-semibold text-white">{methodLabel}</div>
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex justify-between text-emerald-300">
                        <span>Entradas:</span>
                        <span>{formatCurrency(stats.entrada)}</span>
                      </div>
                      <div className="flex justify-between text-red-300">
                        <span>Saídas:</span>
                        <span>{formatCurrency(stats.saida)}</span>
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

          {/* Filtros */}
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por descrição, cliente ou OS"
              className="flex-1 min-w-64 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
            />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="rounded-md border border-white/10 bg-slate-900 px-3 py-2 text-xs font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400"
            />
            <div className="relative">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="appearance-none rounded-md border border-white/10 bg-slate-900 px-3 py-2 pr-7 text-xs font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400"
              >
                <option value="all">Todos os tipos</option>
                <option value="entrada">Entradas</option>
                <option value="saida">Saídas</option>
              </select>
              <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
                ▼
              </span>
            </div>
            {(dateFilter || typeFilter !== "all" || search) && (
              <button
                onClick={() => {
                  setDateFilter("");
                  setTypeFilter("all");
                  setSearch("");
                }}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:border-emerald-300/40 hover:text-white"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Lista de Transações */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="font-semibold text-white">Movimentações Financeiras</div>
              <span className="text-xs text-slate-300">
                {loading ? "Carregando..." : `${filtered.length} registro(s)`}
              </span>
            </div>
            {loading ? (
              <div className="px-6 py-8 text-center text-slate-300">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
                <p className="text-sm">Carregando transações...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-6 py-4 text-slate-300">
                Nenhuma transação encontrada. Clique em "+ Nova transação" para adicionar.
              </div>
            ) : (
              <div className="overflow-x-auto">
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
            )}
          </div>
        </>
      )}

      {mode === "form" && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">Nova transação</div>
              <p className="text-xs text-slate-300">
                Registre uma entrada ou saída financeira vinculada a cliente, OS ou funcionário.
        </p>
      </div>
            <button
              onClick={() => {
                setMode("list");
                resetForm();
              }}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Tipo de transação *</label>
              <select
                value={form.type}
                onChange={(e) =>
                  setForm((f) => ({ ...f, type: e.target.value as TransactionType }))
                }
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Ex: Pagamento de serviço de perfuração"
              />
            </div>

            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Categoria</label>
              <select
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
                placeholder="Informações adicionais sobre a transação"
              />
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={saveTransaction}
              disabled={saving}
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar transação"}
            </button>
          </div>
        </div>
      )}

      {mode === "detail" && selected && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">{selected.description}</div>
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
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
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
                      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
                      const downloadUrl = `${apiUrl}/api/s3/download/${selected.receiptFileKey}`;
                      window.open(downloadUrl, "_blank");
                    } catch (err) {
                      console.error("Erro ao baixar comprovante:", err);
                      Swal.fire("Erro", "Não foi possível baixar o comprovante", "error");
                    }
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30"
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

