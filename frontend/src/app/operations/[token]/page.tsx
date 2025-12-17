"use client";

import "@/app/globals.css";
import Image from "next/image";
import { useEffect, useMemo, useState, useCallback } from "react";
import Swal from "sweetalert2";
import RouteMap from "./_components/RouteMap";
import { apiFetch } from "@/lib/api-client";
import SignatureCanvas from "@/components/SignatureCanvas";

type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";
type PaymentMethod = "dinheiro" | "pix" | "transferencia" | "cartao" | "cheque" | "outro";

const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" }
];
type ViewTab = "disponiveis" | "execucao" | "concluidas";
type MainView = "home" | "ops";

const ICONS = {
  pin: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 21s-6-5.3-6-10a6 6 0 1 1 12 0c0 4.7-6 10-6 10Z" />
      <circle cx="12" cy="11" r="2" />
    </svg>
  ),
  clock: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  ),
  check: (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m5 13 4 4L19 7" />
    </svg>
  ),
  home: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m3 11 9-8 9 8" />
      <path d="M4 10v10h5v-6h6v6h5V10" />
    </svg>
  ),
  ops: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="4" width="18" height="14" rx="2" />
      <path d="M3 10h18" />
      <path d="M8 16h.01M12 16h.01M16 16h.01" />
    </svg>
  ),
  exit: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M15 3h4v18h-4" />
      <path d="M10 17 15 12 10 7" />
      <path d="M15 12H3" />
    </svg>
  )
};

