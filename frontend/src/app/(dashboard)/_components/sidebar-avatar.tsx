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

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center gap-3 rounded-full border border-white/10 bg-white/5 px-2 py-2 transition hover:border-emerald-300/40 hover:bg-white/10"
      >
        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-slate-800">
          <img
            src="/logoreis.png"
            alt="Reis Fundações"
            className="h-12 w-12 object-cover"
          />
        </div>
        <div className="flex-1 text-left text-xs text-slate-200">
          <div className="font-semibold leading-tight text-white">
            {displayName}
          </div>
          <div className="text-[11px] text-emerald-300">{displayRole}</div>
          <div className="truncate text-[11px] text-slate-400">
            {displayEmail}
          </div>
        </div>
        <span className="text-xs text-slate-300">{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div className="absolute bottom-14 left-0 right-0 z-20">
          <AccountCard name={displayName} email={displayEmail} />
        </div>
      )}
    </div>
  );
}

