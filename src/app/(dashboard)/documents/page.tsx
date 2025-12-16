export default function DocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-white">
          Documentos e Contratos
        </h1>
        <p className="text-sm text-slate-300">
          Upload, versionamento e status de assinatura. Listaremos os arquivos
          do banco assim que as rotas de API estiverem conectadas ao storage.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-slate-200 shadow-inner shadow-black/20">
        <div className="font-semibold text-white">Arquivos</div>
        <p className="mt-2 text-slate-300">
          Em breve: lista de contratos/documentos por cliente/OS, com status de
          assinatura e links de download.
        </p>
      </div>
    </div>
  );
}

