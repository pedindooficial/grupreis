"use client";

import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";
import { Catalog, PriceVariation, SoilType, MachineAccess } from "@/models/Catalog";

const SOIL_TYPES: { value: SoilType; label: string }[] = [
  { value: "argiloso", label: "Argiloso" },
  { value: "arenoso", label: "Arenoso" },
  { value: "rochoso", label: "Rochoso" },
  { value: "misturado", label: "Terra comum" },
  { value: "outro", label: "Não sei informar" }
];

const ACCESS_TYPES: { value: MachineAccess; label: string }[] = [
  { value: "livre", label: "Acesso livre e desimpedido" },
  { value: "limitado", label: "Algumas limitações" },
  { value: "restrito", label: "Acesso restrito ou complicado" }
];

const COMMON_DIAMETERS = [30, 35, 40, 45, 50, 60, 70, 80, 90, 100, 110, 120];

// Component to display photos with presigned URLs
function PhotoGrid({ photoKeys, onRemove }: { photoKeys: string[]; onRemove: (index: number) => void }) {
  const [photoUrls, setPhotoUrls] = useState<Record<number, string>>({});

  useEffect(() => {
    const loadUrls = async () => {
      const urls: Record<number, string> = {};
      for (let i = 0; i < photoKeys.length; i++) {
        try {
          const res = await apiFetch("/files/presigned-url", {
            method: "POST",
            body: JSON.stringify({ key: photoKeys[i] })
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.data?.url) {
            urls[i] = data.data.url;
          }
        } catch (err) {
          console.error(`Failed to load photo ${i}:`, err);
        }
      }
      setPhotoUrls(urls);
    };
    if (photoKeys.length > 0) {
      loadUrls();
    }
  }, [photoKeys]);

  return (
    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
      {photoKeys.map((key, index) => (
        <div key={index} className="relative group">
          {photoUrls[index] ? (
            <img
              src={photoUrls[index]}
              alt={`Foto ${index + 1}`}
              className="w-full h-20 sm:h-24 object-cover rounded-lg border border-white/10"
            />
          ) : (
            <div className="w-full h-20 sm:h-24 rounded-lg border border-white/10 bg-slate-800 flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-emerald-400"></div>
            </div>
          )}
          <button
            onClick={() => onRemove(index)}
            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-70 sm:opacity-0 group-hover:opacity-100 transition touch-manipulation active:scale-95"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

export default function CatalogPage() {
  const [items, setItems] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<"list" | "form">("list");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadedPhotoKeys, setUploadedPhotoKeys] = useState<string[]>([]);
  const [expandedDiameters, setExpandedDiameters] = useState<Set<number>>(new Set());
  const [expandedServices, setExpandedServices] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "",
    active: true,
    priceVariations: [] as PriceVariation[]
  });

  useEffect(() => {
    loadItems();
  }, []);

  const loadItems = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/catalog", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setItems(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      category: "",
      active: true,
      priceVariations: []
    });
    setEditingId(null);
    setSelectedPhotos([]);
    setUploadedPhotoKeys([]);
    setMode("list");
    setExpandedDiameters(new Set());
  };

  const handleEdit = (item: Catalog) => {
    // Ensure all price variations have default access value
    const priceVariations = (item.priceVariations || []).map((pv) => ({
      ...pv,
      access: pv.access || "livre"
    }));
    
    setForm({
      name: item.name || "",
      description: item.description || "",
      category: item.category || "",
      active: item.active !== undefined ? item.active : true,
      priceVariations
    });
    setEditingId(item._id?.toString() || null);
    setUploadedPhotoKeys(item.photos || []);
    setSelectedPhotos([]);
    setMode("form");
    // Expand all diameter groups when editing
    const diameters = new Set(priceVariations.map((pv) => pv.diameter));
    setExpandedDiameters(diameters);
  };

  const toggleDiameterGroup = (diameter: number) => {
    setExpandedDiameters((prev) => {
      const next = new Set(prev);
      if (next.has(diameter)) {
        next.delete(diameter);
      } else {
        next.add(diameter);
      }
      return next;
    });
  };

  const toggleService = (serviceId: string) => {
    setExpandedServices((prev) => {
      const next = new Set(prev);
      if (next.has(serviceId)) {
        next.delete(serviceId);
      } else {
        next.add(serviceId);
      }
      return next;
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      // Validate file types and sizes
      const validFiles = files.filter((file) => {
        if (!file.type.startsWith("image/")) {
          Swal.fire("Atenção", `${file.name} não é uma imagem válida.`, "warning");
          return false;
        }
        if (file.size > 5 * 1024 * 1024) {
          Swal.fire("Atenção", `${file.name} é muito grande. Tamanho máximo: 5MB`, "warning");
          return false;
        }
        return true;
      });
      setSelectedPhotos((prev) => [...prev, ...validFiles]);
    }
  };

  const removePhoto = (index: number, isUploaded: boolean) => {
    if (isUploaded) {
      setUploadedPhotoKeys((prev) => prev.filter((_, i) => i !== index));
    } else {
      setSelectedPhotos((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const addPriceVariation = async () => {
    const { value: diameter } = await Swal.fire({
      title: "Selecionar Diâmetro",
      text: "Escolha o diâmetro para a nova variação de preço:",
      input: "select",
      inputOptions: COMMON_DIAMETERS.reduce((acc, d) => {
        acc[d] = `${d} cm`;
        return acc;
      }, {} as Record<number, string>),
      inputPlaceholder: "Selecione o diâmetro",
      showCancelButton: true,
      confirmButtonText: "Adicionar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#10b981",
      cancelButtonColor: "#6b7280",
      inputValidator: (value) => {
        if (!value) {
          return "Você precisa selecionar um diâmetro!";
        }
        return null;
      }
    });

    if (!diameter) return; // User cancelled

    const selectedDiameter = parseInt(diameter, 10);
    
    setForm((f) => ({
      ...f,
      priceVariations: [
        ...f.priceVariations,
        { diameter: selectedDiameter, soilType: "argiloso", access: "livre", price: 0, executionTime: undefined }
      ]
    }));
    // Expand the group for the newly added variation
    setExpandedDiameters((prev) => new Set(prev).add(selectedDiameter));
  };

  const updatePriceVariation = (index: number, field: keyof PriceVariation, value: any) => {
    setForm((f) => ({
      ...f,
      priceVariations: f.priceVariations.map((pv, i) => {
        if (i === index) {
          // Ensure numeric fields are converted to numbers
          if (field === "diameter") {
            return { ...pv, [field]: typeof value === "string" ? parseInt(value, 10) : Number(value) };
          }
          if (field === "price") {
            return { ...pv, [field]: typeof value === "string" ? parseFloat(value) : Number(value) };
          }
          if (field === "executionTime") {
            return { ...pv, [field]: value !== undefined ? (typeof value === "string" ? parseInt(value, 10) : Number(value)) : undefined };
          }
          return { ...pv, [field]: value };
        }
        return pv;
      })
    }));
  };

  const removePriceVariation = (index: number) => {
    setForm((f) => ({
      ...f,
      priceVariations: f.priceVariations.filter((_, i) => i !== index)
    }));
  };

  // Group price variations by diameter
  const groupedVariations = form.priceVariations.reduce((acc, variation, index) => {
    const diameter = variation.diameter;
    if (!acc[diameter]) {
      acc[diameter] = [];
    }
    acc[diameter].push({ ...variation, originalIndex: index });
    return acc;
  }, {} as Record<number, Array<PriceVariation & { originalIndex: number }>>);

  const sortedDiameters = Object.keys(groupedVariations)
    .map(Number)
    .sort((a, b) => a - b);

  const handleSubmit = async () => {
    if (saving) return;

    if (!form.name.trim()) {
      Swal.fire("Atenção", "Informe o nome do serviço.", "warning");
      return;
    }

    if (form.priceVariations.length === 0) {
      Swal.fire("Atenção", "Adicione pelo menos uma variação de preço.", "warning");
      return;
    }

    try {
      setSaving(true);
      
      // Validate price variations before sending
      for (const pv of form.priceVariations) {
        if (!pv.diameter || pv.diameter <= 0) {
          Swal.fire("Atenção", `Variação com diâmetro inválido: ${pv.diameter}`, "warning");
          setSaving(false);
          return;
        }
        if (pv.price === undefined || pv.price < 0) {
          Swal.fire("Atenção", `Variação com preço inválido: ${pv.price}`, "warning");
          setSaving(false);
          return;
        }
        if (!pv.soilType || !["argiloso", "arenoso", "rochoso", "misturado", "outro"].includes(pv.soilType)) {
          Swal.fire("Atenção", `Variação com tipo de solo inválido: ${pv.soilType}`, "warning");
          setSaving(false);
          return;
        }
        if (!pv.access || !["livre", "limitado", "restrito"].includes(pv.access)) {
          Swal.fire("Atenção", `Variação com acesso inválido: ${pv.access}`, "warning");
          setSaving(false);
          return;
        }
      }

      // Upload new photos
      const newPhotoKeys: string[] = [];
      for (const photo of selectedPhotos) {
        const formData = new FormData();
        formData.append("file", photo);
        formData.append("category", "catalog");
        if (editingId) formData.append("id", editingId);

        const uploadRes = await apiFetch("/files/upload", {
          method: "POST",
          headers: {},
          body: formData as any
        });

        const uploadData = await uploadRes.json().catch(() => null);
        if (uploadRes.ok && uploadData?.data?.key) {
          newPhotoKeys.push(uploadData.data.key);
        }
      }

      // Combine existing and new photos
      const allPhotos = [...uploadedPhotoKeys, ...newPhotoKeys];

      // Ensure priceVariations are properly formatted (numbers, not strings)
      let formattedPriceVariations;
      try {
        formattedPriceVariations = form.priceVariations.map((pv) => {
          // Validate and convert each field
          const diameter = typeof pv.diameter === "string" ? parseInt(pv.diameter, 10) : Number(pv.diameter);
          const price = typeof pv.price === "string" ? parseFloat(pv.price) : Number(pv.price);
          
          // Set default values if missing
          const soilType = pv.soilType || "argiloso";
          const access = pv.access || "livre";
          
          // Validate required fields
          if (isNaN(diameter) || diameter <= 0) {
            throw new Error(`Diâmetro inválido: ${pv.diameter}`);
          }
          if (isNaN(price) || price < 0) {
            throw new Error(`Preço inválido: ${pv.price}`);
          }
          if (!["argiloso", "arenoso", "rochoso", "misturado", "outro"].includes(soilType)) {
            throw new Error(`Tipo de solo inválido: ${soilType}`);
          }
          if (!["livre", "limitado", "restrito"].includes(access)) {
            throw new Error(`Acesso inválido: ${access}`);
          }
          
          // Include executionTime if present
          const result: any = {
            diameter,
            soilType,
            access,
            price
          };
          
          if (pv.executionTime !== undefined && pv.executionTime !== null) {
            const executionTime = typeof pv.executionTime === "string" ? parseInt(pv.executionTime, 10) : Number(pv.executionTime);
            if (!isNaN(executionTime) && executionTime >= 0) {
              result.executionTime = executionTime;
            }
          }
          
          return result;
        });
      } catch (validationError: any) {
        Swal.fire("Atenção", validationError?.message || "Erro ao validar variações de preço.", "warning");
        setSaving(false);
        return;
      }

      const payload: any = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        category: form.category.trim() || undefined,
        active: form.active,
        priceVariations: formattedPriceVariations,
        photos: allPhotos.length > 0 ? allPhotos : undefined
      };

      const res = editingId
        ? await apiFetch(`/catalog/${editingId}`, {
            method: "PUT",
            body: JSON.stringify(payload)
          })
        : await apiFetch("/catalog", {
            method: "POST",
            body: JSON.stringify(payload)
          });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        console.error("Catalog save error:", data);
        const errorMessage = data?.error || "Não foi possível salvar item do catálogo.";
        const issues = data?.issues?.fieldErrors || data?.issues?.formErrors || [];
        const details = issues.length > 0 ? `\n\nDetalhes: ${JSON.stringify(issues, null, 2)}` : "";
        Swal.fire("Erro", errorMessage + details, "error");
        return;
      }

      Swal.fire(
        "Sucesso",
        editingId ? "Item atualizado com sucesso." : "Item criado com sucesso.",
        "success"
      );
      resetForm();
      loadItems();
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao salvar item do catálogo.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão",
      text: "Deseja realmente excluir este item do catálogo?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#6b7280",
      confirmButtonText: "Sim, excluir",
      cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      const res = await apiFetch(`/catalog/${id}`, {
        method: "DELETE"
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        Swal.fire("Erro", data?.error || "Não foi possível excluir item.", "error");
        return;
      }

      setItems((prev) => prev.filter((item) => item._id !== id));
      Swal.fire("Sucesso", "Item excluído com sucesso.", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Erro", "Falha ao excluir item.", "error");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400 mx-auto mb-2"></div>
          <p className="text-sm text-slate-300">Carregando catálogo...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-white">Catálogo de Serviços</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Gerencie os serviços oferecidos e suas variações de preço por diâmetro e tipo de solo
          </p>
        </div>
        {mode === "list" && (
          <button
            onClick={() => setMode("form")}
            className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition touch-manipulation active:scale-95"
          >
            + Novo Serviço
          </button>
        )}
      </div>

      {mode === "form" ? (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 p-3 sm:p-6">
          <div className="mb-4 sm:mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h2 className="text-base sm:text-lg font-semibold text-white">
              {editingId ? "Editar Serviço" : "Novo Serviço"}
            </h2>
            <button
              onClick={resetForm}
              className="w-full sm:w-auto px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-sm font-semibold hover:bg-white/10 transition touch-manipulation active:scale-95"
            >
              Cancelar
            </button>
          </div>

          <div className="space-y-3 sm:space-y-4">
            <div className="grid gap-3 sm:gap-4 sm:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Nome do Serviço <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-3 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                  placeholder="Ex: Estaca Broca"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Categoria</label>
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-3 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                  placeholder="Ex: Fundações"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Descrição</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
                className="w-full px-3 py-3 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                placeholder="Descrição do serviço..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Fotos</label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handlePhotoSelect}
                className="w-full px-3 py-3 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500/20 file:text-emerald-300 hover:file:bg-emerald-500/30 touch-manipulation"
              />
              <p className="mt-1 text-xs text-slate-500">Formatos aceitos: JPG, PNG (máx. 5MB cada)</p>

              {/* Display uploaded photos */}
              {uploadedPhotoKeys.length > 0 && (
                <PhotoGrid
                  photoKeys={uploadedPhotoKeys}
                  onRemove={(index) => removePhoto(index, true)}
                />
              )}

              {/* Display selected photos */}
              {selectedPhotos.length > 0 && (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Nova foto ${index + 1}`}
                        className="w-full h-20 sm:h-24 object-cover rounded-lg border border-emerald-500/50"
                      />
                      <button
                        onClick={() => removePhoto(index, false)}
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-xs opacity-70 sm:opacity-0 group-hover:opacity-100 transition touch-manipulation active:scale-95"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0 mb-3">
                <label className="block text-sm font-medium text-slate-300">
                  Variações de Preço <span className="text-red-400">*</span>
                </label>
                <button
                  onClick={addPriceVariation}
                  className="w-full sm:w-auto px-3 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition touch-manipulation active:scale-95"
                >
                  + Adicionar Variação
                </button>
              </div>

              {form.priceVariations.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4 border border-dashed border-white/10 rounded-lg">
                  Nenhuma variação de preço adicionada. Clique em "Adicionar Variação" para começar.
                </p>
              ) : (
                <div className="space-y-4">
                  {sortedDiameters.map((diameter) => {
                    const variations = groupedVariations[diameter];
                    return (
                      <div
                        key={diameter}
                        className="rounded-lg border border-white/10 bg-slate-900/30 overflow-hidden"
                      >
                        <div className="px-3 sm:px-4 py-2 sm:py-3 bg-slate-800/50 border-b border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                          <button
                            onClick={() => toggleDiameterGroup(diameter)}
                            className="flex items-center gap-2 hover:opacity-80 transition touch-manipulation"
                          >
                            <svg
                              className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-300 transition-transform duration-200 ${
                                expandedDiameters.has(diameter) ? "rotate-90" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                            <h4 className="font-semibold text-white text-xs sm:text-sm">
                              Diâmetro: {diameter} cm ({variations.length} {variations.length === 1 ? "variação" : "variações"})
                            </h4>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Expand the group if collapsed
                              if (!expandedDiameters.has(diameter)) {
                                setExpandedDiameters((prev) => new Set(prev).add(diameter));
                              }
                              setForm((f) => ({
                                ...f,
                                priceVariations: [
                                  ...f.priceVariations,
                                  { diameter, soilType: "argiloso", access: "livre", price: 0 }
                                ]
                              }));
                            }}
                            className="w-full sm:w-auto px-3 py-2 rounded-lg border border-emerald-500/50 bg-emerald-500/20 text-emerald-300 text-xs font-semibold hover:bg-emerald-500/30 transition touch-manipulation active:scale-95"
                          >
                            + Adicionar para {diameter}cm
                          </button>
                        </div>
                        {expandedDiameters.has(diameter) && (
                          <div className="p-3 sm:p-4 space-y-3">
                          {variations.map((variation) => {
                            const index = variation.originalIndex;
                            return (
                              <div
                                key={index}
                                className="p-3 rounded-lg border border-white/10 bg-slate-900/50 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"
                              >
                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Tipo de Solo
                                  </label>
                                  <select
                                    value={variation.soilType}
                                    onChange={(e) =>
                                      updatePriceVariation(index, "soilType", e.target.value as SoilType)
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                                  >
                                    {SOIL_TYPES.map((st) => (
                                      <option key={st.value} value={st.value}>
                                        {st.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Acesso para Máquina
                                  </label>
                                  <select
                                    value={variation.access}
                                    onChange={(e) =>
                                      updatePriceVariation(index, "access", e.target.value as MachineAccess)
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                                  >
                                    {ACCESS_TYPES.map((at) => (
                                      <option key={at.value} value={at.value}>
                                        {at.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Preço (R$)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    value={variation.price}
                                    onChange={(e) =>
                                      updatePriceVariation(index, "price", parseFloat(e.target.value) || 0)
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                                    placeholder="0.00"
                                  />
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-slate-400 mb-1">
                                    Tempo (min/metro)
                                  </label>
                                  <input
                                    type="number"
                                    step="1"
                                    min="0"
                                    value={variation.executionTime || ""}
                                    onChange={(e) =>
                                      updatePriceVariation(
                                        index,
                                        "executionTime",
                                        e.target.value ? parseInt(e.target.value, 10) : undefined
                                      )
                                    }
                                    className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
                                    placeholder="Ex: 10"
                                  />
                                </div>

                                <div className="flex items-end sm:col-span-2 lg:col-span-1">
                                  <button
                                    onClick={() => removePriceVariation(index)}
                                    className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition touch-manipulation active:scale-95"
                                  >
                                    Remover
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                className="w-4 h-4 rounded border-white/10 bg-slate-900/60 text-emerald-500 focus:ring-emerald-500/50"
              />
              <label htmlFor="active" className="text-sm text-slate-300">
                Serviço ativo
              </label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 disabled:opacity-50 transition touch-manipulation active:scale-95"
              >
                {saving ? "Salvando..." : editingId ? "Atualizar" : "Criar Serviço"}
              </button>
              <button
                onClick={resetForm}
                className="w-full sm:w-auto px-6 py-3 sm:py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 font-semibold hover:bg-white/10 transition touch-manipulation active:scale-95"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-slate-900/50 overflow-hidden">
          {/* Search Field */}
          <div className="p-3 sm:p-4 border-b border-white/10">
            <div className="relative">
              <input
                type="text"
                placeholder="Buscar por nome, descrição, categoria ou preço..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 sm:py-2 pl-10 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 touch-manipulation"
              />
              <svg
                className="absolute left-3 top-3 sm:top-2.5 w-5 h-5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute right-3 top-3 sm:top-2.5 text-slate-400 hover:text-white transition touch-manipulation active:scale-95"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {(() => {
            // Filter items based on search term
            const filteredItems = items.filter((item) => {
              if (!searchTerm.trim()) return true;
              
              const search = searchTerm.toLowerCase().trim();
              
              // Search in name
              if (item.name?.toLowerCase().includes(search)) return true;
              
              // Search in description
              if (item.description?.toLowerCase().includes(search)) return true;
              
              // Search in category
              if (item.category?.toLowerCase().includes(search)) return true;
              
              // Search in price variations
              const priceMatch = item.priceVariations?.some((pv) => {
                // Check if search term matches price (e.g., "17", "17.00", "R$ 17")
                const priceStr = pv.price.toString();
                const priceFormatted = pv.price.toFixed(2);
                if (priceStr.includes(search) || priceFormatted.includes(search)) return true;
                
                // Check if search term matches soil type
                const soilTypeLabel = SOIL_TYPES.find((st) => st.value === pv.soilType)?.label.toLowerCase();
                if (soilTypeLabel?.includes(search)) return true;
                
                // Check if search term matches access type
                const accessLabel = ACCESS_TYPES.find((at) => at.value === pv.access)?.label.toLowerCase();
                if (accessLabel?.includes(search)) return true;
                
                // Check if search term matches diameter
                if (pv.diameter.toString().includes(search)) return true;
                
                return false;
              });
              
              if (priceMatch) return true;
              
              return false;
            });

            if (items.length === 0) {
              return (
                <div className="p-6 sm:p-8 text-center">
                  <p className="text-sm text-slate-300">Nenhum serviço cadastrado.</p>
                </div>
              );
            }

            if (filteredItems.length === 0) {
              return (
                <div className="p-6 sm:p-8 text-center">
                  <p className="text-sm text-slate-300">
                    Nenhum serviço encontrado para "{searchTerm}".
                  </p>
                </div>
              );
            }

            return (
              <div className="divide-y divide-white/10">
                {filteredItems.map((item) => {
                  const serviceId = item._id?.toString() || "";
                  const isExpanded = expandedServices.has(serviceId);
                  
                  // Group price variations by diameter for summary
                  const grouped = (item.priceVariations || []).reduce((acc, pv) => {
                    const diameter = pv.diameter;
                    if (!acc[diameter]) {
                      acc[diameter] = [];
                    }
                    acc[diameter].push(pv);
                    return acc;
                  }, {} as Record<number, typeof item.priceVariations>);
                  
                  const sortedDiameters = Object.keys(grouped)
                    .map(Number)
                    .sort((a, b) => a - b);
                  
                  const totalVariations = item.priceVariations?.length || 0;
                  
                  return (
                    <div
                      key={serviceId}
                      className="p-3 sm:p-4 hover:bg-slate-800/30 transition"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2 sm:gap-3">
                            <button
                              onClick={() => toggleService(serviceId)}
                              className="flex-shrink-0 mt-0.5 hover:opacity-80 transition touch-manipulation"
                            >
                              <svg
                                className={`w-4 sm:w-5 h-4 sm:h-5 text-slate-400 transition-transform duration-200 ${
                                  isExpanded ? "rotate-90" : ""
                                }`}
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-2">
                                <h3 className="font-semibold text-white text-sm sm:text-base break-words">{item.name}</h3>
                                {item.category && (
                                  <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-slate-500/20 text-slate-300 border border-slate-500/50">
                                    {item.category}
                                  </span>
                                )}
                                {!item.active && (
                                  <span className="px-2 py-0.5 rounded text-[10px] sm:text-xs font-semibold bg-red-500/20 text-red-300 border border-red-500/50">
                                    Inativo
                                  </span>
                                )}
                              </div>
                              {item.description && (
                                <p className="text-xs sm:text-sm text-slate-400 mb-3 break-words">{item.description}</p>
                              )}

                              {!isExpanded ? (
                                <div className="mt-3">
                                  <div className="text-xs sm:text-sm text-slate-400">
                                    <span className="font-medium text-slate-300">{totalVariations}</span> variação{totalVariations !== 1 ? "ões" : ""} de preço
                                    {sortedDiameters.length > 0 && (
                                      <span className="ml-2">
                                        · Diâmetros: {sortedDiameters.join("cm, ")}cm
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="mt-3">
                                  <p className="text-xs font-medium text-slate-400 mb-2">
                                    Variações de Preço:
                                  </p>
                                  <div className="space-y-3">
                                    {sortedDiameters.map((diameter) => {
                                      const variations = grouped[diameter];
                                      return (
                                        <div
                                          key={diameter}
                                          className="rounded-lg border border-white/10 bg-slate-900/30 overflow-hidden"
                                        >
                                          <div className="px-3 py-2 bg-slate-800/50 border-b border-white/10">
                                            <h4 className="font-semibold text-white text-xs sm:text-sm">
                                              Diâmetro: {diameter} cm ({variations.length} {variations.length === 1 ? "variação" : "variações"})
                                            </h4>
                                          </div>
                                          <div className="p-2 sm:p-3 grid gap-2 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                                            {variations.map((pv, idx) => (
                                              <div
                                                key={idx}
                                                className="px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-xs sm:text-sm space-y-2"
                                              >
                                                <div className="text-slate-300">
                                                  <div className="font-medium text-white break-words">
                                                    {SOIL_TYPES.find((st) => st.value === pv.soilType)?.label}
                                                  </div>
                                                  <div className="text-[10px] sm:text-xs text-slate-400 mt-1 break-words">
                                                    {ACCESS_TYPES.find((at) => at.value === pv.access)?.label}
                                                  </div>
                                                </div>
                                                <div className="font-semibold text-emerald-300 text-sm sm:text-base">
                                                  R$ {pv.price.toFixed(2)}/m
                                                </div>
                                                {pv.executionTime ? (
                                                  <div className="flex items-center gap-1.5 text-[10px] sm:text-xs text-blue-300 bg-blue-500/10 px-2 py-1 rounded">
                                                    <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                    </svg>
                                                    <span className="font-medium">{pv.executionTime} min/metro</span>
                                                  </div>
                                                ) : (
                                                  <div className="text-[10px] sm:text-xs text-slate-500 italic">
                                                    Tempo não definido
                                                  </div>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                      <div className="flex flex-col sm:flex-row gap-2 sm:ml-4 w-full sm:w-auto">
                        <button
                          onClick={() => handleEdit(item)}
                          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 text-sm font-semibold hover:bg-white/10 transition touch-manipulation active:scale-95"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDelete(item._id?.toString() || "")}
                          className="w-full sm:w-auto px-3 py-2 rounded-lg border border-red-500/50 bg-red-500/10 text-red-300 text-sm font-semibold hover:bg-red-500/20 transition touch-manipulation active:scale-95"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}

