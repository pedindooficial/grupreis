"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import JobsMap from "./_components/JobsMap";

type Status = "pendente" | "em_execucao" | "concluida" | "cancelada";

const STATUS_LABEL: Record<Status, string> = {
  pendente: "Pendente",
  em_execucao: "Em execução",
  concluida: "Concluída",
  cancelada: "Cancelada"
};

const STATUS_COLORS: Record<Status, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  em_execucao: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  concluida: "bg-emerald-500/20 text-emerald-300 border-emerald-500/50",
  cancelada: "bg-red-500/20 text-red-300 border-red-500/50"
};

const SERVICES = [
  { group: "1. Construção civil e fundações", value: "1.1", label: "Perfuração de Estacas para Fundações Residenciais e Comerciais" },
  { group: "1. Construção civil e fundações", value: "1.3", label: "Abertura de Furos para Sapatas, Brocas e Pilares" },
  { group: "1. Construção civil e fundações", value: "1.4", label: "Perfuração para Estacas Profundas" },
  { group: "2. Saneamento e drenagem", value: "2.1", label: "Perfuração de Fossas Sépticas" },
  { group: "2. Saneamento e drenagem", value: "2.2", label: "Abertura de Sumidouros" },
  { group: "2. Saneamento e drenagem", value: "2.3", label: "Poços de Infiltração" },
  { group: "2. Saneamento e drenagem", value: "2.4", label: "Perfuração para Drenagem de Águas Pluviais" },
  { group: "2. Saneamento e drenagem", value: "2.5", label: "Ampliação e Recuperação de Sistemas Antigos" },
  { group: "3. Construção e estruturas", value: "3.1", label: "Abertura de Furos para Alambrados e Postes" },
  { group: "3. Construção e estruturas", value: "3.2", label: "Perfuração para Bases de Torres, Placas e Estruturas Metálicas" },
  { group: "3. Construção e estruturas", value: "3.3", label: "Abertura de Furos para Contenções, Ancoragens e Reforço Estrutural" },
  { group: "4. Serviços rurais e agro", value: "4.1", label: "Abertura de Buracos para Mourões e Cercas" },
  { group: "4. Serviços rurais e agro", value: "4.2", label: "Perfuração para Irrigação" },
  { group: "4. Serviços rurais e agro", value: "4.3", label: "Sondagem Leve do Solo (Avaliação Inicial)" }
];

const LOCAL_TYPES = ["Residencial", "Comercial", "Industrial", "Rural"];
const SOIL_TYPES = ["Terra comum", "Argiloso", "Arenoso", "Rochoso", "Não sei informar"];

// Map jobs soil types to catalog soil types
const mapSoilTypeToCatalog = (soilType: string): "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro" => {
  const mapping: Record<string, "argiloso" | "arenoso" | "rochoso" | "misturado" | "outro"> = {
    "Argiloso": "argiloso",
    "Arenoso": "arenoso",
    "Rochoso": "rochoso",
    "Terra comum": "misturado",
    "Não sei informar": "outro"
  };
  return mapping[soilType] || "outro";
};

// Map jobs access types to catalog access types
const mapAccessToCatalog = (access: string): "livre" | "limitado" | "restrito" => {
  const mapping: Record<string, "livre" | "limitado" | "restrito"> = {
    "Acesso livre e desimpedido": "livre",
    "Algumas limitações": "limitado",
    "Acesso restrito ou complicado": "restrito"
  };
  return mapping[access] || "livre";
};

// Helper function to format datetime for display
const formatDateTime = (dateTimeString: string | null | undefined): string => {
  if (!dateTimeString) return "-";
  try {
    const date = new Date(dateTimeString);
    if (isNaN(date.getTime())) return dateTimeString;
    
    // Format: DD/MM/YYYY HH:mm
    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return dateTimeString;
  }
};

// Helper function to convert datetime-local format to ISO string for backend
// Preserves the local time without timezone conversion
const convertToISO = (dateTimeLocal: string): string => {
  if (!dateTimeLocal || dateTimeLocal.trim() === "") return "";
  try {
    // datetime-local format is YYYY-MM-DDTHH:mm
    // Parse the components directly to avoid timezone conversion
    const [datePart, timePart] = dateTimeLocal.split("T");
    if (!datePart || !timePart) return "";
    
    const [year, month, day] = datePart.split("-").map(Number);
    const [hours, minutes] = timePart.split(":").map(Number);
    
    if (isNaN(year) || isNaN(month) || isNaN(day) || isNaN(hours) || isNaN(minutes)) {
      return "";
    }
    
    // Create ISO string treating the local time as if it were UTC
    // This preserves the exact time the user selected
    return `${year}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}T${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:00.000Z`;
  } catch {
    return "";
  }
};

// Helper function to convert ISO string to datetime-local format for input
// Extracts the time components directly from the ISO string to avoid timezone conversion
const convertFromISO = (isoString: string | null | undefined): string => {
  if (!isoString) return "";
  try {
    // Parse ISO string directly: YYYY-MM-DDTHH:mm:ss.sssZ
    // Extract the date and time components before the 'Z' or timezone offset
    const isoDate = isoString.split("T")[0]; // YYYY-MM-DD
    const timePart = isoString.split("T")[1]; // HH:mm:ss.sssZ or HH:mm:ss.sss+HH:mm
    
    if (!isoDate || !timePart) {
      // Fallback to Date object if format is unexpected
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, "0");
      const day = date.getDate().toString().padStart(2, "0");
      const hours = date.getHours().toString().padStart(2, "0");
      const minutes = date.getMinutes().toString().padStart(2, "0");
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    }
    
    // Extract hours and minutes from time part (before seconds or timezone)
    const timeMatch = timePart.match(/^(\d{2}):(\d{2})/);
    if (timeMatch) {
      const [, hours, minutes] = timeMatch;
      return `${isoDate}T${hours}:${minutes}`;
    }
    
    return "";
  } catch {
    return "";
  }
};

