"use client";

import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { apiFetch, apiUrl } from "@/lib/api-client";
import BudgetManager from "@/components/BudgetManager";

type TabType = "requests" | "new";
type OrcamentoRequestStatus = "pendente" | "em_contato" | "convertido" | "descartado";

const STATUS_LABELS: Record<OrcamentoRequestStatus, string> = {
  pendente: "Pendente",
  em_contato: "Em Contato",
  convertido: "Convertido",
  descartado: "Descartado"
};

const STATUS_COLORS: Record<OrcamentoRequestStatus, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/50",
  em_contato: "bg-blue-500/20 text-blue-300 border-blue-500/50",
  convertido: "bg-green-500/20 text-green-300 border-green-500/50",
  descartado: "bg-red-500/20 text-red-300 border-red-500/50"
};

const SERVICE_TYPE_LABELS: Record<string, string> = {
  estacas: "Estacas para fundação",
  fossa: "Fossa séptica",
  sumidouro: "Sumidouro / Poço",
  drenagem: "Drenagem pluvial",
  postes: "Postes / Cercas / Alambrados",
  outro: "Outro"
};

const LOCATION_TYPE_LABELS: Record<string, string> = {
  residencial: "Residencial",
  comercial: "Comercial",
  industrial: "Industrial",
  rural: "Rural"
};

const SOIL_TYPE_LABELS: Record<string, string> = {
  terra_comum: "Terra comum",
  argiloso: "Argiloso",
  arenoso: "Arenoso",
  rochoso: "Rochoso",
  nao_sei: "Não sei informar"
};

const ACCESS_LABELS: Record<string, string> = {
  facil: "Fácil",
  medio: "Médio",
  dificil: "Difícil"
};

const DEADLINE_LABELS: Record<string, string> = {
  urgente: "Urgente",
  "30_dias": "Até 30 dias",
  mais_30: "Mais de 30 dias"
};

const formatDate = (dateString: string | undefined | null): string => {
  if (!dateString) return "-";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  } catch {
    return dateString;
  }
};

