"use client";

import { MainView } from "../types";
import { ICONS } from "../constants";

interface BottomNavigationProps {
  view: MainView;
  setView: (view: MainView) => void;
  onLogout: () => void;
}

export default function BottomNavigation({ view, setView, onLogout }: BottomNavigationProps) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-slate-900/95 px-2 sm:px-3 py-2.5 sm:py-2 text-xs text-slate-200 backdrop-blur safe-area-inset-bottom">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-1 sm:gap-2">
        <button
          onClick={() => setView("home")}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 sm:py-1 touch-manipulation min-h-[60px] sm:min-h-[auto] ${
            view === "home" ? "text-white" : "text-slate-300"
          }`}
        >
          <span className="text-lg sm:text-base text-emerald-200">{ICONS.home}</span>
          <span className="text-[10px] sm:text-[11px] font-semibold">Início</span>
        </button>
        <button
          onClick={() => setView("ops")}
          className={`flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 sm:py-1 touch-manipulation min-h-[60px] sm:min-h-[auto] ${
            view === "ops" ? "text-white" : "text-slate-300"
          }`}
        >
          <span className="text-lg sm:text-base text-emerald-200">{ICONS.ops}</span>
          <span className="text-[10px] sm:text-[11px] font-semibold">Operação</span>
        </button>
        <button
          onClick={onLogout}
          className="flex flex-1 flex-col items-center gap-1 rounded-lg px-2 py-1.5 sm:py-1 text-red-200 active:text-red-100 touch-manipulation min-h-[60px] sm:min-h-[auto]"
        >
          <span className="text-lg sm:text-base">{ICONS.exit}</span>
          <span className="text-[10px] sm:text-[11px] font-semibold">Sair</span>
        </button>
      </div>
    </div>
  );
}

