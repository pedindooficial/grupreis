
interface LoginScreenProps {
  password: string;
  setPassword: (password: string) => void;
  showPass: boolean;
  setShowPass: (show: boolean | ((prev: boolean) => boolean)) => void;
  authLoading: boolean;
  onLogin: () => void;
}

export default function LoginScreen({
  password,
  setPassword,
  showPass,
  setShowPass,
  authLoading,
  onLogin
}: LoginScreenProps) {
  return (
    <div
      className="relative min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12 text-slate-100"
      style={{
        background:
          "radial-gradient(circle at 20% 20%, rgba(16,185,129,0.07), transparent 35%), radial-gradient(circle at 80% 0%, rgba(59,130,246,0.06), transparent 30%), #020617"
      }}
    >
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 -top-40 h-72 w-72 rounded-full bg-emerald-500/20 blur-[110px]" />
        <div className="absolute bottom-10 right-0 h-72 w-72 rounded-full bg-blue-500/15 blur-[120px]" />
      </div>
      <div className="relative mx-auto flex max-w-lg flex-col gap-4 sm:gap-6 rounded-2xl sm:rounded-3xl border border-white/10 bg-slate-900/70 p-4 sm:p-8 shadow-2xl shadow-emerald-500/10 backdrop-blur">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl sm:rounded-2xl bg-emerald-500/15 ring-1 ring-emerald-400/40 flex-shrink-0">
            <img
              src="/logoreis.png"
              alt="Reis Fundações"
              className="h-[36px] w-[36px] sm:h-[42px] sm:w-[42px] rounded-lg object-contain"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] sm:text-[11px] uppercase tracking-[0.18em] text-emerald-200">
              Painel da equipe
            </div>
            <div className="text-xl sm:text-2xl font-semibold text-white">Acessar operação</div>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 break-words">
              Digite a senha fornecida pelo administrador para abrir as ordens de serviço desta equipe.
            </p>
          </div>
        </div>

        <div className="grid gap-3 rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 p-4 sm:p-5 shadow-inner shadow-black/40">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-300">
            Senha de acesso
          </label>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <input
              type={showPass ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onLogin()}
              className="w-full rounded-xl border border-white/10 bg-slate-900/80 px-3 py-3 sm:py-3 text-sm text-white outline-none ring-1 ring-transparent transition focus:border-emerald-400/60 focus:ring-emerald-500/40 touch-manipulation"
              placeholder="Informe a senha"
            />
            <button
              type="button"
              onClick={() => setShowPass((v) => !v)}
              className="w-full sm:w-auto rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 sm:py-2 text-xs sm:text-[11px] font-semibold text-slate-100 transition hover:border-emerald-300/50 hover:text-white touch-manipulation active:scale-95"
            >
              {showPass ? "Ocultar" : "Mostrar"}
            </button>
          </div>
          <button
            onClick={onLogin}
            disabled={authLoading}
            className="mt-1 w-full rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-500/30 transition hover:from-emerald-600 hover:to-blue-600 disabled:opacity-60 touch-manipulation active:scale-95"
          >
            {authLoading ? "Verificando..." : "Entrar"}
          </button>
          <div className="text-[10px] sm:text-[11px] text-slate-400 break-words">
            Este link é permanente e exclusivo para a equipe. A sessão expira após 24 horas.
          </div>
        </div>
      </div>
    </div>
  );
}

