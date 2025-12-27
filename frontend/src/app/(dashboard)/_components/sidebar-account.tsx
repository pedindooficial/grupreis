import { useState } from "react";
import AccountCard from "./account-card";

export default function SidebarAccount({
  name,
  email
}: {
  name: string;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left transition hover:border-emerald-300/40 hover:bg-white/10"
      >
        <div className="flex items-center gap-3">
          <img
            src="/logoreis.png"
            alt="Reis Fundações"
            className="h-9 object-contain"
          />
        </div>
        <span className="text-xs text-slate-200">{open ? "▲" : "▼"}</span>
      </button>
      {open && <AccountCard name={name} email={email} />}
    </div>
  );
}