export default function OperationPublicPage({ params }: { params: { token: string } }) {
  const token = params.token;
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true); // Inicia como true para verificar autenticação
  const [data, setData] = useState<{ team: any; jobs: any[] } | null>(null);
  const [tab, setTab] = useState<ViewTab>("disponiveis");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [view, setView] = useState<MainView>("ops");
  const [checkingAuth, setCheckingAuth] = useState(true); // Flag para verificar se está checando autenticação
  const [showRoute, setShowRoute] = useState(false);
  const [routeJobId, setRouteJobId] = useState<string | null>(null); // ID do job para mostrar rota
  const [headquartersAddress, setHeadquartersAddress] = useState<string>("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "tomorrow" | "week" | "month">("all");
  const storageKey = `ops-auth-${token}`;

  const authWithPassword = async (pass: string, opts?: { silent?: boolean }) => {
    const silent = opts?.silent;
    if (!pass.trim()) {
      if (!silent) Swal.fire("Atenção", "Informe a senha de acesso.", "warning");
      setCheckingAuth(false);
      setAuthLoading(false);
      return;
    }
    try {
      setAuthLoading(true);
      const res = await fetch(`/api/operations/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: pass })
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        localStorage.removeItem(storageKey);
        setCheckingAuth(false);
        if (!silent) Swal.fire("Erro", json?.error || "Link ou senha inválidos.", "error");
        return;
      }
      setPassword(pass);
      setData(json.data);
      localStorage.setItem(storageKey, JSON.stringify({ pass }));
      setCheckingAuth(false);
      
      // Load transactions to verify received status
      try {
        const transactionsRes = await apiFetch("/cash", { cache: "no-store" });
        const transactionsData = await transactionsRes.json().catch(() => null);
        if (transactionsData?.data) {
          setTransactions(transactionsData.data);
        }
      } catch (err) {
        console.error("Erro ao carregar transações", err);
      }
      
      if (!silent) Swal.fire("Liberado", "Painel carregado.", "success");
    } catch (err) {
      console.error(err);
      setCheckingAuth(false);
      if (!silent) Swal.fire("Erro", "Falha ao autenticar.", "error");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleAuth = async () => {
    await authWithPassword(password);
  };

  const assignedJobs = useMemo(() => data?.jobs || [], [data]);

  // Helper function to check if a date matches the filter
  const matchesDateFilter = useCallback((dateString: string | undefined): boolean => {
    if (!dateString) return dateFilter === "all";
    
    try {
      const jobDate = new Date(dateString);
      if (isNaN(jobDate.getTime())) return dateFilter === "all";
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      
      const weekFromNow = new Date(today);
      weekFromNow.setDate(weekFromNow.getDate() + 7);
      
      const monthFromNow = new Date(today);
      monthFromNow.setMonth(monthFromNow.getMonth() + 1);
      
      const jobDateOnly = new Date(jobDate);
      jobDateOnly.setHours(0, 0, 0, 0);
      
      switch (dateFilter) {
        case "today":
          return jobDateOnly.getTime() === today.getTime();
        case "tomorrow":
          return jobDateOnly.getTime() === tomorrow.getTime();
        case "week":
          return jobDateOnly >= today && jobDateOnly <= weekFromNow;
        case "month":
          return jobDateOnly >= today && jobDateOnly <= monthFromNow;
        default:
          return true;
      }
    } catch {
      return dateFilter === "all";
    }
  }, [dateFilter]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    let jobs = assignedJobs;
    
    // Filter by status tab
    if (tab === "disponiveis") jobs = jobs.filter((j) => j.status === "pendente");
    else if (tab === "execucao") jobs = jobs.filter((j) => j.status === "em_execucao");
    else if (tab === "concluidas") jobs = jobs.filter((j) => j.status === "concluida");
    
    // Filter by date
    if (dateFilter !== "all") {
      jobs = jobs.filter((j) => matchesDateFilter(j.plannedDate));
    }
    
    return jobs;
  }, [assignedJobs, tab, data, dateFilter, matchesDateFilter]);

  // Group jobs by date
  const groupedJobsByDate = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    
    filteredJobs.forEach((job) => {
      let dateKey = "Sem data";
      if (job.plannedDate) {
        try {
          const date = new Date(job.plannedDate);
          if (!isNaN(date.getTime())) {
            dateKey = date.toLocaleDateString("pt-BR", {
              weekday: "long",
              day: "2-digit",
              month: "long",
              year: "numeric"
            });
            // Capitalize first letter
            dateKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1);
          }
        } catch {
          // Keep "Sem data"
        }
      }
      
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(job);
    });
    
    // Sort dates - put "Sem data" at the end, others by date
    const sortedKeys = Object.keys(groups).sort((a, b) => {
      if (a === "Sem data") return 1;
      if (b === "Sem data") return -1;
      try {
        // Extract date from formatted string
        const dateA = new Date(a.split(",")[1]?.trim() || a);
        const dateB = new Date(b.split(",")[1]?.trim() || b);
        return dateA.getTime() - dateB.getTime();
      } catch {
        return a.localeCompare(b);
      }
    });
    
    return sortedKeys.map((key) => ({ date: key, jobs: groups[key] }));
  }, [filteredJobs]);

  const statusLabel = (s: Status) => {
    if (s === "pendente") return "Pendente";
    if (s === "em_execucao") return "Em execução";
    if (s === "concluida") return "Concluída";
    return "Cancelada";
  };

  const handleStartJob = async (jobId: string, jobTitle: string) => {
    const result = await Swal.fire({
      title: "Confirmar Início",
      html: `
        <div class="text-left">
          <p class="mb-3 text-slate-300">Deseja realmente iniciar este serviço?</p>
          <div class="bg-slate-800/50 rounded-lg p-3 mb-3">
            <p class="text-sm font-semibold text-white mb-1">${jobTitle}</p>
            <p class="text-xs text-slate-400">Ao confirmar, o serviço será marcado como "Em execução" e o horário de início será registrado.</p>
          </div>
        </div>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, iniciar",
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "bg-slate-800 border border-slate-700",
        title: "text-white",
        htmlContainer: "text-slate-300",
        confirmButton: "bg-blue-500 hover:bg-blue-600",
        cancelButton: "bg-slate-600 hover:bg-slate-700"
      }
    });

    if (result.isConfirmed) {
      await updateJobStatus(jobId, "em_execucao");
    }
  };

  const updateJobStatus = async (jobId: string, status: Status) => {
    if (!data) return;
    
    // Get current job to track previous status
    const currentJob = data.jobs.find((j: any) => j._id === jobId);
    const previousStatus = currentJob?.status;
    
    try {
      setUpdating(jobId);
      const payload: any = { token, password, status };
      const now = new Date().toISOString();
      if (status === "em_execucao") payload.startedAt = now;
      if (status === "concluida") payload.finishedAt = now;
      const res = await fetch(`/api/operations/jobs/${jobId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", json?.error || "Não foi possível atualizar.", "error");
        return;
      }
      
      // Update data
      const updatedJob = json.data;
      setData((prev) =>
        prev
          ? { ...prev, jobs: prev.jobs.map((j: any) => (j._id === jobId ? updatedJob : j)) }
          : prev
      );
      
      // Determine target tab based on new status
      let targetTab: ViewTab;
      if (status === "pendente") {
        targetTab = "disponiveis";
      } else if (status === "em_execucao") {
        targetTab = "execucao";
      } else if (status === "concluida") {
        targetTab = "concluidas";
      } else {
        targetTab = tab; // Keep current tab for cancelada
      }
      
      // Switch to the appropriate tab
      setTab(targetTab);
      
      // Select the updated job to show it in detail view
      setSelectedJob(updatedJob);
      
      Swal.fire("Sucesso", "Status atualizado.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const hasTransactionForJob = (jobId: string) => {
    return transactions.some(
      (t) => t.jobId === jobId || (t.jobId && t.jobId.toString() === jobId.toString())
    );
  };

  const markAsReceived = async (job: any) => {
    if (job.status !== "concluida") {
      Swal.fire("Atenção", "Apenas OS concluídas podem ser marcadas como recebidas.", "warning");
      return;
    }

    // Check if transaction already exists
    if (hasTransactionForJob(job._id)) {
      Swal.fire("Atenção", "Esta OS já possui uma transação registrada.", "info");
      return;
    }

    if (job.received) {
      Swal.fire("Atenção", "Esta OS já foi marcada como recebida.", "info");
      return;
    }

    const result = await Swal.fire({
      title: "Confirmar Recebimento",
      html: `
        <div class="text-left" style="max-width: 500px;">
          <div class="mb-4 p-4 rounded-lg bg-emerald-50 border border-emerald-200">
            <div class="text-xs text-emerald-600 mb-1">Valor a Receber</div>
            <div class="text-2xl font-bold text-emerald-700">
              ${new Intl.NumberFormat("pt-BR", {
                style: "currency",
                currency: "BRL"
              }).format(job.finalValue || job.value || 0)}
            </div>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Forma de Pagamento <span class="text-red-500">*</span>
            </label>
            <select 
              id="swal-payment-method" 
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              required
            >
              <option value="">Selecione a forma de pagamento...</option>
              ${PAYMENT_METHODS.map(
                (p) => `<option value="${p.value}">${p.label}</option>`
              ).join("")}
            </select>
          </div>
          
          <div class="mb-4">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Número do Recibo/Comprovante
              <span class="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <input 
              id="swal-receipt" 
              type="text" 
              class="w-full px-3 py-2.5 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
              placeholder="Ex: 001234, COMP-2024-001, etc."
            >
          </div>
          
          <div class="mb-2">
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Comprovante/Recibo (PDF, Foto, etc.)
              <span class="text-gray-400 text-xs font-normal">(opcional)</span>
            </label>
            <input 
              id="swal-receipt-file" 
              type="file" 
              accept=".pdf,.jpg,.jpeg,.png,.heic,.heif"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
            >
            <p class="mt-1 text-xs text-gray-500">Formatos aceitos: PDF, JPG, PNG, HEIC (máx. 50MB)</p>
          </div>
        </div>
      `,
      width: "600px",
      showCancelButton: true,
      confirmButtonText: "Confirmar Recebimento",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      customClass: {
        popup: "text-left",
        title: "text-gray-800 text-xl font-semibold mb-4",
        htmlContainer: "text-gray-600",
        confirmButton: "px-6 py-2.5 rounded-lg font-medium",
        cancelButton: "px-6 py-2.5 rounded-lg font-medium"
      },
      preConfirm: async () => {
        const paymentMethodInput = document.getElementById("swal-payment-method") as HTMLSelectElement;
        const receiptInput = document.getElementById("swal-receipt") as HTMLInputElement;
        const receiptFileInput = document.getElementById("swal-receipt-file") as HTMLInputElement;
        
        if (!paymentMethodInput?.value) {
          Swal.showValidationMessage("Por favor, selecione a forma de pagamento");
          paymentMethodInput?.focus();
          return false;
        }
        
        let receiptFileKey: string | undefined;
        
        // Upload file if provided
        if (receiptFileInput?.files && receiptFileInput.files.length > 0) {
          const file = receiptFileInput.files[0];
          
          // Validate file size (50MB max)
          if (file.size > 50 * 1024 * 1024) {
            Swal.showValidationMessage("O arquivo é muito grande. Tamanho máximo: 50MB");
            return false;
          }
          
          // Validate file type
          const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];
          if (!allowedTypes.includes(file.type)) {
            Swal.showValidationMessage("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou HEIC");
            return false;
          }
          
          try {
            // Show loading
            Swal.showLoading();
            
            // Upload file to S3
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", "receipts");
            formData.append("id", job._id);
            
            const uploadRes = await apiFetch("/files/upload", {
              method: "POST",
              headers: {}, // Let browser set Content-Type with boundary for FormData
              body: formData as any
            });
            
            const uploadData = await uploadRes.json().catch(() => null);
            
            if (!uploadRes.ok || !uploadData?.data?.key) {
              Swal.showValidationMessage("Falha ao fazer upload do arquivo. Tente novamente.");
              return false;
            }
            
            receiptFileKey = uploadData.data.key;
          } catch (err) {
            console.error("File upload error:", err);
            Swal.showValidationMessage("Erro ao fazer upload do arquivo. Tente novamente.");
            return false;
          }
        }
        
        return {
          paymentMethod: paymentMethodInput.value,
          receipt: receiptInput?.value.trim() || undefined,
          receiptFileKey
        };
      }
    });

    if (!result.isConfirmed || !result.value) return;

    try {
      setUpdating(job._id);
      const res = await apiFetch(`/jobs/${job._id}/received`, {
        method: "POST",
        body: JSON.stringify(result.value)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível marcar como recebido.", "error");
        return;
      }

      // Reload transactions to verify it was created
      const transactionsRes = await apiFetch("/cash", { cache: "no-store" });
      const transactionsData = await transactionsRes.json().catch(() => null);
      if (transactionsData?.data) {
        setTransactions(transactionsData.data);
      }

      // Verify transaction was created before updating job status
      const transactionExists = transactionsData?.data?.some(
        (t: any) => t.jobId === job._id || (t.jobId && t.jobId.toString() === job._id.toString())
      );

      if (!transactionExists && data?.transaction) {
        // Transaction was just created, add it to local state
        setTransactions((prev) => [...prev, data.transaction]);
      }

      // Only update job if transaction exists
      if (transactionExists || data?.transaction) {
        // Update job in list
        setData((prev) =>
          prev
            ? {
                ...prev,
                jobs: prev.jobs.map((j: any) =>
                  j._id === job._id
                    ? { ...j, received: true, receivedAt: new Date(), receipt: result.value.receipt, receiptFileKey: result.value.receiptFileKey }
                    : j
                )
              }
            : prev
        );

        // Update selected if it's the same job
        if (selectedJob && selectedJob._id === job._id) {
          setSelectedJob({
            ...selectedJob,
            received: true,
            receivedAt: new Date(),
            receipt: result.value.receipt,
            receiptFileKey: result.value.receiptFileKey
          });
        }

        Swal.fire("Sucesso", "OS marcada como recebida e transação criada no caixa.", "success");
      } else {
        Swal.fire("Erro", "Transação não foi criada. Job não foi marcado como recebido.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao marcar como recebido.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveSignature = async (jobId: string, signature: string) => {
    try {
      setUpdating(jobId);
      const res = await apiFetch(`/jobs/${jobId}/signature`, {
        method: "POST",
        body: JSON.stringify({ signature })
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ error: "Erro desconhecido" }));
        throw new Error(error.error || "Falha ao salvar assinatura");
      }

      const result = await res.json();
      
      // Update local state
      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob({
          ...selectedJob,
          clientSignature: signature,
          clientSignedAt: new Date()
        });
      }

      // Update in jobs list
      if (data) {
        setData({
          ...data,
          jobs: data.jobs.map((j: any) =>
            j._id === jobId
              ? { ...j, clientSignature: signature, clientSignedAt: new Date() }
              : j
          )
        });
      }

      Swal.fire("Sucesso", "Assinatura salva com sucesso.", "success");
    } catch (err: any) {
      console.error(err);
      Swal.fire("Erro", err.message || "Falha ao salvar assinatura.", "error");
    } finally {
      setUpdating(null);
    }
  };

  const handleDownloadPDF = async (jobId: string) => {
    try {
      let apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
      // Remove trailing /api if present to avoid duplication
      if (apiUrl.endsWith("/api")) {
        apiUrl = apiUrl.slice(0, -4);
      }
      const pdfUrl = `${apiUrl}/api/jobs/${jobId}/pdf`;
      
      // Open PDF in new tab
      window.open(pdfUrl, "_blank");
    } catch (err: any) {
      console.error(err);
      Swal.fire("Erro", "Falha ao gerar PDF.", "error");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(storageKey);
    setData(null);
    setPassword("");
    setSelectedJob(null);
    setView("ops");
  };

  const handleNavigateToJob = async (job: any) => {
    const destination = job.site;
    
    if (!destination && (!job.siteLatitude || !job.siteLongitude)) {
      Swal.fire("Erro", "Endereço do serviço não disponível.", "error");
      return;
    }

    // Determine destination: prioritize coordinates over text address
    let destinationParam: string;
    if (job.siteLatitude && job.siteLongitude) {
      destinationParam = `${job.siteLatitude},${job.siteLongitude}`;
    } else {
      destinationParam = destination.replace(/\s*\|\s*/g, ', ');
    }

    // Get current location
    if (!navigator.geolocation) {
      // No geolocation support - open maps directly
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}`, '_blank');
      return;
    }

    // Show loading with skip option
    const loadingAlert = Swal.fire({
      title: "Obtendo localização...",
      html: `
        <p class="text-sm text-slate-600 mb-3">Aguarde enquanto obtemos sua localização atual</p>
        <button
          id="skipLocationBtn"
          class="mt-2 px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition text-sm"
        >
          Pular e abrir Google Maps
        </button>
      `,
      allowOutsideClick: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
        
        // Add click handler for skip button
        const skipBtn = document.getElementById('skipLocationBtn');
        if (skipBtn) {
          skipBtn.onclick = () => {
            Swal.close();
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}`, '_blank');
          };
        }
      }
    });

    // Try to get location with retry logic
    const tryGetLocation = (highAccuracy: boolean, timeout: number, maxAge: number = 0) => {
      return new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          resolve,
          reject,
          {
            enableHighAccuracy: highAccuracy,
            timeout: timeout,
            maximumAge: maxAge
          }
        );
      });
    };

    try {
      let position: GeolocationPosition;
      
      try {
        // First try: High accuracy with 15 second timeout
        console.log('Tentando obter localização com alta precisão...');
        position = await tryGetLocation(true, 15000, 0);
        console.log('Localização obtida com alta precisão');
      } catch (firstError: any) {
        console.log('Alta precisão falhou, tentando com precisão moderada...');
        try {
          // Second try: Low accuracy with 10 second timeout
          position = await tryGetLocation(false, 10000, 0);
          console.log('Localização obtida com precisão moderada');
        } catch (secondError: any) {
          console.log('Precisão moderada falhou, usando localização em cache...');
          // Third try: Use any cached location (up to 5 minutes old)
          position = await tryGetLocation(false, 5000, 300000);
          console.log('Localização obtida do cache');
        }
      }

      const { latitude, longitude } = position.coords;
      const currentLocation = `${latitude},${longitude}`;
      
      Swal.close();

      // Open Google Maps with route
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(currentLocation)}&destination=${encodeURIComponent(destinationParam)}&travelmode=driving`;
      window.open(googleMapsUrl, '_blank');
      
    } catch (error: any) {
      Swal.close();
      
      let errorMessage = "Não foi possível obter sua localização.";
      let errorDetails = "";
      
      if (error.code) {
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Permissão negada";
            errorDetails = "Por favor, permita o acesso à localização nas configurações do navegador.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Localização indisponível";
            errorDetails = "Verifique se o GPS está ativado e você está em um local com boa recepção.";
            break;
          case error.TIMEOUT:
            errorMessage = "Tempo esgotado";
            errorDetails = "Não foi possível obter sua localização em tempo hábil. Tente novamente ou use o botão abaixo.";
            break;
        }
      }
      
      Swal.fire({
        title: "Erro ao obter localização",
        html: `
          <div class="text-left space-y-3">
            <div class="p-3 bg-red-50 border border-red-200 rounded">
              <p class="text-sm font-semibold text-red-900 mb-1">${errorMessage}</p>
              <p class="text-xs text-red-700">${errorDetails}</p>
            </div>
            
            <div class="mt-4 pt-3 border-t border-gray-200">
              <p class="text-xs text-gray-500 mb-3">
                Você ainda pode abrir o destino no Google Maps:
              </p>
              <button
                onclick="window.open('https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}', '_blank'); Swal.close();"
                class="w-full flex items-center justify-center gap-2 p-3 rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition text-sm font-semibold"
              >
                <span class="text-xl">🗺️</span>
                <span>Abrir no Google Maps</span>
              </button>
            </div>
          </div>
        `,
        icon: "warning",
        width: 500,
        showConfirmButton: false,
        showCancelButton: true,
        cancelButtonText: "Pular",
        cancelButtonColor: "#6b7280",
        customClass: {
          popup: "text-left",
          htmlContainer: "text-gray-600"
        }
      });
    }
  };

  useEffect(() => {
    setData(null);
    setSelectedJob(null);
    setPassword("");
    setCheckingAuth(true);
    setAuthLoading(true);
    // tenta reabrir com senha armazenada
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.pass) {
          authWithPassword(parsed.pass, { silent: true });
          return; // Não mostra tela de login se tem senha armazenada
        }
      }
    } catch (err) {
      console.error(err);
    }
    // Se não tem senha armazenada, mostra tela de login
    setCheckingAuth(false);
    setAuthLoading(false);
  }, [token]);

  useEffect(() => {
    // Carregar endereço da sede quando o componente montar
    const loadHeadquarters = async () => {
      try {
        const res = await apiFetch("/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.data?.headquartersAddress) {
          setHeadquartersAddress(data.data.headquartersAddress);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadHeadquarters();
  }, []);

  // Mostra loading enquanto verifica autenticação
  if (checkingAuth || authLoading) {
    return (
      <div
        className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100 flex items-center justify-center"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div
        className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100"
        style={{
          background:
            "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
        }}
      >
        <div className="pointer-events-none absolute inset-0 opacity-60">
          <div className="absolute -left-40 -top-40 h-72 w-72 rounded-full bg-emerald-500/20 blur-[110px]" />
          <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-blue-500/15 blur-[120px]" />
        </div>
        <div className="relative mx-auto flex max-w-lg flex-col gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/40">
              <Image
                src="/logoreis.png"
                alt="Reis Fundações"
                width={42}
                height={42}
                className="rounded-lg object-contain"
                priority
              />
            </div>
            <div className="flex-1">
              <div className="text-[11px] uppercase tracking-[0.18em] text-emerald-200">
                Painel da equipe
              </div>
              <div className="text-2xl font-semibold text-white">Acessar operação</div>
              <p className="text-sm text-slate-300">
                Digite a senha fornecida pelo administrador para abrir as ordens de serviço desta equipe.
              </p>
            </div>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/40">
            <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
              Senha de acesso
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showPass ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Informe a senha"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-semibold text-slate-100 transition hover:border-emerald-300/50 hover:text-white"
              >
                {showPass ? "Ocultar" : "Mostrar"}
              </button>
            </div>
            <button
              onClick={handleAuth}
              disabled={authLoading}
              className="mt-1 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-blue-600 disabled:opacity-60"
            >
              {authLoading ? "Verificando..." : "Entrar"}
            </button>
            <div className="text-[11px] text-slate-400">
              O link permanece válido até que um novo link seja gerado pelo administrador. Não compartilhe com terceiros.
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-8 text-slate-100"
      style={{
        background:
          "radial-gradient(circle at 15% 10%, rgba(16,185,129,0.08), transparent 35%), radial-gradient(circle at 85% 15%, rgba(59,130,246,0.08), transparent 30%), #020617"
      }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <div className="flex flex-col gap-1">
          <div className="text-[11px] uppercase tracking-wide text-emerald-200">Equipe</div>
          <div className="text-2xl font-semibold text-white">{data.team?.name}</div>
          <div className="text-sm text-slate-300">
            Painel público protegido. Atualize início e conclusão das OS atribuídas.
          </div>
        </div>

        {view === "home" ? (
          <div className="grid gap-3 md:grid-cols-3">
            {[
              { label: "Disponíveis", value: assignedJobs.filter((j) => j.status === "pendente").length },
              { label: "Em execução", value: assignedJobs.filter((j) => j.status === "em_execucao").length },
              { label: "Concluídos", value: assignedJobs.filter((j) => j.status === "concluida").length }
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/30"
              >
                <div className="text-xs uppercase tracking-wide text-slate-300">{item.label}</div>
                <div className="mt-1 text-2xl font-semibold text-white">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Date Filter Buttons */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "all", label: "Todas" },
                { key: "today", label: "Hoje" },
                { key: "tomorrow", label: "Amanhã" },
                { key: "week", label: "Esta Semana" },
                { key: "month", label: "Este Mês" }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setDateFilter(filter.key as any)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    dateFilter === filter.key
                      ? "border-emerald-400/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-emerald-300/30 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              {([
                { key: "disponiveis", label: "Disponíveis", desc: "Prontos para iniciar", icon: ICONS.pin },
                { key: "execucao", label: "Em execução", desc: "Andamento em campo", icon: ICONS.clock },
                { key: "concluidas", label: "Concluídos", desc: "Finalizados", icon: ICONS.check }
              ] as { key: ViewTab; label: string; desc: string; icon: JSX.Element }[]).map((item) => {
              const count =
                item.key === "disponiveis"
                  ? assignedJobs.filter((j) => j.status === "pendente").length
                  : item.key === "execucao"
                  ? assignedJobs.filter((j) => j.status === "em_execucao").length
                  : assignedJobs.filter((j) => j.status === "concluida").length;
              return (
                <button
                  key={item.key}
                  onClick={() => setTab(item.key)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left transition ${
                    tab === item.key
                      ? "border-emerald-400/50 bg-emerald-500/10"
                      : "border-white/10 bg-white/5 hover:border-emerald-300/30 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xl text-emerald-200">{item.icon}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-white">{item.label}</div>
                    <div className="text-xs text-slate-300">{item.desc}</div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white">
                    {count}
                  </div>
                </button>
              );
            })}
          </div>
          </>
        )}

        {filteredJobs.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-inner shadow-black/30">
            Nenhum serviço nesta aba.
          </div>
        ) : (
          <div className="space-y-6 pb-20 sm:pb-0">
            {groupedJobsByDate.map((group) => (
              <div key={group.date} className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                  <div className="text-sm font-semibold text-emerald-300 uppercase tracking-wide">
                    {group.date}
                  </div>
                  <div className="rounded-full bg-emerald-500/20 px-2 py-1 text-xs font-semibold text-emerald-300">
                    {group.jobs.length}
                  </div>
                  <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                </div>
                <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {group.jobs.map((job) => (
              <div
                key={job._id}
                className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-[11px] uppercase tracking-wide text-emerald-200">
                      {statusLabel(job.status as Status)}
                    </div>
                    <div className="text-lg font-semibold text-white leading-tight">{job.title}</div>
                    <div className="text-xs text-slate-300">
                      {job.plannedDate || "sem data"} · {job.site || "Endereço não informado"}
                    </div>
                    <div className="text-xs text-slate-400">
                      Cliente: {job.clientName || "—"}
                    </div>
                  </div>
                  <div className="rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold text-white">
                    OS
                  </div>
                </div>

                <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-200">
                  <div className="font-semibold text-white">
                    Serviços ({job.services?.length || 0})
                  </div>
                  <ul className="mt-1 space-y-1 text-[11px] text-slate-300">
                    {(job.services || []).slice(0, 3).map((s: any, idx: number) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="mt-[6px] h-1.5 w-1.5 rounded-full bg-emerald-300/70" />
                        <div className="space-y-0.5">
                          <div className="text-white">
                            {s.serviceType || s.service || "Serviço"}
                          </div>
                          <div className="text-[11px] text-slate-400">
                            Local: {s.siteType || s.localType || "—"} · Solo: {s.soilType || "—"} ·
                            Acesso: {s.access || "—"}
                          </div>
                        </div>
                      </li>
                    ))}
                    {job.services?.length > 3 && (
                      <li className="text-[11px] text-slate-400">
                        +{job.services.length - 3} mais
                      </li>
                    )}
                  </ul>
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-200">
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Início: {job.startedAt ? new Date(job.startedAt).toLocaleString("pt-BR") : "—"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1">
                    Término:{" "}
                    {job.finishedAt ? new Date(job.finishedAt).toLocaleString("pt-BR") : "—"}
                  </span>
                </div>

                <div className="mt-auto flex flex-col sm:flex-row flex-wrap gap-2">
                  {job.status === "pendente" && (
                    <button
                      type="button"
                      disabled={updating === job._id}
                      onClick={() => handleStartJob(job._id, job.title)}
                      className="w-full sm:flex-1 rounded-md border border-blue-400/40 bg-blue-500/10 px-3 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                    >
                      Iniciar
                    </button>
                  )}
                  {(job.status === "em_execucao" || (job.status !== "concluida" && job.startedAt)) && (
                    <button
                      type="button"
                      disabled={updating === job._id}
                      onClick={() => updateJobStatus(job._id, "concluida")}
                      className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      Concluir
                    </button>
                  )}
                  {job.status === "concluida" && !job.received && !hasTransactionForJob(job._id) && job.finalValue && job.finalValue > 0 && (
                    <button
                      type="button"
                      disabled={updating === job._id}
                      onClick={() => markAsReceived(job)}
                      className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                    >
                      {updating === job._id ? "Processando..." : "Receber"}
                    </button>
                  )}
                  {(job.received || hasTransactionForJob(job._id)) && (
                    <div className="w-full sm:flex-1 rounded-md border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-100 text-center">
                      ✓ Recebido
                    </div>
                  )}
                  {job.status === "pendente" && job.site && (
                    <button
                      type="button"
                      onClick={() => handleNavigateToJob(job)}
                      className="w-full sm:flex-1 rounded-md border border-purple-400/40 bg-purple-500/10 px-3 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                    >
                      Rota
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedJob(job)}
                    className="w-full rounded-md border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
                  >
                    Ver detalhes
                  </button>
                </div>
              </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {selectedJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-2 sm:px-4 py-4 pb-20 sm:pb-4 overflow-y-auto">
            <div className="w-full max-w-4xl max-h-[85vh] sm:max-h-[95vh] rounded-2xl border border-white/10 bg-slate-900 p-4 sm:p-6 shadow-2xl overflow-y-auto my-auto">
              <div className="flex flex-col sm:flex-row items-start justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">
                    {statusLabel(selectedJob.status as Status)}
                  </div>
                  <div className="text-lg sm:text-xl font-semibold text-white break-words">{selectedJob.title}</div>
                  <div className="text-xs sm:text-sm text-slate-300 break-words">
                    {selectedJob.clientName || "Cliente não informado"} ·{" "}
                    {selectedJob.site || "Endereço não informado"}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    Data agendada: {selectedJob.plannedDate || "—"}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedJob(null)}
                  className="rounded-full border border-white/15 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white shrink-0"
                >
                  Fechar
                </button>
              </div>

              <div className="mt-4 grid gap-3 sm:gap-4 grid-cols-1 md:grid-cols-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Horários</div>
                  <div className="mt-2 space-y-1 text-xs sm:text-sm">
                    <div>
                      Início:{" "}
                      {selectedJob.startedAt
                        ? new Date(selectedJob.startedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                    <div>
                      Término:{" "}
                      {selectedJob.finishedAt
                        ? new Date(selectedJob.finishedAt).toLocaleString("pt-BR")
                        : "—"}
                    </div>
                  </div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Equipe</div>
                  <div className="mt-2 text-xs sm:text-sm">{selectedJob.team || data.team?.name}</div>
                  <div className="text-xs text-slate-400">OS #{selectedJob._id}</div>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                  <div className="text-xs uppercase text-slate-400">Observações</div>
                  <div className="mt-2 text-xs sm:text-sm break-words">{selectedJob.notes || "Sem observações."}</div>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-xs sm:text-sm font-semibold text-white">
                  Serviços ({selectedJob.services?.length || 0})
                </div>
                <div className="mt-2 grid gap-2 grid-cols-1 md:grid-cols-2">
                  {(selectedJob.services || []).map((s: any, idx: number) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-white/10 bg-slate-800/60 p-3 text-sm text-slate-200"
                    >
                      <div className="font-semibold text-white">
                        {s.serviceType || s.service || "Serviço"}
                      </div>
                      <div className="text-xs text-slate-400">
                        Local: {s.siteType || s.localType || "—"} · Solo: {s.soilType || "—"} ·
                        Acesso: {s.access || "—"}
                      </div>
                      {s.categories && s.categories.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-emerald-200">
                          {s.categories.map((c: string) => (
                            <span key={c} className="rounded-full bg-emerald-500/10 px-2 py-1">
                              {c}
                            </span>
                          ))}
                        </div>
                      )}
                      {(s.stakeDiameter || s.diametro) && (
                        <div className="mt-1 text-xs text-slate-300">
                          Estacas: Ø{(s.stakeDiameter || s.diametro || "").toString()}cm ·{" "}
                          {(s.stakeDepth || s.profundidade || "").toString()}m ·{" "}
                          {(s.stakeQuantity || s.quantidade || "").toString()} un
                        </div>
                      )}
                      {(s.sptInfo || s.sptFileName) && (
                        <div className="mt-1 text-xs text-slate-300">
                          SPT/Diagnóstico: {s.sptInfo || s.sptFileName}
                        </div>
                      )}
                      {s.observacoes && (
                        <div className="mt-1 text-xs text-slate-300">Obs.: {s.observacoes}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Signature Section */}
              <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
                <div className="text-xs sm:text-sm font-semibold text-white mb-3">
                  Assinatura do Cliente
                </div>
                {selectedJob.clientSignature ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                      <div className="text-xs text-emerald-300 mb-2">✓ Assinatura coletada</div>
                      <img
                        src={selectedJob.clientSignature}
                        alt="Assinatura do cliente"
                        className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
                      />
                      {selectedJob.clientSignedAt && (
                        <div className="text-xs text-emerald-200/70 mt-2 text-center">
                          Assinado em: {new Date(selectedJob.clientSignedAt).toLocaleString("pt-BR")}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        // Allow re-signing
                        const newJob = { ...selectedJob, clientSignature: undefined, clientSignedAt: undefined };
                        setSelectedJob(newJob);
                      }}
                      className="w-full rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-500/30"
                    >
                      Reassinar
                    </button>
                  </div>
                ) : (
                  <div className="w-full">
                    <SignatureCanvas
                      onSave={(signature) => handleSaveSignature(selectedJob._id, signature)}
                      width={400}
                      height={200}
                    />
                  </div>
                )}
              </div>

              {showRoute && selectedJob.site && headquartersAddress && (
                <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-xs sm:text-sm font-semibold text-white">Rota da Sede até o Local</div>
                    <button
                      type="button"
                      onClick={() => setShowRoute(false)}
                      className="rounded-md border border-white/10 px-2 py-1 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white"
                    >
                      Fechar mapa
                    </button>
                  </div>
                  <div className="w-full h-64 rounded-lg overflow-hidden bg-slate-800">
                    <iframe
                      width="100%"
                      height="100%"
                      style={{ border: 0 }}
                      loading="lazy"
                      allowFullScreen
                      referrerPolicy="no-referrer-when-downgrade"
                      src={`https://www.google.com/maps/embed/v1/directions?key=AIzaSyAUoyCSevBWa4CkeDcBuYd-R0mbR2NtpIs&origin=${encodeURIComponent(headquartersAddress)}&destination=${encodeURIComponent(selectedJob.site)}&mode=driving`}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 flex flex-col sm:flex-row flex-wrap gap-2">
                {selectedJob.status === "pendente" && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => handleStartJob(selectedJob._id, selectedJob.title)}
                    className="w-full sm:w-auto rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20 disabled:opacity-60"
                  >
                    Iniciar serviço
                  </button>
                )}
                {(selectedJob.status === "em_execucao" || (selectedJob.status !== "concluida" && selectedJob.startedAt)) && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => updateJobStatus(selectedJob._id, "concluida")}
                    className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    Concluir serviço
                  </button>
                )}
                {selectedJob.status === "concluida" && !selectedJob.received && !hasTransactionForJob(selectedJob._id) && selectedJob.finalValue && selectedJob.finalValue > 0 && (
                  <button
                    type="button"
                    disabled={updating === selectedJob._id}
                    onClick={() => markAsReceived(selectedJob)}
                    className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/60 hover:bg-emerald-500/20 disabled:opacity-60"
                  >
                    {updating === selectedJob._id ? "Processando..." : "Receber"}
                  </button>
                )}
                {(selectedJob.received || hasTransactionForJob(selectedJob._id)) && (
                  <div className="w-full sm:w-auto rounded-md border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-xs font-semibold text-emerald-100 text-center">
                    ✓ Recebido
                  </div>
                )}
                {selectedJob.site && (
                  <button
                    type="button"
                    onClick={() => handleNavigateToJob(selectedJob)}
                    className="w-full sm:w-auto rounded-md border border-purple-400/40 bg-purple-500/10 px-4 py-2 text-xs font-semibold text-purple-100 transition hover:border-purple-300/60 hover:bg-purple-500/20"
                  >
                    🚗 Rota
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDownloadPDF(selectedJob._id)}
                  className="w-full sm:w-auto rounded-md border border-blue-400/40 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-100 transition hover:border-blue-300/60 hover:bg-blue-500/20"
                >
                  📄 Baixar PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedJob(null);
                    setShowRoute(false);
                  }}
                  className="w-full sm:w-auto rounded-md border border-white/15 bg-white/5 px-4 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:bg-white/10"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Rota - Focado em Mobile */}
        {routeJobId && headquartersAddress && (() => {
          const jobForRoute = filteredJobs.find((j) => j._id === routeJobId);
          if (!jobForRoute || !jobForRoute.site) return null;
          
          return (
            <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950">
              {/* Header do Modal */}
              <div className="flex items-center justify-between border-b border-white/10 bg-slate-900 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="text-xs uppercase tracking-wide text-emerald-200">Rota de Navegação</div>
                  <div className="text-sm font-semibold text-white truncate">{jobForRoute.title}</div>
                  <div className="text-xs text-slate-400 truncate">{jobForRoute.site}</div>
                </div>
                <button
                  onClick={() => setRouteJobId(null)}
                  className="ml-3 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 hover:border-emerald-300/40 hover:text-white shrink-0"
                >
                  Fechar
                </button>
              </div>

              {/* Mapa de Rota - Usando Google Maps JavaScript API */}
              <div className="flex-1 relative min-h-0 overflow-hidden">
                <RouteMap
                  origin={headquartersAddress}
                  destination={jobForRoute.site}
                  jobTitle={jobForRoute.title}
                />
              </div>

              {/* Footer com informações */}
              <div className="border-t border-white/10 bg-slate-900 px-4 py-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <div className="text-slate-400 mb-1">Origem</div>
                    <div className="text-white font-medium truncate">{headquartersAddress}</div>
                  </div>
                  <div>
                    <div className="text-slate-400 mb-1">Destino</div>
                    <div className="text-white font-medium truncate">{jobForRoute.site}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {data && (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/90 px-3 py-2 text-xs text-slate-200 backdrop-blur">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2">
            <button
              onClick={() => setView("home")}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 ${
                view === "home" ? "text-white" : "text-slate-300"
              }`}
            >
              <span className="text-base text-emerald-200">{ICONS.home}</span>
              <span className="text-[11px] font-semibold">Início</span>
            </button>
            <button
              onClick={() => setView("ops")}
              className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 ${
                view === "ops" ? "text-white" : "text-slate-300"
              }`}
            >
              <span className="text-base text-emerald-200">{ICONS.ops}</span>
              <span className="text-[11px] font-semibold">Operação</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1 text-red-200 hover:text-red-100"
            >
              <span className="text-base">{ICONS.exit}</span>
              <span className="text-[11px] font-semibold">Sair</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


