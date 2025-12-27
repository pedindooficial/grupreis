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
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-3 text-sm text-slate-100">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 text-sm font-semibold text-white shadow-lg">
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-white">
            {name || "Usuário"}
          </div>
          <div className="truncate text-xs text-slate-300">
            {email || "sem e-mail"}
          </div>
        </div>
      </div>
      <div className="mt-3 flex gap-2 text-xs">
        <button
          onClick={() => navigate("/settings")}
          className="flex-1 rounded-md border border-white/10 bg-white/5 px-3 py-2 text-center font-semibold text-slate-100 transition hover:border-emerald-300/50 hover:text-white"
        >
          Configurações
        </button>
        <button
          onClick={handleLogout}
          className="flex-1 rounded-md border border-emerald-400/50 bg-emerald-500/20 px-3 py-2 font-semibold text-emerald-50 transition hover:border-emerald-300 hover:bg-emerald-500/30"
        >
          Sair
        </button>
      </div>
    </div>
  );
}

