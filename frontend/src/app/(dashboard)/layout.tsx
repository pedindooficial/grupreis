import Link from "next/link";
import Image from "next/image";
import { ReactNode } from "react";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import "@/app/globals.css";
import { authOptions } from "@/lib/auth";
import SidebarAvatar from "./_components/sidebar-avatar";
import SidebarNav from "./_components/sidebar-nav";
import MobileNav from "./_components/mobile-nav";

const ICONS = {
  dashboard: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="3" width="7" height="7" rx="2" />
      <rect x="14" y="14" width="7" height="7" rx="2" />
      <rect x="3" y="14" width="7" height="7" rx="2" />
    </svg>
  ),
  clients: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="8" cy="8" r="3" />
      <circle cx="17" cy="8" r="3" />
      <path d="M4 19c0-2.2 2-4 4-4h0" />
      <path d="M13 15c2 0 4 1.8 4 4" />
    </svg>
  ),
  jobs: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 7h16v10H4z" />
      <path d="M9 7V5h6v2" />
      <path d="M9 12h6" />
    </svg>
  ),
  teams: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="7" r="3" />
      <path d="M4 21v-2a5 5 0 0 1 5-5h0" />
      <circle cx="17" cy="7" r="3" />
      <path d="M15 21v-2a5 5 0 0 1 5-5h0" />
    </svg>
  ),
  equipment: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M4 15h16l-2 5H6l-2-5Z" />
      <path d="M6 15V9l6-4 6 4v6" />
    </svg>
  ),
  cash: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M7 12h10" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  documents: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M7 3h8l4 4v12a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M7 7h8" />
      <path d="M7 11h10" />
      <path d="M7 15h10" />
    </svg>
  ),
  employees: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="9" cy="7" r="4" />
      <circle cx="17" cy="13" r="3" />
      <path d="M3 21c0-3.2 2.8-6 6-6h0c1.6 0 3.2.6 4.3 1.7" />
      <path d="M10 21c0-1.3.4-2.6 1.1-3.7" />
      <path d="M14 21c0-1 .2-2 .7-2.9" />
    </svg>
  ),
  machines: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 17H2l-1-4h18l-1 4h-3" />
      <path d="M7 17v-4" />
      <path d="M17 17v-4" />
      <path d="M2 13l2-6h16l2 6" />
      <circle cx="6" cy="17" r="2" />
      <circle cx="18" cy="17" r="2" />
      <path d="M6 17v-2" />
      <path d="M18 17v-2" />
    </svg>
  ),
  audit: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
      <path d="M16 13H8" />
      <path d="M16 17H8" />
      <path d="M10 9H8" />
      <circle cx="18" cy="4" r="1.5" fill="currentColor" />
    </svg>
  ),
  catalog: (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d="M3 9h18" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  )
};

async function getJobsPendingCount() {
  // TODO: When jobs API is fully moved to the backend service,
  // call it here to get the real pending count.
  return 0;
}

async function Sidebar({ session }: { session: Session }) {
  const pendingCount = await getJobsPendingCount();
  const items = [
    { label: "Dashboard", href: "/", icon: ICONS.dashboard },
    {
      label: "Ordens de Serviço",
      href: "/jobs",
      icon: ICONS.jobs,
      badge: pendingCount > 0 ? pendingCount : null
    },
    { label: "Clientes", href: "/clients", icon: ICONS.clients },
    { label: "Funcionários", href: "/employees", icon: ICONS.employees },
    { label: "Equipes", href: "/teams", icon: ICONS.teams },
    { label: "Equipamentos", href: "/equipment", icon: ICONS.equipment },
    { label: "Máquinas", href: "/machines", icon: ICONS.machines },
    { label: "Financeiro", href: "/cash", icon: ICONS.cash },
    { label: "Documentos", href: "/documents", icon: ICONS.documents },
    { label: "Auditoria", href: "/audit", icon: ICONS.audit },
    { label: "Catálogo", href: "/catalog", icon: ICONS.catalog }
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col justify-between border-r border-white/10 bg-slate-900 px-5 py-7 md:flex">
      <div className="space-y-6">
        <div className="flex justify-start px-1">
          <Image
            src="/logoreis.png"
            alt="Reis Fundações"
            width={170}
            height={48}
              className="object-contain"
              style={{ width: "auto", height: "auto" }}
            priority
          />
        </div>
        <SidebarNav items={items} />
      </div>
      <div className="border-t border-white/10 pt-5">
        <SidebarAvatar name={session.user?.name ?? "Usuário"} email={session.user?.email} />
      </div>
    </aside>
  );
}

function Topbar({ session }: { session: Session }) {
  return (
    <header className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-3 backdrop-blur">
      <div className="flex items-center gap-2">
        <div className="h-9 w-9 overflow-hidden rounded-lg bg-slate-800">
          <Image
            src="/logoreis.png"
            alt="Reis Fundações"
            width={48}
            height={48}
            className="h-9 w-9 object-cover"
            priority
          />
        </div>
        <div>
          <div className="text-sm font-semibold text-white">Reis Fundações</div>
          <div className="text-xs text-slate-300">Painel operacional</div>
        </div>
      </div>
      <div className="text-[11px] text-slate-400">
        Sessão: {session.user?.email ?? "admin"}
      </div>
    </header>
  );
}

export default async function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const session = await getServerSession(authOptions);

  // Garantia extra (além do middleware) para rotas server components
  if (!session) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar session={session} />
      <div className="flex w-full flex-col gap-4 px-4 pb-24 pt-6 md:ml-64 md:px-8 md:pb-8">
        <Topbar session={session} />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          {children}
        </div>
      </div>
      <nav className="fixed bottom-0 left-0 right-0 z-30 grid grid-cols-8 border-t border-white/10 bg-slate-900/95 px-2 py-2 text-xs font-semibold text-slate-200 backdrop-blur md:hidden">
        <MobileNav
          items={[
            { label: "Dashboard", href: "/", icon: ICONS.dashboard },
            { label: "Clientes", href: "/clients", icon: ICONS.clients },
            { label: "Func.", href: "/employees", icon: ICONS.employees },
            { label: "OS", href: "/jobs", icon: ICONS.jobs },
            { label: "Equip.", href: "/equipment", icon: ICONS.equipment },
            { label: "Máq.", href: "/machines", icon: ICONS.machines },
            { label: "Financeiro", href: "/cash", icon: ICONS.cash },
            { label: "Equipes", href: "/teams", icon: ICONS.teams }
          ]}
        />
      </nav>
    </div>
  );
}

