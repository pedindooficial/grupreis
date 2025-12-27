import { useState, useEffect, useMemo, useCallback } from "react";
import Swal from "sweetalert2";
import { apiFetch, apiUrl } from "@/lib/api-client";
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
      const res = await apiFetch(`/operations/team/${teamId}`, {
        method: "POST",
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
      if (json?.data) {
        setData(json.data);
      } else {
        if (!silent) Swal.fire("Erro", "Resposta inválida do servidor.", "error");
        return;
      }
      
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
      title: `<div class="flex items-center gap-3">
        <div class="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
          <svg class="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span class="text-xl font-bold text-slate-800">Iniciar Serviço</span>
      </div>`,
      html: `
        <div class="text-left space-y-4 mt-4">
          <p class="text-base text-slate-600 font-medium">Deseja iniciar este serviço?</p>
          
          <div class="bg-gradient-to-br from-blue-50 to-indigo-50 border-l-4 border-blue-500 rounded-lg p-4 shadow-sm">
            <div class="flex items-start gap-3">
              <div class="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500 flex items-center justify-center">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-bold text-slate-900 mb-1 break-words">${jobTitle}</p>
                <p class="text-xs text-slate-600 leading-relaxed">O serviço será marcado como <span class="font-semibold text-blue-600">"Em execução"</span> e o horário de início será registrado automaticamente.</p>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg p-3">
            <svg class="w-4 h-4 flex-shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Você poderá marcar como concluído quando finalizar o trabalho.</span>
          </div>
        </div>
      `,
      showCancelButton: true,
      confirmButtonColor: "#3b82f6",
      cancelButtonColor: "#94a3b8",
      confirmButtonText: '<span class="px-2">✓ Sim, iniciar agora</span>',
      cancelButtonText: "Cancelar",
      customClass: {
        popup: "rounded-2xl shadow-2xl",
        title: "text-left pb-0",
        htmlContainer: "text-left",
        confirmButton: "rounded-lg font-semibold px-6 py-3 shadow-lg hover:shadow-xl transition-all",
        cancelButton: "rounded-lg font-semibold px-6 py-3 hover:bg-slate-200 transition-all"
      },
      buttonsStyling: true
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
      
      const res = await apiFetch(`/operations/jobs/${jobId}`, {
        method: "PATCH",
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
      // Use apiUrl helper to construct the correct API URL
      const pdfUrl = apiUrl(`/jobs/${jobId}/pdf`);
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

    // Check if device is mobile/tablet (has GPS)
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // Function to open Google Maps app on mobile
    const openGoogleMapsApp = (destination: string, origin?: string) => {
      if (isAndroid) {
        // Android: Use google.navigation: scheme for route navigation
        let appUrl: string;
        if (origin) {
          // With origin (route navigation)
          appUrl = `google.navigation:q=${destination}`;
        } else {
          // Just destination
          appUrl = `google.navigation:q=${destination}`;
        }
        
        // Create a hidden link and click it to open the app
        const link = document.createElement('a');
        link.href = appUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fallback to web version after a short delay
        setTimeout(() => {
          const webUrl = origin
            ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
          window.open(webUrl, '_blank');
        }, 1000);
      } else if (isIOS) {
        // iOS: Use comgooglemaps:// scheme (Google Maps app)
        let appUrl: string;
        if (origin) {
          appUrl = `comgooglemaps://?daddr=${destination}&saddr=${origin}&directionsmode=driving`;
        } else {
          appUrl = `comgooglemaps://?daddr=${destination}&directionsmode=driving`;
        }
        
        // Create a hidden link and click it to open the app
        const link = document.createElement('a');
        link.href = appUrl;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Fallback to Apple Maps if Google Maps not installed, then web
        setTimeout(() => {
          const appleMapsUrl = origin
            ? `maps://?daddr=${destination}&saddr=${origin}`
            : `maps://?daddr=${destination}`;
          const appleLink = document.createElement('a');
          appleLink.href = appleMapsUrl;
          appleLink.style.display = 'none';
          document.body.appendChild(appleLink);
          appleLink.click();
          document.body.removeChild(appleLink);
          
          // Final fallback to web
          setTimeout(() => {
            const webUrl = origin
              ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
              : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
            window.open(webUrl, '_blank');
          }, 1000);
        }, 1000);
      } else {
        // Desktop or other: open in web browser
        const webUrl = origin
          ? `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=driving`
          : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destination)}`;
        window.open(webUrl, '_blank');
      }
    };
    
    // If desktop, show alert about GPS requirement
    if (!isMobile) {
      Swal.fire({
        title: "GPS Necessário",
        html: `
          <div class="text-left space-y-3">
            <p class="text-sm text-gray-600">
              Para usar a navegação com rota a partir da sua localização atual, é necessário um dispositivo com GPS (celular ou tablet).
            </p>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p class="text-xs font-semibold text-blue-900 mb-2">💡 Opções:</p>
              <ul class="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Use um celular ou tablet para acessar esta página</li>
                <li>Ou abra apenas o destino no Google Maps (sem rota)</li>
              </ul>
            </div>
          </div>
        `,
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Abrir destino",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#3b82f6"
      }).then((result) => {
        if (result.isConfirmed) {
          window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destinationParam)}`, '_blank');
        }
      });
      return;
    }

    // Check geolocation support
    if (!navigator.geolocation) {
      Swal.fire({
        title: "Geolocalização não suportada",
        text: "Seu navegador não suporta geolocalização. Abrindo apenas o destino...",
        icon: "info"
      }).then(() => {
        openGoogleMapsApp(destinationParam);
      });
      return;
    }

    let watchId: number | null = null;
    let positionObtained = false;

    // Show loading with skip option
    const loadingAlert = Swal.fire({
      title: "Obtendo localização...",
      html: `
        <p class="text-sm text-slate-600 mb-3">Aguarde enquanto obtemos sua localização atual via GPS</p>
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
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            Swal.close();
            openGoogleMapsApp(destinationParam);
          };
        }

        // Use watchPosition (most reliable for GPS)
        watchId = navigator.geolocation.watchPosition(
          (position) => {
            if (positionObtained) return;
            positionObtained = true;
            
            const { latitude, longitude } = position.coords;
            
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            
            Swal.close();
            const currentLocation = `${latitude},${longitude}`;
            // Open Google Maps app on mobile with route navigation
            openGoogleMapsApp(destinationParam, currentLocation);
          },
          (error) => {
            if (positionObtained) return;
            
            let errorMessage = "Não foi possível obter sua localização.";
            let errorDetails = "";
            
            if (error.code) {
              switch (error.code) {
                case 1: // PERMISSION_DENIED
                  errorMessage = "Permissão negada";
                  errorDetails = "Por favor, permita o acesso à localização nas configurações do navegador.";
                  break;
                case 2: // POSITION_UNAVAILABLE
                  errorMessage = "Localização indisponível";
                  errorDetails = "Verifique se o GPS está ativado e você está em um local com boa recepção.";
                  break;
                case 3: // TIMEOUT
                  errorMessage = "Tempo esgotado";
                  errorDetails = "Não foi possível obter sua localização em tempo hábil. Verifique se o GPS está ativado.";
                  break;
              }
            }
            
            if (watchId !== null) {
              navigator.geolocation.clearWatch(watchId);
            }
            
            Swal.close();
            
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
                      id="openMapsErrorBtn"
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
              cancelButtonText: "Fechar",
              cancelButtonColor: "#6b7280",
              customClass: {
                popup: "text-left",
                htmlContainer: "text-gray-600"
              },
              didOpen: () => {
                const openMapsBtn = document.getElementById('openMapsErrorBtn');
                if (openMapsBtn) {
                  openMapsBtn.onclick = () => {
                    Swal.close();
                    openGoogleMapsApp(destinationParam);
                  };
                }
              }
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 20000,
            maximumAge: 0
          }
        );
      },
      willClose: () => {
        // Cleanup: stop watching position when dialog closes
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
          watchId = null;
        }
      }
    });
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

  // Real-time updates using Server-Sent Events (SSE) with MongoDB Change Streams
  useEffect(() => {
    if (!data || !password || !teamId) return; // Only connect when authenticated

    const API_BASE = import.meta.env.VITE_API_URL || 
      (import.meta.env.DEV ? "https://localhost:4000/api" : "https://gruporeis.cloud/api");
    
    // Remove /api suffix if present
    const baseUrl = API_BASE.endsWith("/api") ? API_BASE.slice(0, -4) : API_BASE;
    const sseUrl = `${baseUrl}/api/operations/team/${teamId}/watch?password=${encodeURIComponent(password)}`;

    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);

      eventSource.onopen = () => {
        console.log("✅ Connected to real-time updates");
      };

      eventSource.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          if (message.type === "update" && message.jobs) {
            const previousJobCount = data.jobs?.length || 0;
            const newJobCount = message.jobs.length;
            
            // Update data with new jobs
            setData((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                jobs: message.jobs
              };
            });

            // Show notification if new jobs were added
            if (newJobCount > previousJobCount) {
              const newJobsCount = newJobCount - previousJobCount;
              Swal.fire({
                icon: "info",
                title: "Nova OS disponível!",
                text: `${newJobsCount} nova${newJobsCount > 1 ? 's' : ''} ordem${newJobsCount > 1 ? 'ens' : ''} de serviço ${newJobsCount > 1 ? 'foram' : 'foi'} adicionada${newJobsCount > 1 ? 's' : ''}.`,
                toast: true,
                position: "top-end",
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
              });
            }
          }
        } catch (err) {
          console.error("Error parsing SSE message:", err);
        }
      };

      eventSource.onerror = (error) => {
        console.error("SSE connection error:", error);
        // EventSource will automatically try to reconnect
      };

      // Handle visibility change - close when tab is hidden to save resources
      const handleVisibilityChange = () => {
        if (document.hidden && eventSource) {
          eventSource.close();
          eventSource = null;
        } else if (!document.hidden && !eventSource && data && password) {
          // Reconnect when tab becomes visible
          try {
            eventSource = new EventSource(sseUrl);
            eventSource.onmessage = (event) => {
              try {
                const message = JSON.parse(event.data);
                if (message.type === "update" && message.jobs) {
                  setData((prev) => {
                    if (!prev) return prev;
                    return { ...prev, jobs: message.jobs };
                  });
                }
              } catch (err) {
                console.error("Error parsing SSE message:", err);
              }
            };
          } catch (err) {
            console.error("Error reconnecting SSE:", err);
          }
        }
      };

      document.addEventListener("visibilitychange", handleVisibilityChange);

      // Cleanup on unmount
      return () => {
        document.removeEventListener("visibilitychange", handleVisibilityChange);
        if (eventSource) {
          eventSource.close();
        }
      };
    } catch (err) {
      console.error("Error setting up SSE connection:", err);
    }
  }, [data, password, teamId]);

  const assignedJobs = useMemo(() => data?.jobs || [], [data]);

  // Jobs filtered only by date (for status card counts)
  const dateFilteredJobs = useMemo(() => {
    if (!data) return [];
    if (dateFilter === "all") return assignedJobs;
    return assignedJobs.filter((j) => matchesDateFilter(j.plannedDate, dateFilter));
  }, [assignedJobs, dateFilter, data]);

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
    dateFilteredJobs,
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

