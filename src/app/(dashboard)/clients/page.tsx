"use client";

import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";

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
  const emptyAddress = {
    address: "",
    addressStreet: "",
    addressNumber: "",
    addressNeighborhood: "",
    addressCity: "",
    addressState: "",
    addressZip: ""
  };

  const [editForm, setEditForm] = useState({
    name: "",
    personType: "cpf" as PersonType,
    docNumber: "",
    phone: "",
    email: "",
    ...emptyAddress
  });

  const [form, setForm] = useState({
    name: "",
    docNumber: "",
    phone: "",
    email: "",
    ...emptyAddress
  });

  useEffect(() => {
    const loadClients = async () => {
      try {
        const res = await fetch("/api/clients", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (!res.ok) {
          console.error("Erro ao carregar clientes", data);
          return;
        }
        setClients(data?.data || []);
      } catch (err) {
        console.error(err);
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
      const personType = (selectedClient.personType || "cpf") as PersonType;
      const rawDocNumber = (selectedClient.docNumber || "").replace(/\D/g, "");
      const formattedDocNumber = personType === "cpf" ? formatCPF(rawDocNumber) : formatCNPJ(rawDocNumber);
      
      const rawPhone = (selectedClient.phone || "").replace(/\D/g, "");
      const formattedPhone = formatPhone(rawPhone);
      
      setEditForm({
        name: selectedClient.name || "",
        personType,
        docNumber: formattedDocNumber,
        phone: formattedPhone,
        email: selectedClient.email || "",
        address: selectedClient.address || "",
        addressStreet: selectedClient.addressStreet || "",
        addressNumber: selectedClient.addressNumber || "",
        addressNeighborhood: selectedClient.addressNeighborhood || "",
        addressCity: selectedClient.addressCity || "",
        addressState: selectedClient.addressState || "",
        addressZip: selectedClient.addressZip || ""
      });
    }
  }, [selectedClient]);

  const openNewClient = () => {
    setMode("select");
    setPersonType(null);
    setForm({
      name: "",
      docNumber: "",
      phone: "",
      email: "",
      ...emptyAddress
    });
  };
  const cancelFlow = () => {
    setMode(null);
    setPersonType(null);
    setForm({
      name: "",
      docNumber: "",
      phone: "",
      email: "",
      ...emptyAddress
    });
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
    const composedAddress = [
      [form.addressStreet, form.addressNumber].filter(Boolean).join(", "),
      form.addressNeighborhood,
      [form.addressCity, form.addressState].filter(Boolean).join(" - "),
      form.addressZip
    ]
      .filter((v) => v && v.trim().length > 0)
      .join(" | ");
    try {
      setSaving(true);
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          personType,
          docNumber: form.docNumber.replace(/\D/g, ""), // Remove formatação antes de salvar
          phone: form.phone.replace(/\D/g, ""), // Remove formatação antes de salvar
          email: form.email,
          address: composedAddress,
          addressStreet: form.addressStreet,
          addressNumber: form.addressNumber,
          addressNeighborhood: form.addressNeighborhood,
          addressCity: form.addressCity,
          addressState: form.addressState,
          addressZip: form.addressZip
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
    const composedAddress = [
      [editForm.addressStreet, editForm.addressNumber].filter(Boolean).join(", "),
      editForm.addressNeighborhood,
      [editForm.addressCity, editForm.addressState].filter(Boolean).join(" - "),
      editForm.addressZip
    ]
      .filter((v) => v && v.trim().length > 0)
      .join(" | ");
    try {
      setSaving(true);
      const res = await fetch(`/api/clients/${selectedClient._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          docNumber: editForm.docNumber.replace(/\D/g, ""), // Remove formatação antes de salvar
          phone: editForm.phone.replace(/\D/g, ""), // Remove formatação antes de salvar
          address: composedAddress
        })
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível atualizar", "error");
        return;
      }
      Swal.fire("Sucesso", "Cliente atualizado.", "success");
      setClients((prev) =>
        prev.map((c) => (c._id === selectedClient._id ? data.data : c))
      );
      setSelectedClient(data.data);
      setEditing(false);
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao atualizar cliente.", "error");
    } finally {
      setSaving(false);
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
      const res = await fetch(`/api/clients/${selectedClient._id}`, {
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
                {filtered.length} registro(s)
              </span>
            </div>

            {filtered.length === 0 ? (
              <div className="px-6 py-4 text-slate-300">
                Em breve exibiremos a lista de clientes e obras diretamente do banco.
                Utilize o botão acima para cadastrar quando o backend estiver ligado.
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
                          {c.address || "-"}
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
            <div className="space-y-1 text-sm">
              <label className="text-slate-200">Endereço da obra</label>
              <input
                value={form.addressStreet}
                onChange={(e) => setForm((f) => ({ ...f, addressStreet: e.target.value }))}
                className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                placeholder="Logradouro"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1 text-sm">
                <input
                  value={form.addressNumber}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressNumber: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Número"
                />
              </div>
              <div className="space-y-1 text-sm">
                <input
                  value={form.addressNeighborhood}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressNeighborhood: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Bairro"
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1 text-sm">
                <input
                  value={form.addressCity}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressCity: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="Cidade"
                />
              </div>
              <div className="space-y-1 text-sm">
                <select
                  value={form.addressState}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressState: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                >
                  <option value="">UF</option>
                  {BRAZIL_STATES.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1 text-sm">
                <input
                  value={form.addressZip}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, addressZip: e.target.value }))
                  }
                  className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  placeholder="CEP"
                />
              </div>
            </div>
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
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-900 p-6 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-between">
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

            {editing ? (
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
                <div className="space-y-1 text-sm sm:col-span-2">
                  <label className="text-slate-200">Endereço</label>
                  <input
                    value={editForm.addressStreet}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressStreet: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Logradouro"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <input
                    value={editForm.addressNumber}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressNumber: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Número"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <input
                    value={editForm.addressNeighborhood}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressNeighborhood: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Bairro"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <input
                    value={editForm.addressCity}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressCity: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-1 text-sm">
                  <select
                    value={editForm.addressState}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressState: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  >
                    <option value="">UF</option>
                    {BRAZIL_STATES.map((uf) => (
                      <option key={uf} value={uf}>
                        {uf}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1 text-sm">
                  <input
                    value={editForm.addressZip}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, addressZip: e.target.value }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="CEP"
                  />
                </div>
              </div>
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
                  <div className="text-[11px] uppercase text-slate-400">Endereço</div>
                  <div className="text-white">
                    {[selectedClient.addressStreet, selectedClient.addressNumber]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </div>
                  <div className="text-white">
                    {selectedClient.addressNeighborhood || ""}
                  </div>
                  <div className="text-white">
                    {[selectedClient.addressCity, selectedClient.addressState]
                      .filter(Boolean)
                      .join(" - ")}
                  </div>
                  <div className="text-white">{selectedClient.addressZip || ""}</div>
                  <div className="text-slate-400 text-xs">
                    {selectedClient.address || ""}
                  </div>
                </div>
              </div>
            )}

            <div className="mt-4 flex justify-end gap-2 text-xs">
              <button
                onClick={() => setSelectedClient(null)}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-2 font-semibold text-slate-100 transition hover:border-emerald-300/40 hover:text-white"
              >
                Fechar
              </button>
              {editing ? (
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

