import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import SignatureCanvas from "@/components/SignatureCanvas";

const BRAZIL_STATES = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA",
  "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN",
  "RS", "RO", "RR", "SC", "SP", "SE", "TO"
];

type UserRole = "admin" | "user";

export default function SettingsPage() {
  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role || "user";
  const isAdmin = userRole === "admin";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMode, setUserMode] = useState<"list" | "form">("list");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "user" as UserRole,
    active: true
  });

  // Travel Pricing States
  const [travelPricings, setTravelPricings] = useState<any[]>([]);
  const [travelPricingMode, setTravelPricingMode] = useState<"list" | "form">("list");
  const [editingTravelPricingId, setEditingTravelPricingId] = useState<string | null>(null);
  const [travelPricingForm, setTravelPricingForm] = useState({
    upToKm: "",
    pricePerKm: "",
    fixedPrice: "",
    type: "per_km" as "per_km" | "fixed",
    description: "",
    roundTrip: true,
    order: 0,
    isDefault: false
  });

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
    email: "",
    companySignature: ""
  });

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await apiFetch("/settings", { cache: "no-store" });
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
            email: data.data.email || "",
            companySignature: data.data.companySignature || ""
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

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
      loadTravelPricings();
    }
  }, [isAdmin]);

  const loadUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await apiFetch("/users", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setUsers(Array.isArray(data.data) ? data.data : []);
      } else if (!res.ok) {
        // Silently fail - backend might not be running
        console.warn("Failed to load users:", data?.error || "Backend not available");
        setUsers([]);
      }
    } catch (err) {
      console.error("Error loading users:", err);
      setUsers([]);
    } finally {
      setUsersLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (saving) return;
    
    if (!form.headquartersAddress && !form.headquartersStreet) {
      Swal.fire("Atenção", "Informe pelo menos o endereço da sede.", "warning");
      return;
    }

    try {
      setSaving(true);
      const res = await apiFetch("/settings", {
        method: "PUT",
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

  const handleUserSubmit = async () => {
    if (saving) return;

    if (!userForm.name.trim() || !userForm.email.trim()) {
      Swal.fire("Atenção", "Preencha nome e email.", "warning");
      return;
    }

    if (!editingUserId && !userForm.password) {
      Swal.fire("Atenção", "Informe uma senha para o novo usuário.", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        name: userForm.name.trim(),
        email: userForm.email.trim(),
        role: userForm.role,
        active: userForm.active
      };

      if (userForm.password) {
        payload.password = userForm.password;
      }

      const res = editingUserId
        ? await apiFetch(`/users/${editingUserId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await apiFetch("/users", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar usuário.", "error");
        return;
      }

      Swal.fire("Sucesso", editingUserId ? "Usuário atualizado com sucesso." : "Usuário criado com sucesso.", "success");
      resetUserForm();
      loadUsers();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar usuário.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetUserForm = () => {
    setUserForm({
      name: "",
      email: "",
      password: "",
      role: "user",
      active: true
    });
    setEditingUserId(null);
    setUserMode("list");
  };

  const handleEditUser = (user: any) => {
    setUserForm({
      name: user.name || "",
      email: user.email || "",
      password: "",
      role: user.role || "user",
      active: user.active !== undefined ? user.active : true
    });
    setEditingUserId(user._id);
    setUserMode("form");
  };

  const handleDeleteUser = async (userId: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão",
      text: "Deseja realmente excluir este usuário?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/users/${userId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        Swal.fire("Erro", data?.error || "Não foi possível excluir usuário.", "error");
        return;
      }

      setUsers((prev) => prev.filter((u) => u._id !== userId));
      Swal.fire("Sucesso", "Usuário excluído com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir usuário.", "error");
    }
  };

  // Travel Pricing Functions
  const loadTravelPricings = async () => {
    try {
      const res = await apiFetch("/travel-pricing", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setTravelPricings(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Error loading travel pricings:", err);
      setTravelPricings([]);
    }
  };

  const handleTravelPricingSubmit = async () => {
    if (saving) return;

    if (!travelPricingForm.description.trim()) {
      Swal.fire("Atenção", "Informe uma descrição.", "warning");
      return;
    }

    if (travelPricingForm.type === "per_km" && !travelPricingForm.pricePerKm) {
      Swal.fire("Atenção", "Informe o preço por km.", "warning");
      return;
    }

    if (travelPricingForm.type === "fixed" && !travelPricingForm.fixedPrice) {
      Swal.fire("Atenção", "Informe o preço fixo.", "warning");
      return;
    }

    try {
      setSaving(true);
      const payload: any = {
        description: travelPricingForm.description.trim(),
        type: travelPricingForm.type,
        roundTrip: travelPricingForm.roundTrip,
        order: travelPricingForm.order,
        isDefault: travelPricingForm.isDefault || false
      };

      // upToKm can be null for "any distance" pricing
      if (travelPricingForm.upToKm && travelPricingForm.upToKm.trim() !== "") {
        payload.upToKm = parseFloat(travelPricingForm.upToKm);
      } else {
        payload.upToKm = null;
      }

      if (travelPricingForm.type === "per_km" && travelPricingForm.pricePerKm) {
        payload.pricePerKm = parseFloat(travelPricingForm.pricePerKm);
      }

      if (travelPricingForm.type === "fixed" && travelPricingForm.fixedPrice) {
        payload.fixedPrice = parseFloat(travelPricingForm.fixedPrice);
      }

      const res = editingTravelPricingId
        ? await apiFetch(`/travel-pricing/${editingTravelPricingId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await apiFetch("/travel-pricing", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        Swal.fire("Erro", data?.error || "Não foi possível salvar preço.", "error");
        return;
      }

      Swal.fire("Sucesso", editingTravelPricingId ? "Preço atualizado com sucesso." : "Preço criado com sucesso.", "success");
      resetTravelPricingForm();
      loadTravelPricings();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar preço.", "error");
    } finally {
      setSaving(false);
    }
  };

  const resetTravelPricingForm = () => {
    setTravelPricingForm({
      upToKm: "",
      pricePerKm: "",
      fixedPrice: "",
      type: "per_km",
      description: "",
      roundTrip: true,
      order: 0,
      isDefault: false
    });
    setEditingTravelPricingId(null);
    setTravelPricingMode("list");
  };

  const handleEditTravelPricing = (pricing: any) => {
    setTravelPricingForm({
      upToKm: pricing.upToKm ? pricing.upToKm.toString() : "",
      pricePerKm: pricing.pricePerKm ? pricing.pricePerKm.toString() : "",
      fixedPrice: pricing.fixedPrice ? pricing.fixedPrice.toString() : "",
      type: pricing.type || "per_km",
      description: pricing.description || "",
      roundTrip: pricing.roundTrip !== undefined ? pricing.roundTrip : true,
      order: pricing.order || 0,
      isDefault: pricing.isDefault || false
    });
    setEditingTravelPricingId(pricing._id);
    setTravelPricingMode("form");
  };

  const handleDeleteTravelPricing = async (pricingId: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão",
      text: "Deseja realmente excluir este preço?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/travel-pricing/${pricingId}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        Swal.fire("Erro", data?.error || "Não foi possível excluir preço.", "error");
        return;
      }

      setTravelPricings((prev) => prev.filter((p) => p._id !== pricingId));
      Swal.fire("Sucesso", "Preço excluído com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir preço.", "error");
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
          Configure as informações da empresa e gerencie usuários do sistema.
        </p>
      </div>

      {/* Company Settings */}
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

        {/* Company Signature Section */}
        <div className="mt-6 space-y-3 md:col-span-2">
          <div>
            <label className="text-slate-200 text-sm font-semibold">Assinatura da Empresa</label>
            <p className="text-xs text-slate-400 mt-1">
              Esta assinatura será usada em PDFs de Ordens de Serviço, Contratos e outros documentos.
            </p>
          </div>
          {form.companySignature ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-3">
                <div className="text-xs text-emerald-300 mb-2">✓ Assinatura da empresa configurada</div>
                <img
                  src={form.companySignature}
                  alt="Assinatura da empresa"
                  className="w-full max-w-md mx-auto border border-white/20 rounded bg-white"
                />
              </div>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, companySignature: "" }))}
                className="w-full rounded-lg border border-yellow-400/50 bg-yellow-500/20 px-3 py-2 text-xs font-semibold text-yellow-300 transition hover:border-yellow-400 hover:bg-yellow-500/30"
              >
                Alterar Assinatura
              </button>
            </div>
          ) : (
            <div className="w-full">
              <SignatureCanvas
                onSave={(signature) => setForm((f) => ({ ...f, companySignature: signature }))}
                width={400}
                height={200}
              />
            </div>
          )}
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

      {/* User Management - Only for Admins */}
      {isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">Gerenciar Usuários</h2>
              <p className="text-xs text-slate-400">
                Crie e gerencie usuários do sistema. Apenas administradores podem acessar documentos.
              </p>
            </div>
            {userMode === "list" && (
              <button
                onClick={() => setUserMode("form")}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
              >
                + Novo Usuário
              </button>
            )}
          </div>

          {userMode === "form" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={userForm.name}
                    onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Nome completo"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="usuario@exemplo.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    {editingUserId ? "Nova Senha (deixe em branco para manter)" : "Senha"} {!editingUserId && <span className="text-red-400">*</span>}
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Função</label>
                  <select
                    value={userForm.role}
                    onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value as UserRole }))}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  >
                    <option value="user">Usuário</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="user-active"
                    checked={userForm.active}
                    onChange={(e) => setUserForm((f) => ({ ...f, active: e.target.checked }))}
                    className="w-4 h-4 rounded border-white/10 bg-slate-900/60 text-emerald-500 focus:ring-emerald-500/50"
                  />
                  <label htmlFor="user-active" className="text-sm text-slate-300">
                    Usuário ativo
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleUserSubmit}
                  disabled={saving}
                  className="px-6 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 transition"
                >
                  {saving ? "Salvando..." : editingUserId ? "Atualizar" : "Criar Usuário"}
                </button>
                <button
                  onClick={resetUserForm}
                  className="px-6 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 font-semibold hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {usersLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400 mx-auto mb-2"></div>
                  <p className="text-sm text-slate-300">Carregando usuários...</p>
                </div>
              ) : users.length === 0 ? (
                <p className="text-slate-300 text-center py-8">Nenhum usuário cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {users.map((user) => {
                    const isCurrentUser = user._id === currentUser?.id;
                    return (
                      <div
                        key={user._id}
                        className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-slate-900/30"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-white">{user.name}</span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/50">
                                Você
                              </span>
                            )}
                            <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                              user.role === "admin"
                                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                                : "bg-slate-500/20 text-slate-300 border border-slate-500/50"
                            }`}>
                              {user.role === "admin" ? "Admin" : "Usuário"}
                            </span>
                            {!user.active && (
                              <span className="px-2 py-0.5 rounded text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/50">
                                Inativo
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-400 mt-1">{user.email}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditUser(user)}
                            className="px-3 py-1.5 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-sm font-semibold hover:bg-white/10 transition"
                          >
                            Editar
                          </button>
                          {!isCurrentUser ? (
                            <button
                              onClick={() => handleDeleteUser(user._id)}
                              className="px-3 py-1.5 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition"
                            >
                              Excluir
                            </button>
                          ) : (
                            <button
                              disabled
                              className="px-3 py-1.5 rounded-lg border border-slate-500/30 bg-slate-500/10 text-slate-500 text-sm font-semibold cursor-not-allowed opacity-50"
                              title="Você não pode excluir seu próprio usuário"
                            >
                              Excluir
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Travel Pricing - Only for Admins */}
      {isAdmin && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white mb-2">🚗 Preços de Deslocamento</h2>
              <p className="text-xs text-slate-400">
                Configure os preços de deslocamento padrão com base na distância.
              </p>
            </div>
            {travelPricingMode === "list" && (
              <button
                onClick={() => setTravelPricingMode("form")}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition"
              >
                + Novo Preço
              </button>
            )}
          </div>

          {travelPricingMode === "form" ? (
            <div className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1 text-sm md:col-span-2">
                  <label className="text-slate-200">Descrição *</label>
                  <input
                    value={travelPricingForm.description}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="Ex: Até 50km, Acima de 100km, Deslocamento padrão, etc."
                  />
                </div>

                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">Tipo de Preço *</label>
                  <select
                    value={travelPricingForm.type}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, type: e.target.value as "per_km" | "fixed" }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                  >
                    <option value="per_km">Por Km</option>
                    <option value="fixed">Preço Fixo</option>
                  </select>
                </div>

                <div className="space-y-1 text-sm md:col-span-2">
                  <label className="text-slate-200 flex items-center gap-2">
                    Até (Km)
                    {travelPricingForm.type === "fixed" && (
                      <span className="text-xs px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/50">
                        Opcional
                      </span>
                    )}
                  </label>
                  <input
                    type="number"
                    value={travelPricingForm.upToKm}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, upToKm: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder={travelPricingForm.type === "fixed" 
                      ? "Deixe vazio para aplicar a qualquer distância" 
                      : "Ex: 50, 100, etc."
                    }
                    min="0"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    {travelPricingForm.type === "fixed" 
                      ? "💡 Deixe vazio para criar um preço fixo válido para qualquer quilometragem"
                      : "Ex: 50 (até 50km), 100 (até 100km), ou deixe vazio para acima de X km"
                    }
                  </p>
                </div>

                {travelPricingForm.type === "per_km" && (
                  <div className="space-y-1 text-sm">
                    <label className="text-slate-200">Preço por Km (R$) *</label>
                    <input
                      type="number"
                      value={travelPricingForm.pricePerKm}
                      onChange={(e) => setTravelPricingForm((f) => ({ ...f, pricePerKm: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Ex: 3.50"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}

                {travelPricingForm.type === "fixed" && (
                  <div className="space-y-1 text-sm">
                    <label className="text-slate-200">Preço Fixo (R$) *</label>
                    <input
                      type="number"
                      value={travelPricingForm.fixedPrice}
                      onChange={(e) => setTravelPricingForm((f) => ({ ...f, fixedPrice: e.target.value }))}
                      className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                      placeholder="Ex: 350.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                )}

                <div className="space-y-1 text-sm">
                  <label className="text-slate-200">Ordem</label>
                  <input
                    type="number"
                    value={travelPricingForm.order}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40"
                    placeholder="0"
                    min="0"
                  />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="roundTrip"
                    checked={travelPricingForm.roundTrip}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, roundTrip: e.target.checked }))}
                    className="w-4 h-4 rounded border border-white/10 bg-slate-900/60"
                  />
                  <label htmlFor="roundTrip" className="text-slate-200 cursor-pointer">
                    Ida e Volta
                  </label>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    id="isDefault"
                    checked={travelPricingForm.isDefault}
                    onChange={(e) => setTravelPricingForm((f) => ({ ...f, isDefault: e.target.checked }))}
                    className="w-4 h-4 rounded border border-white/10 bg-slate-900/60"
                  />
                  <label htmlFor="isDefault" className="text-slate-200 cursor-pointer">
                    Usar como padrão (quando nenhuma regra corresponder)
                  </label>
                </div>
              </div>

              <div className="flex gap-2 pt-4 border-t border-white/10">
                <button
                  onClick={resetTravelPricingForm}
                  className="flex-1 px-4 py-2 rounded-lg border border-white/10 bg-slate-900/60 text-slate-200 font-semibold hover:bg-slate-800/60 transition"
                  disabled={saving}
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTravelPricingSubmit}
                  className="flex-1 px-4 py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50"
                  disabled={saving}
                >
                  {saving ? "Salvando..." : editingTravelPricingId ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </div>
          ) : (
            <div>
              {travelPricings.length === 0 ? (
                <p className="text-slate-300 text-center py-8">Nenhum preço de deslocamento cadastrado.</p>
              ) : (
                <div className="space-y-2">
                  {travelPricings.map((pricing) => (
                    <div
                      key={pricing._id}
                      className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-slate-900/30"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold text-white">{pricing.description}</span>
                          {pricing.isDefault && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50">
                              Padrão
                            </span>
                          )}
                          {pricing.roundTrip && (
                            <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/50">
                              Ida e Volta
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-slate-400">
                          {pricing.type === "per_km" ? (
                            <>
                              {pricing.upToKm ? `Até ${pricing.upToKm}km` : "Acima de X km"} • 
                              <span className="text-emerald-300 font-semibold ml-1">
                                R$ {pricing.pricePerKm?.toFixed(2)}/km
                              </span>
                            </>
                          ) : (
                            <>
                              {pricing.upToKm 
                                ? `Até ${pricing.upToKm}km` 
                                : <span className="text-blue-300 font-medium">Qualquer distância</span>
                              } • 
                              <span className="text-emerald-300 font-semibold ml-1">
                                R$ {pricing.fixedPrice?.toFixed(2)} (fixo)
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditTravelPricing(pricing)}
                          className="px-3 py-1 rounded text-xs font-semibold border border-yellow-500/50 bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteTravelPricing(pricing._id)}
                          className="px-3 py-1 rounded text-xs font-semibold border border-red-500/50 bg-red-500/20 text-red-300 hover:bg-red-500/30 transition"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
