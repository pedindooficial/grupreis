"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import JobsMap from "./_components/JobsMap";
import JobsFilters from "./_components/JobsFilters";
import JobsList from "./_components/JobsList";
import JobForm from "./_components/JobForm";
import JobDetail from "./_components/JobDetail";
import JobFeedback from "./_components/JobFeedback";
import { Status, STATUS_LABEL, STATUS_COLORS, SERVICES, LOCAL_TYPES, SOIL_TYPES, CATALOG_DIAMETERS, ACCESS_TYPES, CATEGORIES, PAYMENT_METHODS, SERVICE_DEFAULT_CATS } from "./constants";
import { mapSoilTypeToCatalog, mapAccessToCatalog, normalizeLocalType, normalizeSoilType, normalizeAccess, normalizeDiameter, formatDateTime, convertToISO, convertFromISO, calculateServicePrice, matchesDateFilter } from "./utils";

export default function JobsPage() {
  const [mode, setMode] = useState<"list" | "form" | "detail" | "edit">("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  
  // Set default dates to today and tomorrow
  const getTodayDate = () => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  };
  
  const getTomorrowDate = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`;
  };
  
  const todayStr = getTodayDate();
  const tomorrowStr = getTomorrowDate();
  
  const [dateFilter, setDateFilter] = useState<"all" | "ontem" | "hoje" | "amanha" | "esse_mes" | "esse_ano" | "custom">("custom");
  // Temporary state for custom date inputs (not applied until "Buscar" is clicked)
  const [tempCustomDateStart, setTempCustomDateStart] = useState(todayStr);
  const [tempCustomDateEnd, setTempCustomDateEnd] = useState(tomorrowStr);
  // Applied custom dates (used in filtering) - set to today and tomorrow by default
  const [customDateStart, setCustomDateStart] = useState(todayStr);
  const [customDateEnd, setCustomDateEnd] = useState(tomorrowStr);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [catalogItems, setCatalogItems] = useState<any[]>([]);
  const [availability, setAvailability] = useState<{
    available: string[];
    booked: string[];
    date: string;
    estimatedDuration?: number;
    durationText?: string;
  } | null>(null);
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const [calculatingDistance, setCalculatingDistance] = useState(false);

  const [form, setForm] = useState({
    clientId: "",
    clientName: "",
    site: "",
    team: "", // Team name (kept for display/backward compatibility)
    teamId: "", // Team ID (preferred)
    status: "pendente" as Status,
    plannedDate: "",
    notes: "",
    value: "",
    discountPercent: "",
    selectedAddress: "",
    travelDistanceKm: 0,
    travelPrice: 0,
    travelDescription: "",
    nfeFileKey: "", // S3 key for NFE file
    nfeFile: null as File | null, // Temporary file before upload
    services: [] as Array<{
      id: string;
      catalogId?: string;
      service: string;
      localType: string;
      soilType: string;
      sptInfo: string;
      sptFileName?: string;
      access: string;
      categories: string[];
      diametro: string;
      profundidade: string;
      quantidade: string;
      observacoes: string;
      value: string;
      discountPercent: string;
      executionTime?: number;
    }>
  });

  // Check team availability when team, date, or services change
  useEffect(() => {
    const checkAvailability = async () => {
      if (!form.team || !form.plannedDate) {
        setAvailability(null);
        return;
      }

      try {
        setCheckingAvailability(true);
        // Extract date part from datetime-local format (YYYY-MM-DD)
        const datePart = form.plannedDate.split("T")[0];
        
        // Prepare services data for availability check
        const servicesForCheck = form.services
          .filter(s => s.executionTime && s.quantidade && s.profundidade)
          .map(s => ({
            executionTime: s.executionTime,
            quantidade: s.quantidade,
            profundidade: s.profundidade
          }));
        
        const queryParams = new URLSearchParams({
          team: form.team,
          date: datePart
        });
        
        if (servicesForCheck.length > 0) {
          queryParams.append('services', JSON.stringify(servicesForCheck));
        }
        
        const res = await apiFetch(`/jobs/availability?${queryParams.toString()}`);
        const data = await res.json();
        
        if (res.ok && data?.data) {
          setAvailability(data.data);
          
          // Check if selected time is available
          if (form.plannedDate) {
            const selectedTime = new Date(form.plannedDate);
            const timeString = `${selectedTime.getHours().toString().padStart(2, "0")}:${selectedTime.getMinutes().toString().padStart(2, "0")}`;
            
            if (data.data.booked.includes(timeString)) {
              // Show warning if selected time is booked
              Swal.fire({
                icon: "warning",
                title: "Equipe Indisponível",
                html: `
                  <p class="text-sm text-gray-700 mb-2">A equipe <strong>${form.team}</strong> já possui uma OS agendada neste horário.</p>
                  ${data.data.durationText ? `<p class="text-xs text-gray-500 mb-2">Duração estimada: <strong>${data.data.durationText}</strong></p>` : ''}
                  <p class="text-xs text-gray-500">Horários disponíveis neste dia:</p>
                  <div class="mt-2 max-h-40 overflow-y-auto">
                    ${data.data.available.length > 0 
                      ? `<div class="flex flex-wrap gap-1">${data.data.available.map((t: string) => `<span class="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">${t}</span>`).join("")}</div>`
                      : "<p class=\"text-xs text-red-600\">Nenhum horário disponível neste dia.</p>"
                    }
                  </div>
                `,
                confirmButtonText: "Entendi"
              });
            }
          }
        }
      } catch (err) {
        console.error("Error checking availability:", err);
      } finally {
        setCheckingAvailability(false);
      }
    };

    // Debounce the check
    const timeoutId = setTimeout(checkAvailability, 500);
    return () => clearTimeout(timeoutId);
  }, [form.team, form.plannedDate, form.services]);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/clients", { cache: "no-store" });
        const data = await res.json();
        setClients(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    loadClients();
  }, []);

  useEffect(() => {
    const loadTeams = async () => {
      try {
        const res = await apiFetch("/teams", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar equipes", data);
          return;
        }
        setTeams(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    loadTeams();
  }, []);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const res = await apiFetch("/jobs", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar OS", data);
          return;
        }
        setJobs(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadJobs();
  }, []);

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        const res = await apiFetch("/cash", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (data?.data) {
          setTransactions(Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        console.error("Erro ao carregar transações", err);
      }
    };
    loadTransactions();
  }, []);

  useEffect(() => {
    const loadCatalog = async () => {
      try {
        const res = await apiFetch("/catalog", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.data) {
          // Only load active catalog items
          setCatalogItems(Array.isArray(data.data) ? data.data.filter((item: any) => item.active !== false) : []);
        }
      } catch (err) {
        console.error("Erro ao carregar catálogo", err);
      }
    };
    loadCatalog();
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return jobs.filter((job) => {
      const matchesTerm =
        term.length === 0 ||
        job.title.toLowerCase().includes(term) ||
        (job.clientName || "").toLowerCase().includes(term) ||
        job.site.toLowerCase().includes(term);
      const matchesStatus =
        statusFilter === "all" ? true : job.status === statusFilter;
      const matchesDate = matchesDateFilter(
        job.plannedDate,
        dateFilter,
        customDateStart,
        customDateEnd
      );
      return matchesTerm && matchesStatus && matchesDate;
    });
  }, [jobs, search, statusFilter, dateFilter, customDateStart, customDateEnd]);

  // Calcular valor total automaticamente a partir dos serviços
  const servicesValuesKey = useMemo(() => {
    return form.services.map(s => `${s.id}:${s.value || ""}:${s.discountPercent || ""}`).join("|");
  }, [form.services]);

  useEffect(() => {
    if (mode !== "form" && mode !== "edit") return;
    
    let totalValue = 0;
    let totalDiscountValue = 0;
    let hasAnyValue = false;
    
    form.services.forEach((srv) => {
      if (srv.value && srv.value.trim() !== "") {
        const value = parseFloat(srv.value);
        if (!isNaN(value) && value >= 0) {
          hasAnyValue = true;
          totalValue += value;
          
          // Calcular desconto do serviço
          const discountPercent = srv.discountPercent && srv.discountPercent.trim() !== ""
            ? parseFloat(srv.discountPercent)
            : 0;
          
          if (!isNaN(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
            totalDiscountValue += (value * discountPercent) / 100;
          }
        }
      }
    });
    
    // Add travel price to total
    if (form.travelPrice && form.travelPrice > 0) {
      totalValue += form.travelPrice;
      hasAnyValue = true;
    }
    
    // Atualizar valor total apenas se houver serviços com valores
    if (hasAnyValue && totalValue > 0) {
      const calculatedDiscountPercent = totalValue > 0 ? ((totalDiscountValue / totalValue) * 100) : 0;
      const newValue = totalValue.toFixed(2);
      const newDiscount = calculatedDiscountPercent > 0 ? calculatedDiscountPercent.toFixed(2) : "0";
      
      // Só atualizar se os valores forem diferentes
      const currentValueNum = form.value ? parseFloat(form.value) : 0;
      const currentDiscountNum = form.discountPercent ? parseFloat(form.discountPercent) : 0;
      
      if (Math.abs(currentValueNum - totalValue) > 0.01 || 
          Math.abs(currentDiscountNum - calculatedDiscountPercent) > 0.01) {
        setForm((f) => ({
          ...f,
          value: newValue,
          discountPercent: newDiscount
        }));
      }
    } else if (!hasAnyValue && form.value && parseFloat(form.value) > 0) {
      // Se nenhum serviço tem valor mas o campo total tem, manter (permite edição manual)
      // Não fazer nada
    }
  }, [servicesValuesKey, form.travelPrice, mode]);

  const resetForm = () =>
    setForm({
      clientId: "",
      clientName: "",
      site: "",
      team: "",
      teamId: "",
      status: "pendente",
      plannedDate: "",
      notes: "",
      value: "",
      discountPercent: "",
      selectedAddress: "",
      travelDistanceKm: 0,
      travelPrice: 0,
      travelDescription: "",
      nfeFileKey: "",
      nfeFile: null,
      services: [] as Array<{
        id: string;
        catalogId?: string;
        service: string;
        localType: string;
        soilType: string;
        sptInfo: string;
        sptFileName?: string;
        access: string;
        categories: string[];
        diametro: string;
        profundidade: string;
        quantidade: string;
        observacoes: string;
        value: string;
        discountPercent: string;
        executionTime?: number;
      }>
    });

  const populateFormWithJob = (job: any) => {
    // Convert teamId to string (handle ObjectId objects and nested _id)
    let teamIdString = "";
    if (job.teamId) {
      if (typeof job.teamId === 'string') {
        teamIdString = job.teamId;
      } else if (job.teamId._id) {
        teamIdString = job.teamId._id.toString();
      } else if (job.teamId.toString) {
        teamIdString = job.teamId.toString();
      }
    } else if (job.team) {
      // If teamId is missing but team name exists, try to find the teamId
      const matchingTeam = teams.find((t) => t.name === job.team);
      if (matchingTeam) {
        teamIdString = typeof matchingTeam._id === 'string' ? matchingTeam._id : (matchingTeam._id?.toString?.() || String(matchingTeam._id));
      }
    }
    
    // Convert clientId to string
    let clientIdString = "";
    if (job.clientId) {
      if (typeof job.clientId === 'string') {
        clientIdString = job.clientId;
      } else if (job.clientId._id) {
        clientIdString = job.clientId._id.toString();
      } else if (job.clientId.toString) {
        clientIdString = job.clientId.toString();
      }
    }
    
    const newForm = {
      clientId: clientIdString,
      clientName: job.clientName || "",
      site: job.site || "",
      team: job.team || "",
      teamId: teamIdString,
      status: job.status || "pendente",
      plannedDate: job.plannedDate ? convertFromISO(job.plannedDate) : "",
      notes: job.notes || "",
      value: job.value ? String(job.value) : "",
      discountPercent: job.discountPercent ? String(job.discountPercent) : "",
      selectedAddress: job.selectedAddress || "",
      travelDistanceKm: job.travelDistanceKm || 0,
      travelPrice: job.travelPrice || 0,
      travelDescription: job.travelDescription || "",
      nfeFileKey: job.nfeFileKey || "",
      nfeFile: null, // Don't load file when editing, only the key
      services: (job.services || []).map((srv: any, index: number) => {
        // Convert catalogId to string
        let catalogIdString: string | undefined = undefined;
        if (srv.catalogId) {
          if (typeof srv.catalogId === 'string') {
            catalogIdString = srv.catalogId;
          } else if (srv.catalogId._id) {
            catalogIdString = srv.catalogId._id.toString();
          } else if (srv.catalogId.toString) {
            catalogIdString = srv.catalogId.toString();
          }
        }
        
        const normalizedLocalType = normalizeLocalType(srv.localType || "");
        const normalizedSoilType = normalizeSoilType(srv.soilType || "");
        const normalizedAccess = normalizeAccess(srv.access || "");
        const normalizedDiameter = normalizeDiameter(srv.diametro || "");
        
        return {
          id: `service-${Date.now()}-${index}`,
          catalogId: catalogIdString,
          service: srv.service || "",
          localType: normalizedLocalType,
          soilType: normalizedSoilType,
          sptInfo: srv.sptInfo || "",
          sptFileName: srv.sptFileName || "",
          access: normalizedAccess,
          categories: srv.categories || [],
          diametro: normalizedDiameter,
          profundidade: srv.profundidade || "",
          quantidade: srv.quantidade || "",
          observacoes: srv.observacoes || "",
          value: srv.value !== undefined ? String(srv.value) : "",
          discountPercent: srv.discountPercent !== undefined ? String(srv.discountPercent) : "",
          executionTime: srv.executionTime || 0
        };
      })
    };
    
    setForm(newForm);
    // Expand all services when editing
    const serviceIds = newForm.services.map((s) => s.id);
    setExpandedServices(new Set(serviceIds));
  };

  const startNew = () => {
    resetForm();
    setMode("form");
    setSelected(null);
  };

  const calculateTravelPrice = async () => {
    if (!form.clientId) {
      Swal.fire("Atenção", "Selecione um cliente primeiro.", "warning");
      return;
    }

    try {
      setCalculatingDistance(true);
      
      // Get client address
      const res = await apiFetch(`/clients/${form.clientId}`);
      if (!res.ok) {
        throw new Error("Falha ao buscar endereço do cliente");
      }
      const data = await res.json();
      console.log("Dados do cliente:", data);
      
      // Collect all available addresses
      let addresses: string[] = [];
      
      if (data?.data?.addresses && Array.isArray(data.data.addresses) && data.data.addresses.length > 0) {
        addresses = data.data.addresses
          .map((addr: any) => addr.address)
          .filter((addr: string) => addr && addr.trim());
      } else if (data?.data?.address) {
        addresses = [data.data.address];
      }
      
      if (addresses.length === 0) {
        Swal.fire("Atenção", "Cliente não possui endereço cadastrado.", "warning");
        setCalculatingDistance(false);
        return;
      }
      
      let clientAddress = addresses[0];
      
      // If multiple addresses, ask user to select
      if (addresses.length > 1) {
        const { value: selection } = await Swal.fire({
          title: "Selecione o Endereço",
          html: `
            <div class="text-left">
              <p class="mb-3 text-sm text-slate-600">Este cliente possui ${addresses.length} endereços cadastrados. Selecione qual usar para o cálculo de deslocamento:</p>
              <select id="addressSelect" class="w-full p-2 border border-gray-300 rounded-lg text-sm">
                ${addresses.map((addr, idx) => 
                  `<option value="${idx}">${addr}</option>`
                ).join("")}
              </select>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: "Calcular",
          cancelButtonText: "Cancelar",
          preConfirm: () => {
            const select = document.getElementById("addressSelect") as HTMLSelectElement;
            return select ? parseInt(select.value) : 0;
          }
        });
        
        if (selection === undefined) {
          setCalculatingDistance(false);
          return; // User cancelled
        }
        clientAddress = addresses[selection];
      }
      
      if (!clientAddress || !clientAddress.trim()) {
        Swal.fire("Atenção", "Endereço inválido", "warning");
        setCalculatingDistance(false);
        return;
      }
      
      console.log("Calculando distância para:", clientAddress);
      
      // Calculate distance
      const distRes = await apiFetch("/distance/calculate", {
        method: "POST",
        body: JSON.stringify({ clientAddress })
      });
      
      const distData = await distRes.json();
      console.log("Resposta do servidor:", distData);
      
      if (!distRes.ok) {
        const errorMsg = distData?.error || "Não foi possível calcular a distância";
        const errorDetail = distData?.detail || "";
        
        // Check if it's an API activation error
        if (errorMsg.includes("Distance Matrix API") || errorDetail.includes("LegacyApiNotActivatedMapError")) {
          Swal.fire({
            icon: "error",
            title: "Distance Matrix API não ativada",
            html: `
              <div class="text-left space-y-3">
                <p>A API do Google Maps precisa ser ativada no Google Cloud Console.</p>
                <p class="font-semibold">📋 Como ativar:</p>
                <ol class="list-decimal ml-5 space-y-1">
                  <li>Acesse o <a href="https://console.cloud.google.com/apis/library/distance-matrix-backend.googleapis.com" target="_blank" class="text-blue-500 underline">Google Cloud Console</a></li>
                  <li>Faça login com sua conta Google</li>
                  <li>Clique em "ATIVAR" na Distance Matrix API</li>
                  <li>Aguarde alguns segundos e tente novamente</li>
                </ol>
                <p class="text-sm text-gray-500 mt-3">
                  💡 É gratuito até 40.000 requisições/mês!
                </p>
              </div>
            `,
            confirmButtonText: "Entendi",
            width: 600
          });
          return;
        }
        
        // Check if it's an address not found error
        if (errorMsg.includes("Endereço não encontrado") || errorMsg.includes("NOT_FOUND")) {
          Swal.fire({
            icon: "error",
            title: "Endereço não encontrado",
            html: `
              <div class="text-left space-y-3">
                <p class="text-sm">O Google Maps não conseguiu localizar um dos endereços:</p>
                ${distData.companyAddress ? `
                  <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p class="text-xs font-semibold text-blue-700 mb-1">📍 Endereço da Empresa:</p>
                    <p class="text-xs text-blue-900">${distData.companyAddress}</p>
                  </div>
                ` : ""}
                ${distData.clientAddress ? `
                  <div class="p-3 bg-amber-50 rounded border-l-4 border-amber-400">
                    <p class="text-xs font-semibold text-amber-700 mb-1">📍 Endereço do Cliente:</p>
                    <p class="text-xs text-amber-900">${distData.clientAddress}</p>
                  </div>
                ` : ""}
                <p class="text-xs text-gray-600 mt-3">
                  ✏️ <strong>Dica:</strong> Verifique se os endereços estão completos e corretos. 
                  Endereços incompletos ou com erros de digitação podem não ser encontrados pelo Google Maps.
                </p>
                ${!distData.companyAddress || distData.companyAddress.trim() === "" ? `
                  <p class="text-xs text-red-600 mt-2">
                    ⚠️ O endereço da empresa não está configurado! Configure em <strong>Configurações</strong>.
                  </p>
                ` : ""}
              </div>
            `,
            confirmButtonText: "Entendi",
            width: 600
          });
          return;
        }
        
        Swal.fire("Erro", errorMsg + (errorDetail ? `<br><small>${errorDetail}</small>` : ""), "error");
        return;
      }
      
      // Update form with travel data
      setForm((f) => ({
        ...f,
        selectedAddress: clientAddress,
        travelDistanceKm: distData.data.distanceKm,
        travelPrice: distData.data.travelPrice,
        travelDescription: distData.data.travelDescription
      }));
      
      // Show success message
      Swal.fire({
        icon: "success",
        title: "Distância Calculada",
        html: `
          <div class="text-left space-y-2">
            <p><strong>Distância:</strong> ${distData.data.distanceText}</p>
            <p><strong>Tempo estimado:</strong> ${distData.data.durationText}</p>
            <p><strong>Preço de deslocamento:</strong> R$ ${distData.data.travelPrice.toFixed(2)}</p>
            <p class="text-sm text-gray-500">${distData.data.travelDescription}</p>
          </div>
        `,
        confirmButtonText: "OK"
      });
      
    } catch (error: any) {
      console.error("Erro ao calcular distância:", error);
      Swal.fire("Erro", error.message || "Erro ao calcular distância", "error");
    } finally {
      setCalculatingDistance(false);
    }
  };

  const saveJob = async () => {
    if (saving) return;
    const servicesValid = form.services.length > 0 && form.services.every((s) => s.service);
    if (!servicesValid) {
      Swal.fire("Atenção", "Adicione ao menos um serviço e selecione o tipo.", "warning");
      return;
    }

    const clientName =
      form.clientId && clients.find((c) => c._id === form.clientId)?.name
        ? clients.find((c) => c._id === form.clientId)?.name
        : form.clientName || "Não informado";

    const isEditing = mode === "edit" && selected;

    try {
      setSaving(true);
      
      // Upload NFE file if a new file was selected
      let nfeFileKey = form.nfeFileKey; // Keep existing key if no new file
      if (form.nfeFile) {
        try {
          const formData = new FormData();
          formData.append("file", form.nfeFile);
          formData.append("category", "nfe");
          // Only append id if it exists and is not empty
          if (isEditing && selected && selected._id) {
            formData.append("id", String(selected._id));
          }

          const uploadRes = await apiFetch("/files/upload", {
            method: "POST",
            body: formData as any
          });

          const uploadData = await uploadRes.json().catch(() => null);

          if (!uploadRes.ok) {
            const errorMessage = uploadData?.error || uploadData?.detail || "Falha ao fazer upload do arquivo NFE";
            throw new Error(errorMessage);
          }

          if (!uploadData?.data?.key) {
            throw new Error("Resposta do servidor inválida: chave do arquivo não encontrada");
          }

          nfeFileKey = uploadData.data.key;
          
          // If we uploaded a new file and there was an old one, delete the old file from S3
          if (isEditing && selected?.nfeFileKey && selected.nfeFileKey !== nfeFileKey) {
            try {
              const encodedKey = encodeURIComponent(selected.nfeFileKey);
              await apiFetch(`/files/${encodedKey}`, {
                method: "DELETE"
              });
            } catch (err) {
              console.error("Error deleting old NFE file from S3:", err);
              // Don't block the save if deletion fails
            }
          }
        } catch (err: any) {
          console.error("NFE upload error:", err);
          const errorMessage = err?.message || "Falha ao fazer upload do arquivo NFE. Tente novamente.";
          Swal.fire("Erro", errorMessage, "error");
          setSaving(false);
          return;
        }
      } else if (isEditing && selected?.nfeFileKey && (!form.nfeFileKey || form.nfeFileKey.trim() === "")) {
        // If editing and NFE was removed (empty key), delete the old file from S3
        try {
          const encodedKey = encodeURIComponent(selected.nfeFileKey);
          await apiFetch(`/files/${encodedKey}`, {
            method: "DELETE"
          });
          nfeFileKey = ""; // Ensure it's empty
        } catch (err) {
          console.error("Error deleting NFE file from S3:", err);
          // Don't block the save if deletion fails
        }
      }
      
      // Remover campos vazios do form antes de enviar
      const { value: formValue, discountPercent: formDiscount, ...restForm } = form;
      
      // Processar serviços com valores individuais
      const processedServices = form.services.map((srv) => {
        const serviceData: any = {
          catalogId: (srv as any).catalogId || undefined,
          service: srv.service,
          localType: srv.localType,
          soilType: srv.soilType,
          access: srv.access,
          sptInfo: srv.sptInfo,
          sptFileName: srv.sptFileName,
          categories: srv.categories,
          diametro: srv.diametro,
          profundidade: srv.profundidade,
          quantidade: srv.quantidade,
          observacoes: srv.observacoes
        };

        // Adicionar valores do serviço se foram preenchidos
        if (srv.value && srv.value.trim() !== "") {
          const value = parseFloat(srv.value);
          if (!isNaN(value) && value >= 0) {
            serviceData.value = value;
            
            const discountPercent = srv.discountPercent && srv.discountPercent.trim() !== ""
              ? parseFloat(srv.discountPercent)
              : 0;
            
            if (!isNaN(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
              serviceData.discountPercent = discountPercent;
              serviceData.discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
              serviceData.finalValue = value - serviceData.discountValue;
            } else {
              serviceData.discountPercent = 0;
              serviceData.discountValue = 0;
              serviceData.finalValue = value;
            }
          }
        } else {
          // Se não tem valor, não incluir campos de valor
          delete serviceData.value;
          delete serviceData.discountPercent;
          delete serviceData.discountValue;
          delete serviceData.finalValue;
        }
        
        // Include executionTime if present (from catalog variation)
        if ((srv as any).executionTime !== undefined) {
          serviceData.executionTime = (srv as any).executionTime;
        }

        return serviceData;
      });
      
      const { team, ...restFormWithoutTeam } = restForm;
      const payload: any = {
        ...restFormWithoutTeam,
        services: processedServices,
        clientName,
        status: "pendente"
      };
      
      // Include teamId if available, otherwise fall back to team name for backward compatibility
      if (form.teamId) {
        payload.teamId = form.teamId;
      } else if (form.team) {
        payload.team = form.team;
      }
      
      // Include travel/displacement data if calculated
      if (form.travelDistanceKm && form.travelDistanceKm > 0) {
        payload.selectedAddress = form.selectedAddress;
        payload.travelDistanceKm = form.travelDistanceKm;
        payload.travelPrice = form.travelPrice;
        payload.travelDescription = form.travelDescription;
      }
      
      // Include NFE file key - if empty and editing, set to null to clear it in DB
      if (nfeFileKey && nfeFileKey.trim() !== "") {
        payload.nfeFileKey = nfeFileKey;
      } else if (isEditing && selected?.nfeFileKey) {
        // If editing and NFE was removed, explicitly set to null to clear it
        payload.nfeFileKey = null;
      }
      
      // Only include plannedDate if it has a value (not empty string)
      if (form.plannedDate && form.plannedDate.trim() !== "") {
        payload.plannedDate = form.plannedDate;
      } else {
        // Remove plannedDate if it's empty to avoid sending empty string
        delete payload.plannedDate;
      }
      
      // Calculate total estimated duration in minutes
      let totalMinutes = 0;
      form.services.forEach((srv: any) => {
        const catalogItem = catalogItems.find((item) => item._id === srv.catalogId);
        if (catalogItem && srv.diametro && srv.soilType && srv.access && srv.quantidade && srv.profundidade) {
          const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
          const catalogAccess = mapAccessToCatalog(srv.access);
          const diameterNum = parseInt(srv.diametro, 10);
          
          const priceVariation = catalogItem.priceVariations?.find(
            (pv: any) =>
              pv.diameter === diameterNum &&
              pv.soilType === catalogSoilType &&
              pv.access === catalogAccess
          );
          
          if (priceVariation?.executionTime) {
            const quantity = parseFloat(srv.quantidade) || 0;
            const depth = parseFloat(srv.profundidade) || 0;
            totalMinutes += priceVariation.executionTime * quantity * depth;
          }
        }
      });
      
      // Add 30 minutes gap if we have execution time
      if (totalMinutes > 0) {
        payload.estimatedDuration = totalMinutes + 30; // Add 30 min gap
      }
      
      // Só adicionar value geral se foi preenchido (permite 0)
      if (formValue && formValue.trim() !== "") {
        const value = parseFloat(formValue);
        if (!isNaN(value) && value >= 0) {
          payload.value = value;
          
          // Só adicionar desconto se value foi preenchido
          if (formDiscount && formDiscount.trim() !== "") {
            const discountPercent = parseFloat(formDiscount);
            if (!isNaN(discountPercent) && discountPercent >= 0 && discountPercent <= 100) {
              payload.discountPercent = discountPercent;
            }
          } else {
            // Se não tem desconto, definir como 0
            payload.discountPercent = 0;
          }
        }
      }
      
      const url = isEditing ? `/jobs/${selected._id}` : "/jobs";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || `Não foi possível ${isEditing ? "atualizar" : "salvar"} a OS.`, "error");
        return;
      }
      
      if (isEditing) {
        // Update existing job in list
        setJobs((prev) => prev.map((job) => (job._id === selected._id ? data.data : job)));
      } else {
        // Add new job to list
        setJobs((prev) => [data.data, ...prev]);
      }
      
      resetForm();
      setSelected(null);
      setMode("list");
      Swal.fire("Sucesso", `OS ${isEditing ? "atualizada" : "salva"} com sucesso.${form.nfeFile ? " Arquivo NFE enviado." : ""}`, "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar OS.", "error");
    } finally {
      setSaving(false);
    }
  };

  const hasTransactionForJob = (jobId: string | undefined) => {
    if (!jobId || !transactions || transactions.length === 0) return false;
    const jobIdStr = String(jobId);
    return transactions.some((t) => {
      if (!t || !t.jobId) return false;
      const tJobIdStr = String(t.jobId);
      // Compare both as strings to handle ObjectId vs string comparisons
      return tJobIdStr === jobIdStr;
    });
  };

  const markAsReceived = async (job: any, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (job.status !== "concluida") {
      Swal.fire("Atenção", "Apenas OS concluídas podem ser marcadas como recebidas.", "warning");
      return;
    }

    // Check if transaction already exists
    if (hasTransactionForJob(job._id)) {
      // Transaction exists, use the received endpoint to mark as received
      const result = await Swal.fire({
        title: "Marcar como Recebido",
        html: `
          <div class="text-left" style="max-width: 500px;">
            <div class="mb-4 p-3 rounded-lg bg-blue-50 border border-blue-200">
              <p class="text-sm text-blue-700">
                Uma transação já existe para esta OS. Confirme para marcar como recebida.
              </p>
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
          </div>
        `,
        width: "600px",
        showCancelButton: true,
        confirmButtonText: "Confirmar",
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
        preConfirm: () => {
          const receiptInput = document.getElementById("swal-receipt") as HTMLInputElement;
          return {
            receipt: receiptInput?.value.trim() || undefined
          };
        }
      });

      if (!result.isConfirmed || !result.value) return;

      try {
        const res = await apiFetch(`/jobs/${job._id}/received`, {
          method: "POST",
          body: JSON.stringify(result.value)
        });

        const data = await res.json().catch(() => null);
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível marcar como recebido.", "error");
          return;
        }

        // Update job in list
        setJobs((prev) =>
          prev.map((j) => (j._id === job._id ? { ...j, received: true, receivedAt: new Date(), receipt: result.value.receipt } : j))
        );

        // Update selected if it's the same job
        if (selected && selected._id === job._id) {
          setSelected({ ...selected, received: true, receivedAt: new Date(), receipt: result.value.receipt });
        }

        Swal.fire("Sucesso", "OS marcada como recebida.", "success");
      } catch (err) {
        console.error(err);
        Swal.fire("Erro", "Falha ao marcar como recebido.", "error");
      }
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
        setJobs((prev) =>
          prev.map((j) => (j._id === job._id ? { ...j, received: true, receivedAt: new Date(), receipt: result.value.receipt, receiptFileKey: result.value.receiptFileKey } : j))
        );

        // Update selected if it's the same job
        if (selected && selected._id === job._id) {
          setSelected({ ...selected, received: true, receivedAt: new Date(), receipt: result.value.receipt, receiptFileKey: result.value.receiptFileKey });
        }

        Swal.fire("Sucesso", "OS marcada como recebida e transação criada no caixa.", "success");
      } else {
        Swal.fire("Erro", "Transação não foi criada. Job não foi marcado como recebido.", "error");
      }
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao marcar como recebido.", "error");
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-4 sm:pb-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Ordens de Serviço</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Abertura e acompanhamento de OS, horários de início e término, status
            e vínculo com cliente/obra e equipe. Dados são salvos no banco.
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={startNew}
            className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 touch-manipulation active:scale-95"
          >
            + Nova OS
          </button>
        )}
      </div>

      {mode === "list" && (
        <>
          <JobsFilters
            search={search}
            setSearch={setSearch}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            dateFilter={dateFilter}
            setDateFilter={setDateFilter}
            tempCustomDateStart={tempCustomDateStart}
            setTempCustomDateStart={setTempCustomDateStart}
            tempCustomDateEnd={tempCustomDateEnd}
            setTempCustomDateEnd={setTempCustomDateEnd}
            customDateStart={customDateStart}
            customDateEnd={customDateEnd}
            setCustomDateStart={setCustomDateStart}
            setCustomDateEnd={setCustomDateEnd}
          />

          <JobsMap jobs={filtered} />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/5 px-3 sm:px-6 py-3 sm:py-4">
              <div className="font-semibold text-white text-sm sm:text-base">Lista de OS</div>
              <span className="text-xs text-slate-300">
                {loading ? "Carregando..." : `${filtered.length} registro(s)`}
              </span>
            </div>
            <JobsList
              jobs={filtered}
              loading={loading}
              onJobClick={(job) => {
                setSelected(job);
                setMode("detail");
              }}
              hasTransactionForJob={hasTransactionForJob}
              markAsReceived={markAsReceived}
            />
          </div>
        </>
      )}

      {(mode === "form" || mode === "edit") && (
        <JobForm
          mode={mode}
          form={form}
          setForm={setForm}
          clients={clients}
          teams={teams}
          catalogItems={catalogItems}
          expandedServices={expandedServices}
          setExpandedServices={setExpandedServices}
          availability={availability}
          checkingAvailability={checkingAvailability}
          calculatingDistance={calculatingDistance}
          onCancel={() => {
            setMode("list");
            resetForm();
            setSelected(null);
          }}
          onSave={saveJob}
          onCalculateTravelPrice={calculateTravelPrice}
          saving={saving}
          selectedJob={mode === "edit" ? selected : undefined}
          onFeedbackUpdated={(updatedJob) => {
            // Update selected job
            setSelected(updatedJob);
            // Update jobs list
            setJobs((prev) =>
              prev.map((job) =>
                job._id === updatedJob._id ? updatedJob : job
              )
            );
          }}
        />
      )}

      {mode === "detail" && selected && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg font-semibold text-white break-words">{selected.title}</div>
              <div className="text-xs text-slate-300 mt-1">
                {STATUS_LABEL[selected.status as Status]}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <button
                onClick={() => {
                  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
                  const pdfUrl = `${apiUrl}/jobs/${selected._id}/pdf`;
                  window.open(pdfUrl, "_blank");
                }}
                className="w-full sm:w-auto rounded-lg border border-blue-400/50 bg-blue-500/20 px-3 py-2 text-xs font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30"
              >
                📄 Baixar PDF
              </button>
              {selected.status !== "cancelada" && (
                <button
                  onClick={async () => {
                    // Fetch full job data to ensure we have all fields including teamId
                    try {
                      const res = await apiFetch(`/jobs/${selected._id}`, { cache: "no-store" });
                      const data = await res.json().catch(() => null);
                      if (res.ok && data?.data) {
                        const fullJob = data.data;
                        setMode("edit");
                        setTimeout(() => {
                          populateFormWithJob(fullJob);
                        }, 0);
                      } else {
                        // Fallback to using selected job if fetch fails
                        setMode("edit");
                        setTimeout(() => {
                          populateFormWithJob(selected);
                        }, 0);
                      }
                    } catch (err) {
                      console.error("Error fetching full job:", err);
                      // Fallback to using selected job
                      setMode("edit");
                      setTimeout(() => {
                        populateFormWithJob(selected);
                      }, 0);
                    }
                  }}
                  className="w-full sm:w-auto rounded-lg border border-amber-400/50 bg-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-300 transition hover:border-amber-400 hover:bg-amber-500/30"
                >
                  ✏️ Editar
                </button>
              )}
              {selected.status === "concluida" && !hasTransactionForJob(selected._id) && selected.finalValue && selected.finalValue > 0 && (
                <button
                  onClick={() => markAsReceived(selected)}
                  className="w-full sm:w-auto rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 transition hover:border-emerald-400 hover:bg-emerald-500/30"
                >
                  Receber
                </button>
              )}
              {hasTransactionForJob(selected._id) && (
                <div className="w-full sm:w-auto rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 text-center">
                  ✓ Recebido
                </div>
              )}
              {selected.status !== "cancelada" && selected.status !== "concluida" && (
                <button
                  onClick={async () => {
                    const { value: formValues } = await Swal.fire({
                      title: "Cancelar Serviço",
                      html: `
                        <div class="text-left">
                          <p class="mb-4 text-slate-300">Tem certeza que deseja cancelar esta OS?</p>
                          <label class="block text-sm text-slate-300 mb-2">Motivo do cancelamento:</label>
                          <textarea 
                            id="cancellationReason" 
                            class="swal2-textarea bg-slate-800 text-white border-slate-600 rounded p-2 w-full" 
                            placeholder="Digite o motivo do cancelamento..."
                            rows="4"
                          ></textarea>
                        </div>
                      `,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#ef4444",
                      cancelButtonColor: "#6b7280",
                      confirmButtonText: "Sim, cancelar",
                      cancelButtonText: "Não",
                      focusConfirm: false,
                      preConfirm: () => {
                        const reason = (document.getElementById("cancellationReason") as HTMLTextAreaElement)?.value;
                        if (!reason || reason.trim() === "") {
                          Swal.showValidationMessage("Por favor, informe o motivo do cancelamento");
                          return false;
                        }
                        return { reason: reason.trim() };
                      },
                      customClass: {
                        popup: "bg-slate-800 border border-slate-700",
                        title: "text-white",
                        htmlContainer: "text-slate-300",
                        confirmButton: "bg-red-500 hover:bg-red-600",
                        cancelButton: "bg-slate-600 hover:bg-slate-700"
                      }
                    });

                    if (formValues && formValues.reason) {
                      try {
                        const res = await apiFetch(`/jobs/${selected._id}`, {
                          method: "PATCH",
                          body: JSON.stringify({
                            status: "cancelada",
                            cancellationReason: formValues.reason
                          })
                        });

                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          Swal.fire("Erro", data?.error || "Não foi possível cancelar a OS.", "error");
                          return;
                        }

                        // Atualizar a lista e o selected
                        setJobs((prev) =>
                          prev.map((job) =>
                            job._id === selected._id
                              ? { ...job, status: "cancelada", cancellationReason: formValues.reason }
                              : job
                          )
                        );
                        setSelected({ ...selected, status: "cancelada", cancellationReason: formValues.reason });
                        Swal.fire("Sucesso", "OS cancelada com sucesso.", "success");
                      } catch (err) {
                        console.error(err);
                        Swal.fire("Erro", "Falha ao cancelar OS.", "error");
                      }
                    }
                  }}
                  className="w-full sm:w-auto rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/20"
                >
                  Cancelar Serviço
                </button>
              )}
              {selected.status === "cancelada" && (
                <button
                  onClick={async () => {
                    const result = await Swal.fire({
                      title: "Excluir OS Cancelada",
                      html: `
                        <div class="text-left">
                          <p class="mb-4 text-slate-300">Tem certeza que deseja excluir permanentemente esta OS?</p>
                          <p class="text-sm text-red-300">⚠️ Esta ação não pode ser desfeita!</p>
                        </div>
                      `,
                      icon: "warning",
                      showCancelButton: true,
                      confirmButtonColor: "#ef4444",
                      cancelButtonColor: "#6b7280",
                      confirmButtonText: "Sim, excluir",
                      cancelButtonText: "Cancelar",
                      customClass: {
                        popup: "bg-slate-800 border border-slate-700",
                        title: "text-white",
                        htmlContainer: "text-slate-300",
                        confirmButton: "bg-red-500 hover:bg-red-600",
                        cancelButton: "bg-slate-600 hover:bg-slate-700"
                      }
                    });

                    if (result.isConfirmed) {
                      try {
                        const res = await apiFetch(`/jobs/${selected._id}`, {
                          method: "DELETE"
                        });

                        const data = await res.json().catch(() => null);
                        if (!res.ok) {
                          Swal.fire("Erro", data?.error || "Não foi possível excluir a OS.", "error");
                          return;
                        }

                        // Remove da lista
                        setJobs((prev) => prev.filter((job) => job._id !== selected._id));
                        setMode("list");
                        setSelected(null);
                        Swal.fire("Sucesso", "OS excluída com sucesso.", "success");
                      } catch (err) {
                        console.error(err);
                        Swal.fire("Erro", "Falha ao excluir OS.", "error");
                      }
                    }
                  }}
                  className="w-full sm:w-auto rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-xs font-semibold text-red-300 transition hover:border-red-400 hover:bg-red-500/20"
                >
                  🗑️ Excluir
                </button>
              )}
              <button
                onClick={() => {
                  setMode("list");
                  setSelected(null);
                }}
                className="w-full sm:w-auto rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
            </div>
          </div>

          <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Serviço principal</div>
              <div className="text-white">
                {selected.services?.[0]?.service || "-"}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Cliente</div>
              <div className="text-white">
                {selected.clientName || selected.client || "-"}
              </div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Obra</div>
              <div className="text-white">{selected.site || "-"}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Equipe</div>
              <div className="text-white">{selected.team || "-"}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Data</div>
              <div className="text-white">{formatDateTime(selected.plannedDate)}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Valor Total</div>
              <div className="text-white font-semibold">
                {selected.finalValue !== undefined && selected.finalValue !== null
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.finalValue)
                  : selected.value
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.value)
                  : "-"}
              </div>
            </div>
            
            {/* Travel/Displacement Information */}
            {selected.travelDistanceKm && selected.travelDistanceKm > 0 && (
              <>
                {selected.selectedAddress && (
                  <div className="sm:col-span-2 rounded-lg border border-blue-400/30 bg-blue-500/5 px-3 py-2 text-sm text-slate-200">
                    <div className="text-[11px] uppercase text-blue-300 flex items-center gap-1">
                      <span>📍</span>
                      Endereço Utilizado
                    </div>
                    <div className="text-blue-100 text-xs mt-0.5">{selected.selectedAddress}</div>
                  </div>
                )}
                <div className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
                  <div className="text-[11px] uppercase text-blue-300 flex items-center gap-1">
                    <span>🚗</span>
                    Distância
                  </div>
                  <div className="text-blue-100 font-semibold">{selected.travelDistanceKm} km</div>
                </div>
                <div className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
                  <div className="text-[11px] uppercase text-blue-300">Deslocamento</div>
                  <div className="text-blue-100 font-semibold">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.travelPrice)}
                  </div>
                  <div className="text-[10px] text-blue-200/60 mt-0.5">
                    {selected.travelDescription}
                  </div>
                </div>
              </>
            )}
            
            {/* Execution Time Information */}
            {(() => {
              // Use saved estimatedDuration from job
              const totalMinutes = selected.estimatedDuration || 0;
              
              if (totalMinutes > 0) {
                const hours = Math.floor(totalMinutes / 60);
                const mins = Math.round(totalMinutes % 60);
                const timeText = hours > 0 
                  ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
                  : `${mins}min`;
                
                // Calculate expected end time
                let expectedEndTime = null;
                if (selected.plannedDate) {
                  try {
                    const startDate = new Date(selected.plannedDate);
                    if (!isNaN(startDate.getTime())) {
                      const endDate = new Date(startDate.getTime() + totalMinutes * 60 * 1000);
                      expectedEndTime = endDate.toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      });
                    }
                  } catch (e) {
                    // ignore
                  }
                }
                
                return (
                  <>
                    <div className="rounded-lg border border-orange-400/50 bg-orange-500/10 px-3 py-2 text-sm text-slate-200">
                      <div className="text-[11px] uppercase text-orange-300 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Tempo Estimado
                      </div>
                      <div className="text-orange-100 font-semibold">{timeText}</div>
                      <div className="text-[10px] text-orange-200/70 mt-1">
                        Duração total estimada
                      </div>
                    </div>
                    
                    {expectedEndTime && (
                      <div className="rounded-lg border border-purple-400/50 bg-purple-500/10 px-3 py-2 text-sm text-slate-200">
                        <div className="text-[11px] uppercase text-purple-300 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Término Previsto
                        </div>
                        <div className="text-purple-100 font-semibold">{expectedEndTime}</div>
                        <div className="text-[10px] text-purple-200/70 mt-1">
                          Data + tempo estimado
                        </div>
                      </div>
                    )}
                  </>
                );
              }
              return null;
            })()}
            {hasTransactionForJob(selected._id) && (
              <>
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
                  <div className="text-[11px] uppercase text-emerald-300">Status de Recebimento</div>
                  <div className="text-emerald-300 font-semibold">✓ Recebido</div>
                  {selected.receivedAt && (
                    <div className="text-xs text-emerald-200/70 mt-1">
                      {new Date(selected.receivedAt).toLocaleString("pt-BR")}
                    </div>
                  )}
                  <div className="text-xs text-emerald-200/70 mt-1">
                    Transação registrada no caixa
                  </div>
                </div>
                {selected.receipt && (
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                    <div className="text-[11px] uppercase text-slate-400">Recibo/Comprovante</div>
                    <div className="text-white">{selected.receipt}</div>
                  </div>
                )}
                {selected.receiptFileKey && (
                  <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
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
                      className="w-full flex items-center justify-center gap-2 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-300 transition hover:border-blue-400 hover:bg-blue-500/30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Baixar Comprovante
                    </button>
                  </div>
                )}
              </>
            )}
            {/* Displacement/Travel Cost - Show prominently if exists */}
            {selected.travelPrice && selected.travelPrice > 0 && (
              <div className="rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-blue-300 flex items-center gap-1">
                  <span>🚗</span>
                  Deslocamento
                </div>
                <div className="text-blue-100 font-semibold">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(selected.travelPrice)}
                </div>
                {selected.travelDistanceKm && selected.travelDistanceKm > 0 && (
                  <div className="text-xs text-blue-200/70 mt-0.5">
                    {selected.travelDistanceKm} km
                  </div>
                )}
                {selected.travelDescription && (
                  <div className="text-xs text-blue-200/60 mt-0.5">
                    {selected.travelDescription}
                  </div>
                )}
              </div>
            )}
            
            {selected.discountPercent && selected.discountPercent > 0 ? (
              <>
                <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                  <div className="text-[11px] uppercase text-slate-400">Desconto</div>
                  <div className="text-red-300 font-semibold">
                    {selected.discountPercent}% ({new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.discountValue || 0)})
                  </div>
                </div>
                <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
                  <div className="text-[11px] uppercase text-emerald-300">Valor Final</div>
                  <div className="text-emerald-100 font-semibold text-lg">
                    {new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.finalValue || selected.value || 0)}
                  </div>
                </div>
              </>
            ) : (
              <div className="rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm text-slate-200">
                <div className="text-[11px] uppercase text-emerald-300">Valor Final</div>
                <div className="text-emerald-100 font-semibold text-lg">
                  {selected.value
                    ? new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(selected.value)
                    : "-"}
                </div>
              </div>
            )}
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
              <div className="text-[11px] uppercase text-slate-400">Observações gerais</div>
              <div className="text-white">{selected.notes || "-"}</div>
            </div>
            {selected.status === "cancelada" && selected.cancellationReason && (
              <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-slate-200 sm:col-span-2">
                <div className="text-[11px] uppercase text-red-300">Motivo do Cancelamento</div>
                <div className="text-red-200 mt-1">{selected.cancellationReason}</div>
              </div>
            )}
          </div>

          <div className="mt-4 sm:mt-5 space-y-3">
            <div className="text-sm font-semibold text-white">
              Serviços detalhados ({(selected.services || []).length})
            </div>
            {(selected.services || []).map((srv: any, idx: number) => (
              <div
                key={srv.id || idx}
                className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 text-sm text-slate-200"
              >
                <div className="flex items-center justify-between text-xs text-slate-300 mb-3 pb-3 border-b border-white/10">
                  <span>Serviço #{idx + 1}</span>
                  <span>{srv.service || "-"}</span>
                </div>
                
                {/* Valores do Serviço Individual - Sempre mostrar se houver valor */}
                {(srv.value !== undefined && srv.value !== null) || (srv.finalValue !== undefined && srv.finalValue !== null) ? (
                  <div className="mb-3 p-2 sm:p-3 rounded-lg border border-emerald-400/30 bg-emerald-500/10">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-[10px] uppercase text-emerald-300">Valor Total</div>
                        <div className="text-emerald-100 font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(srv.value || 0)}
                        </div>
                      </div>
                      {srv.discountPercent && srv.discountPercent > 0 ? (
                        <div>
                          <div className="text-[10px] uppercase text-red-300">Desconto</div>
                          <div className="text-red-200 font-semibold">
                            {srv.discountPercent}%
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="text-[10px] uppercase text-slate-400">Desconto</div>
                          <div className="text-slate-300 font-semibold">0%</div>
                        </div>
                      )}
                      <div>
                        <div className="text-[10px] uppercase text-emerald-300">Valor Final</div>
                        <div className="text-emerald-100 font-semibold">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL"
                          }).format(srv.finalValue !== undefined && srv.finalValue !== null ? srv.finalValue : (srv.value || 0))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 p-3 rounded-lg border border-slate-600/30 bg-slate-800/10">
                    <div className="text-xs text-slate-400 text-center">
                      Nenhum valor informado para este serviço
                    </div>
                  </div>
                )}
                
                {/* Execution Time Information for Individual Service */}
                {(() => {
                  if (srv.executionTime && srv.quantidade && srv.profundidade) {
                    const quantity = parseFloat(srv.quantidade) || 0;
                    const depth = parseFloat(srv.profundidade) || 0;
                    const totalMinutes = srv.executionTime * quantity * depth;
                    
                    const hours = Math.floor(totalMinutes / 60);
                    const mins = Math.round(totalMinutes % 60);
                    const timeText = hours > 0 
                      ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
                      : `${mins}min`;
                    
                    return (
                      <div className="mb-3 p-2 sm:p-3 rounded-lg border border-orange-400/30 bg-orange-500/10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          <div>
                            <div className="text-[10px] uppercase text-orange-300 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Tempo/metro
                            </div>
                            <div className="text-orange-100 font-semibold">{srv.executionTime} min/m</div>
                          </div>
                          <div>
                            <div className="text-[10px] uppercase text-orange-300 flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Tempo Total Estimado
                            </div>
                            <div className="text-orange-100 font-semibold text-base">{timeText}</div>
                            <div className="text-[9px] text-orange-200/70 mt-0.5">
                              {quantity} × {depth}m × {srv.executionTime} min/m
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}
                
                <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Local</div>
                    <div className="text-white text-xs sm:text-sm">{srv.localType || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Solo</div>
                    <div className="text-white text-xs sm:text-sm">{srv.soilType || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Acesso</div>
                    <div className="text-white text-xs sm:text-sm break-words">{srv.access || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">Diâmetro</div>
                    <div className="text-white text-xs sm:text-sm">{srv.diametro || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">
                      Profundidade
                    </div>
                    <div className="text-white text-xs sm:text-sm">{srv.profundidade || "-"}</div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">
                      Quantidade
                    </div>
                    <div className="text-white text-xs sm:text-sm">{srv.quantidade || "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">
                      Categorias
                    </div>
                    <div className="text-white text-xs sm:text-sm break-words">
                      {srv.categories?.length ? srv.categories.join(", ") : "-"}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">
                      SPT / Diagnóstico
                    </div>
                    <div className="text-white text-xs sm:text-sm break-words">{srv.sptInfo || "-"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="text-[10px] sm:text-[11px] uppercase text-slate-400">
                      Observações do serviço
                    </div>
                    <div className="text-white text-xs sm:text-sm break-words">{srv.observacoes || "-"}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Signature Section */}
          <div className="mt-4 sm:mt-5 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="text-sm font-semibold text-white mb-3">
              Assinatura do Cliente
            </div>
            {selected.clientSignature ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                  <div className="text-xs text-emerald-300 mb-2">✓ Assinatura coletada</div>
                  <img
                    src={selected.clientSignature}
                    alt="Assinatura do cliente"
                    className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
                  />
                  {selected.clientSignedAt && (
                    <div className="text-xs text-emerald-200/70 mt-2 text-center">
                      Assinado em: {new Date(selected.clientSignedAt).toLocaleString("pt-BR")}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-white/20 bg-slate-800/50 p-4 text-center">
                <div className="text-sm text-slate-400">
                  Nenhuma assinatura coletada ainda.
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  A assinatura pode ser coletada na página de operações públicas.
                </div>
              </div>
            )}
          </div>

          {/* Client Feedback Section - Show if job is completed OR has feedback */}
          {(selected.status === "concluida" || selected.clientRating !== undefined) && (
            <div className="mt-4 sm:mt-5">
              <JobFeedback
                job={selected}
                isClientView={false}
                onFeedbackSubmitted={(updatedJob) => {
                  // Update selected job
                  setSelected(updatedJob);
                  // Update jobs list
                  setJobs((prev) =>
                    prev.map((job) =>
                      job._id === updatedJob._id ? updatedJob : job
                    )
                  );
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

