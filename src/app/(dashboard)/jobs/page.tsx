"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
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
  const [mode, setMode] = useState<"list" | "form" | "detail">("list");
  const [selected, setSelected] = useState<any | null>(null);
  const [jobs, setJobs] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [saving, setSaving] = useState(false);

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
    services: [] as Array<{
      id: string;
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
    }>
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await fetch("/api/clients", { cache: "no-store" });
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
        const res = await fetch("/api/teams", { cache: "no-store" });
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
        const res = await fetch("/api/jobs", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar OS", data);
          return;
        }
        setJobs(Array.isArray(data?.data) ? data.data : []);
      } catch (err) {
        console.error(err);
      }
    };
    loadJobs();
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
    if (mode !== "form") return;
    
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
  }, [servicesValuesKey, mode]);

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
      services: [] as Array<{
        id: string;
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
      }>
    });

  const startNew = () => {
    resetForm();
    setMode("form");
    setSelected(null);
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

    try {
      setSaving(true);
      // Remover campos vazios do form antes de enviar
      const { value: formValue, discountPercent: formDiscount, ...restForm } = form;
      
      // Processar serviços com valores individuais
      const processedServices = form.services.map((srv) => {
        const serviceData: any = {
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

        return serviceData;
      });
      
      const payload: any = {
        ...restForm,
        services: processedServices,
        clientName,
        status: "pendente"
      };
      
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
      
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar a OS.", "error");
        return;
      }
      setJobs((prev) => [data.data, ...prev]);
      resetForm();
      setMode("list");
      Swal.fire("Sucesso", "OS salva com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar OS.", "error");
    } finally {
      setSaving(false);
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
                {filtered.length} registro(s)
              </span>
            </div>
            {filtered.length === 0 ? (
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
                            {job.plannedDate || "-"}
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
                            <span className={`rounded-full border px-3 py-1 text-xs font-semibold whitespace-nowrap text-center ${
                              STATUS_COLORS[job.status as Status] || "bg-white/5 text-white border-white/10"
                            }`}>
                              {STATUS_LABEL[job.status as Status] || "-"}
                            </span>
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
                            {job.plannedDate || "Sem data"}
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
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {mode === "form" && (
        <div className="space-y-4 sm:space-y-5 rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/30">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-base sm:text-lg font-semibold text-white">Nova OS</div>
              <p className="text-xs text-slate-300 mt-1">
                Preencha os dados. A OS será salva e listada abaixo.
              </p>
            </div>
            <button
              onClick={() => setMode("list")}
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
                  setForm((f) => ({
                    ...f,
                    clientId: e.target.value,
                    site: client?.address || ""
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
              <label className="text-slate-200">Obra / Endereço</label>
              <input
                value={form.site}
                onChange={(e) => setForm((f) => ({ ...f, site: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Endereço da obra"
              />
              <div className="text-[11px] text-slate-400">
                Endereço é preenchido pelo cliente selecionado; você pode ajustar se necessário.
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
                        discountPercent: ""
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
                        value={srv.service}
                        onChange={(e) =>
                          setForm((f) => {
                            const code = e.target.value.split(" ")[0];
                            return {
                              ...f,
                              services: f.services.map((s) =>
                                s.id === srv.id
                                  ? {
                                      ...s,
                                      service: e.target.value,
                                      categories: SERVICE_DEFAULT_CATS[code] || []
                                    }
                                  : s
                              )
                            };
                          })
                        }
                        className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      >
                        <option value="">Selecione um serviço</option>
                        {SERVICES.map((s) => (
                          <option key={s.value} value={`${s.value} - ${s.label}`}>
                            {s.group} — {s.label}
                          </option>
                        ))}
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
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.map((s) =>
                              s.id === srv.id ? { ...s, soilType: e.target.value } : s
                            )
                          }))
                        }
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
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            services: f.services.map((s) =>
                              s.id === srv.id ? { ...s, access: e.target.value } : s
                            )
                          }))
                        }
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
                        <label className="text-slate-200 text-xs sm:text-sm">Diâmetro (30–90 cm)</label>
                        <input
                          type="number"
                          min={30}
                          max={90}
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
                      </div>
                      <div className="space-y-1 text-sm">
                        <label className="text-slate-200 text-xs sm:text-sm">Profundidade (1–18 m)</label>
                        <input
                          type="number"
                          min={1}
                          max={18}
                          value={srv.profundidade}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              services: f.services.map((s) =>
                                s.id === srv.id
                                  ? { ...s, profundidade: e.target.value }
                                  : s
                              )
                            }))
                          }
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
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              services: f.services.map((s) =>
                                s.id === srv.id ? { ...s, quantidade: e.target.value } : s
                              )
                            }))
                          }
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
                      <div className="text-xs sm:text-sm font-semibold text-emerald-200">Valores deste Serviço</div>
                      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
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
            <div className="mb-3 sm:mb-4 text-sm font-semibold text-white">Valores do Serviço</div>
            <div className="mb-2 text-xs text-slate-400">
              O valor total é calculado automaticamente a partir dos valores dos serviços individuais.
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
              <label className="text-slate-200">Data agendada</label>
              <input
                type="date"
                value={form.plannedDate}
                onChange={(e) => setForm((f) => ({ ...f, plannedDate: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              />
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
              {saving ? "Salvando..." : "Salvar OS"}
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
                        const res = await fetch(`/api/jobs/${selected._id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
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
              <div className="text-white">{selected.plannedDate || "-"}</div>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200">
              <div className="text-[11px] uppercase text-slate-400">Valor Total</div>
              <div className="text-white font-semibold">
                {selected.value
                  ? new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(selected.value)
                  : "-"}
              </div>
            </div>
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
        </div>
      )}
    </div>
  );
}

