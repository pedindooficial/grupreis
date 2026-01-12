import React from "react";
import Swal from "sweetalert2";
import { apiFetch } from "@/lib/api-client";

interface NFEUploadProps {
  nfeFileKey: string;
  nfeFile: File | null;
  onFileChange: (file: File | null) => void;
  onFileKeyChange: (key: string) => void;
}

export default function NFEUpload({
  nfeFileKey,
  nfeFile,
  onFileChange,
  onFileKeyChange
}: NFEUploadProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      Swal.fire("Erro", "O arquivo é muito grande. Tamanho máximo: 50MB", "error");
      e.target.value = ""; // Clear input
      return;
    }

    // Validate file type
    if (file.type !== "application/pdf") {
      Swal.fire("Erro", "Apenas arquivos PDF são aceitos", "error");
      e.target.value = ""; // Clear input
      return;
    }

    // Store file in form state (will be uploaded when saving)
    onFileChange(file);
  };

  const handleViewFile = async () => {
    try {
      const res = await apiFetch("/files/presigned-url", {
        method: "POST",
        body: JSON.stringify({ key: nfeFileKey })
      });
      const data = await res.json();
      if (res.ok && data?.data?.url) {
        window.open(data.data.url, "_blank");
      } else {
        Swal.fire("Erro", "Não foi possível visualizar o arquivo", "error");
      }
    } catch (err) {
      console.error("Error viewing file:", err);
      Swal.fire("Erro", "Não foi possível visualizar o arquivo", "error");
    }
  };

  const handleRemoveFile = async () => {
    // If file is already uploaded to S3, delete it from bucket
    if (nfeFileKey) {
      try {
        // URL encode the key for the DELETE endpoint
        const encodedKey = encodeURIComponent(nfeFileKey);
        const deleteRes = await apiFetch(`/files/${encodedKey}`, {
          method: "DELETE"
        });

        if (!deleteRes.ok) {
          const errorData = await deleteRes.json().catch(() => null);
          const errorMessage = errorData?.error || "Falha ao excluir arquivo do servidor";
          Swal.fire("Aviso", errorMessage, "warning");
          // Continue to remove from form even if S3 deletion fails
        }
      } catch (err) {
        console.error("Error deleting file from S3:", err);
        Swal.fire("Aviso", "Falha ao excluir arquivo do servidor, mas foi removido do formulário.", "warning");
        // Continue to remove from form even if S3 deletion fails
      }
    }

    // Remove from form state
    onFileChange(null);
    onFileKeyChange("");
    // Clear file input
    const fileInput = document.querySelector('input[type="file"][accept=".pdf"]') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return (
    <div className="rounded-xl border border-purple-400/30 bg-purple-500/5 p-4 space-y-3">
      <h4 className="text-sm font-semibold text-purple-200">📄 Nota Fiscal Eletrônica (NFE)</h4>
      <div className="space-y-2">
        <label className="block text-sm text-slate-200">
          Arquivo NFE (PDF)
          <span className="text-slate-400 text-xs font-normal ml-1">(opcional)</span>
        </label>
        <input
          type="file"
          accept=".pdf"
          onChange={handleFileChange}
          className="w-full rounded-lg border border-white/10 bg-slate-900/60 px-3 py-2 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-purple-400/60 focus:ring-purple-500/40 file:mr-4 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30"
        />
        {(nfeFile || nfeFileKey) && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-500/20 border border-purple-400/30">
            <svg className="w-4 h-4 text-purple-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span className="text-xs text-purple-200">
              {nfeFile ? nfeFile.name : "NFE anexada"}
              {nfeFile && !nfeFileKey && " (será enviado ao salvar)"}
            </span>
            {nfeFileKey && (
              <button
                type="button"
                onClick={handleViewFile}
                className="ml-auto text-xs text-purple-300 hover:text-purple-200 underline"
              >
                Visualizar
              </button>
            )}
            <button
              type="button"
              onClick={handleRemoveFile}
              className="text-xs text-red-300 hover:text-red-200"
            >
              Remover
            </button>
          </div>
        )}
        <p className="text-xs text-slate-400">O arquivo NFE será disponibilizado para o cliente no website.</p>
      </div>
    </div>
  );
}

