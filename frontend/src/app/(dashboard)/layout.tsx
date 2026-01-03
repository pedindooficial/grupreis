import { ReactNode, useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/lib/auth-context";
import { apiFetch, apiUrl } from "@/lib/api-client";
import SidebarAvatar from "./_components/sidebar-avatar";
import SidebarNav from "./_components/sidebar-nav";
import MobileNav from "./_components/mobile-nav";
import MaintenanceNotification from "./_components/maintenance-notification";

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
  ),
  orcamentos: (
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
    </svg>
  )
};

export function usePendingCount() {
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // TODO: When jobs API is fully moved to the backend service,
    // call it here to get the real pending count.
    setPendingCount(0);
  }, []);

  return pendingCount;
}

export function usePendingOrcamentoRequestsCount() {
  const [pendingCount, setPendingCount] = useState(0);
  const location = useLocation();
  const isOnOrcamentoRequestsPage = location.pathname === "/orcamento-requests";
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    // Only fetch count when not on the orçamento requests page
    if (isOnOrcamentoRequestsPage) {
      setPendingCount(0);
      // Close SSE connection if open
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    // Use SSE for real-time updates
    const connectSSE = () => {
      try {
        const url = apiUrl("/orcamento-requests/count/watch");
        const eventSource = new EventSource(url);
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          console.log("SSE connected for orcamento requests count");
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === "count" && typeof data.count === "number") {
              setPendingCount(data.count);
            }
          } catch (error) {
            console.error("Error parsing SSE message for count:", error);
          }
        };

        eventSource.onerror = (error) => {
          console.error("SSE error for count:", error);
          eventSource.close();
          eventSourceRef.current = null;
          // Try to reconnect after a delay
          setTimeout(() => {
            if (!isOnOrcamentoRequestsPage) {
              connectSSE();
            }
          }, 5000);
        };
      } catch (error) {
        console.error("Error setting up SSE for count:", error);
        // Fallback to polling if SSE fails
        const fetchCount = async () => {
          try {
            const res = await apiFetch("/orcamento-requests/count/pending", { cache: "no-store" });
            const data = await res.json().catch(() => null);
            if (res.ok && data?.data?.count !== undefined) {
              setPendingCount(data.data.count);
            }
          } catch (err) {
            console.error("Error fetching pending orçamento requests count:", err);
          }
        };
        fetchCount();
        const interval = setInterval(fetchCount, 30000);
        return () => clearInterval(interval);
      }
    };

    connectSSE();

    // Cleanup on unmount or when page changes
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [isOnOrcamentoRequestsPage]);

  return pendingCount;
}

function Sidebar() {
  const { user } = useAuth();
  const pendingCount = usePendingCount();
  const pendingOrcamentoCount = usePendingOrcamentoRequestsCount();
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
    { label: "Catálogo", href: "/catalog", icon: ICONS.catalog },
    { 
      label: "Orçamentos", 
      href: "/orcamento-requests", 
      icon: ICONS.orcamentos,
      badge: pendingOrcamentoCount > 0 ? pendingOrcamentoCount : null
    }
  ];

  return (
    <aside className="fixed left-0 top-0 hidden h-screen w-64 flex-col justify-between border-r border-white/10 bg-slate-900 px-5 py-7 md:flex">
      <div className="space-y-6">
        <div className="flex justify-start px-1">
          <img
            src="/logoreis.png"
            alt="Reis Fundações"
            className="h-12 object-contain"
          />
        </div>
        <SidebarNav items={items} />
      </div>
      <div className="border-t border-white/10 pt-5">
        <SidebarAvatar name={user?.name ?? "Usuário"} email={user?.email} />
      </div>
    </aside>
  );
}

function Topbar() {
  const { user } = useAuth();
  
  return (
    <header className="flex items-center justify-between rounded-xl sm:rounded-2xl border border-white/10 bg-white/5 px-3 sm:px-5 py-2.5 sm:py-3 backdrop-blur">
      <div className="flex items-center gap-2 min-w-0 flex-1">
        <div className="h-7 w-7 sm:h-9 sm:w-9 overflow-hidden rounded-lg bg-slate-800 flex-shrink-0">
          <img
            src="/logoreis.png"
            alt="Reis Fundações"
            className="h-7 w-7 sm:h-9 sm:w-9 object-cover"
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs sm:text-sm font-semibold text-white truncate">Reis Fundações</div>
          <div className="text-[10px] sm:text-xs text-slate-300 truncate hidden sm:block">Painel operacional</div>
        </div>
      </div>
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        <MaintenanceNotification />
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
          <div className="text-[10px] sm:text-[11px] text-slate-300 whitespace-nowrap">
            <span className="hidden md:inline">Sessão: </span>
            <span className="truncate max-w-[140px] lg:max-w-none">{user?.email ?? "admin"}</span>
          </div>
        </div>
        <div className="sm:hidden flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/5 border border-white/10">
          <div className="h-1.5 w-1.5 rounded-full bg-emerald-400"></div>
          <div className="text-[10px] text-slate-300 truncate max-w-[100px]">
            {user?.email?.split("@")[0] ?? "admin"}
          </div>
        </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children
}: {
  children: ReactNode;
}) {
  const pendingCount = usePendingCount();
  const pendingOrcamentoCount = usePendingOrcamentoRequestsCount();
  
  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar />
      <div className="flex w-full flex-col gap-4 px-4 pb-8 pt-6 md:ml-64 md:px-8 md:pb-8">
        <Topbar />
        <div className="rounded-2xl border border-white/10 bg-white/5 p-5 shadow-inner shadow-black/30">
          {children}
        </div>
      </div>
      <div className="fixed top-2 right-2 z-30 md:hidden">
        <MobileNav
          items={[
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
            { label: "Catálogo", href: "/catalog", icon: ICONS.catalog },
            { 
              label: "Orçamentos", 
              href: "/orcamento-requests", 
              icon: ICONS.orcamentos,
              badge: pendingOrcamentoCount > 0 ? pendingOrcamentoCount : null
            }
          ]}
        />
      </div>
    </div>
  );
}

