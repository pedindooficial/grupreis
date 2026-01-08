import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";

export default function AccountCard({
  name,
  email
}: {
  name: string;
  email?: string | null;
}) {
  const { logout } = useAuth();
  const navigate = useNavigate();
  
  const initials = (name || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "U";

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/95 backdrop-blur-sm shadow-2xl p-4 min-w-[280px]">
      {/* User Info Section */}
      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 text-base font-bold text-white shadow-lg flex-shrink-0">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-white mb-0.5">
            {name || "Usuário"}
          </div>
          <div className="truncate text-xs text-slate-400 mb-1">
            {email || "sem e-mail"}
          </div>
          <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30">
            <span className="text-[10px] font-semibold text-emerald-300 uppercase tracking-wide">
              Administrador
            </span>
          </div>
        </div>
      </div>

      {/* Actions Section */}
      <div className="space-y-2">
        <button
          onClick={() => {
            navigate("/settings");
          }}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span>Configurações</span>
        </button>
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 rounded-lg border border-red-400/50 bg-red-500/20 px-4 py-2.5 text-sm font-medium text-red-100 transition hover:border-red-400 hover:bg-red-500/30 hover:text-white"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span>Sair</span>
        </button>
      </div>
    </div>
  );
}

