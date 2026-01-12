import { useEffect, useState, useMemo } from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

interface SocialMediaItem {
  _id?: string;
  type: "image" | "video";
  url: string;
  title: string;
  description?: string;
  order: number;
  active: boolean;
  clientUpload?: boolean;
  approved?: boolean;
  clientName?: string;
  clientEmail?: string;
  createdAt?: string;
  updatedAt?: string;
}

const S3_BASE_URL = import.meta.env.VITE_S3_BASE_URL || "https://reisfundacoes.s3.sa-east-1.amazonaws.com/";

export default function SocialPage() {
  const [mode, setMode] = useState<"list" | "form">("list");
  const [items, setItems] = useState<SocialMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "image" | "video">("all");
  const [activeFilter, setActiveFilter] = useState<"all" | "active" | "inactive">("all");
  const [uploadMode, setUploadMode] = useState<"upload" | "url">("upload");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [pendingUploads, setPendingUploads] = useState<SocialMediaItem[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);

  const [form, setForm] = useState({
    type: "image" as "image" | "video",
    url: "",
    title: "",
    description: "",
    order: 0,
    active: true
  });

  useEffect(() => {
    loadData();
    loadPendingUploads();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await apiFetch("/social-media", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setItems(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Error loading social media:", err);
      Swal.fire("Erro", "Falha ao carregar mídias sociais", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadPendingUploads = async () => {
    try {
      setLoadingPending(true);
      const res = await apiFetch("/social-media/pending", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setPendingUploads(Array.isArray(data.data) ? data.data : []);
      }
    } catch (err) {
      console.error("Error loading pending uploads:", err);
    } finally {
      setLoadingPending(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await apiFetch(`/social-media/${id}/approve`, {
        method: "POST"
      });
      if (res.ok) {
        Swal.fire("Sucesso", "Upload aprovado com sucesso!", "success");
        loadData();
        loadPendingUploads();
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Falha ao aprovar");
      }
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao aprovar upload", "error");
    }
  };

  const handleReject = async (id: string, title: string) => {
    const result = await Swal.fire({
      title: "Rejeitar Upload?",
      html: `
        <div class="text-left">
          <p class="mb-4 text-slate-300">Tem certeza que deseja rejeitar este upload?</p>
          <p class="text-sm text-slate-400 mb-2"><strong>Título:</strong> ${title}</p>
          <p class="text-sm text-red-300">⚠️ O arquivo será removido do S3 e o registro será deletado permanentemente.</p>
        </div>
      `,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Sim, rejeitar",
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
        const res = await apiFetch(`/social-media/${id}/reject`, {
          method: "POST"
        });
        if (res.ok) {
          Swal.fire("Sucesso", "Upload rejeitado e removido", "success");
          loadPendingUploads();
        } else {
          const errorData = await res.json().catch(() => null);
          throw new Error(errorData?.error || "Falha ao rejeitar");
        }
      } catch (err: any) {
        Swal.fire("Erro", err.message || "Falha ao rejeitar upload", "error");
      }
    }
  };

  // Get pending uploads from items list (in case they're not loaded separately)
  const pendingFromItems = useMemo(() => {
    return items.filter((item) => item.clientUpload && !item.approved);
  }, [items]);

  // Combine pending uploads from both sources
  const allPendingUploads = useMemo(() => {
    const pendingIds = new Set(pendingUploads.map((p) => p._id));
    const combined = [...pendingUploads];
    
    // Add any pending items from main list that aren't already in pending list
    pendingFromItems.forEach((item) => {
      if (item._id && !pendingIds.has(item._id)) {
        combined.push(item);
      }
    });
    
    return combined;
  }, [pendingUploads, pendingFromItems]);

  // Get sorted items for reordering logic
  const sortedItems = useMemo(() => {
    return [...items].sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      // If same order, use createdAt as tiebreaker
      const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bDate - aDate; // Newer first
    });
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Exclude pending client uploads from main list (they appear in pending section)
      if (item.clientUpload && !item.approved) {
        return false;
      }
      
      const matchesSearch =
        !search ||
        item.title?.toLowerCase().includes(search.toLowerCase()) ||
        item.description?.toLowerCase().includes(search.toLowerCase()) ||
        item.url?.toLowerCase().includes(search.toLowerCase());
      const matchesType = typeFilter === "all" || item.type === typeFilter;
      const matchesActive =
        activeFilter === "all" ||
        (activeFilter === "active" && item.active) ||
        (activeFilter === "inactive" && !item.active);
      return matchesSearch && matchesType && matchesActive;
    });
  }, [items, search, typeFilter, activeFilter]);

  // Helper to check if item can move up/down
  const canMoveUp = (itemId: string | undefined) => {
    if (!itemId) return false;
    const currentIndex = sortedItems.findIndex((item) => item._id === itemId);
    return currentIndex > 0;
  };

  const canMoveDown = (itemId: string | undefined) => {
    if (!itemId) return false;
    const currentIndex = sortedItems.findIndex((item) => item._id === itemId);
    return currentIndex >= 0 && currentIndex < sortedItems.length - 1;
  };

  const resetForm = () => {
    setForm({
      type: "image",
      url: "",
      title: "",
      description: "",
      order: 0,
      active: true
    });
    setEditingId(null);
    setSelectedFile(null);
    setUploadMode("upload");
    setUploadProgress(0);
  };

  const handleEdit = (item: SocialMediaItem) => {
    setForm({
      type: item.type,
      url: item.url,
      title: item.title,
      description: item.description || "",
      order: item.order,
      active: item.active
    });
    setEditingId(item._id || null);
    setSelectedFile(null);
    setUploadMode(item.url.startsWith("http") ? "url" : "upload");
    setMode("form");
  };

  const handleDelete = async (id: string) => {
    const result = await Swal.fire({
      title: "Confirmar exclusão",
      text: "Tem certeza que deseja excluir este item?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#ef4444",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Excluir",
      cancelButtonText: "Cancelar"
    });

    if (result.isConfirmed) {
      try {
        const res = await apiFetch(`/social-media/${id}`, {
          method: "DELETE"
        });
        if (res.ok) {
          Swal.fire("Sucesso", "Item excluído com sucesso", "success");
          loadData();
        } else {
          throw new Error("Falha ao excluir");
        }
      } catch (err) {
        Swal.fire("Erro", "Falha ao excluir item", "error");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      Swal.fire("Erro", "O arquivo é muito grande. Tamanho máximo: 50MB", "error");
      return;
    }

    // Validate file type
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    
    if (!isImage && !isVideo) {
      Swal.fire("Erro", "Tipo de arquivo não permitido. Use imagens (JPG, PNG, etc.) ou vídeos (MP4, etc.)", "error");
      return;
    }

    // Auto-set type based on file
    if (isImage && form.type !== "image") {
      setForm({ ...form, type: "image" });
    } else if (isVideo && form.type !== "video") {
      setForm({ ...form, type: "video" });
    }

    setSelectedFile(file);
    setUploadMode("upload");
  };

  const extractYouTubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const extractVimeoId = (url: string): string | null => {
    const match = url.match(/(?:vimeo\.com\/)(\d+)/);
    return match ? match[1] : null;
  };

  const getEmbedUrl = (url: string, type: "image" | "video"): string => {
    if (type === "video") {
      const youtubeId = extractYouTubeId(url);
      if (youtubeId) {
        return `https://www.youtube.com/embed/${youtubeId}`;
      }
      const vimeoId = extractVimeoId(url);
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    }
    return url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.title.trim()) {
      Swal.fire("Atenção", "Preencha o título", "warning");
      return;
    }

    if (uploadMode === "upload" && !selectedFile && !editingId) {
      Swal.fire("Atenção", "Selecione um arquivo para upload ou use uma URL externa", "warning");
      return;
    }

    if (uploadMode === "url" && !form.url.trim()) {
      Swal.fire("Atenção", "Preencha a URL", "warning");
      return;
    }

    setSaving(true);
    setUploading(uploadMode === "upload" && !!selectedFile);

    try {
      let finalUrl = form.url;

      // Upload file if in upload mode and file is selected
      if (uploadMode === "upload" && selectedFile) {
        setUploadProgress(10);
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("category", form.type === "image" ? "fotos" : "videos");
        if (editingId) formData.append("id", editingId);

        setUploadProgress(30);
        const uploadRes = await apiFetch("/files/upload-social", {
          method: "POST",
          headers: {},
          body: formData as any
        });

        setUploadProgress(60);
        const uploadData = await uploadRes.json().catch(() => null);
        
        if (!uploadRes.ok || !uploadData?.data?.key) {
          throw new Error("Falha ao fazer upload do arquivo");
        }

        finalUrl = uploadData.data.key; // Use the S3 key as the URL
        setUploadProgress(90);
      } else if (uploadMode === "url" && form.url.trim()) {
        // For external URLs, use as-is
        finalUrl = form.url.trim();
      } else if (editingId) {
        // Keep existing URL when editing without changing file/URL
        const existingItem = items.find((i) => i._id === editingId);
        if (existingItem) {
          finalUrl = existingItem.url;
        }
      }

      const url = editingId ? `/social-media/${editingId}` : "/social-media";
      const method = editingId ? "PUT" : "POST";

      setUploadProgress(95);
      const res = await apiFetch(url, {
        method,
        body: JSON.stringify({ ...form, url: finalUrl })
      });

      if (res.ok) {
        setUploadProgress(100);
        Swal.fire("Sucesso", editingId ? "Item atualizado com sucesso" : "Item criado com sucesso", "success");
        resetForm();
        setMode("list");
        loadData();
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Falha ao salvar");
      }
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao salvar item", "error");
    } finally {
      setSaving(false);
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleToggleActive = async (item: SocialMediaItem) => {
    try {
      // If it's a client upload and we're activating it, also approve it
      const updateData: any = { active: !item.active };
      if (item.clientUpload && !item.active && !item.approved) {
        // Activating a pending client upload - approve it automatically
        updateData.approved = true;
      }
      
      const res = await apiFetch(`/social-media/${item._id}`, {
        method: "PUT",
        body: JSON.stringify(updateData)
      });
      if (res.ok) {
        loadData();
        loadPendingUploads(); // Refresh pending list if it was a client upload
      }
    } catch (err) {
      Swal.fire("Erro", "Falha ao atualizar status", "error");
    }
  };

  const handleReorder = async (itemId: string, direction: "up" | "down") => {
    try {
      const currentItem = items.find((item) => item._id === itemId);
      if (!currentItem) return;

      const currentIndex = sortedItems.findIndex((item) => item._id === itemId);
      if (currentIndex === -1) return;

      // Find adjacent item
      let targetIndex: number;
      if (direction === "up") {
        targetIndex = currentIndex - 1;
        if (targetIndex < 0) return; // Already at top
      } else {
        targetIndex = currentIndex + 1;
        if (targetIndex >= sortedItems.length) return; // Already at bottom
      }

      const targetItem = sortedItems[targetIndex];
      if (!targetItem._id) return;

      // Swap orders
      const tempOrder = currentItem.order;
      const newCurrentOrder = targetItem.order;
      const newTargetOrder = tempOrder;

      // Update both items using bulk reorder endpoint
      const reorderItems = [
        { _id: itemId, order: newCurrentOrder },
        { _id: targetItem._id, order: newTargetOrder }
      ];

      const res = await apiFetch("/social-media/reorder", {
        method: "POST",
        body: JSON.stringify({ items: reorderItems })
      });

      if (res.ok) {
        loadData();
      } else {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.error || "Falha ao reordenar");
      }
    } catch (err: any) {
      Swal.fire("Erro", err.message || "Falha ao reordenar", "error");
    }
  };

  const getMediaUrl = (url: string) => {
    if (url.startsWith("http")) return url;
    return `${S3_BASE_URL}${url}`;
  };

  const getDisplayUrl = (item: SocialMediaItem) => {
    if (item.url.startsWith("http")) return item.url;
    return `${S3_BASE_URL}${item.url}`;
  };

  const getEmbedUrlForItem = (item: SocialMediaItem): string | null => {
    if (item.type === "video") {
      const youtubeId = extractYouTubeId(item.url);
      if (youtubeId) {
        return `https://www.youtube.com/embed/${youtubeId}`;
      }
      const vimeoId = extractVimeoId(item.url);
      if (vimeoId) {
        return `https://player.vimeo.com/video/${vimeoId}`;
      }
    }
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-slate-400">Carregando...</div>
      </div>
    );
  }

  if (mode === "form") {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-semibold text-white">
              {editingId ? "Editar Mídia Social" : "Nova Mídia Social"}
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1">
              {editingId ? "Atualize as informações da mídia" : "Adicione uma nova foto ou vídeo"}
            </p>
          </div>
          <button
            onClick={() => {
              resetForm();
              setMode("list");
            }}
            className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-white hover:bg-white/10 transition"
          >
            Voltar
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Tipo <span className="text-red-400">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => setForm({ ...form, type: e.target.value as "image" | "video" })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              >
                <option value="image">Imagem</option>
                <option value="video">Vídeo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Fonte da Mídia <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("upload");
                    setSelectedFile(null);
                    setForm({ ...form, url: form.url || "" });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border font-semibold transition ${
                    uploadMode === "upload"
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  📤 Upload (até 50MB)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUploadMode("url");
                    setSelectedFile(null);
                    setForm({ ...form, url: form.url || "" });
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg border font-semibold transition ${
                    uploadMode === "url"
                      ? "border-emerald-500/50 bg-emerald-500/20 text-emerald-300"
                      : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  🔗 URL Externa
                </button>
              </div>

              {uploadMode === "upload" ? (
                <div className="space-y-2">
                  <input
                    type="file"
                    accept={form.type === "image" ? "image/*" : "video/*"}
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-emerald-500 file:text-white hover:file:bg-emerald-600 file:cursor-pointer"
                  />
                  {selectedFile && (
                    <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                      <p className="text-sm text-emerald-300">
                        <span className="font-semibold">Arquivo selecionado:</span> {selectedFile.name}
                      </p>
                      <p className="text-xs text-emerald-200/70 mt-1">
                        Tamanho: {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                    </div>
                  )}
                  {uploading && (
                    <div className="space-y-2">
                      <div className="w-full bg-slate-800 rounded-full h-2">
                        <div
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400 text-center">Fazendo upload... {uploadProgress}%</p>
                    </div>
                  )}
                  <p className="text-xs text-slate-400">
                    {form.type === "image"
                      ? "Formatos suportados: JPG, PNG, GIF, WebP (máx. 50MB)"
                      : "Formatos suportados: MP4, WebM, MOV (máx. 50MB)"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={form.url || ""}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder={
                      form.type === "image"
                        ? "Ex: https://example.com/image.jpg ou fotos/dergel.jpg"
                        : "Ex: https://youtube.com/watch?v=... ou https://vimeo.com/123456 ou videos/demo.mp4"
                    }
                    className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    required={uploadMode === "url"}
                  />
                  <p className="text-xs text-slate-400">
                    {form.type === "image"
                      ? "URL completa da imagem ou caminho no S3 (ex: fotos/dergel.jpg)"
                      : "URL do YouTube, Vimeo, ou caminho no S3 (ex: videos/demo.mp4). YouTube e Vimeo serão convertidos automaticamente para embed."}
                  </p>
                  {form.url && (extractYouTubeId(form.url) || extractVimeoId(form.url)) && (
                    <div className="p-3 rounded-lg border border-blue-500/30 bg-blue-500/10">
                      <p className="text-xs text-blue-300">
                        ✓ {extractYouTubeId(form.url) ? "YouTube" : "Vimeo"} detectado. Será exibido como player incorporado.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={form.title || ""}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="Ex: Perfuração"
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição
              </label>
              <textarea
                value={form.description || ""}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Ex: Nossa maquina SD 400 é a ferramenta certa para suas fundações!"
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Ordem
              </label>
              <input
                type="number"
                value={form.order ?? 0}
                onChange={(e) => setForm({ ...form, order: parseInt(e.target.value) || 0 })}
                className="w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                min="0"
              />
              <p className="text-xs text-slate-400 mt-1">
                Use para ordenar os itens (menor número aparece primeiro)
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="active"
                checked={form.active}
                onChange={(e) => setForm({ ...form, active: e.target.checked })}
                className="w-4 h-4 rounded border-white/10 bg-slate-900/50 text-emerald-500 focus:ring-2 focus:ring-emerald-500/50"
              />
              <label htmlFor="active" className="text-sm text-slate-300">
                Ativo (visível no site público)
              </label>
            </div>

            {form.url && (
              <div className="mt-4 p-4 rounded-lg border border-white/10 bg-slate-900/30">
                <p className="text-xs text-slate-400 mb-2">Preview:</p>
                {form.type === "image" ? (
                  <img
                    src={getMediaUrl(form.url)}
                    alt={form.title}
                    className="max-w-full h-auto rounded-lg border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                ) : (
                  <video
                    src={getMediaUrl(form.url)}
                    controls
                    className="max-w-full h-auto rounded-lg border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLVideoElement).style.display = "none";
                    }}
                  />
                )}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving || uploading}
              className="flex-1 sm:flex-none px-6 py-3 sm:py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading
                ? `Enviando... ${uploadProgress}%`
                : saving
                ? "Salvando..."
                : editingId
                ? "Atualizar"
                : "Criar"}
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setMode("list");
              }}
              className="px-6 py-3 sm:py-2 rounded-lg border border-white/15 bg-white/5 text-slate-200 font-semibold hover:bg-white/10 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-white">Mídias Sociais</h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            Gerencie fotos e vídeos exibidos no site público
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setMode("form");
          }}
          className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-lg bg-emerald-500 text-white font-semibold hover:bg-emerald-600 transition touch-manipulation active:scale-95"
        >
          + Nova Mídia
        </button>
      </div>

      {/* Pending Client Uploads Section */}
      {allPendingUploads.length > 0 && (
        <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center gap-2">
                <span>⏳</span>
                <span>Uploads Pendentes de Aprovação</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 mt-1">
                {allPendingUploads.length} {allPendingUploads.length === 1 ? "upload aguardando" : "uploads aguardando"} revisão
              </p>
            </div>
            <button
              onClick={loadPendingUploads}
              disabled={loadingPending}
              className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white text-sm font-semibold hover:bg-white/10 transition disabled:opacity-50"
            >
              {loadingPending ? "Atualizando..." : "🔄 Atualizar"}
            </button>
          </div>

          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {allPendingUploads.map((item) => (
              <div
                key={item._id}
                className="rounded-xl border border-orange-500/30 bg-slate-900/50 p-4 space-y-3"
              >
                <div className="relative">
                  {item.type === "image" ? (
                    <img
                      src={getDisplayUrl(item)}
                      alt={item.title}
                      className="w-full h-48 object-cover rounded-lg border border-white/10"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3EImagem não encontrada%3C/text%3E%3C/svg%3E";
                      }}
                    />
                  ) : (
                    <video
                      src={getDisplayUrl(item)}
                      className="w-full h-48 object-cover rounded-lg border border-white/10"
                      controls
                      onError={(e) => {
                        (e.target as HTMLVideoElement).style.display = "none";
                      }}
                    />
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 rounded text-xs font-semibold bg-orange-500/20 text-orange-300 border border-orange-500/50">
                      Pendente
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-base font-semibold text-white break-words">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="text-xs text-slate-300 line-clamp-2">
                      {item.description}
                    </p>
                  )}
                  {(item.clientName || item.clientEmail) && (
                    <div className="text-xs text-slate-400 space-y-1">
                      {item.clientName && (
                        <p><strong>Cliente:</strong> {item.clientName}</p>
                      )}
                      {item.clientEmail && (
                        <p><strong>Email:</strong> {item.clientEmail}</p>
                      )}
                    </div>
                  )}
                  {item.createdAt && (
                    <p className="text-xs text-slate-500">
                      Enviado em: {new Date(item.createdAt).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </p>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/10">
                  <button
                    onClick={() => item._id && handleApprove(item._id)}
                    className="flex-1 px-3 py-2 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-sm font-semibold hover:bg-emerald-500/30 transition"
                  >
                    ✓ Aprovar
                  </button>
                  <button
                    onClick={() => item._id && handleReject(item._id, item.title)}
                    className="flex-1 px-3 py-2 rounded-lg bg-red-500/20 border border-red-500/50 text-red-300 text-sm font-semibold hover:bg-red-500/30 transition"
                  >
                    ✗ Rejeitar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou descrição..."
              className="w-full px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as "all" | "image" | "video")}
              className="flex-1 sm:flex-none min-w-[120px] px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Todos os tipos</option>
              <option value="image">Imagens</option>
              <option value="video">Vídeos</option>
            </select>
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value as "all" | "active" | "inactive")}
              className="flex-1 sm:flex-none min-w-[120px] px-3 py-2.5 sm:py-2 rounded-lg border border-white/10 bg-slate-900/50 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="all">Todos</option>
              <option value="active">Ativos</option>
              <option value="inactive">Inativos</option>
            </select>
          </div>
        </div>
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-12 text-center">
          <p className="text-sm text-slate-300">
            {search || typeFilter !== "all" || activeFilter !== "all"
              ? "Nenhum item encontrado com os filtros aplicados."
              : "Nenhuma mídia cadastrada. Clique em 'Nova Mídia' para começar."}
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item._id}
              className="rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 space-y-3 sm:space-y-4"
            >
              <div className="relative">
                {item.type === "image" ? (
                  <img
                    src={getDisplayUrl(item)}
                    alt={item.title}
                    className="w-full h-48 object-cover rounded-lg border border-white/10"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23334155' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='14'%3EImagem não encontrada%3C/text%3E%3C/svg%3E";
                    }}
                  />
                ) : (
                  (() => {
                    const embedUrl = getEmbedUrlForItem(item);
                    return embedUrl ? (
                      <div className="w-full h-48 rounded-lg border border-white/10 overflow-hidden bg-slate-900">
                        <iframe
                          src={embedUrl}
                          className="w-full h-full"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                        />
                      </div>
                    ) : (
                      <video
                        src={getDisplayUrl(item)}
                        className="w-full h-48 object-cover rounded-lg border border-white/10"
                        controls
                        onError={(e) => {
                          (e.target as HTMLVideoElement).style.display = "none";
                        }}
                      />
                    );
                  })()
                )}
                <div className="absolute top-2 right-2">
                  <span
                    className={`px-2 py-1 rounded text-xs font-semibold ${
                      item.active
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/50"
                        : "bg-slate-500/20 text-slate-300 border border-slate-500/50"
                    }`}
                  >
                    {item.active ? "Ativo" : "Inativo"}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h3 className="text-base sm:text-lg font-semibold text-white break-words">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-xs sm:text-sm text-slate-300 line-clamp-2">
                    {item.description}
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span className={`px-2 py-0.5 rounded ${
                    item.type === "image"
                      ? "bg-blue-500/20 text-blue-300 border border-blue-500/50"
                      : "bg-purple-500/20 text-purple-300 border border-purple-500/50"
                  }`}>
                    {item.type === "image" ? "📷 Imagem" : "🎥 Vídeo"}
                  </span>
                  <span>Ordem: {item.order}</span>
                </div>
                <p className="text-xs text-slate-500 font-mono truncate">{item.url}</p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-white/10">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 px-3 py-2 rounded-lg border border-blue-400/40 bg-blue-500/10 text-blue-100 text-sm font-semibold hover:bg-blue-500/20 transition"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleActive(item)}
                  className={`flex-1 px-3 py-2 rounded-lg border text-sm font-semibold transition ${
                    item.active
                      ? "border-yellow-400/40 bg-yellow-500/10 text-yellow-100 hover:bg-yellow-500/20"
                      : "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20"
                  }`}
                >
                  {item.active ? "Desativar" : "Ativar"}
                </button>
                <button
                  onClick={() => item._id && handleDelete(item._id)}
                  className="px-3 py-2 rounded-lg border border-red-400/40 bg-red-500/10 text-red-100 text-sm font-semibold hover:bg-red-500/20 transition"
                >
                  Excluir
                </button>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400">
                <button
                  onClick={() => item._id && handleReorder(item._id, "up")}
                  className="px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canMoveUp(item._id)}
                  title="Mover para cima"
                >
                  ↑
                </button>
                <button
                  onClick={() => item._id && handleReorder(item._id, "down")}
                  className="px-2 py-1 rounded border border-white/10 bg-white/5 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!canMoveDown(item._id)}
                  title="Mover para baixo"
                >
                  ↓
                </button>
                <span className="ml-auto">Ordem: {item.order}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

