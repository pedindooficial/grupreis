"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

interface BudgetManagerProps {
  clientId: string;
  clientName: string;
  onClose: () => void;
  initialBudgetId?: string; // Optional: auto-select this budget when loaded
}

const SOIL_TYPE_LABELS: Record<string, string> = {
  "arenoso": "Arenoso",
  "argiloso": "Argiloso",
  "rochoso": "Rochoso",
  "misturado": "Terra comum",
  "outro": "Não sei informar"
};

const ACCESS_LABELS: Record<string, string> = {
  "livre": "Acesso livre e desimpedido",
  "limitado": "Algumas limitações",
  "restrito": "Acesso restrito ou complicado"
};

export default function BudgetManager({ clientId, clientName, onClose, initialBudgetId }: BudgetManagerProps) {
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [budgets, setBudgets] = useState<any[]>([]);
  const [catalog, setCatalog] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [form, setForm] = useState({
    title: "",
    services: [] as Array<{
      id: string;
      catalogId?: string;
      service: string;
      localType: string;
      soilType: string;
      access: string;
      diametro: string;
      profundidade: string;
      quantidade: string;
      categories: string[];
      value: number;
      discountPercent: number;
      discountValue: number;
      finalValue: number;
      basePrice: number;
      executionTime: number;
    }>,
    value: 0,
    discountPercent: 0,
    discountValue: 0,
    finalValue: 0,
    selectedAddress: "",
    travelDistanceKm: 0,
    travelPrice: 0,
    travelDescription: "",
    status: "pendente" as "pendente" | "aprovado" | "rejeitado" | "convertido",
    notes: "",
    validUntil: ""
  });

  const [calculatingDistance, setCalculatingDistance] = useState(false);

  useEffect(() => {
    loadData();
  }, [clientId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, catalogRes, teamsRes] = await Promise.all([
        apiFetch("/budgets/client/" + clientId, { cache: "no-store" }),
        apiFetch("/catalog", { cache: "no-store" }),
        apiFetch("/teams", { cache: "no-store" })
      ]);

      const budgetsData = await budgetsRes.json().catch(() => null);
      const catalogData = await catalogRes.json().catch(() => null);
      const teamsData = await teamsRes.json().catch(() => null);

      const budgetsList = budgetsData?.data || [];
      setBudgets(budgetsList);
      setCatalog(catalogData?.data || []);
      setTeams(Array.isArray(teamsData?.data) ? teamsData.data : []);
      
      // Auto-select budget if initialBudgetId is provided
      if (initialBudgetId && budgetsList.length > 0) {
        const budgetToSelect = budgetsList.find((b: any) => b._id === initialBudgetId);
        if (budgetToSelect) {
          setSelected(budgetToSelect);
          setMode("detail");
          // Clear the initialBudgetId after selecting (handled by parent component)
        }
      }
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
    } finally {
      setLoading(false);
    }
  };

  const addService = () => {
    const newServiceId = "service-" + Date.now();
    const newService = {
      id: newServiceId,
      service: "",
      localType: "",
      soilType: "",
      access: "",
      diametro: "",
      profundidade: "",
      quantidade: "",
      categories: [],
      value: 0,
      discountPercent: 0,
      discountValue: 0,
      finalValue: 0,
      basePrice: 0,
      executionTime: 0
    };
    setForm((prev) => ({ ...prev, services: [...prev.services, newService] }));
    // Auto-expand new service
    setExpandedServices((prev) => new Set([...prev, newServiceId]));
  };

  const removeService = (id: string) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.filter((s) => s.id !== id)
    }));
    recalculateTotal();
  };

  const updateService = (id: string, updates: any) => {
    setForm((prev) => ({
      ...prev,
      services: prev.services.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, ...updates };

        // Always recalculate service values
        const qty = parseFloat(updated.quantidade) || 0;
        const depth = parseFloat(updated.profundidade) || 0;
        const basePrice = updated.basePrice || 0;

        updated.value = qty * depth * basePrice;
        updated.discountValue = (updated.value * (updated.discountPercent || 0)) / 100;
        updated.finalValue = updated.value - updated.discountValue;

        return updated;
      })
    }));

    // Recalculate total after a short delay
    setTimeout(recalculateTotal, 100);
  };

  const recalculateTotal = (formOverride?: any) => {
    setForm((prev) => {
      const currentForm = formOverride || prev;
      const servicesValue = currentForm.services.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
      const travelPrice = currentForm.travelPrice || 0;
      const totalValue = servicesValue + travelPrice;
      const discountValue = (totalValue * currentForm.discountPercent) / 100;
      const finalValue = totalValue - discountValue;

      return {
        ...prev,
        ...formOverride,
        value: totalValue,
        discountValue,
        finalValue
      };
    });
  };

  const handleCatalogSelect = async (serviceId: string, catalogId: string) => {
    const catalogItem = catalog.find((c) => c._id === catalogId);
    if (!catalogItem) return;

    updateService(serviceId, {
      catalogId,
      service: catalogItem.description || catalogItem.name || "",
      categories: catalogItem.categories || []
    });
  };

  const handleVariationSelect = (
    serviceId: string,
    diametro?: string,
    soilType?: string,
    access?: string
  ) => {
    const service = form.services.find((s) => s.id === serviceId);
    if (!service || !service.catalogId) return;

    const catalogItem = catalog.find((c) => c._id === service.catalogId);
    if (!catalogItem) return;

    // Use current values if not provided
    const finalDiametro = diametro || service.diametro;
    const finalSoilType = soilType || service.soilType;
    const finalAccess = access || service.access;

    // Only search if all three are defined
    if (!finalDiametro || !finalSoilType || !finalAccess) return;

    // Convert diameter from "30cm" to 30 (number) to match catalog format
    const diameterNum = parseInt(finalDiametro, 10);
    if (isNaN(diameterNum)) return;

    const variation = catalogItem.priceVariations?.find(
      (v: any) =>
        v.diameter === diameterNum &&
        v.soilType === finalSoilType &&
        v.access === finalAccess
    );

    if (variation) {
      const updates: any = {
        basePrice: variation.price || 0,
        executionTime: variation.executionTime || 0
      };
      
      if (diametro) updates.diametro = diametro;
      if (soilType) updates.soilType = soilType;
      if (access) updates.access = access;

      updateService(serviceId, updates);
    }
  };

  const calculateTravelPrice = async (clientAddress: string) => {
    if (!clientAddress || !clientAddress.trim()) {
      Swal.fire("Atenção", "Endereço do cliente não informado", "warning");
      return;
    }

    try {
      setCalculatingDistance(true);
      console.log("Calculando distância para:", clientAddress);
      const res = await apiFetch("/distance/calculate", {
        method: "POST",
        body: JSON.stringify({ clientAddress })
      });

      const data = await res.json().catch(() => null);
      console.log("Resposta do servidor:", data);
      
      if (!res.ok) {
        const errorMsg = data?.error || "Não foi possível calcular a distância";
        const errorDetail = data?.detail || "";
        
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
        if (errorMsg.includes("Endereço não encontrado") || errorMsg.includes("NOT_FOUND") || data?.companyAddress || data?.clientAddress) {
          Swal.fire({
            icon: "error",
            title: "Endereço não encontrado",
            html: `
              <div class="text-left space-y-3">
                <p class="text-sm">O Google Maps não conseguiu localizar um dos endereços:</p>
                ${data?.companyAddress ? `
                  <div class="p-3 bg-blue-50 rounded border-l-4 border-blue-400">
                    <p class="text-xs font-semibold text-blue-700 mb-1">📍 Endereço da Empresa:</p>
                    <p class="text-xs text-blue-900">${data.companyAddress}</p>
                  </div>
                ` : ""}
                ${data?.clientAddress ? `
                  <div class="p-3 bg-amber-50 rounded border-l-4 border-amber-400">
                    <p class="text-xs font-semibold text-amber-700 mb-1">📍 Endereço do Cliente:</p>
                    <p class="text-xs text-amber-900">${data.clientAddress}</p>
                  </div>
                ` : ""}
                <p class="text-xs text-gray-600 mt-3">
                  ✏️ <strong>Dica:</strong> Verifique se os endereços estão completos e corretos. 
                  Endereços incompletos ou com erros de digitação podem não ser encontrados pelo Google Maps.
                </p>
                ${!data?.companyAddress || data.companyAddress.trim() === "" ? `
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

      if (data?.data) {
        setForm((prev) => ({
          ...prev,
          selectedAddress: clientAddress,
          travelDistanceKm: data.data.distanceKm || 0,
          travelPrice: data.data.travelPrice || 0,
          travelDescription: data.data.travelDescription || ""
        }));

        Swal.fire({
          title: "Distância Calculada",
          html: `
            <div class="text-left space-y-2">
              <p><strong>Distância:</strong> ${data.data.distanceText || data.data.distanceKm + " km"}</p>
              <p><strong>Tempo estimado:</strong> ${data.data.durationText || "-"}</p>
              <p><strong>Preço de deslocamento:</strong> R$ ${data.data.travelPrice?.toFixed(2) || "0,00"}</p>
              <p class="text-sm text-gray-500">${data.data.travelDescription || ""}</p>
            </div>
          `,
          icon: "success"
        });

        // Recalculate total with all travel data
        recalculateTotal({
          ...form,
          selectedAddress: clientAddress,
          travelDistanceKm: data.data.distanceKm || 0,
          travelPrice: data.data.travelPrice || 0,
          travelDescription: data.data.travelDescription || ""
        });
      }
    } catch (err) {
      console.error("Error calculating distance:", err);
      Swal.fire("Erro", "Falha ao calcular distância", "error");
    } finally {
      setCalculatingDistance(false);
    }
  };

  const editBudget = (budget: any) => {
    setSelected(budget);
    setForm({
      title: budget.title || "",
      services: budget.services.map((s: any, idx: number) => ({
        id: Date.now().toString() + idx,
        catalogId: s.catalogId,
        service: s.service || "",
        localType: s.localType || "",
        soilType: s.soilType || "",
        access: s.access || "",
        diametro: s.diametro || "",
        profundidade: s.profundidade || "",
        quantidade: s.quantidade || "",
        categories: s.categories || [],
        observacoes: s.observacoes || "",
        basePrice: s.basePrice || 0,
        executionTime: s.executionTime || 0,
        value: s.value || 0,
        discountPercent: s.discountPercent || 0,
        discountValue: s.discountValue || 0,
        finalValue: s.finalValue || 0
      })),
      value: budget.value || 0,
      discountPercent: budget.discountPercent || 0,
      discountValue: budget.discountValue || 0,
      finalValue: budget.finalValue || 0,
      selectedAddress: budget.selectedAddress || "",
      travelDistanceKm: budget.travelDistanceKm || 0,
      travelPrice: budget.travelPrice || 0,
      travelDescription: budget.travelDescription || "",
      status: budget.status || "pendente",
      notes: budget.notes || "",
      validUntil: budget.validUntil || ""
    });
    // Expand all services when editing
    setExpandedServices(new Set(budget.services.map((_: any, idx: number) => Date.now().toString() + idx)));
    setMode("form");
  };

  const saveBudget = async () => {
    if (form.services.length === 0) {
      Swal.fire("Atenção", "Adicione pelo menos um serviço ao orçamento", "warning");
      return;
    }

    if (!form.title.trim()) {
      Swal.fire("Atenção", "Informe o título do orçamento", "warning");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        clientId,
        clientName,
        title: form.title,
        services: form.services.map((s) => ({
          catalogId: s.catalogId,
          service: s.service,
          localType: s.localType,
          soilType: s.soilType,
          access: s.access,
          diametro: s.diametro,
          profundidade: s.profundidade,
          quantidade: s.quantidade,
          categories: s.categories,
          value: s.value,
          discountPercent: s.discountPercent,
          discountValue: s.discountValue,
          finalValue: s.finalValue,
          basePrice: s.basePrice,
          executionTime: s.executionTime
        })),
        value: form.value,
        discountPercent: form.discountPercent,
        discountValue: form.discountValue,
        finalValue: form.finalValue,
        selectedAddress: form.selectedAddress,
        travelDistanceKm: form.travelDistanceKm,
        travelPrice: form.travelPrice,
        travelDescription: form.travelDescription,
        status: form.status,
        notes: form.notes,
        validUntil: form.validUntil || undefined
      };

      const method = selected ? "PUT" : "POST";
      const url = selected ? "/budgets/" + selected._id : "/budgets";

      const res = await apiFetch(url, {
        method,
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Falha ao salvar orçamento", "error");
        return;
      }

      Swal.fire("Sucesso", "Orçamento salvo com sucesso", "success");
      await loadData();
      setMode("list");
      resetForm();
    } catch (err) {
      console.error("Erro ao salvar orçamento:", err);
      Swal.fire("Erro", "Falha ao salvar orçamento", "error");
    } finally {
      setSaving(false);
    }
  };

  const deleteBudget = async (budgetId: string) => {
    const result = await Swal.fire({
      title: "Excluir Orçamento?",
      text: "Esta ação não pode ser desfeita!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch("/budgets/" + budgetId, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        Swal.fire("Erro", data?.error || "Falha ao excluir orçamento", "error");
        return;
      }

      Swal.fire("Sucesso", "Orçamento excluído com sucesso", "success");
      await loadData();
      setMode("list");
    } catch (err) {
      console.error("Erro ao excluir orçamento:", err);
      Swal.fire("Erro", "Falha ao excluir orçamento", "error");
    }
  };

  const convertToJob = async (budgetId: string) => {
    // Find the budget to extract data
    const budget = budgets.find((b) => b._id === budgetId);
    if (!budget) {
      Swal.fire("Erro", "Orçamento não encontrado", "error");
      return;
    }

    // Extract location from budget - try selectedAddress first, then fetch client addresses as fallback
    let defaultSite = budget.selectedAddress || "";
    
    // If no selectedAddress, try to get from client
    if (!defaultSite && clientId) {
      try {
        const clientRes = await apiFetch("/clients/" + clientId, { cache: "no-store" });
        const clientData = await clientRes.json().catch(() => null);
        if (clientRes.ok && clientData?.data) {
          const client = clientData.data;
          // Try addresses array first (new format)
          if (client.addresses && client.addresses.length > 0) {
            defaultSite = client.addresses[0].address || "";
          } 
          // Fallback to legacy address field
          else if (client.address) {
            defaultSite = client.address;
          }
        }
      } catch (err) {
        console.warn("Could not fetch client address:", err);
      }
    }

    // Build teams dropdown options
    const teamsOptions = teams
      .filter((t) => t.status === "ativa") // Only show active teams
      .map((t) => `<option value="${t._id}">${t.name}</option>`)
      .join("");

    // Escape HTML for safe insertion
    const escapedSite = (defaultSite || "").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    const escapedNotes = (budget.notes || "").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const htmlContent = `
      <div style="text-align: left; color: #e2e8f0;">
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.5rem;">
            Equipe <span style="color: #f87171;">*</span>
          </label>
          <select 
            id="swal-team" 
            style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.5); color: #ffffff; font-size: 0.875rem; outline: none; transition: all 0.2s;"
            onfocus="this.style.borderColor='rgba(16, 185, 129, 0.6)'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'"
            onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.boxShadow='none'"
          >
            <option value="">Selecione...</option>
            ${teamsOptions}
          </select>
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.5rem;">
            Data e Hora <span style="color: #f87171;">*</span>
          </label>
          <input 
            id="swal-date" 
            type="datetime-local" 
            style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.5); color: #ffffff; font-size: 0.875rem; outline: none; transition: all 0.2s;"
            onfocus="this.style.borderColor='rgba(16, 185, 129, 0.6)'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'"
            onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.boxShadow='none'"
          />
        </div>
        <div style="margin-bottom: 1rem;">
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.5rem;">
            Local
          </label>
          <input 
            id="swal-site" 
            type="text" 
            placeholder="Endereço do serviço" 
            value="${escapedSite}"
            style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.5); color: #ffffff; font-size: 0.875rem; outline: none; transition: all 0.2s;"
            onfocus="this.style.borderColor='rgba(16, 185, 129, 0.6)'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'"
            onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.boxShadow='none'"
          />
        </div>
        <div>
          <label style="display: block; font-size: 0.875rem; font-weight: 500; color: #cbd5e1; margin-bottom: 0.5rem;">
            Observações
          </label>
          <textarea 
            id="swal-notes" 
            placeholder="Observações adicionais"
            style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid rgba(255, 255, 255, 0.1); background: rgba(15, 23, 42, 0.5); color: #ffffff; font-size: 0.875rem; outline: none; min-height: 80px; resize: vertical; transition: all 0.2s; font-family: inherit;"
            onfocus="this.style.borderColor='rgba(16, 185, 129, 0.6)'; this.style.boxShadow='0 0 0 3px rgba(16, 185, 129, 0.1)'"
            onblur="this.style.borderColor='rgba(255, 255, 255, 0.1)'; this.style.boxShadow='none'"
          >${escapedNotes}</textarea>
        </div>
      </div>
    `;

    const { value: formValues } = await Swal.fire({
      title: "Converter em Ordem de Serviço",
      html: htmlContent,
      showCancelButton: true,
      confirmButtonText: "Converter",
      cancelButtonText: "Cancelar",
      width: "600px",
      background: "#0f172a",
      color: "#ffffff",
      customClass: {
        popup: "swal2-dark",
        title: "swal2-title-dark",
        confirmButton: "swal2-confirm-dark",
        cancelButton: "swal2-cancel-dark"
      },
      didOpen: () => {
        // Apply dark theme styles after modal opens
        const popup = document.querySelector(".swal2-popup") as HTMLElement;
        if (popup) {
          popup.style.background = "#0f172a";
          popup.style.border = "1px solid rgba(255, 255, 255, 0.1)";
        }
        const title = document.querySelector(".swal2-title") as HTMLElement;
        if (title) {
          title.style.color = "#ffffff";
        }
        const confirmBtn = document.querySelector(".swal2-confirm") as HTMLElement;
        if (confirmBtn) {
          confirmBtn.style.background = "#8b5cf6";
          confirmBtn.style.borderColor = "#8b5cf6";
          confirmBtn.style.color = "#ffffff";
        }
        const cancelBtn = document.querySelector(".swal2-cancel") as HTMLElement;
        if (cancelBtn) {
          cancelBtn.style.background = "rgba(255, 255, 255, 0.1)";
          cancelBtn.style.borderColor = "rgba(255, 255, 255, 0.2)";
          cancelBtn.style.color = "#e2e8f0";
        }
      },
      preConfirm: () => {
        const teamId = (document.getElementById("swal-team") as HTMLSelectElement)?.value;
        const plannedDate = (document.getElementById("swal-date") as HTMLInputElement)?.value;
        const site = (document.getElementById("swal-site") as HTMLInputElement)?.value || "";
        const notes = (document.getElementById("swal-notes") as HTMLTextAreaElement)?.value || "";

        if (!teamId || !plannedDate) {
          Swal.showValidationMessage("Equipe e Data são obrigatórios");
          return null;
        }

        // Find team name from teamId
        const selectedTeam = teams.find((t) => t._id === teamId);
        const teamName = selectedTeam?.name || "";

        return { teamId, team: teamName, plannedDate, site, notes };
      }
    });

    if (!formValues) return;

    try {
      const res = await apiFetch("/budgets/" + budgetId + "/convert", {
        method: "POST",
        body: JSON.stringify(formValues)
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Falha ao converter orçamento", "error");
        return;
      }

      const osNumber = data?.data?.seq ? String(data.data.seq).padStart(6, "0") : "";
      Swal.fire(
        "Sucesso",
        "Orçamento convertido em OS " + osNumber,
        "success"
      );
      await loadData();
      setMode("list");
    } catch (err) {
      console.error("Erro ao converter orçamento:", err);
      Swal.fire("Erro", "Falha ao converter orçamento", "error");
    }
  };

  const downloadPDF = (budgetId: string) => {
    const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
    const url = apiUrl + "/budgets/" + budgetId + "/pdf";
    window.open(url, "_blank");
  };

  const toggleServiceExpanded = (serviceId: string) => {
    setExpandedServices((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(serviceId)) {
        newSet.delete(serviceId);
      } else {
        newSet.add(serviceId);
      }
      return newSet;
    });
  };

  const resetForm = () => {
    setForm({
      title: "",
      services: [],
      value: 0,
      discountPercent: 0,
      discountValue: 0,
      finalValue: 0,
      selectedAddress: "",
      travelDistanceKm: 0,
      travelPrice: 0,
      travelDescription: "",
      status: "pendente",
      notes: "",
      validUntil: ""
    });
    setSelected(null);
    setExpandedServices(new Set());
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR");
  };

  const STATUS_LABELS: Record<string, { label: string; color: string }> = {
    pendente: { label: "Pendente", color: "yellow" },
    aprovado: { label: "Aprovado", color: "green" },
    rejeitado: { label: "Rejeitado", color: "red" },
    convertido: { label: "Convertido em OS", color: "blue" }
  };

  if (loading) {
    return (
      <div className="text-center text-white py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-3"></div>
        Carregando orçamentos...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full max-h-[85vh] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/10 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">
          💰 Orçamentos - {clientName}
        </h3>
        <button
          onClick={onClose}
          className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
        >
          Voltar
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto mt-4 pr-2 space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">

      {/* List Mode */}
      {mode === "list" && (
        <div className="space-y-3">
          <button
            onClick={() => {
              resetForm();
              setMode("form");
            }}
            className="w-full rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-3 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/30"
          >
            + Novo Orçamento
          </button>

          {budgets.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              Nenhum orçamento encontrado para este cliente
            </div>
          ) : (
            <div className="space-y-2">
              {budgets.map((budget) => (
                <div
                  key={budget._id}
                  className="rounded-lg border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition cursor-pointer"
                  onClick={() => {
                    setSelected(budget);
                    setMode("detail");
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-white">{budget.title}</div>
                      <div className="text-xs text-slate-300">
                        {budget.servicesCount || budget.services?.length || 0} serviço(s) •{" "}
                        {budget.createdAt && formatDate(budget.createdAt)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-emerald-300">
                        {formatCurrency(budget.finalValue || 0)}
                      </div>
                      <span
                        className={
                          "inline-block rounded-full px-2 py-1 text-xs font-semibold " +
                          (budget.status === "aprovado"
                            ? "bg-green-500/20 text-green-300"
                            : budget.status === "convertido"
                            ? "bg-blue-500/20 text-blue-300"
                            : budget.status === "rejeitado"
                            ? "bg-red-500/20 text-red-300"
                            : "bg-yellow-500/20 text-yellow-300")
                        }
                      >
                        {STATUS_LABELS[budget.status]?.label || budget.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detail Mode */}
      {mode === "detail" && selected && (
        <div className="space-y-4">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-semibold text-white">{selected.title}</div>
                <div className="text-xs text-slate-300">
                  Criado em {selected.createdAt && formatDate(selected.createdAt)}
                </div>
                {selected.validUntil && (
                  <div className="text-xs text-orange-300">
                    Válido até {formatDate(selected.validUntil)}
                  </div>
                )}
              </div>
              <span
                className={
                  "rounded-full px-3 py-1 text-xs font-semibold " +
                  (selected.status === "aprovado"
                    ? "bg-green-500/20 text-green-300"
                    : selected.status === "convertido"
                    ? "bg-blue-500/20 text-blue-300"
                    : selected.status === "rejeitado"
                    ? "bg-red-500/20 text-red-300"
                    : "bg-yellow-500/20 text-yellow-300")
                }
              >
                {STATUS_LABELS[selected.status]?.label || selected.status}
              </span>
            </div>

            {/* Services */}
            <div className="space-y-2 mb-4">
              <div className="text-sm font-semibold text-slate-200">Serviços:</div>
              {selected.services?.map((service: any, index: number) => (
                <div
                  key={index}
                  className="rounded border border-white/5 bg-white/5 p-3 text-xs text-slate-300"
                >
                  <div className="font-semibold text-white">{service.service}</div>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {service.diametro && <div>Diâmetro: {service.diametro}</div>}
                    {service.soilType && <div>Solo: {SOIL_TYPE_LABELS[service.soilType] || service.soilType}</div>}
                    {service.access && <div>Acesso: {ACCESS_LABELS[service.access] || service.access}</div>}
                    {service.profundidade && <div>Profundidade: {service.profundidade}m</div>}
                    {service.quantidade && <div>Quantidade: {service.quantidade} un.</div>}
                    <div className="col-span-2 font-semibold text-emerald-300">
                      Valor: {formatCurrency(service.finalValue || 0)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t border-white/10 pt-3 space-y-2 text-sm">
              {/* Services Subtotal (without travel) */}
              {selected.value !== undefined && (
                <div className="flex justify-between text-slate-300">
                  <span>Subtotal (Serviços):</span>
                  <span>{formatCurrency((selected.value || 0) - (selected.travelPrice || 0))}</span>
                </div>
              )}
              
              {/* Travel/Displacement Costs Breakdown */}
              {selected.travelPrice && selected.travelPrice > 0 && (
                <div className="rounded-lg border border-blue-500/30 bg-blue-500/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-blue-300 font-semibold">
                      Deslocamento
                      {selected.travelDistanceKm && typeof selected.travelDistanceKm === 'number' && selected.travelDistanceKm > 0 && (
                        <span className="ml-2 text-blue-200 font-normal">
                          ({Math.round(selected.travelDistanceKm)}km)
                        </span>
                      )}:
                    </span>
                    <span className="text-blue-200 font-bold">{formatCurrency(selected.travelPrice || 0)}</span>
                  </div>
                  {selected.selectedAddress && (
                    <div className="text-xs text-blue-200/80">
                      📍 <span className="font-medium">Endereço:</span> {selected.selectedAddress}
                    </div>
                  )}
                  {selected.travelDescription && (
                    <div className="text-xs text-blue-200/70 italic mt-1 pt-2 border-t border-blue-500/20">
                      {selected.travelDescription}
                    </div>
                  )}
                </div>
              )}
              
              {/* Total (Services + Travel) */}
              {selected.value && (
                <div className="flex justify-between text-slate-300 pt-2 border-t border-white/10">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(selected.value)}</span>
                </div>
              )}
              
              {/* Discount */}
              {selected.discountValue && selected.discountValue > 0 && (
                <div className="flex justify-between text-red-300">
                  <span>Desconto ({selected.discountPercent}%):</span>
                  <span>- {formatCurrency(selected.discountValue)}</span>
                </div>
              )}
              
              {/* Final Total */}
              <div className="flex justify-between text-lg font-bold text-emerald-300 pt-2 border-t border-emerald-500/30">
                <span>Total:</span>
                <span>{formatCurrency(selected.finalValue || 0)}</span>
              </div>
            </div>

            {selected.notes && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <div className="text-xs font-semibold text-slate-200 mb-1">Observações:</div>
                <div className="text-xs text-slate-300">{selected.notes}</div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => downloadPDF(selected._id)}
              className="flex-1 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30"
            >
              📄 Baixar PDF
            </button>
            {selected.status !== "convertido" && (
              <>
                <button
                  onClick={() => editBudget(selected)}
                  className="flex-1 rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-4 py-2 text-sm font-semibold text-yellow-100 transition hover:border-yellow-400 hover:bg-yellow-500/30"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => convertToJob(selected._id)}
                  className="flex-1 rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/30"
                >
                  🔄 Converter em OS
                </button>
                <button
                  onClick={() => deleteBudget(selected._id)}
                  className="flex-1 rounded-lg border border-red-400/50 bg-red-500/20 px-4 py-2 text-sm font-semibold text-red-100 transition hover:border-red-400 hover:bg-red-500/30"
                >
                  🗑️ Excluir
                </button>
              </>
            )}
            <button
              onClick={() => {
                setSelected(null);
                setMode("list");
              }}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
            >
              Voltar
            </button>
          </div>
        </div>
      )}

      {/* Form Mode */}
      {mode === "form" && (
        <div className="space-y-4">
          <div className="space-y-3">
            {/* Title */}
            <div>
              <label className="text-sm font-semibold text-slate-200">Título do Orçamento *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                placeholder="Ex: Orçamento - Fundações Residenciais"
              />
            </div>

            {/* Services */}
            <div className="space-y-2">
              <div className="flex items-center justify-between sticky top-0 bg-slate-900 py-2 z-10">
                <label className="text-sm font-semibold text-slate-200">
                  Serviços {form.services.length > 0 && "(" + form.services.length + ")"}
                </label>
                <div className="flex gap-2">
                  {form.services.length > 0 && (
                    <>
                      <button
                        onClick={() => setExpandedServices(new Set(form.services.map((s) => s.id)))}
                        className="rounded border border-slate-500/50 bg-slate-700/20 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700/30"
                      >
                        Expandir Todos
                      </button>
                      <button
                        onClick={() => setExpandedServices(new Set())}
                        className="rounded border border-slate-500/50 bg-slate-700/20 px-2 py-1 text-xs font-semibold text-slate-300 transition hover:bg-slate-700/30"
                      >
                        Recolher Todos
                      </button>
                    </>
                  )}
                  <button
                    onClick={addService}
                    className="rounded border border-blue-400/50 bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-100 transition hover:bg-blue-500/30"
                  >
                    + Adicionar Serviço
                  </button>
                </div>
              </div>

              {form.services.length === 0 ? (
                <div className="text-center text-slate-400 py-4 border border-dashed border-slate-600 rounded-lg">
                  Nenhum serviço adicionado. Clique em "Adicionar Serviço" para começar.
                </div>
              ) : (
                <div className="space-y-3">
                  {form.services.map((service, index) => {
                    const isExpanded = expandedServices.has(service.id);
                    return (
                      <div
                        key={service.id}
                        className={
                          "rounded-lg border overflow-hidden transition-all " +
                          (!service.service || !service.diametro || !service.quantidade || !service.profundidade
                            ? "border-yellow-500/30 bg-yellow-500/5"
                            : service.finalValue > 0
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-white/10 bg-white/5")
                        }
                      >
                        {/* Service Header - Always Visible */}
                        <div 
                          className={
                            "flex items-center justify-between p-4 cursor-pointer transition " +
                            (isExpanded ? "bg-white/5" : "hover:bg-white/5")
                          }
                          onClick={() => toggleServiceExpanded(service.id)}
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <button
                              type="button"
                              className={
                                "text-slate-400 hover:text-white transition transform " +
                                (isExpanded ? "rotate-90" : "")
                              }
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleServiceExpanded(service.id);
                              }}
                            >
                              ▶
                            </button>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <div className="text-sm font-semibold text-white">
                                  Serviço {index + 1}
                                </div>
                                {!service.service || !service.diametro || !service.quantidade || !service.profundidade ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
                                    Incompleto
                                  </span>
                                ) : service.finalValue > 0 ? (
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    ✓ Completo
                                  </span>
                                ) : null}
                                {service.service && (
                                  <div className="text-sm text-slate-300">
                                    {service.service.substring(0, 40)}{service.service.length > 40 ? '...' : ''}
                                  </div>
                                )}
                              </div>
                              {!isExpanded && (
                                <div className="flex items-center gap-3 mt-1 text-xs">
                                  {service.finalValue > 0 && (
                                    <span className="text-emerald-300 font-semibold">
                                      {formatCurrency(service.finalValue)}
                                    </span>
                                  )}
                                  {service.diametro && (
                                    <span className="text-slate-400">Ø {service.diametro}</span>
                                  )}
                                  {service.soilType && (
                                    <span className="text-slate-400">{SOIL_TYPE_LABELS[service.soilType]}</span>
                                  )}
                                  {service.quantidade && service.profundidade && (
                                    <span className="text-slate-400">
                                      {service.quantidade}un. × {service.profundidade}m
                                    </span>
                                  )}
                                  {service.basePrice > 0 && (
                                    <span className="text-blue-400">R$ {service.basePrice.toFixed(2)}/m</span>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeService(service.id);
                            }}
                            className="text-red-400 hover:text-red-300 text-xs px-2 py-1 rounded hover:bg-red-500/10 transition"
                          >
                            🗑️ Remover
                          </button>
                        </div>

                        {/* Service Details - Collapsible */}
                        {isExpanded && (
                          <div className="p-4 pt-0 space-y-3 border-t border-white/5">
                            {/* Catalog Selection */}
                            <div>
                              <label className="text-xs text-slate-300">Catálogo de Serviços</label>
                              <select
                                value={service.catalogId || ""}
                                onChange={(e) => handleCatalogSelect(service.id, e.target.value)}
                                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                              >
                                <option value="">Selecione do catálogo...</option>
                                {catalog.map((cat) => (
                                  <option key={cat._id} value={cat._id}>
                                    {cat.name || cat.description}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Service Name */}
                            <div>
                              <label className="text-xs text-slate-300">Nome do Serviço *</label>
                              <input
                                type="text"
                                value={service.service}
                                onChange={(e) => updateService(service.id, { service: e.target.value })}
                                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                placeholder="Ex: Perfuração de Estaca"
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              {/* Diameter */}
                              <div>
                                <label className="text-xs text-slate-300">Diâmetro</label>
                                <select
                                  value={service.diametro}
                                  onChange={(e) => {
                                    updateService(service.id, { diametro: e.target.value });
                                    setTimeout(() => handleVariationSelect(service.id, e.target.value), 50);
                                  }}
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Selecione...</option>
                                  {[...Array(19)].map((_, i) => {
                                    const diameter = 30 + (i * 5);
                                    return (
                                      <option key={diameter} value={diameter + "cm"}>
                                        {diameter}cm
                                      </option>
                                    );
                                  })}
                                </select>
                              </div>

                              {/* Soil Type */}
                              <div>
                                <label className="text-xs text-slate-300">Tipo de Solo</label>
                                <select
                                  value={service.soilType}
                                  onChange={(e) => {
                                    updateService(service.id, { soilType: e.target.value });
                                    setTimeout(() => handleVariationSelect(service.id, undefined, e.target.value), 50);
                                  }}
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Selecione...</option>
                                  <option value="arenoso">Arenoso</option>
                                  <option value="argiloso">Argiloso</option>
                                  <option value="rochoso">Rochoso</option>
                                  <option value="misturado">Terra comum</option>
                                  <option value="outro">Não sei informar</option>
                                </select>
                              </div>

                              {/* Access */}
                              <div>
                                <label className="text-xs text-slate-300">Acesso para Máquina</label>
                                <select
                                  value={service.access}
                                  onChange={(e) => {
                                    updateService(service.id, { access: e.target.value });
                                    setTimeout(() => handleVariationSelect(service.id, undefined, undefined, e.target.value), 50);
                                  }}
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                >
                                  <option value="">Selecione...</option>
                                  <option value="livre">Acesso livre e desimpedido</option>
                                  <option value="limitado">Algumas limitações</option>
                                  <option value="restrito">Acesso restrito ou complicado</option>
                                </select>
                              </div>

                              {/* Base Price */}
                              <div>
                                <label className="text-xs text-slate-300">Preço Base/m</label>
                                <input
                                  type="number"
                                  value={service.basePrice || ""}
                                  onChange={(e) =>
                                    updateService(service.id, { basePrice: parseFloat(e.target.value) || 0 })
                                  }
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                  step="0.01"
                                  min="0"
                                  readOnly={!!service.catalogId}
                                />
                              </div>

                              {/* Profundidade */}
                              <div>
                                <label className="text-xs text-slate-300">Profundidade (m)</label>
                                <input
                                  type="number"
                                  value={service.profundidade}
                                  onChange={(e) =>
                                    updateService(service.id, { profundidade: e.target.value })
                                  }
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                  step="0.01"
                                  min="0"
                                />
                              </div>

                              {/* Quantidade */}
                              <div>
                                <label className="text-xs text-slate-300">Quantidade</label>
                                <input
                                  type="number"
                                  value={service.quantidade}
                                  onChange={(e) =>
                                    updateService(service.id, { quantidade: e.target.value })
                                  }
                                  className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                                  min="1"
                                />
                              </div>
                            </div>

                            {/* Service Value Display */}
                            <div className={
                              "rounded border p-3 text-sm " +
                              (service.finalValue > 0 
                                ? "bg-emerald-500/10 border-emerald-400/30" 
                                : "bg-slate-800/50 border-slate-700/30")
                            }>
                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <div className="text-slate-400">Preço Base/m:</div>
                                  <div className={"font-semibold " + (service.basePrice > 0 ? "text-blue-300" : "text-slate-500")}>
                                    {service.basePrice > 0 ? "R$ " + service.basePrice.toFixed(2) : "Aguardando..."}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-slate-400">Valor Total:</div>
                                  <div className={"font-semibold text-lg " + (service.finalValue > 0 ? "text-emerald-300" : "text-slate-500")}>
                                    {formatCurrency(service.finalValue)}
                                  </div>
                                </div>
                              </div>
                              {service.basePrice > 0 && service.quantidade && service.profundidade && (
                                <div className="text-slate-400 mt-2 pt-2 border-t border-slate-700/30 text-xs">
                                  <strong>Cálculo:</strong> {service.quantidade} un. × {service.profundidade}m × R$ {service.basePrice.toFixed(2)}/m = {formatCurrency(service.value || 0)}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                    })}
                  </div>
                )}
              </div>

            {/* Travel/Displacement */}
            <div className="rounded-lg border border-blue-400/30 bg-blue-500/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  🚗 Deslocamento
                </h4>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      // Get client data
                      const res = await apiFetch(`/clients/${clientId}`);
                      const data = await res.json();
                      console.log("Dados do cliente:", data);
                      
                      let addresses: string[] = [];
                      
                      // Collect all available addresses
                      if (data?.data?.addresses && Array.isArray(data.data.addresses) && data.data.addresses.length > 0) {
                        addresses = data.data.addresses
                          .map((addr: any) => addr.address)
                          .filter((addr: string) => addr && addr.trim());
                      } else if (data?.data?.address) {
                        addresses = [data.data.address];
                      }
                      
                      if (addresses.length === 0) {
                        Swal.fire("Atenção", "Cliente sem endereço cadastrado", "warning");
                        return;
                      }
                      
                      let selectedAddress = addresses[0];
                      
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
                        
                        if (selection === undefined) return; // User cancelled
                        selectedAddress = addresses[selection];
                      }
                      
                      if (selectedAddress && selectedAddress.trim()) {
                        calculateTravelPrice(selectedAddress.trim());
                      } else {
                        Swal.fire("Atenção", "Endereço inválido", "warning");
                      }
                    } catch (err) {
                      console.error(err);
                      Swal.fire("Erro", "Falha ao buscar endereço do cliente", "error");
                    }
                  }}
                  disabled={calculatingDistance}
                  className="px-3 py-1 rounded text-xs font-semibold border border-blue-400/50 bg-blue-500/20 text-blue-100 hover:bg-blue-500/30 transition disabled:opacity-50"
                >
                  {calculatingDistance ? "Calculando..." : "📍 Calcular"}
                </button>
              </div>
              {form.travelDistanceKm > 0 ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-slate-300">
                    <span>Distância:</span>
                    <span className="font-semibold">{form.travelDistanceKm} km</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Preço:</span>
                    <span className="font-semibold text-emerald-300">
                      R$ {form.travelPrice.toFixed(2)}
                    </span>
                  </div>
                  {form.travelDescription && (
                    <div className="text-xs text-slate-400 pt-2 border-t border-blue-400/20">
                      {form.travelDescription}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Clique em "Calcular" para obter a distância e o preço de deslocamento.
                </p>
              )}
            </div>

            {/* Discount */}
            <div>
              <label className="text-sm text-slate-200">Desconto (%)</label>
              <input
                type="number"
                value={form.discountPercent}
                onChange={(e) => {
                  const percent = parseFloat(e.target.value) || 0;
                  setForm((prev) => ({
                    ...prev,
                    discountPercent: percent,
                    discountValue: (prev.value * percent) / 100,
                    finalValue: prev.value - (prev.value * percent) / 100
                  }));
                }}
                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                step="0.01"
                min="0"
                max="100"
              />
            </div>

            {/* Valid Until */}
            <div>
              <label className="text-sm text-slate-200">Válido até</label>
              <input
                type="date"
                value={form.validUntil}
                onChange={(e) => setForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="text-sm text-slate-200">Observações</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
                className="mt-1 w-full rounded border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white"
                rows={3}
                placeholder="Observações ou condições do orçamento..."
              />
            </div>

            {/* Total Display */}
            <div className={
              "rounded-lg border p-4 " +
              (form.finalValue > 0 
                ? "border-emerald-400/30 bg-emerald-500/10" 
                : "border-slate-700/30 bg-slate-800/30")
            }>
              <div className="text-xs font-semibold text-slate-400 mb-3">RESUMO DO ORÇAMENTO</div>
              <div className="space-y-2 text-sm">
                {form.services.length > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>{form.services.length} serviço(s) adicionado(s)</span>
                  </div>
                )}
                {form.services.reduce((sum, s) => sum + (s.value || 0), 0) > 0 && (
                  <div className="flex justify-between text-slate-300">
                    <span>Serviços:</span>
                    <span className="font-semibold">{formatCurrency(form.services.reduce((sum, s) => sum + (s.value || 0), 0))}</span>
                  </div>
                )}
                {form.travelPrice > 0 && (
                  <div className="flex justify-between text-blue-300">
                    <span>
                      Deslocamento
                      {form.travelDistanceKm && form.travelDistanceKm > 0 && (
                        <span> ({form.travelDistanceKm.toFixed(1).replace('.', ',')}km)</span>
                      )}:
                    </span>
                    <span className="font-semibold">{formatCurrency(form.travelPrice)}</span>
                  </div>
                )}
                {form.value > 0 && (form.travelPrice > 0 || form.services.length > 0) && (
                  <div className="flex justify-between text-slate-300 pt-2 border-t border-slate-700/30">
                    <span>Subtotal:</span>
                    <span className="font-semibold">{formatCurrency(form.value)}</span>
                  </div>
                )}
                {form.discountValue > 0 && (
                  <div className="flex justify-between text-red-300">
                    <span>Desconto ({form.discountPercent}%):</span>
                    <span className="font-semibold">- {formatCurrency(form.discountValue)}</span>
                  </div>
                )}
                <div className={
                  "flex justify-between text-xl font-bold pt-3 border-t " +
                  (form.finalValue > 0 
                    ? "border-emerald-400/30 text-emerald-300" 
                    : "border-slate-700/30 text-slate-500")
                }>
                  <span>TOTAL:</span>
                  <span>{formatCurrency(form.finalValue)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <button
              onClick={() => {
                setMode("list");
                resetForm();
              }}
              className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white/20 hover:bg-white/10"
              disabled={saving}
            >
              Cancelar
            </button>
            <button
              onClick={saveBudget}
              className="flex-1 rounded-lg border border-emerald-400/50 bg-emerald-500/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-400 hover:bg-emerald-500/30 disabled:opacity-50"
              disabled={saving}
            >
              {saving ? "Salvando..." : "💾 Salvar Orçamento"}
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}