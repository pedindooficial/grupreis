"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import { Status, TeamData, Job, ViewTab, DateFilter } from "../types";
import { encodePassword, decodePassword, matchesDateFilter, groupJobsByDate } from "../utils";
import { PAYMENT_METHODS } from "../constants";

export function useOperations(teamId: string) {
  const [password, setPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const [data, setData] = useState<TeamData | null>(null);
  const [tab, setTab] = useState<ViewTab>("disponiveis");
  const [updating, setUpdating] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showPass, setShowPass] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [headquartersAddress, setHeadquartersAddress] = useState<string>("");
  const [transactions, setTransactions] = useState<any[]>([]);
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  
  const storageKey = `ops-auth-team-${teamId}`;

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
      const res = await fetch(`/api/operations/team/${teamId}`, {
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
      
      // Store with timestamp
      const timestamp = Date.now();
      const encoded = encodePassword(pass);
      localStorage.setItem(storageKey, JSON.stringify({ pass: encoded, timestamp }));
      
      setCheckingAuth(false);
      
      // Load transactions
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
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      await updateJobStatus(jobId, "em_execucao");
    }
  };

  const updateJobStatus = async (jobId: string, status: Status) => {
    if (!data) return;
    
    try {
      setUpdating(jobId);
      const payload: any = { teamId, password, status };
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
      
      const updatedJob = json.data;
      setData((prev) =>
        prev
          ? { ...prev, jobs: prev.jobs.map((j: any) => (j._id === jobId ? updatedJob : j)) }
          : prev
      );
      
      let targetTab: ViewTab;
      if (status === "pendente") {
        targetTab = "disponiveis";
      } else if (status === "em_execucao") {
        targetTab = "execucao";
      } else if (status === "concluida") {
        targetTab = "concluidas";
      } else {
        targetTab = tab;
      }
      
      setTab(targetTab);
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

  const markAsReceived = async (job: Job) => {
    if (job.status !== "concluida") {
      Swal.fire("Atenção", "Apenas OS concluídas podem ser marcadas como recebidas.", "warning");
      return;
    }

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
        
        if (receiptFileInput?.files && receiptFileInput.files.length > 0) {
          const file = receiptFileInput.files[0];
          
          if (file.size > 50 * 1024 * 1024) {
            Swal.showValidationMessage("O arquivo é muito grande. Tamanho máximo: 50MB");
            return false;
          }
          
          const allowedTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/heic", "image/heif"];
          if (!allowedTypes.includes(file.type)) {
            Swal.showValidationMessage("Tipo de arquivo não permitido. Use PDF, JPG, PNG ou HEIC");
            return false;
          }
          
          try {
            Swal.showLoading();
            
            const formData = new FormData();
            formData.append("file", file);
            formData.append("category", "receipts");
            formData.append("id", job._id);
            
            const uploadRes = await apiFetch("/files/upload", {
              method: "POST",
              headers: {},
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

      const responseData = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", responseData?.error || "Não foi possível marcar como recebido.", "error");
        return;
      }

      const transactionsRes = await apiFetch("/cash", { cache: "no-store" });
      const transactionsData = await transactionsRes.json().catch(() => null);
      if (transactionsData?.data) {
        setTransactions(transactionsData.data);
      }

      const transactionExists = transactionsData?.data?.some(
        (t: any) => t.jobId === job._id || (t.jobId && t.jobId.toString() === job._id.toString())
      );

      if (!transactionExists && responseData?.transaction) {
        setTransactions((prev) => [...prev, responseData.transaction]);
      }

      if (transactionExists || responseData?.transaction) {
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

      if (selectedJob && selectedJob._id === jobId) {
        setSelectedJob({
          ...selectedJob,
          clientSignature: signature,
          clientSignedAt: new Date()
        });
      }

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
      if (apiUrl.endsWith("/api")) {
        apiUrl = apiUrl.slice(0, -4);
      }
      const pdfUrl = `${apiUrl}/api/jobs/${jobId}/pdf`;
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
  };

  const handleNavigateToJob = async (job: Job) => {
    const destination = job.site;
    
    if (!destination && (!job.siteLatitude || !job.siteLongitude)) {
      Swal.fire("Erro", "Endereço do serviço não disponível.", "error");
      return;
    }

    let destinationParam: string;
    if (job.siteLatitude && job.siteLongitude) {
      destinationParam = `${job.siteLatitude},${job.siteLongitude}`;
    } else {
      destinationParam = destination!.replace(/\s*\|\s*/g, ', ');
    }

    if (!navigator.geolocation) {
      window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}`, '_blank');
      return;
    }

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
        
        const skipBtn = document.getElementById('skipLocationBtn');
        if (skipBtn) {
          skipBtn.onclick = () => {
            Swal.close();
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}`, '_blank');
          };
        }
      }
    });

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
        console.log('Tentando obter localização com alta precisão...');
        position = await tryGetLocation(true, 15000, 0);
        console.log('Localização obtida com alta precisão');
      } catch (firstError: any) {
        console.log('Alta precisão falhou, tentando com precisão moderada...');
        try {
          position = await tryGetLocation(false, 10000, 0);
          console.log('Localização obtida com precisão moderada');
        } catch (secondError: any) {
          console.log('Precisão moderada falhou, usando localização em cache...');
          position = await tryGetLocation(false, 5000, 300000);
          console.log('Localização obtida do cache');
        }
      }

      const { latitude, longitude } = position.coords;
      const currentLocation = `${latitude},${longitude}`;
      
      Swal.close();

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
        cancelButtonColor: "#6b7280"
      });
    }
  };

  // Check auth on mount
  useEffect(() => {
    setData(null);
    setSelectedJob(null);
    setPassword("");
    setCheckingAuth(true);
    setAuthLoading(true);
    
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed?.pass) {
          const timestamp = parsed.timestamp || 0;
          const now = Date.now();
          const hoursSinceAuth = (now - timestamp) / (1000 * 60 * 60);
          
          if (hoursSinceAuth < 24) {
            const decodedPass = decodePassword(parsed.pass);
            if (decodedPass) {
              authWithPassword(decodedPass, { silent: true });
              return;
            }
          } else {
            localStorage.removeItem(storageKey);
          }
        }
      }
    } catch (err) {
      console.error(err);
      localStorage.removeItem(storageKey);
    }
    
    setCheckingAuth(false);
    setAuthLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  // Load headquarters address
  useEffect(() => {
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

  const assignedJobs = useMemo(() => data?.jobs || [], [data]);

  const filteredJobs = useMemo(() => {
    if (!data) return [];
    let jobs = assignedJobs;
    
    if (tab === "disponiveis") jobs = jobs.filter((j) => j.status === "pendente");
    else if (tab === "execucao") jobs = jobs.filter((j) => j.status === "em_execucao");
    else if (tab === "concluidas") jobs = jobs.filter((j) => j.status === "concluida");
    
    if (dateFilter !== "all") {
      jobs = jobs.filter((j) => matchesDateFilter(j.plannedDate, dateFilter));
    }
    
    return jobs;
  }, [assignedJobs, tab, data, dateFilter]);

  const groupedJobsByDate = useMemo(() => groupJobsByDate(filteredJobs), [filteredJobs]);

  return {
    password,
    setPassword,
    authLoading,
    data,
    tab,
    setTab,
    updating,
    selectedJob,
    setSelectedJob,
    showPass,
    setShowPass,
    checkingAuth,
    headquartersAddress,
    dateFilter,
    setDateFilter,
    assignedJobs,
    filteredJobs,
    groupedJobsByDate,
    authWithPassword,
    handleStartJob,
    updateJobStatus,
    hasTransactionForJob,
    markAsReceived,
    handleSaveSignature,
    handleDownloadPDF,
    handleLogout,
    handleNavigateToJob
  };
}