// Helper function to calculate service price based on catalog variation
// Formula: (quantity * profundidade) * base_price
const calculateServicePrice = (
  catalogItem: any,
  diameter: string,
  soilType: string,
  access: string,
  quantidade: string,
  profundidade: string
): { value: string; executionTime?: number } => {
  if (!catalogItem || !diameter || !soilType || !access) {
    return { value: "" };
  }

  const catalogSoilType = mapSoilTypeToCatalog(soilType);
  const catalogAccess = mapAccessToCatalog(access);
  const diameterNum = parseInt(diameter, 10);

  const priceVariation = catalogItem.priceVariations?.find(
    (pv: any) =>
      pv.diameter === diameterNum &&
      pv.soilType === catalogSoilType &&
      pv.access === catalogAccess
  );

  if (!priceVariation) {
    return { value: "" };
  }

  const quantity = parseFloat(quantidade) || 0;
  const depth = parseFloat(profundidade) || 0;
  const basePrice = priceVariation.price || 0;
  const executionTime = priceVariation.executionTime; // Get execution time from variation

  // Formula: (quantity * profundidade) * base_price
  const calculatedValue = (quantity * depth) * basePrice;

  return {
    value: calculatedValue > 0 ? calculatedValue.toFixed(2) : "",
    executionTime: executionTime
  };
};

const CATALOG_DIAMETERS = [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120];
const ACCESS_TYPES = [
  "Acesso livre e desimpedido",
  "Algumas limitações",
  "Acesso restrito ou complicado"
];
const CATEGORIES = [
  "Estacas para fundação",
  "Fossa séptica",
  "Sumidouro / Poço",
  "Drenagem pluvial",
  "Postes / Cercas / Alambrados",
  "Outro (especifique)"
];

const PAYMENT_METHODS: { value: string; label: string }[] = [
  { value: "dinheiro", label: "Dinheiro" },
  { value: "pix", label: "PIX" },
  { value: "transferencia", label: "Transferência" },
  { value: "cartao", label: "Cartão" },
  { value: "cheque", label: "Cheque" },
  { value: "outro", label: "Outro" }
];

const SERVICE_DEFAULT_CATS: Record<string, string[]> = {
  "1.1": ["Estacas para fundação"],
  "1.3": ["Estacas para fundação"],
  "1.4": ["Estacas para fundação"],
  "2.1": ["Fossa séptica"],
  "2.2": ["Sumidouro / Poço"],
  "2.3": ["Drenagem pluvial"],
  "2.4": ["Drenagem pluvial"],
  "2.5": ["Drenagem pluvial"],
  "3.1": ["Postes / Cercas / Alambrados"],
  "3.2": ["Estacas para fundação"],
  "3.3": ["Estacas para fundação"],
  "4.1": ["Postes / Cercas / Alambrados"],
  "4.2": ["Outro (especifique)"],
  "4.3": ["Outro (especifique)"]
};

