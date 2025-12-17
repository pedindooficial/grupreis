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
    .join(" | ");
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
        setClients(data?.data || []);
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

      // Load client budgets
      loadClientBudgets(selectedClient._id);
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
      Swal.fire("Sucesso", "Cliente atualizado.", "success");
      setClients((prev) => prev.map((c) => (c._id === selectedClient._id ? data.data : c)));
      setSelectedClient(data.data);
      setEditing(false);
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

  const removeAddress = (index: number) => {
    if (editing) {
      setEditForm(f => ({
        ...f,
        addresses: f.addresses.filter((_, i) => i !== index)
      }));
    } else {
      setForm(f => ({
        ...f,
        addresses: f.addresses.filter((_, i) => i !== index)
      }));
    }
  };

  const startEditAddress = (index: number) => {
    setEditingAddressIndex(index);
    const addresses = editing ? editForm.addresses : form.addresses;
    setNewAddressForm({ ...addresses[index] });
  };

  const saveEditAddress = () => {
    if (editingAddressIndex === null) {
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

    try {
      Swal.fire({
        title: "Gerando link...",
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });

      // Create location capture token
      const res = await apiFetch("/location-capture/create", {
        method: "POST",
        body: JSON.stringify({
          description: `Confirme a localização - ${selectedClient.name}`,
          resourceType: "client",
          resourceId: clientId,
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
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";
      
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes e Obras</h1>
          <p className="text-sm text-slate-300">
            Cadastro de clientes, contatos e endereços de obra. Dados serão
            carregados do banco assim que a API estiver conectada.
          </p>
        </div>
        {mode === null && (
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex flex-wrap items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome, CPF/CNPJ ou telefone"
                className="w-56 bg-transparent text-sm text-white outline-none placeholder:text-slate-400"
              />
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setFilterOpen((s) => !s)}
                  className="flex items-center gap-2 rounded-md border border-white/10 bg-slate-900 px-3 py-2 pr-7 text-xs font-semibold text-white transition hover:border-emerald-300/50 focus:border-emerald-400 focus:outline-none"
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
                        className="block w-full px-3 py-2 text-left text-xs font-semibold text-slate-200 transition hover:bg-white/10"
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
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-3 py-2 text-sm font-semibold text-white shadow-lg transition hover:from-blue-600 hover:to-emerald-500"
            >
              + Novo cliente/obra
            </button>
          </div>
        )}
      </div>

      {mode === null && (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 shadow-inner shadow-black/20"
              >
                <div className="text-[11px] uppercase tracking-wide text-slate-400">
                  {item.label}
                </div>
                <div className="mt-2 text-2xl font-semibold text-white">
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
              <div className="px-6 py-4 text-slate-300">
                Nenhum cliente cadastrado. Clique em “+ Novo cliente/obra” para adicionar.
              </div>
            ) : (
              <div className="overflow-x-auto">
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
            )}
          </div>
        </>
      )}

      {mode === "select" && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">Novo cliente</div>
              <p className="text-sm text-slate-300">
                Escolha se o cliente é Pessoa Física (CPF) ou Pessoa Jurídica (CNPJ).
              </p>
            </div>
            <button
              onClick={cancelFlow}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
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
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
            >
              Pessoa Física (CPF)
              <div className="text-xs font-normal text-slate-300">
                CPF, nome completo e contato.
              </div>
            </button>
            <button
              onClick={() => {
                setPersonType("cnpj");
                setMode("form");
              }}
              className="rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-emerald-300/40 hover:bg-white/10"
            >
              Pessoa Jurídica (CNPJ)
              <div className="text-xs font-normal text-slate-300">
                CNPJ, razão social, contato e obra.
              </div>
            </button>
          </div>
        </div>
      )}

      {mode === "form" && personType && (
        <div className="space-y-5 rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg font-semibold text-white">
                Cadastro de cliente ({personType === "cpf" ? "CPF" : "CNPJ"})
              </div>
              <p className="text-xs text-slate-300">
                Preencha os dados. Integração com API virá em seguida.
              </p>
            </div>
            <button
              onClick={cancelFlow}
              className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="contato@cliente.com"
              />
            </div>
          </div>

          {/* Seção de Endereços */}
          <div className="space-y-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">Endereços</div>
                <div className="text-xs text-slate-400">Adicione um ou mais endereços para este cliente</div>
              </div>
              <button
                type="button"
                onClick={openNewAddressForm}
                className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
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
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Endereço Principal"
                    />
                  </div>
                  <div className="space-y-1 text-sm">
                    <label className="text-slate-200">Logradouro</label>
                    <input
                      value={newAddressForm.addressStreet}
                      onChange={(e) => setNewAddressForm((f) => ({ ...f, addressStreet: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Rua, Avenida, etc."
                    />
                  </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Número</label>
                          <input
                            value={newAddressForm.addressNumber}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNumber: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Bairro</label>
                          <input
                            value={newAddressForm.addressNeighborhood}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="São Paulo"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">UF</label>
                          <select
                            value={newAddressForm.addressState}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressState: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
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
              className="rounded-lg bg-gradient-to-r from-blue-500 to-emerald-400 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-blue-600 hover:to-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
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
                onClose={() => setBudgetMode(null)}
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
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                    className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
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
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="Endereço Principal"
                        />
                      </div>
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200">Logradouro</label>
                        <input
                          value={newAddressForm.addressStreet}
                          onChange={(e) => setNewAddressForm((f) => ({ ...f, addressStreet: e.target.value }))}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="Rua, Avenida, etc."
                        />
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Número</label>
                          <input
                            value={newAddressForm.addressNumber}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNumber: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="123"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">Bairro</label>
                          <input
                            value={newAddressForm.addressNeighborhood}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressNeighborhood: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                            placeholder="São Paulo"
                          />
                        </div>
                        <div className="space-y-1 text-sm">
                          <label className="text-slate-200">UF</label>
                          <select
                            value={newAddressForm.addressState}
                            onChange={(e) => setNewAddressForm((f) => ({ ...f, addressState: e.target.value }))}
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                            className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
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
                          className="rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
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
                    <div className="text-[11px] uppercase text-slate-400">Endereços</div>
                    {(selectedClient.addresses && Array.isArray(selectedClient.addresses) && selectedClient.addresses.length > 0) ? (
                      <div className="space-y-2">
                        {selectedClient.addresses.map((addr: any, index: number) => (
                          <div key={index} className="text-white">
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
                      <div className="text-white text-sm">
                        {selectedClient.address || "Nenhum endereço cadastrado"}
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
                    💰 Fazer Orçamento
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

