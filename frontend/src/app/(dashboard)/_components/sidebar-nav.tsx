"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number | null;
}

export default function SidebarNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-1 text-[15px] text-slate-100">
      {items.map((item) => {
        // Verificar se a rota atual corresponde ao item
        // Para "/" precisa ser exatamente "/", para outros precisa começar com o href
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href as any}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 transition ${
              isActive
                ? "bg-emerald-500/20 border border-emerald-400/30 text-white"
                : "hover:bg-white/10 hover:text-white"
            }`}
          >
            <span className={isActive ? "text-emerald-300" : "text-slate-200"}>
              {item.icon}
            </span>
            <span className="font-medium flex-1">{item.label}</span>
            {item.badge ? (
              <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
                {item.badge}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );
}

