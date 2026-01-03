"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import BudgetManager from "@/components/BudgetManager";

type PersonType = "cpf" | "cnpj";

// Funções de formatação
const formatCPF = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 3) return numbers;
  if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
  if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
  return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
};

const formatCNPJ = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers;
  if (numbers.length <= 5) return `${numbers.slice(0, 2)}.${numbers.slice(2)}`;
  if (numbers.length <= 8) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5)}`;
  if (numbers.length <= 12) return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8)}`;
  return `${numbers.slice(0, 2)}.${numbers.slice(2, 5)}.${numbers.slice(5, 8)}/${numbers.slice(8, 12)}-${numbers.slice(12, 14)}`;
};

const formatPhone = (value: string) => {
  const numbers = value.replace(/\D/g, "");
  if (numbers.length <= 2) return numbers.length > 0 ? `(${numbers}` : numbers;
  if (numbers.length <= 6) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
  if (numbers.length <= 10) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 6)}-${numbers.slice(6)}`;
  return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
};

const BRAZIL_STATES = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO"
];

// Função auxiliar para formatar endereço
const formatAddressString = (addr: {
  addressStreet?: string;
  addressNumber?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
}) => {
  return [
    [addr.addressStreet, addr.addressNumber].filter(Boolean).join(", "),
    addr.addressNeighborhood,
    [addr.addressCity, addr.addressState].filter(Boolean).join(" - "),
    addr.addressZip
  ]
    .filter((v) => v && v.trim().length > 0)
    .join(", ");
};

export default function ClientsPage() {
  const [mode, setMode] = useState<"select" | "form" | null>(null);
  const [personType, setPersonType] = useState<PersonType | null>(null);
  const [clients, setClients] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"all" | PersonType>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingAddressIndex, setEditingAddressIndex] = useState<number | null | -1>(null);

  const [budgetMode, setBudgetMode] = useState<"list" | "form" | null>(null);
  const [budgets, setBudgets] = useState<any[]>([]);
  const [selectedBudget, setSelectedBudget] = useState<any | null>(null);
  const [pendingBudgetId, setPendingBudgetId] = useState<string | null>(null);
  const [clientJobs, setClientJobs] = useState<any[]>([]);
  const emptyAddress = {
    label: "",
    address: "",
    addressStreet: "",
    addressNumber: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    addressZip: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined
  };

  const [editForm, setEditForm] = useState({
    name: "",
    personType: "cpf" as PersonType,
    docNumber: "",
    phone: "",
    email: "",
    addresses: [] as typeof emptyAddress[]
  });

  const [form, setForm] = useState({
    name: "",
    docNumber: "",
    phone: "",
    email: "",
    addresses: [] as typeof emptyAddress[]
  });
  
  const [newAddressForm, setNewAddressForm] = useState(emptyAddress);

  useEffect(() => {
    const loadClients = async () => {
      try {
        setLoading(true);
        const res = await apiFetch("/clients", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar clientes", data);
          return;
        }
        const clientsData = data?.data || [];
        setClients(clientsData);
        
        // Check for query parameters to auto-select client and budget
        const params = new URLSearchParams(window.location.search);
        const clientId = params.get("clientId");
        const budgetId = params.get("budgetId");
        
        if (clientId && clientsData.length > 0) {
          const client = clientsData.find((c: any) => c._id === clientId);
          if (client) {
            setSelectedClient(client);
            // If budgetId is also provided, open budget manager
            if (budgetId) {
              setPendingBudgetId(budgetId);
              setBudgetMode("list");
            }
            // Clean up URL parameters
            window.history.replaceState({}, "", "/clients");
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadClients();
  }, []);

  const stats = useMemo(
    () => [
      { label: "Total de clientes", value: String(clients.length || 0) },
      { label: "Clientes com serviços", value: "0" },
      { label: "Serviços finalizados", value: "0" },
      { label: "Serviços pendentes", value: "0" }
    ],
    [clients]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return clients.filter((c) => {
      const matchesType = filterType === "all" ? true : c.personType === filterType;
      const matchesTerm =
        term.length === 0 ||
        c.name?.toLowerCase().includes(term) ||
        c.docNumber?.toLowerCase().includes(term) ||
        c.phone?.toLowerCase().includes(term);
      return matchesType && matchesTerm;
    });
  }, [clients, filterType, search]);

  useEffect(() => {
    if (selectedClient) {
      setEditing(false);
      setBudgetMode(null);
      const personType = (selectedClient.personType || "cpf") as PersonType;
      const rawDocNumber = (selectedClient.docNumber || "").replace(/\D/g, "");
      const formattedDocNumber = personType === "cpf" ? formatCPF(rawDocNumber) : formatCNPJ(rawDocNumber);
      
      const rawPhone = (selectedClient.phone || "").replace(/\D/g, "");
      const formattedPhone = formatPhone(rawPhone);
      
      // Processar endereços: usar addresses se existir, senão criar a partir dos campos legados
      let addresses: typeof emptyAddress[] = [];
      if (selectedClient.addresses && Array.isArray(selectedClient.addresses) && selectedClient.addresses.length > 0) {
        addresses = selectedClient.addresses.map((addr: any) => ({
          _id: addr._id,
          label: addr.label || "",
          address: addr.address || formatAddressString(addr),
          addressStreet: addr.addressStreet || "",
          addressNumber: addr.addressNumber || "",
          addressNeighborhood: addr.addressNeighborhood || "",
          addressCity: addr.addressCity || "",
          addressState: addr.addressState || "",
          addressZip: addr.addressZip || "",
          latitude: addr.latitude,
          longitude: addr.longitude
        }));
      } else if (selectedClient.addressStreet || selectedClient.address) {
        // Migrar endereço legado para o novo formato
        addresses = [{
          label: "Endereço Principal",
          address: selectedClient.address || formatAddressString({
            addressStreet: selectedClient.addressStreet || "",
            addressNumber: selectedClient.addressNumber || "",
            addressNeighborhood: selectedClient.addressNeighborhood || "",
            addressCity: selectedClient.addressCity || "",
            addressState: selectedClient.addressState || "",
            addressZip: selectedClient.addressZip || ""
          }),
          addressStreet: selectedClient.addressStreet || "",
          addressNumber: selectedClient.addressNumber || "",
          addressNeighborhood: selectedClient.addressNeighborhood || "",
          addressCity: selectedClient.addressCity || "",
          addressState: selectedClient.addressState || "",
          addressZip: selectedClient.addressZip || "",
          latitude: undefined,
          longitude: undefined
        }];
      }
      
      setEditForm({
        name: selectedClient.name || "",
        personType,
        docNumber: formattedDocNumber,
        phone: formattedPhone,
        email: selectedClient.email || "",
        addresses
      });

      // Load client budgets and jobs
      loadClientBudgets(selectedClient._id);
      loadClientJobs(selectedClient._id);
    }
  }, [selectedClient]);

  const loadClientBudgets = async (clientId: string) => {
    try {
      const res = await apiFetch(`/budgets/client/${clientId}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok) {
        setBudgets(data?.data || []);
      }
    } catch (err) {
      console.error("Erro ao carregar orçamentos:", err);
    }
  };

  const loadClientJobs = async (clientId: string) => {
    try {
      const res = await apiFetch("/jobs", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        // Filter jobs by clientId
        const jobs = Array.isArray(data.data) ? data.data : [];
        const clientJobsList = jobs.filter((job: any) => 
          job.clientId === clientId || 
          (typeof job.clientId === 'object' && job.clientId?._id === clientId) ||
          (typeof job.clientId === 'object' && job.clientId?.toString() === clientId)
        );
        setClientJobs(clientJobsList);
      }
    } catch (err) {
      console.error("Erro ao carregar OSs do cliente:", err);
    }
  };

  const openNewClient = () => {
    setMode("select");
    setPersonType(null);
    setForm({
      name: "",
      docNumber: "",
      phone: "",
      email: "",
      addresses: []
    });
    setNewAddressForm(emptyAddress);
  };
  const cancelFlow = () => {
    setMode(null);
    setPersonType(null);
    setForm({
      name: "",
      docNumber: "",
      phone: "",
      email: "",
      addresses: []
    });
    setNewAddressForm(emptyAddress);
    setEditingAddressIndex(null);
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!personType) return;
    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome/razão social.", "warning");
      return;
    }
    if (!form.docNumber.trim()) {
      Swal.fire("Atenção", "Informe o CPF/CNPJ.", "warning");
      return;
    }
    
    // Processar endereços: formatar o campo address de cada um
    const processedAddresses = form.addresses.map(addr => ({
      ...addr,
      address: formatAddressString(addr)
    }));
    
    try {
      setSaving(true);
      const res = await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          personType,
          docNumber: form.docNumber.replace(/\D/g, ""), // Remove formatação antes de salvar
          phone: form.phone.replace(/\D/g, ""), // Remove formatação antes de salvar
          email: form.email,
          addresses: processedAddresses
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar", "error");
        return;
      }
      Swal.fire("Sucesso", "Cliente salvo com sucesso.", "success");
      setClients((prev) => [data.data, ...prev]);
      cancelFlow();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar cliente.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async () => {
    if (saving) return;
    if (!selectedClient) return;
    if (!editForm.name.trim()) {
      Swal.fire("Atenção", "Informe o nome/razão social.", "warning");
      return;
    }
    if (!editForm.docNumber.trim()) {
      Swal.fire("Atenção", "Informe o CPF/CNPJ.", "warning");
      return;
    }
    
    // Processar endereços: formatar o campo address de cada um
    const processedAddresses = editForm.addresses.map(addr => ({
      ...addr,
      address: formatAddressString(addr)
    }));
    
    try {
      setSaving(true);
      const res = await apiFetch(`/clients/${selectedClient._id}`, {
        method: "PUT",
        body: JSON.stringify({
          name: editForm.name,
          personType: editForm.personType,
          docNumber: editForm.docNumber.replace(/\D/g, ""), // Remove formatação antes de salvar
          phone: editForm.phone.replace(/\D/g, ""), // Remove formatação antes de salvar
          email: editForm.email,
          addresses: processedAddresses
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar", "error");
        return;
      }
      
      console.log("✅ Cliente atualizado:", data.data);
      console.log("📍 Endereços após atualização:", data.data.addresses);
      
      Swal.fire("Sucesso", "Cliente atualizado.", "success");
      
      // Update the clients list
      setClients((prev) => prev.map((c) => (c._id === selectedClient._id ? data.data : c)));
      
      // Update selected client with fresh data from server
      setSelectedClient(data.data);
      
      // Reset editing state
      setEditing(false);
      
      // Clear any address editing state
      setEditingAddressIndex(null);
      setNewAddressForm(emptyAddress);
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar cliente.", "error");
    } finally {
      setSaving(false);
    }
  };
  
  // Funções para gerenciar endereços
  const addAddress = () => {
    if (editing) {
      setEditForm(f => ({
        ...f,
        addresses: [...f.addresses, { ...newAddressForm }]
      }));
    } else {
      setForm(f => ({
        ...f,
        addresses: [...f.addresses, { ...newAddressForm }]
      }));
    }
    setNewAddressForm(emptyAddress);
  };

  const removeAddress = async (index: number) => {
    const addresses = editing ? editForm.addresses : form.addresses;
    const addressToRemove = addresses[index];
    const addressLabel = addressToRemove?.label || `Endereço ${index + 1}`;
    
    const result = await Swal.fire({
      title: "Remover Endereço?",
      html: `
        <div class="text-left">
          <p class="mb-3 text-sm text-slate-600">Tem certeza que deseja remover este endereço?</p>
          <div class="rounded-lg bg-red-50 border border-red-200 p-3">
            <p class="text-sm font-semibold text-red-900">${addressLabel}</p>
            <p class="text-xs text-red-700 mt-1">${addressToRemove?.address || formatAddressString(addressToRemove) || "Endereço incompleto"}</p>
          </div>
          <p class="mt-3 text-xs text-slate-500">Esta ação não pode ser desfeita.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sim, remover",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280"
    });
    
    if (!result.isConfirmed) return;
    
    console.log(`🗑️ Removendo endereço ${index}:`, addressToRemove);
    
    if (editing) {
      setEditForm(f => {
        const newAddresses = f.addresses.filter((_, i) => i !== index);
        console.log(`📍 Endereços restantes (${newAddresses.length}):`, newAddresses);
        return {
          ...f,
          addresses: newAddresses
        };
      });
    } else {
      setForm(f => {
        const newAddresses = f.addresses.filter((_, i) => i !== index);
        console.log(`📍 Endereços restantes (${newAddresses.length}):`, newAddresses);
        return {
          ...f,
          addresses: newAddresses
        };
      });
    }
    
    // If we were editing this address, clear the form
    if (editingAddressIndex === index) {
      setEditingAddressIndex(null);
      setNewAddressForm(emptyAddress);
    }
    
    Swal.fire({
      title: "Removido!",
      html: `<p>Endereço removido com sucesso.</p><p class="text-sm text-gray-600 mt-2">Lembre-se de clicar em <strong>"Salvar alterações"</strong> para persistir esta mudança.</p>`,
      icon: "success",
      timer: 3000,
      showConfirmButton: false
    });
  };

  const startEditAddress = (index: number) => {
    setEditingAddressIndex(index);
    const addresses = editing ? editForm.addresses : form.addresses;
    setNewAddressForm({ ...addresses[index] });
  };

  const saveEditAddress = () => {
    if (editingAddressIndex === null || editingAddressIndex === -1) {
      addAddress();
      return;
    }
    
    if (editing) {
      setEditForm(f => {
        const newAddresses = [...f.addresses];
        newAddresses[editingAddressIndex] = { ...newAddressForm };
        return { ...f, addresses: newAddresses };
      });
    } else {
      setForm(f => {
        const newAddresses = [...f.addresses];
        newAddresses[editingAddressIndex] = { ...newAddressForm };
        return { ...f, addresses: newAddresses };
      });
    }
    
    setNewAddressForm(emptyAddress);
    setEditingAddressIndex(null);
  };

  const cancelEditAddress = () => {
    setNewAddressForm(emptyAddress);
    setEditingAddressIndex(null);
  };

  const openNewAddressForm = () => {
    setNewAddressForm(emptyAddress);
    setEditingAddressIndex(-1); // Usar -1 para indicar que é um novo endereço (não null)
  };

  // Função para gerar link de captura de localização
  const generateLocationLink = async () => {
    // Verificar se está editando um cliente existente ou criando novo
    const clientId = editing && selectedClient?._id ? selectedClient._id : null;
    
    if (!clientId) {
      Swal.fire({
        title: "Atenção",
        text: "Para gerar um link de captura, é necessário salvar o cliente primeiro. As coordenadas podem ser inseridas manualmente nos campos abaixo.",
        icon: "warning",
        confirmButtonText: "Entendi"
      });
      return;
    }
    
    // Check if we're editing an existing address (has _id) or creating a new one
    let addressId = (newAddressForm as any)?._id;
    
    // If creating a new address, we need to save the client first to get the address ID
    if (!addressId && editingAddressIndex !== null) {
      const confirmResult = await Swal.fire({
        title: "Atenção",
        html: "Para capturar a localização de um novo endereço, você precisa salvá-lo primeiro.<br/><br/>Deseja salvar este endereço agora?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sim, salvar",
        cancelButtonText: "Cancelar"
      });
      
      if (!confirmResult.isConfirmed) {
        return;
      }
      
      // Show loading
      Swal.fire({
        title: "Salvando...",
        text: "Aguarde enquanto salvamos o endereço",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
      
      try {
        // First, prepare the addresses array with the new/updated address
        const currentAddresses = editingAddressIndex === null || editingAddressIndex === -1
          ? [...editForm.addresses, newAddressForm]  // Adding new address
          : editForm.addresses.map((addr, i) => i === editingAddressIndex ? newAddressForm : addr);  // Updating existing
        
        // Process addresses
        const processedAddresses = currentAddresses.map(addr => ({
          ...addr,
          address: formatAddressString(addr)
        }));
        
        // Save the client directly
        const res = await apiFetch(`/clients/${clientId}`, {
          method: "PUT",
          body: JSON.stringify({
            name: editForm.name,
            personType: editForm.personType,
            docNumber: editForm.docNumber.replace(/\D/g, ""),
            phone: editForm.phone.replace(/\D/g, ""),
            email: editForm.email,
            addresses: processedAddresses
          })
        });
        
        const data = await res.json().catch(() => null);
        
        if (!res.ok) {
          Swal.fire("Erro", data?.error || "Não foi possível salvar", "error");
          return;
        }
        
        // Update states
        setClients((prev) => prev.map((c) => (c._id === clientId ? data.data : c)));
        setSelectedClient(data.data);
        
        // Find the address we just added/updated
        const addresses = data.data.addresses || [];
        if (addresses.length > 0) {
          // For new address (-1 or null), it will be the last one
          // For existing address, find it by matching the data
          if (editingAddressIndex === null || editingAddressIndex === -1) {
            // New address is last
            const targetAddress = addresses[addresses.length - 1];
            addressId = targetAddress._id;
            console.log(`✅ Cliente salvo, novo endereço ID: ${addressId}`);
          } else {
            // Find existing address by matching some fields
            const targetAddress = addresses.find((addr: any) => 
              addr.addressStreet === newAddressForm.addressStreet &&
              addr.addressNumber === newAddressForm.addressNumber &&
              addr.label === newAddressForm.label
            );
            if (targetAddress) {
              addressId = targetAddress._id;
              console.log(`✅ Cliente salvo, endereço atualizado ID: ${addressId}`);
            }
          }
        }
        
        if (!addressId) {
          Swal.fire("Erro", "Não foi possível obter o ID do endereço. Tente novamente.", "error");
          return;
        }
        
        // Clear the address form
        setEditingAddressIndex(null);
        setNewAddressForm(emptyAddress);
        
      } catch (error) {
        console.error("Erro ao salvar cliente:", error);
        Swal.fire("Erro", "Falha ao salvar o cliente. Tente novamente.", "error");
        return;
      }
    }

    try {
      Swal.fire({
        title: "Gerando link...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Create location capture token with addressId
      const res = await apiFetch("/location-capture/create", {
        method: "POST",
        body: JSON.stringify({
          description: `Confirme a localização - ${selectedClient.name}`,
          resourceType: "client",
          resourceId: clientId,
          addressId: addressId, // Pass the specific address ID
          expiresInHours: 72 // 3 days
        })
      });

      const data = await res.json();
      Swal.close();

      if (!res.ok) {
        throw new Error(data?.error || "Erro ao gerar link");
      }

      const protocol = window.location.protocol;
      const host = window.location.host;
      const fullUrl = `${protocol}//${host}/location-capture/${data.data.token}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`;

      // Show link and QR code
      const result = await Swal.fire({
        title: "📍 Link de Captura Gerado",
        html: `
          <div class="text-left space-y-4">
            <p class="text-sm text-gray-600">
              Envie este link para <strong>${selectedClient.name}</strong> confirmar a localização:
            </p>
            
            <div class="p-3 bg-blue-50 rounded border border-blue-200">
              <p class="text-xs text-gray-500 mb-1">Link:</p>
              <input 
                type="text" 
                value="${fullUrl}" 
                readonly 
                class="w-full p-2 text-sm border rounded"
                id="locationLink"
              />
            </div>

            <div class="flex gap-2">
              <button 
                onclick="navigator.clipboard.writeText('${fullUrl}'); this.innerText='✓ Copiado!'; this.classList.add('bg-green-500'); this.classList.remove('bg-blue-500')"
                class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                📋 Copiar Link
              </button>
              <button 
                onclick="window.open('https://wa.me/${selectedClient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Por favor, confirme sua localização através deste link: ' + fullUrl)}', '_blank')"
                class="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                💬 WhatsApp
              </button>
            </div>

            <div class="text-center">
              <p class="text-xs text-gray-500 mb-2">QR Code:</p>
              <img src="${qrCodeUrl}" alt="QR Code" class="mx-auto rounded" />
            </div>

            <p class="text-xs text-gray-500">
              ⏱️ Link válido por 72 horas. As coordenadas serão atualizadas automaticamente quando o cliente confirmar.
            </p>
          </div>
        `,
        width: 600,
        confirmButtonText: "Fechar",
        showCloseButton: true
      });
    } catch (error: any) {
      Swal.close();
      console.error("Erro ao gerar link:", error);
      Swal.fire("Erro", error?.message || "Erro ao gerar link. Tente novamente.", "error");
    }
  };

  // Verificar periodicamente se a localização foi capturada
  const checkLocationCaptureStatus = async (token: string) => {
    let attempts = 0;
    const maxAttempts = 100; // 5 minutos (100 * 3 segundos)

    const checkInterval = setInterval(async () => {
      attempts++;
      
      try {
        const res = await apiFetch(`/location-capture/status/${token}`);
        const data = await res.json();

        if (res.ok && data.data.captured) {
          clearInterval(checkInterval);
          
          // Atualizar todos os campos do endereço no formulário
          setNewAddressForm((f) => ({
            ...f,
            latitude: data.data.latitude,
            longitude: data.data.longitude,
            addressStreet: data.data.addressStreet || f.addressStreet,
            addressNumber: data.data.addressNumber || f.addressNumber,
            addressNeighborhood: data.data.addressNeighborhood || f.addressNeighborhood,
            addressCity: data.data.addressCity || f.addressCity,
            addressState: data.data.addressState || f.addressState,
            addressZip: data.data.addressZip || f.addressZip
          }));

          Swal.fire({
            title: "Localização capturada!",
            text: "Os dados do endereço foram atualizados automaticamente nos campos.",
            icon: "success",
            timer: 3000,
            showConfirmButton: false
          });
        }
      } catch (error) {
        console.error("Erro ao verificar status:", error);
      }

      // Parar após máximo de tentativas
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
      }
    }, 3000); // Verificar a cada 3 segundos
  };

  // Função para gerar link do Google Maps
  const getGoogleMapsLink = (lat?: number, lon?: number, address?: string): string => {
    if (lat && lon) {
      return `https://www.google.com/maps?q=${lat},${lon}`;
    } else if (address) {
      return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    }
    return "#";
  };

  const generateLocationCaptureLink = async () => {
    if (!selectedClient) return;

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:4000/api";
      
      // Create location capture token
      const res = await apiFetch("/location-capture/create", {
        method: "POST",
        body: JSON.stringify({
          description: `Confirme a localização - ${selectedClient.name}`,
          resourceType: "client",
          resourceId: selectedClient._id,
          expiresInHours: 72 // 3 days
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        Swal.fire("Erro", data.error || "Falha ao gerar link", "error");
        return;
      }

      const protocol = window.location.protocol;
      const host = window.location.host;
      const fullUrl = `${protocol}//${host}/location-capture/${data.data.token}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(fullUrl)}`;

      // Show link and QR code
      Swal.fire({
        title: "📍 Link de Captura Gerado",
        html: `
          <div class="text-left space-y-4">
            <div class="p-3 bg-blue-50 rounded border border-blue-200 mb-3">
              <p class="text-xs text-blue-700 font-semibold mb-1">ℹ️ Novo Endereço</p>
              <p class="text-xs text-blue-600">Quando o cliente confirmar a localização, um NOVO endereço será adicionado automaticamente.</p>
            </div>
            <p class="text-sm text-gray-600">
              Envie este link para <strong>${selectedClient.name}</strong> confirmar a localização:
            </p>
            
            <div class="p-3 bg-blue-50 rounded border border-blue-200">
              <p class="text-xs text-gray-500 mb-1">Link:</p>
              <input 
                type="text" 
                value="${fullUrl}" 
                readonly 
                class="w-full p-2 text-sm border rounded"
                id="locationLink"
              />
            </div>

            <div class="flex gap-2">
              <button 
                onclick="navigator.clipboard.writeText('${fullUrl}'); this.innerText='✓ Copiado!'; this.classList.add('bg-green-500')"
                class="flex-1 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
              >
                📋 Copiar Link
              </button>
              <button 
                onclick="window.open('https://wa.me/${selectedClient.phone?.replace(/\D/g, '')}?text=${encodeURIComponent('Olá! Por favor, confirme sua localização através deste link: ' + fullUrl)}', '_blank')"
                class="flex-1 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
              >
                💬 WhatsApp
              </button>
            </div>

            <div class="text-center">
              <p class="text-xs text-gray-500 mb-2">QR Code:</p>
              <img src="${qrCodeUrl}" alt="QR Code" class="mx-auto rounded" />
            </div>

            <p class="text-xs text-gray-500">
              ⏱️ Link válido por 72 horas
            </p>
          </div>
        `,
        width: 600,
        confirmButtonText: "Fechar",
        showCloseButton: true
      });
    } catch (error) {
      console.error("Error generating location link:", error);
      Swal.fire("Erro", "Falha ao gerar link de captura", "error");
    }
  };

  const handleDelete = async () => {
    if (!selectedClient) return;
    const confirm = await Swal.fire({
      title: "Excluir cliente?",
      html:
        '<p>Essa ação não pode ser desfeita.</p>' +
        '<input id="swal-reason" class="swal2-input" placeholder="Motivo (obrigatório)">',
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444",
      preConfirm: () => {
        const input = document.getElementById(
          "swal-reason"
        ) as HTMLInputElement | null;
        const reason = input?.value.trim();
        if (!reason) {
          Swal.showValidationMessage("Informe um motivo para excluir.");
          return;
        }
        return reason;
      }
    });
    if (!confirm.isConfirmed || !confirm.value) return;
    const reason = confirm.value;
    try {
      const res = await apiFetch(`/clients/${selectedClient._id}`, {
        method: "DELETE"
      });
      const data = await res.json();
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível excluir", "error");
        return;
      }
      Swal.fire("Sucesso", `Cliente excluído. Motivo: ${reason}`, "success");
      setClients((prev) => prev.filter((c) => c._id !== selectedClient._id));
      setSelectedClient(null);
      setEditing(false);
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir cliente.", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Clientes e Obras</h1>
          <p className="text-xs sm:text-sm text-slate-300">
            Cadastro de clientes, contatos e endereços de obra. Dados serão
            carregados do banco assim que a API estiver conectada.
          </p>
        </div>
        {mode === null && (
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3">
            <div className="relative flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 flex-1 sm:flex-initial">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CPF/CNPJ ou telefone"
                className="w-full sm:w-56 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((s) => !s)}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 py-2.5 pr-7 text-xs font-semibold text-white transition hover:border-emerald-300/50 focus:border-emerald-400 focus:outline-none touch-manipulation"
                >
                  {filterType === "all"
                    ? "Todos"
                    : filterType === "cpf"
                    ? "CPF"
                    : "CNPJ"}
                  <span className="text-[10px] text-slate-300">▼</span>
                </button>
                {filterOpen && (
                  <div className="absolute right-0 z-20 mt-1 w-28 overflow-hidden rounded-md border border-white/10 bg-slate-900 shadow-xl shadow-black/40">
                    {[
                      { label: "Todos", value: "all" },
                      { label: "CPF", value: "cpf" },
                      { label: "CNPJ", value: "cnpj" }
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setFilterType(opt.value as any);
                          setFilterOpen(false);
                        }}
                        className="block w-full px-3 py-2.5 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/10 touch-manipulation"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={openNewClient}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500 touch-manipulation active:scale-95"
            >
              + Novo cliente/obra
            </button>
          </div>
        )}
      </div>

      {mode === null && (
        <>
          <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl border border-white/10 bg-white/5 p-3 shadow-inner shadow-black/20"
              >
                <div className="text-[10px] sm:text-[11px] uppercase tracking-wide text-slate-400">
                  {item.label}
                </div>
                <div className="mt-1.5 text-xl sm:text-2xl font-semibold text-white">
                  {item.value}
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-0 text-sm text-slate-200 shadow-inner shadow-black/20">
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <div className="font-semibold text-white">Lista de clientes</div>
              <span className="text-xs text-slate-300">
                {loading ? "Carregando..." : `${filtered.length} registro(s)`}
              </span>
            </div>

            {loading ? (
              <div className="px-6 py-8 text-center text-slate-300">
                <div className="mx-auto mb-2 h-8 w-8 animate-spin rounded-full border-b-2 border-emerald-400" />
                <p className="text-sm">Carregando clientes...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 sm:px-6 py-4 text-slate-300 text-sm">
                Nenhum cliente cadastrado. Clique em "+ Novo cliente/obra" para adicionar.
              </div>
            ) : (
              <>
                {/* Mobile Card View */}
                <div className="md:hidden space-y-3 px-4 pb-4">
                  {filtered.map((c) => (
                    <div
                      key={c._id}
                      className="rounded-lg border border-white/10 bg-white/5 p-4 space-y-3 cursor-pointer transition hover:bg-white/10 active:bg-white/15"
                      onClick={() => setSelectedClient(c)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-base font-semibold text-white truncate">{c.name}</h3>
                          <div className="mt-1 text-xs text-slate-300">
                            {c.personType === "cnpj" ? "CNPJ" : "CPF"}{" "}
                            {c.docNumber
                              ? (c.personType === "cnpj"
                                  ? formatCNPJ(c.docNumber.replace(/\D/g, ""))
                                  : formatCPF(c.docNumber.replace(/\D/g, "")))
                              : "-"}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedClient(c);
                          }}
                          className="ml-2 flex-shrink-0 rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation"
                        >
                          Detalhes
                        </button>
                      </div>
                      <div className="space-y-1.5 text-sm">
                        {c.phone && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            <span className="truncate">{formatPhone(c.phone.replace(/\D/g, ""))}</span>
                          </div>
                        )}
                        {c.email && (
                          <div className="flex items-center gap-2 text-slate-300">
                            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                            <span className="truncate">{c.email}</span>
                          </div>
                        )}
                        <div className="flex items-start gap-2 text-slate-300">
                          <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          <span className="text-xs line-clamp-2">
                            {(() => {
                              if (c.addresses && Array.isArray(c.addresses) && c.addresses.length > 0) {
                                return c.addresses[0].address || c.addresses[0].label || "Endereço cadastrado";
                              }
                              return c.address || "-";
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-white/5 text-xs uppercase text-slate-300">
                      <tr>
                        <th className="px-4 py-3">Nome</th>
                        <th className="px-4 py-3">Documento</th>
                        <th className="px-4 py-3">Telefone</th>
                        <th className="px-4 py-3">E-mail</th>
                        <th className="px-4 py-3">Endereço</th>
                        <th className="px-4 py-3 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((c) => (
                        <tr
                          key={c._id}
                          className="border-t border-white/5 hover:bg-white/5 cursor-pointer"
                          onClick={() => setSelectedClient(c)}
                        >
                          <td className="px-4 py-3 text-white">{c.name}</td>
                          <td className="px-4 py-3 text-slate-200">
                            {c.personType === "cnpj" ? "CNPJ" : "CPF"}{" "}
                            {c.docNumber
                              ? (c.personType === "cnpj"
                                  ? formatCNPJ(c.docNumber.replace(/\D/g, ""))
                                  : formatCPF(c.docNumber.replace(/\D/g, "")))
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {c.phone
                              ? formatPhone(c.phone.replace(/\D/g, ""))
                              : "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {c.email || "-"}
                          </td>
                          <td className="px-4 py-3 text-slate-200">
                            {(() => {
                              if (c.addresses && Array.isArray(c.addresses) && c.addresses.length > 0) {
                                return c.addresses[0].address || c.addresses[0].label || "Endereço cadastrado";
                              }
                              return c.address || "-";
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right text-slate-200">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClient(c);
                              }}
                              className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                            >
                              Detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {mode === "select" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-semibold text-white">Novo cliente</div>
              <p className="text-xs sm:text-sm text-slate-300">
                Escolha se o cliente é Pessoa Física (CPF) ou Pessoa Jurídica (CNPJ).
              </p>
            </div>
            <button
              onClick={cancelFlow}
              className="w-full sm:w-auto rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
            >
              Cancelar
            </button>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              onClick={() => {
                setPersonType("cpf");
                setMode("form");
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-left text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation active:scale-95"
            >
              Pessoa Física (CPF)
              <div className="text-xs font-normal text-slate-300 mt-1">
                CPF, nome completo e contato.
              </div>
            </button>
            <button
              onClick={() => {
                setPersonType("cnpj");
                setMode("form");
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-4 text-left text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10 touch-manipulation active:scale-95"
            >
              Pessoa Jurídica (CNPJ)
              <div className="text-xs font-normal text-slate-300 mt-1">
                CNPJ, razão social, contato e obra.
              </div>
            </button>
          </div>
        </div>
      )}

      {mode === "form" && personType && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="text-base sm:text-lg font-semibold text-white">
                Cadastro de cliente ({personType === "cpf" ? "CPF" : "CNPJ"})
              </div>
              <p className="text-xs text-slate-300">
                Preencha os dados. Integração com API virá em seguida.
              </p>
            </div>
            <button
              onClick={cancelFlow}
              className="w-full sm:w-auto rounded-lg border border-white/10 px-4 py-2.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white touch-manipulation active:scale-95"
            >
              Cancelar
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">
                {personType === "cpf" ? "Nome completo" : "Razão social"}
              </label>
              <input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder={
                  personType === "cpf" ? "João da Silva" : "Reis Fundações LTDA"
                }
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">
                {personType === "cpf" ? "CPF" : "CNPJ"}
              </label>
              <input
                value={form.docNumber}
                onChange={(e) => {
                  const rawValue = e.target.value.replace(/\D/g, "");
                  const formatted = personType === "cpf" ? formatCPF(rawValue) : formatCNPJ(rawValue);
                  setForm((f) => ({ ...f, docNumber: formatted }));
                }}
                maxLength={personType === "cpf" ? 14 : 18}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder={personType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Telefone</label>
              <input
                value={form.phone}
                onChange={(e) => {
                  const formatted = formatPhone(e.target.value);
                  setForm((f) => ({ ...f, phone: formatted }));
                }}
                maxLength={15}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                placeholder="contato@cliente.com"
              />
            </div>
          </div>

          {/* Seção de Endereços */}
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-white">Endereços</div>
                <div className="text-xs text-slate-400">Adicione um ou mais endereços para este cliente</div>
              </div>
              <button
                type="button"
                onClick={openNewAddressForm}
                className="w-full sm:w-auto rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30 touch-manipulation active:scale-95"
              >
                + Novo Endereço
              </button>
            </div>

            {/* Lista de endereços cadastrados */}
            {form.addresses.length > 0 && (
              <div className="space-y-2">
                {form.addresses.map((addr, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3"
                  >
                    <div className="flex-1">
                      <div className="font-semibold text-white text-sm">
                        {addr.label || `Endereço ${index + 1}`}
                      </div>
                      <div className="text-xs text-slate-300 mt-1">
                        {formatAddressString(addr) || "Endereço incompleto"}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEditAddress(index)}
                        className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => removeAddress(index)}
                        className="rounded-md border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/30"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Formulário de novo/editar endereço */}
            {editingAddressIndex !== null || form.addresses.length === 0 ? (
              <div className="space-y-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-white">
                    {editingAddressIndex !== null ? "Editar Endereço" : "Novo Endereço"}
                  </div>
                  {editingAddressIndex === null && form.addresses.length > 0 && (
                    <button
                      type="button"
                      onClick={cancelEditAddress}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
                <div className="grid gap-3">
                  <div className="space-y-1 text-sm">
                    <label className="text-slate-200">Etiqueta (ex: Casa, Escritório, Obra 1)</label>
                    <input
                      value={newAddressForm.label}
                      onChange={(e) => setNewAddressForm((f) => ({ ...f, label: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                      placeholder="Endereço Principal"
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-slate-200">Logradouro</label>
                    <input
                      value={newAddressForm.addressStreet}
                      onChange={(e) => setNewAddressForm((f) => ({ ...f, addressStreet: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Número</label>
                          <input
                            value={newAddressForm.addressNumber}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNumber: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Bairro</label>
                          <input
                            value={newAddressForm.addressNeighborhood}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="Centro"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Cidade</label>
                          <input
                            value={newAddressForm.addressCity}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressCity: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="São Paulo"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">UF</label>
                          <select
                            value={newAddressForm.addressState}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressState: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                          >
                            <option value="">Selecione</option>
                            {BRAZIL_STATES.map((uf) => (
                              <option key={uf} value={uf}>
                                {uf}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">CEP</label>
                          <input
                            value={newAddressForm.addressZip}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressZip: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                      
                      {/* Coordenadas */}
                      <div className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-200">Localização (Latitude / Longitude)</label>
                          <button
                            type="button"
                            onClick={generateLocationLink}
                            className="rounded-md border border-blue-400/50 bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-50 transition hover:border-blue-300 hover:bg-blue-500/30"
                          >
                            📍 Gerar Link de Captura
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 text-sm">
                            <label className="text-slate-300">Latitude</label>
                            <input
                              type="number"
                              step="any"
                              value={newAddressForm.latitude ?? ""}
                              onChange={(e) => setNewAddressForm((f) => ({ 
                                ...f, 
                                latitude: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-blue-400/60 focus:ring-blue-500/40"
                              placeholder="-23.5505199"
                            />
                          </div>
                          <div className="space-y-1 text-sm">
                            <label className="text-slate-300">Longitude</label>
                            <input
                              type="number"
                              step="any"
                              value={newAddressForm.longitude ?? ""}
                              onChange={(e) => setNewAddressForm((f) => ({ 
                                ...f, 
                                longitude: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-blue-400/60 focus:ring-blue-500/40"
                              placeholder="-46.6333094"
                            />
                          </div>
                        </div>
                        {newAddressForm.latitude && newAddressForm.longitude && (
                          <div className="mt-2">
                            <a
                              href={getGoogleMapsLink(newAddressForm.latitude, newAddressForm.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
                            >
                              🗺️ Ver no Google Maps
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditAddress}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveEditAddress}
                          className="w-full sm:w-auto rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30 touch-manipulation active:scale-95"
                        >
                          {editingAddressIndex !== null ? "Salvar" : "Adicionar"}
                        </button>
                      </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60 touch-manipulation active:scale-95"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      )}

      {selectedClient && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 py-4">
          <div className="flex h-full max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl border border-white/10 bg-slate-900 shadow-2xl shadow-black/50 overflow-hidden">
            {/* Header fixo */}
            <div className="flex items-center justify-between p-6 pb-4 border-b border-white/10 flex-shrink-0">
              <div>
                <div className="text-lg font-semibold text-white">
                  {selectedClient.name}
                </div>
                <div className="text-xs text-slate-300">
                  {selectedClient.personType === "cnpj" ? "CNPJ" : "CPF"}{" "}
                  {selectedClient.docNumber
                    ? (selectedClient.personType === "cnpj"
                        ? formatCNPJ(selectedClient.docNumber.replace(/\D/g, ""))
                        : formatCPF(selectedClient.docNumber.replace(/\D/g, "")))
                    : "-"}
                </div>
              </div>
              <button
                onClick={() => setSelectedClient(null)}
                className="h-9 w-9 rounded-lg border border-white/10 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
                aria-label="Fechar"
              >
                ×
              </button>
            </div>
            
            {/* Conteúdo scrollável */}
            <div className="flex-1 overflow-y-auto p-6 pt-4">
            {budgetMode ? (
              <BudgetManager
                clientId={selectedClient._id}
                clientName={selectedClient.name}
                onClose={() => {
                  setBudgetMode(null);
                  setPendingBudgetId(null);
                }}
                initialBudgetId={pendingBudgetId || undefined}
              />
            ) : editing ? (
              <>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">
                    {editForm.personType === "cpf" ? "Nome completo" : "Razão social"}
                  </label>
                  <input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">
                    {editForm.personType === "cpf" ? "CPF" : "CNPJ"}
                  </label>
                  <input
                    value={editForm.docNumber}
                    onChange={(e) => {
                      const rawValue = e.target.value.replace(/\D/g, "");
                      const formatted = editForm.personType === "cpf" ? formatCPF(rawValue) : formatCNPJ(rawValue);
                      setEditForm((f) => ({ ...f, docNumber: formatted }));
                    }}
                    maxLength={editForm.personType === "cpf" ? 14 : 18}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                    placeholder={editForm.personType === "cpf" ? "000.000.000-00" : "00.000.000/0000-00"}
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">Tipo</label>
                  <select
                    value={editForm.personType}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        personType: e.target.value as PersonType
                      }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                  >
                    <option value="cpf">CPF</option>
                    <option value="cnpj">CNPJ</option>
                  </select>
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">Telefone</label>
                  <input
                    value={editForm.phone}
                    onChange={(e) => {
                      const formatted = formatPhone(e.target.value);
                      setEditForm((f) => ({ ...f, phone: formatted }));
                    }}
                    maxLength={15}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                    placeholder="(11) 99999-9999"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">E-mail</label>
                  <input
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                  />
                </div>
              </div>

              {/* Seção de Endereços */}
              <div className="mt-4 space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold text-white">Endereços</div>
                    <div className="text-xs text-slate-400">Gerencie os endereços do cliente</div>
                  </div>
                  <button
                    type="button"
                    onClick={openNewAddressForm}
                    className="w-full sm:w-auto rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30 touch-manipulation active:scale-95"
                  >
                    + Novo Endereço
                  </button>
                </div>

                {/* Lista de endereços cadastrados */}
                {editForm.addresses.length > 0 && (
                  <div className="space-y-2">
                    {editForm.addresses.map((addr, index) => (
                      <div
                        key={index}
                        className="flex items-start justify-between rounded-lg border border-white/10 bg-slate-900/60 p-3"
                      >
                        <div className="flex-1">
                          <div className="font-semibold text-white text-sm">
                            {addr.label || `Endereço ${index + 1}`}
                          </div>
                          <div className="text-xs text-slate-300 mt-1">
                            {formatAddressString(addr) || "Endereço incompleto"}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditAddress(index)}
                            className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => removeAddress(index)}
                            className="rounded-md border border-red-500/30 bg-red-500/20 px-2 py-1 text-xs font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/30"
                          >
                            Remover
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Formulário de novo/editar endereço */}
                {(editingAddressIndex !== null || editForm.addresses.length === 0) && (
                  <div className="space-y-3 rounded-lg border border-emerald-400/30 bg-emerald-500/5 p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-semibold text-white">
                        {(editingAddressIndex !== null && editingAddressIndex !== -1) ? "Editar Endereço" : "Novo Endereço"}
                      </div>
                      {(editingAddressIndex === null || editingAddressIndex === -1) && editForm.addresses.length > 0 && (
                        <button
                          type="button"
                          onClick={cancelEditAddress}
                          className="text-xs text-slate-400 hover:text-white"
                        >
                          Cancelar
                        </button>
                      )}
                    </div>
                    <div className="grid gap-3">
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200">Etiqueta (ex: Casa, Escritório, Obra 1)</label>
                        <input
                          value={newAddressForm.label || ""}
                          onChange={(e) => setNewAddressForm((f) => ({ ...f, label: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                          placeholder="Endereço Principal"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200">Logradouro</label>
                        <input
                          value={newAddressForm.addressStreet}
                          onChange={(e) => setNewAddressForm((f) => ({ ...f, addressStreet: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                          placeholder="Rua, Avenida, etc."
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Número</label>
                          <input
                            value={newAddressForm.addressNumber}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNumber: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Bairro</label>
                          <input
                            value={newAddressForm.addressNeighborhood}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="Centro"
                          />
                        </div>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-3">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Cidade</label>
                          <input
                            value={newAddressForm.addressCity}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressCity: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="São Paulo"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">UF</label>
                          <select
                            value={newAddressForm.addressState}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressState: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                          >
                            <option value="">Selecione</option>
                            {BRAZIL_STATES.map((uf) => (
                              <option key={uf} value={uf}>
                                {uf}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">CEP</label>
                          <input
                            value={newAddressForm.addressZip}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressZip: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
                            placeholder="00000-000"
                          />
                        </div>
                      </div>
                      
                      {/* Coordenadas */}
                      <div className="rounded-lg border border-blue-400/30 bg-blue-500/5 p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <label className="text-sm font-semibold text-slate-200">Localização (Latitude / Longitude)</label>
                          <button
                            type="button"
                            onClick={generateLocationLink}
                            className="rounded-md border border-blue-400/50 bg-blue-500/20 px-2 py-1 text-xs font-semibold text-blue-50 transition hover:border-blue-300 hover:bg-blue-500/30"
                          >
                            📍 Gerar Link de Captura
                          </button>
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div className="space-y-1 text-sm">
                            <label className="text-slate-300">Latitude</label>
                            <input
                              type="number"
                              step="any"
                              value={newAddressForm.latitude ?? ""}
                              onChange={(e) => setNewAddressForm((f) => ({ 
                                ...f, 
                                latitude: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-blue-400/60 focus:ring-blue-500/40"
                              placeholder="-23.5505199"
                            />
                          </div>
                          <div className="space-y-1 text-sm">
                            <label className="text-slate-300">Longitude</label>
                            <input
                              type="number"
                              step="any"
                              value={newAddressForm.longitude ?? ""}
                              onChange={(e) => setNewAddressForm((f) => ({ 
                                ...f, 
                                longitude: e.target.value ? parseFloat(e.target.value) : undefined 
                              }))}
                              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-blue-400/60 focus:ring-blue-500/40"
                              placeholder="-46.6333094"
                            />
                          </div>
                        </div>
                        {newAddressForm.latitude && newAddressForm.longitude && (
                          <div className="mt-2">
                            <a
                              href={getGoogleMapsLink(newAddressForm.latitude, newAddressForm.longitude)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
                            >
                              🗺️ Ver no Google Maps
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={cancelEditAddress}
                          className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={saveEditAddress}
                          className="w-full sm:w-auto rounded-md border border-emerald-400/50 bg-emerald-500/20 px-4 py-2.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30 touch-manipulation active:scale-95"
                        >
                          {editingAddressIndex !== null ? "Salvar" : "Adicionar"}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              </>
            ) : (
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                    <div className="text-[11px] uppercase text-slate-400">Telefone</div>
                    <div className="text-white">
                      {selectedClient.phone
                        ? formatPhone(selectedClient.phone.replace(/\D/g, ""))
                        : "-"}
                    </div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
                    <div className="text-[11px] uppercase text-slate-400">E-mail</div>
                    <div className="text-white">{selectedClient.email || "-"}</div>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 sm:col-span-2 space-y-1">
                    <div className="text-[11px] uppercase text-slate-400">
                      Endereços {selectedClient.addresses && selectedClient.addresses.length > 0 && `(${selectedClient.addresses.length})`}
                    </div>
                    {(selectedClient.addresses && Array.isArray(selectedClient.addresses) && selectedClient.addresses.length > 0) ? (
                      <div className="space-y-2">
                        {selectedClient.addresses.map((addr: any, index: number) => (
                          <div key={addr._id || index} className="text-white">
                            <div className="font-semibold text-sm">
                              {addr.label || `Endereço ${index + 1}`}
                            </div>
                            <div className="text-xs text-slate-300 mt-0.5">
                              {addr.address || formatAddressString(addr)}
                            </div>
                            {addr.latitude && addr.longitude && (
                              <div className="mt-1">
                                <a
                                  href={getGoogleMapsLink(addr.latitude, addr.longitude)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 underline"
                                >
                                  🗺️ Ver localização no Google Maps
                                </a>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div>
                        <div className="text-slate-400 text-sm italic">
                          Nenhum endereço cadastrado
                        </div>
                        {/* Show legacy address if it exists (for debugging/migration) */}
                        {selectedClient.address && (
                          <div className="mt-2 p-2 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs">
                            <div className="text-yellow-300 font-semibold mb-1">⚠️ Endereço legado (será limpo ao editar):</div>
                            <div className="text-yellow-200">{selectedClient.address}</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Orçamentos e OSs Section */}
              {!editing && !budgetMode && (
                <div className="mt-6 space-y-4">
                  {/* Orçamentos */}
                  <div className="rounded-lg border border-white/10 bg-slate-800/30 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <span>💰</span>
                      <span>Orçamentos ({budgets.length})</span>
                    </h3>
                    {budgets.length > 0 ? (
                      <div className="space-y-2">
                        {budgets.slice(0, 5).map((budget: any) => (
                          <div
                            key={budget._id}
                            className="p-3 rounded-lg border border-white/5 bg-slate-900/50 hover:bg-slate-900/70 transition cursor-pointer"
                            onClick={() => {
                              setSelectedBudget(budget);
                              setBudgetMode("list");
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {budget.title || `Orçamento #${budget.seq || budget._id?.slice(-6)}`}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {budget.status === "pendente" && "⏳ Pendente"}
                                  {budget.status === "aprovado" && "✅ Aprovado"}
                                  {budget.status === "rejeitado" && "❌ Rejeitado"}
                                  {budget.status === "convertido" && "🔄 Convertido"}
                                  {budget.finalValue && (
                                    <span className="ml-2">
                                      · R$ {budget.finalValue.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedBudget(budget);
                                  setBudgetMode("list");
                                }}
                                className="text-xs text-blue-400 hover:text-blue-300 font-semibold"
                              >
                                Ver
                              </button>
                            </div>
                          </div>
                        ))}
                        {budgets.length > 5 && (
                          <button
                            onClick={() => setBudgetMode("list")}
                            className="w-full text-xs text-slate-400 hover:text-slate-300 text-center py-2"
                          >
                            Ver todos os {budgets.length} orçamentos →
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic">
                        Nenhum orçamento cadastrado
                      </div>
                    )}
                  </div>

                  {/* OSs (Ordens de Serviço) */}
                  <div className="rounded-lg border border-white/10 bg-slate-800/30 p-4">
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                      <span>📋</span>
                      <span>Ordens de Serviço ({clientJobs.length})</span>
                    </h3>
                    {clientJobs.length > 0 ? (
                      <div className="space-y-2">
                        {clientJobs.slice(0, 5).map((job: any) => (
                          <div
                            key={job._id}
                            className="p-3 rounded-lg border border-white/5 bg-slate-900/50 hover:bg-slate-900/70 transition"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-white truncate">
                                  {job.title || `OS #${job.seq || job._id?.slice(-6)}`}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                  {job.status === "pendente" && "⏳ Pendente"}
                                  {job.status === "em_andamento" && "🔄 Em Andamento"}
                                  {job.status === "concluido" && "✅ Concluído"}
                                  {job.status === "cancelado" && "❌ Cancelado"}
                                  {job.team && (
                                    <span className="ml-2">· {job.team}</span>
                                  )}
                                  {job.plannedDate && (
                                    <span className="ml-2">
                                      · {new Date(job.plannedDate).toLocaleDateString("pt-BR")}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                        {clientJobs.length > 5 && (
                          <div className="text-xs text-slate-400 text-center py-2">
                            +{clientJobs.length - 5} OSs adicionais
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-400 italic">
                        Nenhuma OS cadastrada
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Footer fixo com botões */}
            <div className="border-t border-white/10 p-6 pt-4 flex justify-end gap-2 text-xs flex-shrink-0">
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
              {budgetMode ? (
                <button
                  onClick={() => setBudgetMode(null)}
                  className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
                >
                  Voltar
                </button>
              ) : editing ? (
                <>
                  <button
                    onClick={() => setEditing(false)}
                    className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
                  >
                    Cancelar edição
                  </button>
                  <button
                    onClick={handleUpdate}
                    className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
                  >
                    Salvar alterações
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setBudgetMode("form")}
                    className="rounded-md border border-blue-400/50 bg-blue-500/20 px-3 py-2 font-semibold text-blue-50 transition hover:border-blue-300/50 hover:bg-blue-500/30"
                  >
                    💰 Orçamentos
                  </button>
                  <button
                    onClick={generateLocationCaptureLink}
                    className="rounded-md border border-purple-400/50 bg-purple-500/20 px-3 py-2 font-semibold text-purple-50 transition hover:border-purple-300/50 hover:bg-purple-500/30"
                  >
                    📍 Gerar Link de Captura
                  </button>
                  <button
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-white/10 bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-50 transition hover:border-emerald-300/50 hover:bg-emerald-500/30"
                  >
                    Editar
                  </button>
                  <button
                    onClick={handleDelete}
                    className="rounded-md border border-red-500/30 bg-red-500/20 px-3 py-2 font-semibold text-red-100 transition hover:border-red-400/40 hover:bg-red-500/30"
                  >
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

