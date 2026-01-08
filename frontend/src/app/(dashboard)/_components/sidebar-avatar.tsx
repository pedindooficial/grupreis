import { useState } from "react";
import AccountCard from "./account-card";

export default function SidebarAvatar({
  name,
  email
}: {
  name: string;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);

  const displayName = name || "Reis Fundações";
  const displayRole = "Administrador";
  const displayEmail = email || "admin@grupreis.com";

  const initials = (displayName || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join("") || "U";

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className={`flex w-full items-center gap-3 rounded-lg border transition ${
          open 
            ? "border-emerald-400/50 bg-emerald-500/10" 
            : "border-white/10 bg-white/5 hover:border-emerald-300/40 hover:bg-white/10"
        } px-3 py-2.5`}
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 text-sm font-bold text-white shadow-lg flex-shrink-0">
          {initials}
        </div>
        <div className="flex-1 text-left min-w-0">
          <div className="font-semibold text-sm leading-tight text-white truncate">
            {displayName}
          </div>
          <div className="text-[11px] text-emerald-300 mt-0.5">{displayRole}</div>
          <div className="truncate text-[11px] text-slate-400 mt-0.5">
            {displayEmail}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ${open ? "rotate-180" : ""}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
          />
          {/* Popup */}
          <div className="absolute bottom-full left-0 mb-2 z-20">
            <AccountCard name={displayName} email={displayEmail} />
          </div>
        </>
      )}
    </div>
  );
}