export default function OrcamentosPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>("requests");
  
  // Client selection state (for Novo Orçamento tab)
  const [clients, setClients] = useState<any[]>([]);
  const [loadingClients, setLoadingClients] = useState(true);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [showClientForm, setShowClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    personType: "cpf" as "cpf" | "cnpj",
    cpf: "",
    cnpj: "",
    stateRegistration: ""
  });

  // Budget requests state (for Solicitações tab)
  const [allRequests, setAllRequests] = useState<any[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [statusFilter, setStatusFilter] = useState<OrcamentoRequestStatus | "all">("all");
  const [search, setSearch] = useState("");
  const [selectedRequest, setSelectedRequest] = useState<any | null>(null);
  const [updating, setUpdating] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Filter requests locally based on search and status
  const filteredRequests = useMemo(() => {
    return allRequests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) {
        return false;
      }
      if (search.trim()) {
        const searchTerm = search.trim().toLowerCase();
        const matchesName = request.name?.toLowerCase().includes(searchTerm);
        const matchesPhone = request.phone?.toLowerCase().includes(searchTerm);
        const matchesEmail = request.email?.toLowerCase().includes(searchTerm);
        const matchesAddress = request.address?.toLowerCase().includes(searchTerm);
        if (!matchesName && !matchesPhone && !matchesEmail && !matchesAddress) {
          return false;
        }
      }
      return true;
    });
  }, [allRequests, statusFilter, search]);

  useEffect(() => {
    if (activeTab === "new") {
      loadClients();
    } else if (activeTab === "requests") {
      loadRequests();
    }
  }, [activeTab]);

  const loadClients = async () => {
    try {
      setLoadingClients(true);
      const res = await apiFetch("/clients", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setClients(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Error loading clients:", err);
    } finally {
      setLoadingClients(false);
    }
  };

  const loadRequests = useCallback(async () => {
    try {
      setLoadingRequests(true);
      const res = await apiFetch("/orcamento-requests");
      const data = await res.json().catch(() => null);

      if (res.ok && data?.data) {
        setAllRequests(Array.isArray(data.data) ? data.data : []);
      } else {
        console.error("Failed to load requests:", data);
        Swal.fire("Erro", data?.error || "Não foi possível carregar solicitações.", "error");
      }
    } catch (error: any) {
      console.error("Error loading requests:", error);
      Swal.fire("Erro", "Não foi possível carregar solicitações.", "error");
    } finally {
      setLoadingRequests(false);
    }
  }, []);

  // Real-time updates using Server-Sent Events (SSE) for requests
  useEffect(() => {
    if (activeTab !== "requests") {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const connectSSE = () => {
      try {
        const url = apiUrl("/orcamento-requests/watch");
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log("SSE connected for orcamento requests");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "refresh") {
              setAllRequests(data.requests || []);
            } else if (data.type === "insert") {
              setAllRequests((prev) => {
                const exists = prev.some((r) => r._id === data.request?._id);
                if (exists) return prev;
                return [data.request, ...prev];
              });
              if (data.request) {
                Swal.fire({
                  title: "Nova Solicitação!",
                  html: `
                    <div class="text-left">
                      <p class="font-semibold text-slate-900 mb-2">${data.request.name}</p>
                      <p class="text-sm text-slate-600">${data.request.phone || ""}</p>
                      <p class="text-xs text-slate-500 mt-2">${data.request.services?.length || 0} serviço(s) solicitado(s)</p>
                    </div>
                  `,
                  icon: "info",
                  timer: 5000,
                  showConfirmButton: true,
                  confirmButtonText: "Ver Detalhes",
                  showCancelButton: true,
                  cancelButtonText: "Fechar"
                }).then((result) => {
                  if (result.isConfirmed && data.request) {
                    setSelectedRequest(data.request);
                  }
                });
              }
            } else if (data.type === "update") {
              setAllRequests((prev) =>
                prev.map((r) => (r._id === data.request?._id ? data.request : r))
              );
              setSelectedRequest((prev) => {
                if (prev?._id === data.request?._id) {
                  return data.request;
                }
                return prev;
              });
            } else if (data.type === "delete") {
              setAllRequests((prev) => prev.filter((r) => r._id !== data.requestId));
              setSelectedRequest((prev) => {
                if (prev?._id === data.requestId) {
                  return null;
                }
                return prev;
              });
            }
          } catch (error) {
            console.error("Error parsing SSE message:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE error:", error);
          eventSource.close();
          setTimeout(connectSSE, 5000);
        };
      } catch (error) {
        console.error("Error setting up SSE:", error);
      }
    };

    connectSSE();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [activeTab]);

  const updateStatus = async (id: string, status: OrcamentoRequestStatus, notes?: string) => {
    try {
      setUpdating(true);
      const res = await apiFetch(`/orcamento-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, notes })
      });

      const data = await res.json().catch(() => null);
      if (res.ok) {
        Swal.fire("Sucesso", "Status atualizado com sucesso!", "success");
        await loadRequests();
        if (selectedRequest?._id === id) {
          setSelectedRequest(data.data);
        }
      } else {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar status.", "error");
      }
    } catch (error: any) {
      console.error("Error updating status:", error);
      Swal.fire("Erro", "Não foi possível atualizar status.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const convertToClient = async (request: any, createBudget: boolean = false) => {
    try {
      const result = await Swal.fire({
        title: "Converter Solicitação",
        html: `
          <p class="text-left mb-4">Deseja criar um orçamento junto com o cliente?</p>
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" id="createBudget" ${createBudget ? "checked" : ""} class="rounded">
            <span>Criar orçamento automaticamente</span>
          </label>
        `,
        showCancelButton: true,
        confirmButtonText: "Converter",
        cancelButtonText: "Cancelar",
        confirmButtonColor: "#10b981",
        preConfirm: () => {
          const checkbox = document.getElementById("createBudget") as HTMLInputElement;
          return checkbox?.checked || false;
        }
      });

      if (result.isConfirmed) {
        setUpdating(true);
        const res = await apiFetch(`/orcamento-requests/${request._id}/convert`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            createBudget: result.value,
            notes: `Convertido de solicitação de orçamento #${request.seq}`
          })
        });

        const data = await res.json().catch(() => null);
        if (res.ok && data?.data) {
          const { request: updatedRequest, client, budget } = data.data;
          const clientId = client?._id?.toString() || data.clientId;
          const budgetId = budget?._id?.toString() || data.budgetId;
          
          let message = "Solicitação convertida com sucesso!<br><br>";
          if (client) {
            message += `✓ Cliente criado: <strong>${client.name}</strong> (ID: ${client._id?.slice(-6)})<br>`;
          }
          if (budget) {
            message += `✓ Orçamento criado: <strong>${budget.title}</strong> (ID: ${budget._id?.slice(-6)})<br>`;
          }
          
          let buttonsHtml = '<div style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap; justify-content: center;">';
          if (clientId) {
            buttonsHtml += `<button id="btn-go-client" style="padding: 0.5rem 1rem; background: #10b981; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">Ver Cliente</button>`;
          }
          if (budgetId && clientId) {
            buttonsHtml += `<button id="btn-go-budget" style="padding: 0.5rem 1rem; background: #3b82f6; color: white; border: none; border-radius: 0.5rem; cursor: pointer; font-weight: 600; transition: background 0.2s;" onmouseover="this.style.background='#2563eb'" onmouseout="this.style.background='#3b82f6'">Ver Orçamento</button>`;
          }
          buttonsHtml += '</div>';
          
          await Swal.fire({
            title: "Sucesso!",
            html: message + buttonsHtml,
            icon: "success",
            confirmButtonText: "OK",
            didOpen: () => {
              if (clientId) {
                const clientBtn = document.getElementById("btn-go-client");
                if (clientBtn) {
                  clientBtn.addEventListener("click", () => {
                    Swal.close();
                    navigate(`/clients?clientId=${clientId}`);
                  });
                }
              }
              if (budgetId && clientId) {
                const budgetBtn = document.getElementById("btn-go-budget");
                if (budgetBtn) {
                  budgetBtn.addEventListener("click", () => {
                    Swal.close();
                    navigate(`/clients?clientId=${clientId}&budgetId=${budgetId}`);
                  });
                }
              }
            }
          });
          
          await loadRequests();
          if (updatedRequest) {
            setSelectedRequest({
              ...updatedRequest,
              clientId: clientId || updatedRequest.clientId,
              budgetId: budgetId || updatedRequest.budgetId
            });
          } else {
            const res2 = await apiFetch(`/orcamento-requests/${request._id}`);
            const data2 = await res2.json().catch(() => null);
            if (res2.ok && data2?.data) {
              setSelectedRequest({
                ...data2.data,
                clientId: clientId || data2.data.clientId,
                budgetId: budgetId || data2.data.budgetId
              });
            }
          }
        } else {
          console.error("Conversion error:", data);
          Swal.fire("Erro", data?.error || "Não foi possível converter solicitação.", "error");
        }
      }
    } catch (error: any) {
      console.error("Error converting request:", error);
      Swal.fire("Erro", "Não foi possível converter solicitação.", "error");
    } finally {
      setUpdating(false);
    }
  };

  const deleteRequest = async (id: string) => {
    const result = await Swal.fire({
      title: "Excluir Solicitação",
      text: "Tem certeza que deseja excluir esta solicitação?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#ef4444"
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/orcamento-requests/${id}`, {
          method: "DELETE"
        });

        const data = await res.json().catch(() => null);
        if (res.ok) {
          Swal.fire("Sucesso", "Solicitação excluída com sucesso!", "success");
          await loadRequests();
          if (selectedRequest?._id === id) {
            setSelectedRequest(null);
          }
        } else {
          Swal.fire("Erro", data?.error || "Não foi possível excluir solicitação.", "error");
        }
      } catch (error: any) {
        console.error("Error deleting request:", error);
        Swal.fire("Erro", "Não foi possível excluir solicitação.", "error");
      }
    }
  };

  const handleCreateClient = async () => {
    if (!newClientForm.name.trim() || !newClientForm.phone.trim()) {
      Swal.fire("Erro", "Nome e telefone são obrigatórios", "error");
      return;
    }

    try {
      const res = await apiFetch("/clients", {
        method: "POST",
        body: JSON.stringify({
          name: newClientForm.name.trim(),
          phone: newClientForm.phone.trim(),
          email: newClientForm.email.trim() || undefined,
          address: newClientForm.address.trim() || undefined,
          personType: newClientForm.personType,
          cpf: newClientForm.personType === "cpf" ? newClientForm.cpf.trim() : undefined,
          cnpj: newClientForm.personType === "cnpj" ? newClientForm.cnpj.trim() : undefined,
          stateRegistration: newClientForm.stateRegistration.trim() || undefined
        })
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Falha ao criar cliente", "error");
        return;
      }

      if (data?.data?._id) {
        await loadClients();
        setSelectedClientId(data.data._id);
        setShowClientForm(false);
        setNewClientForm({
          name: "",
          phone: "",
          email: "",
          address: "",
          personType: "cpf",
          cpf: "",
          cnpj: "",
          stateRegistration: ""
        });
        Swal.fire("Sucesso", "Cliente criado com sucesso", "success");
      }
    } catch (err) {
      console.error("Error creating client:", err);
      Swal.fire("Erro", "Falha ao criar cliente", "error");
    }
  };

  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c._id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Orçamentos</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gerencie solicitações de orçamento e crie novos orçamentos
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-white/10">
        <button
          onClick={() => setActiveTab("requests")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "requests"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Solicitações
        </button>
        <button
          onClick={() => setActiveTab("new")}
          className={`px-4 py-2 text-sm font-semibold transition ${
            activeTab === "new"
              ? "text-emerald-400 border-b-2 border-emerald-400"
              : "text-slate-400 hover:text-white"
          }`}
        >
          Novo Orçamento
        </button>
      </div>

      {/* Content */}
      {activeTab === "requests" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, telefone, email ou endereço..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white placeholder-slate-400 outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as OrcamentoRequestStatus | "all")}
              className="rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="all">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Requests List */}
          {loadingRequests ? (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                <p className="text-sm text-slate-300">Carregando solicitações...</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
              {filteredRequests.length === 0 ? (
                <div className="p-8 text-center text-slate-400">
                  <p>Nenhuma solicitação encontrada.</p>
                </div>
              ) : (
                <div className="divide-y divide-white/10">
                  {filteredRequests.map((request) => (
                    <div
                      key={request._id}
                      className="p-4 sm:p-6 hover:bg-slate-800/30 transition cursor-pointer"
                      onClick={() => setSelectedRequest(request)}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-3 mb-2">
                            <span className="text-xs font-mono text-slate-400 bg-slate-800/50 px-2 py-1 rounded">
                              #{request.seq || request._id?.slice(-6)}
                            </span>
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold border ${STATUS_COLORS[request.status || "pendente"]}`}
                            >
                              {STATUS_LABELS[request.status || "pendente"]}
                            </span>
                          </div>
                          <h3 className="text-white font-semibold text-base sm:text-lg mb-1 break-words">
                            {request.name}
                          </h3>
                          <div className="flex flex-wrap gap-3 text-xs sm:text-sm text-slate-400">
                            {request.phone && (
                              <span className="flex items-center gap-1">
                                <span>📞</span>
                                <span>{request.phone}</span>
                              </span>
                            )}
                            {request.email && (
                              <span className="flex items-center gap-1">
                                <span>📧</span>
                                <span>{request.email}</span>
                              </span>
                            )}
                            {request.address && (
                              <span className="flex items-center gap-1">
                                <span>📍</span>
                                <span className="truncate max-w-[200px]">{request.address}</span>
                              </span>
                            )}
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            {request.services?.length || 0} serviço(s) · {formatDate(request.createdAt)}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {request.status !== "convertido" && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                convertToClient(request);
                              }}
                              className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition border border-emerald-500/30"
                            >
                              Converter
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRequest(request);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-white/5 text-slate-200 text-xs font-semibold hover:bg-white/10 transition border border-white/10"
                          >
                            Ver Detalhes
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Detail Modal */}
          {selectedRequest && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div
                className="absolute inset-0"
                onClick={() => setSelectedRequest(null)}
              ></div>
              <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl border border-white/10 bg-slate-900 p-4 sm:p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                      Solicitação #{selectedRequest.seq || selectedRequest._id?.slice(-6)}
                    </h2>
                    <span
                      className={`inline-block px-3 py-1 rounded text-sm font-semibold border ${STATUS_COLORS[selectedRequest.status || "pendente"]}`}
                    >
                      {STATUS_LABELS[selectedRequest.status || "pendente"]}
                    </span>
                  </div>
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="text-slate-400 hover:text-white transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Client Data */}
                  <div className="rounded-lg border border-white/10 bg-slate-800/30 p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Dados do Cliente</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-slate-400">Nome:</span>
                        <p className="text-white font-medium">{selectedRequest.name}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Telefone:</span>
                        <p className="text-white font-medium">{selectedRequest.phone}</p>
                      </div>
                      {selectedRequest.email && (
                        <div>
                          <span className="text-slate-400">Email:</span>
                          <p className="text-white font-medium">{selectedRequest.email}</p>
                        </div>
                      )}
                      {selectedRequest.address && (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400">Endereço:</span>
                          <p className="text-white font-medium">{selectedRequest.address}</p>
                        </div>
                      )}
                      {(selectedRequest.latitude !== undefined && selectedRequest.latitude !== null) ||
                      (selectedRequest.longitude !== undefined && selectedRequest.longitude !== null) ? (
                        <div className="sm:col-span-2">
                          <span className="text-slate-400">Coordenadas:</span>
                          <p className="text-white font-medium">
                            {selectedRequest.latitude?.toFixed(6)}, {selectedRequest.longitude?.toFixed(6)}
                            {selectedRequest.latitude && selectedRequest.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${selectedRequest.latitude},${selectedRequest.longitude}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="ml-2 text-emerald-400 hover:text-emerald-300 underline text-xs"
                                onClick={(e) => e.stopPropagation()}
                              >
                                Ver no mapa
                              </a>
                            )}
                          </p>
                        </div>
                      ) : null}
                      {selectedRequest.locationType && (
                        <div>
                          <span className="text-slate-400">Tipo de Local:</span>
                          <p className="text-white font-medium">
                            {LOCATION_TYPE_LABELS[selectedRequest.locationType] || selectedRequest.locationType}
                          </p>
                        </div>
                      )}
                      {selectedRequest.soilType && (
                        <div>
                          <span className="text-slate-400">Tipo de Solo:</span>
                          <p className="text-white font-medium">
                            {SOIL_TYPE_LABELS[selectedRequest.soilType] || selectedRequest.soilType}
                          </p>
                        </div>
                      )}
                      {selectedRequest.access && (
                        <div>
                          <span className="text-slate-400">Acesso:</span>
                          <p className="text-white font-medium">
                            {ACCESS_LABELS[selectedRequest.access] || selectedRequest.access}
                          </p>
                        </div>
                      )}
                      {selectedRequest.deadline && (
                        <div>
                          <span className="text-slate-400">Prazo:</span>
                          <p className="text-white font-medium">
                            {DEADLINE_LABELS[selectedRequest.deadline] || selectedRequest.deadline}
                          </p>
                        </div>
                      )}
                      <div className="sm:col-span-2">
                        <span className="text-slate-400">Data de Recebimento:</span>
                        <p className="text-white font-medium">{formatDate(selectedRequest.createdAt)}</p>
                      </div>
                    </div>
                    {selectedRequest.sptDiagnostic && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <span className="text-slate-400 text-sm">SPT/Diagnóstico do Solo:</span>
                        <p className="text-white text-sm mt-1 whitespace-pre-wrap">{selectedRequest.sptDiagnostic}</p>
                      </div>
                    )}
                  </div>

                  {/* Services */}
                  <div className="rounded-lg border border-white/10 bg-slate-800/30 p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">
                      Serviços ({selectedRequest.services?.length || 0})
                    </h3>
                    <div className="space-y-3">
                      {selectedRequest.services?.map((service: any, index: number) => (
                        <div key={index} className="p-3 rounded border border-white/5 bg-slate-900/50">
                          <div className="font-medium text-white mb-2">
                            {service.serviceName 
                              ? service.serviceName
                              : service.serviceType === "outro" && service.serviceTypeOther
                              ? `Outro: ${service.serviceTypeOther}`
                              : SERVICE_TYPE_LABELS[service.serviceType] || service.serviceType}
                            {service.serviceId && (
                              <span className="ml-2 text-xs text-slate-500 font-normal">
                                (ID: {service.serviceId.slice(-6)})
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-xs text-slate-400">
                            {service.diameter && (
                              <div>
                                <span className="text-slate-500">Diâmetro:</span> {service.diameter}cm
                              </div>
                            )}
                            {service.depth && (
                              <div>
                                <span className="text-slate-500">Profundidade:</span>{" "}
                                {service.depth === "outro" && service.depthOther
                                  ? `${service.depthOther}m`
                                  : `${service.depth}m`}
                              </div>
                            )}
                            {service.quantity && (
                              <div>
                                <span className="text-slate-500">Quantidade:</span>{" "}
                                {service.quantity === "outro" && service.quantityOther
                                  ? `${service.quantityOther} un`
                                  : `${service.quantity} un`}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-wrap gap-3 pt-4 border-t border-white/10">
                    {selectedRequest.status !== "convertido" && (
                      <>
                        <button
                          onClick={() => convertToClient(selectedRequest, false)}
                          className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
                        >
                          Converter para Cliente
                        </button>
                        <button
                          onClick={() => convertToClient(selectedRequest, true)}
                          className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                        >
                          Converter + Criar Orçamento
                        </button>
                        <select
                          value={selectedRequest.status || "pendente"}
                          onChange={(e) =>
                            updateStatus(selectedRequest._id, e.target.value as OrcamentoRequestStatus)
                          }
                          disabled={updating}
                          className="px-4 py-2 rounded-lg border border-white/10 bg-slate-800 text-white font-semibold"
                        >
                          {Object.entries(STATUS_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </>
                    )}
                    {selectedRequest.status === "convertido" && (selectedRequest.clientId || selectedRequest.budgetId) && (
                      <div className="flex flex-wrap gap-3 w-full">
                        {selectedRequest.clientId && (
                          <button
                            onClick={() => {
                              const clientId = typeof selectedRequest.clientId === 'object' 
                                ? selectedRequest.clientId.toString() 
                                : selectedRequest.clientId;
                              const budgetId = selectedRequest.budgetId 
                                ? (typeof selectedRequest.budgetId === 'object' 
                                    ? selectedRequest.budgetId.toString() 
                                    : selectedRequest.budgetId)
                                : null;
                              navigate(`/clients?clientId=${clientId}${budgetId ? `&budgetId=${budgetId}` : ''}`);
                            }}
                            className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
                          >
                            Ver Cliente
                          </button>
                        )}
                        {selectedRequest.budgetId && selectedRequest.clientId && (
                          <button
                            onClick={() => {
                              const clientId = typeof selectedRequest.clientId === 'object' 
                                ? selectedRequest.clientId.toString() 
                                : selectedRequest.clientId;
                              const budgetId = typeof selectedRequest.budgetId === 'object' 
                                ? selectedRequest.budgetId.toString() 
                                : selectedRequest.budgetId;
                              navigate(`/clients?clientId=${clientId}&budgetId=${budgetId}`);
                            }}
                            className="px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition"
                          >
                            Ver Orçamento
                          </button>
                        )}
                      </div>
                    )}
                    {selectedRequest.status !== "convertido" && (
                      <button
                        onClick={() => deleteRequest(selectedRequest._id)}
                        className="px-4 py-2 rounded-lg bg-red-500/20 text-red-300 font-semibold hover:bg-red-500/30 transition border border-red-500/30"
                      >
                        Excluir
                      </button>
                    )}
                    <button
                      onClick={() => setSelectedRequest(null)}
                      className="ml-auto px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-slate-200 font-semibold hover:bg-white/10 transition"
                    >
                      Fechar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "new" && (
        <div className="space-y-4">
          {/* Client Selection */}
          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Selecionar Cliente</h2>
            
            {!showClientForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-200 mb-2">
                    Cliente Existente
                  </label>
                  {loadingClients ? (
                    <div className="text-slate-400 text-sm">Carregando clientes...</div>
                  ) : (
                    <select
                      value={selectedClientId || ""}
                      onChange={(e) => setSelectedClientId(e.target.value || null)}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2.5 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map((client) => (
                        <option key={client._id} value={client._id}>
                          {client.name} {client.phone ? `- ${client.phone}` : ""}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  <div className="flex-1 border-t border-white/10"></div>
                  <span className="text-sm text-slate-400">ou</span>
                  <div className="flex-1 border-t border-white/10"></div>
                </div>

                <button
                  onClick={() => setShowClientForm(true)}
                  className="w-full rounded-lg border border-blue-400/50 bg-blue-500/20 px-4 py-2.5 text-sm font-semibold text-blue-100 transition hover:border-blue-400 hover:bg-blue-500/30"
                >
                  + Adicionar Novo Cliente
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-white">Novo Cliente</h3>
                  <button
                    onClick={() => {
                      setShowClientForm(false);
                      setNewClientForm({
                        name: "",
                        phone: "",
                        email: "",
                        address: "",
                        personType: "cpf",
                        cpf: "",
                        cnpj: "",
                        stateRegistration: ""
                      });
                    }}
                    className="text-slate-400 hover:text-white text-sm"
                  >
                    Cancelar
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Nome / Razão Social *
                    </label>
                    <input
                      type="text"
                      value={newClientForm.name}
                      onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Nome completo ou razão social"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Telefone *
                    </label>
                    <input
                      type="tel"
                      value={newClientForm.phone}
                      onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="(00) 00000-0000"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={newClientForm.email}
                      onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="email@exemplo.com"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      value={newClientForm.address}
                      onChange={(e) => setNewClientForm({ ...newClientForm, address: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Endereço completo"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-200 mb-1">
                      Tipo
                    </label>
                    <select
                      value={newClientForm.personType}
                      onChange={(e) => setNewClientForm({ ...newClientForm, personType: e.target.value as "cpf" | "cnpj" })}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    >
                      <option value="cpf">CPF</option>
                      <option value="cnpj">CNPJ</option>
                    </select>
                  </div>

                  {newClientForm.personType === "cpf" ? (
                    <div>
                      <label className="block text-sm font-medium text-slate-200 mb-1">
                        CPF
                      </label>
                      <input
                        type="text"
                        value={newClientForm.cpf}
                        onChange={(e) => setNewClientForm({ ...newClientForm, cpf: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  ) : (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                          CNPJ
                        </label>
                        <input
                          type="text"
                          value={newClientForm.cnpj}
                          onChange={(e) => setNewClientForm({ ...newClientForm, cnpj: e.target.value })}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="00.000.000/0000-00"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-200 mb-1">
                          Inscrição Estadual
                        </label>
                        <input
                          type="text"
                          value={newClientForm.stateRegistration}
                          onChange={(e) => setNewClientForm({ ...newClientForm, stateRegistration: e.target.value })}
                          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                          placeholder="Inscrição estadual (opcional)"
                        />
                      </div>
                    </>
                  )}
                </div>

                <button
                  onClick={handleCreateClient}
                  className="w-full sm:w-auto rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:from-emerald-600 hover:to-emerald-700"
                >
                  Criar Cliente
                </button>
              </div>
            )}
          </div>

          {/* Budget Manager */}
          {selectedClientId && selectedClient && (
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Orçamentos - {selectedClient.name}
                </h2>
                <button
                  onClick={() => setSelectedClientId(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Trocar Cliente
                </button>
              </div>
              <BudgetManager
                clientId={selectedClientId}
                clientName={selectedClient.name}
                onClose={() => setSelectedClientId(null)}
              />
            </div>
          )}

          {!selectedClientId && !showClientForm && (
            <div className="rounded-xl border border-white/10 bg-slate-900/50 p-8 text-center">
              <p className="text-slate-400">
                Selecione um cliente existente ou crie um novo para começar a criar orçamentos.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

