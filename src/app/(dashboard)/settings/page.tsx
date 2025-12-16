"use client";

import { useEffect, useState } from "react";
import Swal from "sweetalert2";

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    headquartersAddress: "",
    headquartersStreet: "",
    headquartersNumber: "",
    headquartersNeighborhood: "",
    headquartersCity: "",
    headquartersState: "",
    headquartersZip: "",
    phone: "",
    email: ""
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/settings", { cache: "no-store" });
        const data = await res.json().catch(() => null);
        if (res.ok && data?.data) {
          setForm({
            companyName: data.data.companyName || "",
            headquartersAddress: data.data.headquartersAddress || "",
            headquartersStreet: data.data.headquartersStreet || "",
            headquartersNumber: data.data.headquartersNumber || "",
            headquartersNeighborhood: data.data.headquartersNeighborhood || "",
            headquartersCity: data.data.headquartersCity || "",
            headquartersState: data.data.headquartersState || "",
            headquartersZip: data.data.headquartersZip || "",
            phone: data.data.phone || "",
            email: data.data.email || ""
          });
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const handleSubmit = async () => {
    if (saving) return;
    
    if (!form.headquartersAddress && !form.headquartersStreet) {
      Swal.fire("Atenção", "Informe pelo menos o endereço da sede.", "warning");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar as configurações.", "error");
        return;
      }
      Swal.fire("Sucesso", "Configurações salvas com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar configurações.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando configurações...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">Configurações</h1>
        <p className="text-sm text-slate-300">
          Configure as informações da empresa, incluindo o endereço da sede para cálculo de rotas.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Informações da Empresa</h2>
          <p className="text-xs text-slate-400">
            Configure os dados da empresa Reis Fundações.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm md:col-span-2">
            <label className="text-slate-200">Nome da Empresa</label>
            <input
              value={form.companyName}
              onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Reis Fundações"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Telefone</label>
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="(XX) XXXXX-XXXX"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">E-mail</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="contato@reisfundacoes.com"
            />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">Endereço da Sede</h2>
          <p className="text-xs text-slate-400">
            Configure o endereço completo da sede. Este endereço será usado como ponto de partida para cálculo de rotas.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-1 text-sm md:col-span-2">
            <label className="text-slate-200">Endereço Completo *</label>
            <input
              value={form.headquartersAddress}
              onChange={(e) => setForm((f) => ({ ...f, headquartersAddress: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Ex: Avenida Principal, 123 - Centro, Cidade - UF, CEP"
            />
            <div className="text-[11px] text-slate-400">
              Endereço completo da sede (será usado para cálculo de rotas)
            </div>
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Rua</label>
            <input
              value={form.headquartersStreet}
              onChange={(e) => setForm((f) => ({ ...f, headquartersStreet: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Nome da rua"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Número</label>
            <input
              value={form.headquartersNumber}
              onChange={(e) => setForm((f) => ({ ...f, headquartersNumber: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="123"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Bairro</label>
            <input
              value={form.headquartersNeighborhood}
              onChange={(e) => setForm((f) => ({ ...f, headquartersNeighborhood: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Centro"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Cidade</label>
            <input
              value={form.headquartersCity}
              onChange={(e) => setForm((f) => ({ ...f, headquartersCity: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="Nome da cidade"
            />
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">Estado</label>
            <select
              value={form.headquartersState}
              onChange={(e) => setForm((f) => ({ ...f, headquartersState: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
            >
              <option value="">Selecione</option>
              {BRAZIL_STATES.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 text-sm">
            <label className="text-slate-200">CEP</label>
            <input
              value={form.headquartersZip}
              onChange={(e) => setForm((f) => ({ ...f, headquartersZip: e.target.value }))}
              className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
              placeholder="00000-000"
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
          {saving ? "Salvando..." : "Salvar Configurações"}
        </button>
      </div>
    </div>
  );
}