export default function JobsPage() {
  const [mode, setMode] = useState<"list" | "form" | "detail" | "edit">("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
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
    team: "",
    status: "pendente" as Status,
    plannedDate: "",
    notes: "",
    value: "",
    discountPercent: "",
    selectedAddress: "",
    travelDistanceKm: 0,
    travelPrice: 0,
    travelDescription: "",
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
      return matchesTerm && matchesStatus;
    });
  }, [jobs, search, statusFilter]);

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
      status: "pendente",
      plannedDate: "",
      notes: "",
      value: "",
      discountPercent: "",
      selectedAddress: "",
      travelDistanceKm: 0,
      travelPrice: 0,
      travelDescription: "",
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
    setForm({
      clientId: job.clientId || "",
      clientName: job.clientName || "",
      site: job.site || "",
      team: job.team || "",
      status: job.status || "pendente",
      plannedDate: job.plannedDate || "",
      notes: job.notes || "",
      value: job.value ? String(job.value) : "",
      discountPercent: job.discountPercent ? String(job.discountPercent) : "",
      selectedAddress: job.selectedAddress || "",
      travelDistanceKm: job.travelDistanceKm || 0,
      travelPrice: job.travelPrice || 0,
      travelDescription: job.travelDescription || "",
      services: (job.services || []).map((srv: any, index: number) => ({
        id: `service-${Date.now()}-${index}`,
        catalogId: srv.catalogId || undefined,
        service: srv.service || "",
        localType: srv.localType || "",
        soilType: srv.soilType || "",
        sptInfo: srv.sptInfo || "",
        sptFileName: srv.sptFileName || "",
        access: srv.access || "",
        categories: srv.categories || [],
        diametro: srv.diametro || "",
        profundidade: srv.profundidade || "",
        quantidade: srv.quantidade || "",
        observacoes: srv.observacoes || "",
        value: srv.value !== undefined ? String(srv.value) : "",
        discountPercent: srv.discountPercent !== undefined ? String(srv.discountPercent) : "",
        executionTime: srv.executionTime || 0
      }))
    });
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
      
      const payload: any = {
        ...restForm,
        services: processedServices,
        clientName,
        status: "pendente"
      };
      
      // Include travel/displacement data if calculated
      if (form.travelDistanceKm && form.travelDistanceKm > 0) {
        payload.selectedAddress = form.selectedAddress;
        payload.travelDistanceKm = form.travelDistanceKm;
        payload.travelPrice = form.travelPrice;
        payload.travelDescription = form.travelDescription;
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
      Swal.fire("Sucesso", `OS ${isEditing ? "atualizada" : "salva"} com sucesso.`, "success");
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
            className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500"
          >
            + Nova OS
          </button>
        )}
      </div>

      {mode === "list" && (
        <>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-4 py-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título, cliente ou obra"
              className="w-full sm:w-64 bg-transparent text-sm text-white outline-none placeholder:text-slate-400 px-2 py-2 sm:px-0"
            />
            <div className="flex items-center gap-2 text-xs text-slate-200">
              <span className="hidden sm:inline">Status:</span>
              <div className="relative flex-1 sm:flex-initial">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full sm:w-auto appearance-none rounded-md border border-white/10 bg-slate-900 px-3 py-2 pr-7 text-xs font-semibold text-white outline-none transition hover:border-emerald-300/50 focus:border-emerald-400"
                >
                  <option value="all">Todos</option>
                  <option value="pendente">Pendente</option>
                  <option value="em_execucao">Em execução</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
                <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-300">
                  ▼
                </span>
              </div>
            </div>
          </div>

          <JobsMap jobs={filtered} />

          <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/5 px-3 sm:px-6 py-3 sm:py-4">
              <div className="font-semibold text-white text-sm sm:text-base">Lista de OS</div>
              <span className="text-xs text-slate-300">
                {loading ? "Carregando..." : `${filtered.length} registro(s)`}
              </span>
            </div>
            {loading ? (
              <div className="px-3 sm:px-6 py-6 text-center text-slate-300 text-sm">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
                <p>Carregando ordens de serviço...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 sm:px-6 py-4 text-slate-300 text-sm">
                Nenhuma ordem de serviço encontrada.
              </div>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Título</th>
                        <th className="px-4 py-3">Serviços</th>
                        <th className="px-4 py-3">Cliente</th>
                        <th className="px-4 py-3">Obra</th>
                        <th className="px-4 py-3">Equipe</th>
                        <th className="px-4 py-3">Data</th>
                        <th className="px-4 py-3">Valor</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((job) => (
                        <tr
                          key={job._id}
                          className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => {
                            setSelected(job);
                            setMode("detail");
                          }}
                        >
                          <td className="px-4 py-3 text-white">{job.title}</td>
                          <td className="px-4 py-3 text-slate-200">
                            {job.services?.length
                              ? job.services.map((s: any) => s.service).filter(Boolean).join(", ")
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {job.clientName || job.client || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">{job.site || "-"}</td>
                          <td className="px-4 py-3 text-slate-200">{job.team || "-"}</td>
                          <td className="px-4 py-3 text-slate-200">
                            {formatDateTime(job.plannedDate)}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {job.finalValue !== undefined && job.finalValue !== null
                              ? new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL"
                                }).format(job.finalValue)
                              : job.value !== undefined && job.value !== null
                              ? new Intl.NumberFormat("pt-BR", {
                                  style: "currency",
                                  currency: "BRL"
                                }).format(job.value)
                              : "-"}
                            {job.discountPercent && job.discountPercent > 0 && (
                              <div className="text-xs text-emerald-300">
                                -{job.discountPercent}%
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap text-center ${
                                STATUS_COLORS[job.status as Status] || "bg-white/5 text-white border-white/10"
                              }`}>
                                {STATUS_LABEL[job.status as Status] || "-"}
                              </span>
                              {job.status === "concluida" && !hasTransactionForJob(job._id) && job.finalValue && job.finalValue > 0 && (
                                <button
                                  onClick={(e) => markAsReceived(job, e)}
                                  className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 whitespace-nowrap hover:bg-emerald-500/30 transition"
                                >
                                  Receber
                                </button>
                              )}
                              {hasTransactionForJob(job._id) && (
                                <span className="rounded-full border border-emerald-400/50 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300 whitespace-nowrap">
                                  ✓ Recebido
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 p-3">
                  {filtered.map((job) => (
                    <div
                      key={job._id}
                      onClick={() => {
                        setSelected(job);
                        setMode("detail");
                      }}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3 cursor-pointer active:bg-white/10 transition"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold text-white truncate">{job.title}</div>
                          <div className="text-xs text-slate-400 mt-1">
                            {formatDateTime(job.plannedDate) || "Sem data"}
                          </div>
                        </div>
                        <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                          STATUS_COLORS[job.status as Status] || "bg-white/5 text-white border-white/10"
                        }`}>
                          {STATUS_LABEL[job.status as Status] || "-"}
                        </span>
                      </div>
                      
                      <div className="space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">Cliente:</span>
                          <span className="text-slate-200 flex-1">{job.clientName || job.client || "-"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">Obra:</span>
                          <span className="text-slate-200 flex-1 line-clamp-2">{job.site || "-"}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-slate-400 shrink-0">Equipe:</span>
                          <span className="text-slate-200 flex-1">{job.team || "-"}</span>
                        </div>
                        {job.services?.length > 0 && (
                          <div className="flex items-start gap-2">
                            <span className="text-slate-400 shrink-0">Serviços:</span>
                            <span className="text-slate-200 flex-1 line-clamp-2">
                              {job.services.map((s: any) => s.service).filter(Boolean).slice(0, 2).join(", ")}
                              {job.services.length > 2 && ` +${job.services.length - 2} mais`}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between pt-2 border-t border-white/10">
                          <span className="text-slate-400">Valor:</span>
                          <div className="text-right">
                            <div className="text-emerald-300 font-semibold">
                              {job.finalValue !== undefined && job.finalValue !== null
                                ? new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL"
                                  }).format(job.finalValue)
                                : job.value !== undefined && job.value !== null
                                ? new Intl.NumberFormat("pt-BR", {
                                    style: "currency",
                                    currency: "BRL"
                                  }).format(job.value)
                                : "-"}
                            </div>
                            {job.discountPercent && job.discountPercent > 0 && (
                              <div className="text-[10px] text-emerald-300">
                                -{job.discountPercent}%
                              </div>
                            )}
                          </div>
                        </div>
                        {job.status === "concluida" && (
                          <div className="pt-2 border-t border-white/10">
                            {!hasTransactionForJob(job._id) && job.finalValue && job.finalValue > 0 ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsReceived(job);
                                }}
                                className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition"
                              >
                                Receber
                              </button>
                            ) : hasTransactionForJob(job._id) ? (
                              <div className="text-center text-xs text-emerald-300 font-semibold">
                                ✓ Recebido
                              </div>
                            ) : null}
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

      {(mode === "form" || mode === "edit") && (
        <div className="space-y-4 sm:space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg font-semibold text-white">
                {mode === "edit" ? "Editar OS" : "Nova OS"}
              </div>
              <p className="text-xs text-slate-300 mt-1">
                {mode === "edit" 
                  ? "Atualize os dados e salve as alterações." 
                  : "Preencha os dados. A OS será salva e listada abaixo."}
              </p>
            </div>
            <button
              onClick={() => {
                setMode("list");
                resetForm();
                setSelected(null);
              }}
              className="w-full sm:w-auto rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Cliente</label>
              <select
                value={form.clientId}
                onChange={(e) => {
                  const client = clients.find((c) => c._id === e.target.value);
                  // Resetar endereço selecionado quando cliente muda
                  setForm((f) => ({
                    ...f,
                    clientId: e.target.value,
                    site: "" // Limpar endereço para permitir seleção
                  }));
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione um cliente</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400">
                Vincule a OS a um cliente/empresa existente.
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Endereço da Obra</label>
              {form.clientId ? (() => {
                const selectedClient = clients.find((c) => c._id === form.clientId);
                const addresses = selectedClient?.addresses && Array.isArray(selectedClient.addresses) && selectedClient.addresses.length > 0
                  ? selectedClient.addresses
                  : (selectedClient?.addressStreet || selectedClient?.address
                    ? [{
                        label: "Endereço Principal",
                        address: selectedClient.address || `${selectedClient.addressStreet || ""} ${selectedClient.addressNumber || ""}`.trim(),
                        addressStreet: selectedClient.addressStreet || "",
                        addressNumber: selectedClient.addressNumber || "",
                        addressNeighborhood: selectedClient.addressNeighborhood || "",
                        addressCity: selectedClient.addressCity || "",
                        addressState: selectedClient.addressState || "",
                        addressZip: selectedClient.addressZip || ""
                      }]
                    : []);
                
                return addresses.length > 0 ? (
                  <select
                    value={form.site}
                    onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  >
                    <option value="">Selecione um endereço</option>
                    {addresses.map((addr: any, index: number) => {
                      const addrLabel = addr.label || `Endereço ${index + 1}`;
                      const addrFull = addr.address || [
                        [addr.addressStreet, addr.addressNumber].filter(Boolean).join(", "),
                        addr.addressNeighborhood,
                        [addr.addressCity, addr.addressState].filter(Boolean).join(" - "),
                        addr.addressZip
                      ].filter((v) => v && v.trim().length > 0).join(", ");
                      return (
                        <option key={index} value={addrFull}>
                          {addrLabel} - {addrFull}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    value={form.site}
                    onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Digite o endereço da obra"
                  />
                );
              })() : (
                <input
                  value={form.site}
                  onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Selecione um cliente primeiro"
                  disabled
                />
              )}
              <div className="text-[11px] text-slate-400">
                {form.clientId 
                  ? "Selecione um endereço do cliente ou digite um novo endereço."
                  : "Selecione um cliente para ver os endereços disponíveis."}
              </div>
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Equipe</label>
              <select
                value={form.team}
                onChange={(e) => setForm((f) => ({ ...f, team: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              >
                <option value="">Selecione uma equipe</option>
                {teams.map((t) => (
                  <option key={t._id} value={t.name}>
                    {t.name}
                  </option>
                ))}
              </select>
              <div className="text-[11px] text-slate-400">
                Equipes cadastradas em /teams.
              </div>
              {checkingAvailability && (
                <div className="text-xs text-blue-300 flex items-center gap-1">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-300"></div>
                  Verificando disponibilidade...
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-sm font-semibold text-white">
                Serviços (múltiplos) — selecione e detalhe
              </div>
              <button
                type="button"
                onClick={() =>
                  setForm((f) => ({
                    ...f,
                    services: [
                      ...f.services,
                      {
                        id: crypto.randomUUID(),
                        service: "",
                        catalogId: undefined,
                        localType: "",
                        soilType: "",
                        sptInfo: "",
                        access: "",
                        categories: [],
                        diametro: "",
                        profundidade: "",
                        quantidade: "",
                        observacoes: "",
                        sptFileName: "",
                        value: "",
                        discountPercent: "",
                        executionTime: 0
                      }
                    ]
                  }))
                }
                className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
              >
                + Adicionar serviço
              </button>
            </div>

            <div className="space-y-4">
              {form.services.length === 0 ? (
                <div className="rounded-lg border border-dashed border-white/20 bg-slate-900/40 px-3 py-3 text-xs text-slate-300">
                  Nenhum serviço adicionado. Clique em “+ Adicionar serviço” para inserir
                  o primeiro tipo.
                </div>
              ) : null}

              {form.services.map((srv, idx) => (
                <div
                  key={srv.id}
                  className="rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:p-4 space-y-3"
                >
                  <div className="flex items-center justify-between text-sm text-slate-200">
                    <span className="text-xs sm:text-sm">Serviço #{idx + 1}</span>
                    {form.services.length > 1 && (
                      <button
                        type="button"
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.filter((s) => s.id !== srv.id)
                          }))
                        }
                        className="rounded-md border border-white/10 px-2 py-1 text-[10px] sm:text-xs font-semibold text-red-100 hover:border-red-400/50 hover:text-red-100"
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1 text-sm sm:col-span-2">
                      <label className="text-slate-200">Tipo de serviço</label>
                      <select
                        value={(srv as any).catalogId || srv.service}
                        onChange={(e) => {
                          const value = e.target.value;
                          const catalogItem = catalogItems.find((item) => item._id === value);
                          
                          setForm((f) => {
                            if (catalogItem) {
                              // Using catalog item
                              return {
                                ...f,
                                services: f.services.map((s: any) =>
                                  s.id === srv.id
                                    ? {
                                        ...s,
                                        catalogId: catalogItem._id,
                                        service: catalogItem.name,
                                        categories: catalogItem.category ? [catalogItem.category] : [],
                                        value: "", // Will be calculated based on diameter/soil
                                        discountPercent: "",
                                        diametro: "",
                                        soilType: "",
                                        executionTime: 0 // Initialize execution time
                                      }
                                    : s
                                )
                              };
                            } else {
                              // Using legacy service
                              const code = value.split(" ")[0];
                              return {
                                ...f,
                                services: f.services.map((s: any) =>
                                  s.id === srv.id
                                    ? {
                                        ...s,
                                        catalogId: undefined,
                                        service: value,
                                        categories: SERVICE_DEFAULT_CATS[code] || [],
                                        executionTime: 0 // Initialize execution time for legacy services
                                      }
                                    : s
                                )
                              };
                            }
                          });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      >
                        <option value="">Selecione um serviço</option>
                        {catalogItems.length > 0 && (() => {
                          // Group catalog items by category
                          const groupedByCategory = catalogItems.reduce((acc: Record<string, typeof catalogItems>, item: any) => {
                            const category = item.category || "Sem categoria";
                            if (!acc[category]) {
                              acc[category] = [];
                            }
                            acc[category].push(item);
                            return acc;
                          }, {});
                          
                          // Sort categories alphabetically
                          const sortedCategories = Object.keys(groupedByCategory).sort();
                          
                          return (
                            <optgroup label="Catálogo">
                              {sortedCategories.flatMap((category) =>
                                groupedByCategory[category].map((item: any) => (
                                  <option key={item._id} value={item._id}>
                                    {category} — {item.name}
                                  </option>
                                ))
                              )}
                            </optgroup>
                          );
                        })()}
                        <optgroup label="Serviços Legados">
                          {SERVICES.map((s) => (
                            <option key={s.value} value={`${s.value} - ${s.label}`}>
                              {s.group} — {s.label}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div className="space-y-1 text-sm">
                      <label className="text-slate-200">Tipo de local</label>
                      <select
                        value={srv.localType}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.map((s) =>
                              s.id === srv.id ? { ...s, localType: e.target.value } : s
                            )
                          }))
                        }
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      >
                        <option value="">Selecione</option>
                        {LOCAL_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-sm">
                      <label className="text-slate-200">Tipo de solo</label>
                      <select
                        value={srv.soilType}
                        onChange={(e) => {
                          const newSoilType = e.target.value;
                          setForm((f) => {
                            const updatedServices = f.services.map((s: any) => {
                              if (s.id === srv.id) {
                                const catalogItem = catalogItems.find((item) => item._id === s.catalogId);
                                const priceData = calculateServicePrice(
                                  catalogItem,
                                  s.diametro,
                                  newSoilType,
                                  s.access,
                                  s.quantidade,
                                  s.profundidade
                                );
                                return { ...s, soilType: newSoilType, value: priceData.value, executionTime: priceData.executionTime };
                              }
                              return s;
                            });
                            return { ...f, services: updatedServices };
                          });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      >
                        <option value="">Selecione</option>
                        {SOIL_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-sm">
                      <label className="text-slate-200">Acesso para máquina</label>
                      <select
                        value={srv.access}
                        onChange={(e) => {
                          const newAccess = e.target.value;
                          setForm((f) => {
                            const updatedServices = f.services.map((s: any) => {
                              if (s.id === srv.id) {
                                const catalogItem = catalogItems.find((item) => item._id === s.catalogId);
                                const priceData = calculateServicePrice(
                                  catalogItem,
                                  s.diametro,
                                  s.soilType,
                                  newAccess,
                                  s.quantidade,
                                  s.profundidade
                                );
                                return { ...s, access: newAccess, value: priceData.value, executionTime: priceData.executionTime };
                              }
                              return s;
                            });
                            return { ...f, services: updatedServices };
                          });
                        }}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      >
                        <option value="">Selecione</option>
                        {ACCESS_TYPES.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1 text-sm sm:col-span-2">
                      <label className="text-slate-200">Categorias</label>
                      <div className="flex flex-wrap gap-2">
                        {(srv.categories && srv.categories.length > 0 ? srv.categories : ["—"]).map(
                          (cat) => (
                            <span
                              key={cat}
                              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-slate-100"
                            >
                              {cat}
                            </span>
                          )
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-3 sm:col-span-2">
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200 text-xs sm:text-sm">Diâmetro (30–120 cm)</label>
                        {(srv as any).catalogId ? (
                          <select
                            value={srv.diametro}
                            onChange={(e) => {
                              const newDiameter = e.target.value;
                              setForm((f) => {
                                const updatedServices = f.services.map((s: any) => {
                                  if (s.id === srv.id) {
                                    const catalogItem = catalogItems.find((item) => item._id === s.catalogId);
                                    const priceData = calculateServicePrice(
                                      catalogItem,
                                      newDiameter,
                                      s.soilType,
                                      s.access,
                                      s.quantidade,
                                      s.profundidade
                                    );
                                    return { ...s, diametro: newDiameter, value: priceData.value, executionTime: priceData.executionTime };
                                  }
                                  return s;
                                });
                                return { ...f, services: updatedServices };
                              });
                            }}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          >
                            <option value="">Selecione</option>
                            {CATALOG_DIAMETERS.map((d) => (
                              <option key={d} value={d}>
                                {d} cm
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min={30}
                            max={120}
                            value={srv.diametro}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                services: f.services.map((s) =>
                                  s.id === srv.id ? { ...s, diametro: e.target.value } : s
                                )
                              }))
                            }
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="cm"
                          />
                        )}
                      </div>
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200 text-xs sm:text-sm">Profundidade (1–18 m)</label>
                        <input
                          type="number"
                          min={1}
                          max={18}
                          value={srv.profundidade}
                          onChange={(e) => {
                            const newProfundidade = e.target.value;
                            setForm((f) => {
                              const updatedServices = f.services.map((s: any) => {
                                if (s.id === srv.id) {
                                  const catalogItem = catalogItems.find((item) => item._id === s.catalogId);
                                  const priceData = calculateServicePrice(
                                    catalogItem,
                                    s.diametro,
                                    s.soilType,
                                    s.access,
                                    s.quantidade,
                                    newProfundidade
                                  );
                                  return { ...s, profundidade: newProfundidade, value: priceData.value, executionTime: priceData.executionTime };
                                }
                                return s;
                              });
                              return { ...f, services: updatedServices };
                            });
                          }}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="m"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200 text-xs sm:text-sm">Quantidade</label>
                        <input
                          type="number"
                          min={1}
                          value={srv.quantidade}
                          onChange={(e) => {
                            const newQuantity = e.target.value;
                            setForm((f) => {
                              const updatedServices = f.services.map((s: any) => {
                                if (s.id === srv.id) {
                                  const catalogItem = catalogItems.find((item) => item._id === s.catalogId);
                                  const priceData = calculateServicePrice(
                                    catalogItem,
                                    s.diametro,
                                    s.soilType,
                                    s.access,
                                    newQuantity,
                                    s.profundidade
                                  );
                                  return { ...s, quantidade: newQuantity, value: priceData.value, executionTime: priceData.executionTime };
                                }
                                return s;
                              });
                              return { ...f, services: updatedServices };
                            });
                          }}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="Qtd"
                        />
                      </div>
                    </div>

                    <div className="space-y-1 text-sm sm:col-span-2">
                      <label className="text-slate-200">
                        SPT / Diagnóstico do Solo (resumo ou link)
                      </label>
                      <textarea
                        value={srv.sptInfo}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.map((s) =>
                              s.id === srv.id ? { ...s, sptInfo: e.target.value } : s
                            )
                          }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                        placeholder="Cole o laudo SPT, link ou resumo"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                        <label className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 cursor-pointer">
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setForm((f) => ({
                                ...f,
                                services: f.services.map((s) =>
                                  s.id === srv.id ? { ...s, sptFileName: file.name } : s
                                )
                              }));
                            }}
                          />
                          Anexar SPT (pdf/word)
                        </label>
                        <span className="text-slate-200">
                          {srv.sptFileName ? `Arquivo: ${srv.sptFileName}` : "Nenhum arquivo selecionado"}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-1 text-sm sm:col-span-2">
                      <label className="text-slate-200">Observações do serviço</label>
                      <textarea
                        value={srv.observacoes}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.map((s) =>
                              s.id === srv.id ? { ...s, observacoes: e.target.value } : s
                            )
                          }))
                        }
                        rows={2}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                        placeholder="Detalhes específicos deste serviço"
                      />
                    </div>

                    {/* Valores do Serviço Individual */}
                    <div className="sm:col-span-2 rounded-xl border border-emerald-400/30 bg-emerald-500/5 p-3 sm:p-4 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="text-xs sm:text-sm font-semibold text-emerald-200">Valores deste Serviço</div>
                        {(() => {
                          // Show formula if we have all required values
                          const catalogItem = catalogItems.find((item) => item._id === (srv as any).catalogId);
                          const hasCatalogItem = !!catalogItem;
                          const hasDiameter = !!srv.diametro;
                          const hasSoilType = !!srv.soilType;
                          const hasAccess = !!srv.access;
                          const hasQuantity = !!srv.quantidade && parseFloat(srv.quantidade) > 0;
                          const hasProfundidade = !!srv.profundidade && parseFloat(srv.profundidade) > 0;
                          const hasBasePrice = (() => {
                            if (!hasCatalogItem || !hasDiameter || !hasSoilType || !hasAccess) return false;
                            const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
                            const catalogAccess = mapAccessToCatalog(srv.access);
                            const diameterNum = parseInt(srv.diametro, 10);
                            const priceVariation = catalogItem.priceVariations?.find(
                              (pv: any) =>
                                pv.diameter === diameterNum &&
                                pv.soilType === catalogSoilType &&
                                pv.access === catalogAccess
                            );
                            return !!priceVariation;
                          })();
                          
                          if (hasCatalogItem && hasBasePrice && hasQuantity && hasProfundidade) {
                            const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
                            const catalogAccess = mapAccessToCatalog(srv.access);
                            const diameterNum = parseInt(srv.diametro, 10);
                            const priceVariation = catalogItem.priceVariations?.find(
                              (pv: any) =>
                                pv.diameter === diameterNum &&
                                pv.soilType === catalogSoilType &&
                                pv.access === catalogAccess
                            );
                            
                            if (priceVariation) {
                              const quantity = parseFloat(srv.quantidade) || 0;
                              const depth = parseFloat(srv.profundidade) || 0;
                              const basePrice = priceVariation.price || 0;
                              const calculatedValue = (quantity * depth) * basePrice;
                              
                              return (
                                <div className="text-[10px] sm:text-xs text-slate-300 font-mono bg-slate-800/50 px-2 py-1 rounded border border-slate-600/50">
                                  ({quantity} × {depth}) × {basePrice.toFixed(2)} = {calculatedValue.toFixed(2)}
                                </div>
                              );
                            }
                          }
                          return null;
                        })()}
                      </div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-4">
                        {(() => {
                          // Get base price per meter and execution time from catalog variation
                          const catalogItem = catalogItems.find((item) => item._id === (srv as any).catalogId);
                          let basePricePerMeter = null;
                          let executionTimePerMeter = null;
                          
                          if (catalogItem && srv.diametro && srv.soilType && srv.access) {
                            const catalogSoilType = mapSoilTypeToCatalog(srv.soilType);
                            const catalogAccess = mapAccessToCatalog(srv.access);
                            const diameterNum = parseInt(srv.diametro, 10);
                            
                            const priceVariation = catalogItem.priceVariations?.find(
                              (pv: any) =>
                                pv.diameter === diameterNum &&
                                pv.soilType === catalogSoilType &&
                                pv.access === catalogAccess
                            );
                            
                            if (priceVariation) {
                              basePricePerMeter = priceVariation.price;
                              executionTimePerMeter = priceVariation.executionTime;
                            }
                          }
                          
                          // Calculate total execution time for this service
                          const quantity = parseFloat(srv.quantidade) || 0;
                          const depth = parseFloat(srv.profundidade) || 0;
                          const totalExecutionMinutes = executionTimePerMeter && quantity > 0 && depth > 0
                            ? executionTimePerMeter * quantity * depth
                            : null;
                          
                          const formatTime = (minutes: number) => {
                            const hours = Math.floor(minutes / 60);
                            const mins = Math.round(minutes % 60);
                            if (hours > 0) {
                              return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
                            }
                            return `${mins}min`;
                          };
                          
                          return (
                            <>
                              <div className="space-y-1 text-sm">
                                <label className="text-slate-200">Preço Base/m (R$)</label>
                                <div className="w-full rounded-lg border border-blue-400/50 bg-blue-500/10 px-3 py-2 text-sm font-semibold text-blue-100">
                                  {basePricePerMeter !== null
                                    ? new Intl.NumberFormat("pt-BR", {
                                        style: "currency",
                                        currency: "BRL"
                                      }).format(basePricePerMeter)
                                    : "—"}
                                </div>
                              </div>
                              
                              <div className="space-y-1 text-sm">
                                <label className="text-slate-200 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Tempo/m
                                </label>
                                <div className="w-full rounded-lg border border-purple-400/50 bg-purple-500/10 px-3 py-2 text-sm font-semibold text-purple-100">
                                  {executionTimePerMeter !== null && executionTimePerMeter !== undefined
                                    ? `${executionTimePerMeter} min/m`
                                    : "—"}
                                </div>
                              </div>
                              
                              <div className="space-y-1 text-sm sm:col-span-2">
                                <label className="text-slate-200 flex items-center gap-1">
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  Tempo Total Estimado (este serviço)
                                </label>
                                <div className="w-full rounded-lg border border-orange-400/50 bg-orange-500/10 px-3 py-2 text-sm font-semibold text-orange-100">
                                  {totalExecutionMinutes !== null
                                    ? formatTime(totalExecutionMinutes)
                                    : "—"}
                                </div>
                                <div className="text-[10px] text-slate-400">
                                  {totalExecutionMinutes !== null && executionTimePerMeter
                                    ? `${quantity} × ${depth}m × ${executionTimePerMeter} min/m = ${totalExecutionMinutes.toFixed(0)} min`
                                    : "Preencha todos os campos para calcular"}
                                </div>
                              </div>
                            </>
                          );
                        })()}
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Valor (R$)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={srv.value || ""}
                            onChange={(e) => {
                              const value = e.target.value;
                              setForm((f) => ({
                                ...f,
                                services: f.services.map((s) =>
                                  s.id === srv.id ? { ...s, value } : s
                                )
                              }));
                            }}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Desconto (%)</label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            max="100"
                            value={srv.discountPercent || ""}
                            onChange={(e) => {
                              const discountPercent = e.target.value;
                              setForm((f) => ({
                                ...f,
                                services: f.services.map((s) =>
                                  s.id === srv.id ? { ...s, discountPercent } : s
                                )
                              }));
                            }}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="0.00"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Valor Final (R$)</label>
                          <div className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                            {(() => {
                              const value = srv.value ? parseFloat(srv.value) : 0;
                              const discountPercent = srv.discountPercent ? parseFloat(srv.discountPercent) : 0;
                              const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
                              const finalValue = value - discountValue;
                              return new Intl.NumberFormat("pt-BR", {
                                style: "currency",
                                currency: "BRL"
                              }).format(finalValue);
                            })()}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Seção de Valores Financeiros */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <div className="text-sm font-semibold text-white">Valores do Serviço</div>
              {(() => {
                // Calculate total execution time for all services
                let totalMinutes = 0;
                let hasAnyTime = false;
                
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
                      hasAnyTime = true;
                    }
                  }
                });
                
                if (hasAnyTime && totalMinutes > 0) {
                  const hours = Math.floor(totalMinutes / 60);
                  const mins = Math.round(totalMinutes % 60);
                  const timeText = hours > 0 
                    ? (mins > 0 ? `${hours}h ${mins}min` : `${hours}h`)
                    : `${mins}min`;
                  
                  return (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-orange-500/20 border border-orange-400/50">
                      <svg className="w-4 h-4 text-orange-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-xs font-semibold text-orange-200">
                        Tempo Total: {timeText}
                      </span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            {/* Travel/Displacement Section */}
            <div className="rounded-xl border border-blue-400/30 bg-blue-500/5 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-blue-200">🚗 Deslocamento</h4>
                {form.clientId && (
                  <button
                    type="button"
                    onClick={calculateTravelPrice}
                    disabled={calculatingDistance}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {calculatingDistance ? "Calculando..." : "📍 Calcular"}
                  </button>
                )}
              </div>
              
              {!form.clientId && (
                <div className="text-xs text-slate-400">
                  Selecione um cliente para calcular o deslocamento automaticamente.
                </div>
              )}
              
              {form.travelDistanceKm > 0 && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distância:</span>
                    <span className="text-white font-semibold">{form.travelDistanceKm} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Preço:</span>
                    <span className="text-emerald-300 font-semibold">
                      R$ {form.travelPrice.toFixed(2)}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 pt-1 border-t border-blue-400/20">
                    {form.travelDescription}
                  </div>
                </div>
              )}
            </div>

            <div className="mb-2 text-xs text-slate-400">
              O valor total é calculado automaticamente a partir dos valores dos serviços individuais{form.travelPrice > 0 ? " + deslocamento" : ""}.
            </div>
            <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Valor Total (R$) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.value}
                  onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="0.00"
                  readOnly={form.services.some((s) => s.value && s.value.trim() !== "")}
                />
                {form.services.some((s) => s.value && s.value.trim() !== "") && (
                  <div className="text-[10px] text-emerald-300 mt-1">
                    Calculado automaticamente
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Desconto (%)</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.discountPercent}
                  onChange={(e) => setForm((f) => ({ ...f, discountPercent: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="0.00"
                  readOnly={form.services.some((s) => s.value && s.value.trim() !== "")}
                />
                {form.services.some((s) => s.value && s.value.trim() !== "") && (
                  <div className="text-[10px] text-emerald-300 mt-1">
                    Calculado automaticamente
                  </div>
                )}
              </div>
              <div className="space-y-1 text-sm">
                <label className="text-slate-200">Valor Final (R$)</label>
                <div className="w-full rounded-lg border border-emerald-400/50 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-100">
                  {(() => {
                    const value = form.value ? parseFloat(form.value) : 0;
                    const discountPercent = form.discountPercent ? parseFloat(form.discountPercent) : 0;
                    const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
                    const finalValue = value - discountValue;
                    return new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(finalValue);
                  })()}
                </div>
                {(() => {
                  const value = form.value ? parseFloat(form.value) : 0;
                  const discountPercent = form.discountPercent ? parseFloat(form.discountPercent) : 0;
                  const discountValue = discountPercent > 0 ? (value * discountPercent) / 100 : 0;
                  return discountValue > 0 ? (
                    <div className="text-xs text-slate-400">
                      Desconto: {new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(discountValue)}
                    </div>
                  ) : null;
                })()}
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Data e hora agendada</label>
              <input
                type="datetime-local"
                value={convertFromISO(form.plannedDate)}
                onChange={(e) => {
                  const isoValue = convertToISO(e.target.value);
                  setForm((f) => ({ ...f, plannedDate: isoValue }));
                }}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
              {form.team && form.plannedDate && availability && (
                <div className="mt-2 space-y-2">
                  {availability.durationText && (
                    <div className="text-xs text-blue-300 bg-blue-500/10 border border-blue-400/30 rounded p-2">
                      ⏱️ Duração estimada: <strong>{availability.durationText}</strong>
                    </div>
                  )}
                  {availability.available.length > 0 ? (
                    <div>
                      <div className="text-xs text-emerald-300 mb-1">Horários disponíveis neste dia:</div>
                      <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                        {availability.available.map((time) => (
                          <span
                            key={time}
                            className="px-2 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 rounded text-xs cursor-pointer hover:bg-emerald-500/30"
                            onClick={() => {
                              // Set the time when clicking on available slot
                              const datePart = form.plannedDate.split("T")[0];
                              const [hours, minutes] = time.split(":");
                              const newDateTime = `${datePart}T${hours}:${minutes}`;
                              const isoValue = convertToISO(newDateTime);
                              setForm((f) => ({ ...f, plannedDate: isoValue }));
                            }}
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-red-300 bg-red-500/10 border border-red-400/30 rounded p-2">
                      ⚠️ Nenhum horário disponível para esta equipe neste dia.
                    </div>
                  )}
                  {availability.booked.length > 0 && (
                    <details className="text-xs text-amber-300 bg-amber-500/10 border border-amber-400/30 rounded p-2">
                      <summary className="cursor-pointer font-semibold">
                        ⚠️ {availability.booked.length} horário(s) ocupado(s) - Ver detalhes
                      </summary>
                      <div className="mt-2 flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                        {availability.booked.map((time) => (
                          <span
                            key={time}
                            className="px-2 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-200 rounded text-xs"
                          >
                            {time}
                          </span>
                        ))}
                      </div>
                      <p className="text-[10px] text-amber-200/70 mt-2">
                        Estes horários têm conflito com outras OSs já agendadas para esta equipe.
                      </p>
                    </details>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-1 text-sm sm:col-span-2">
              <label className="text-slate-200">Observações gerais da OS</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                rows={3}
              />
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={saveJob}
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving 
                ? (mode === "edit" ? "Atualizando..." : "Salvando...") 
                : (mode === "edit" ? "Atualizar OS" : "Salvar OS")}
            </button>
          </div>
        </div>
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
                  onClick={() => {
                    populateFormWithJob(selected);
                    setMode("edit");
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
              </>
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
        </div>
      )}
    </div>
  );
}

