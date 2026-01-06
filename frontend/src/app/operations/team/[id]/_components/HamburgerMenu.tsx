"use client";

import { useState } from "react";
import { MainView } from "../types";
import { ICONS } from "../constants";

interface HamburgerMenuProps {
  view: MainView;
  setView: (view: MainView) => void;
  onLogout: () => void;
}

export default function HamburgerMenu({ view, setView, onLogout }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    {
      id: "home" as MainView,
      label: "Início",
      icon: ICONS.home,
      onClick: () => {
        setView("home");
        setIsOpen(false);
      },
      active: view === "home"
    },
    {
      id: "ops" as MainView,
      label: "Operação",
      icon: ICONS.ops,
      onClick: () => {
        setView("ops");
        setIsOpen(false);
      },
      active: view === "ops"
    },
    {
      id: "logout" as const,
      label: "Sair",
      icon: ICONS.exit,
      onClick: () => {
        onLogout();
        setIsOpen(false);
      },
      active: false,
      danger: true
    }
  ];

  return (
    <div className="relative">
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 transition touch-manipulation"
        aria-label="Menu"
      >
        <svg
          className="w-6 h-6 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu */}
          <div className="absolute right-0 top-12 z-50 w-48 rounded-lg border border-white/10 bg-slate-900/95 backdrop-blur shadow-xl overflow-hidden">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition touch-manipulation ${
                  item.active
                    ? "bg-emerald-500/20 text-white border-l-2 border-emerald-400"
                    : item.danger
                    ? "text-red-200 hover:bg-red-500/10 hover:text-red-100"
                    : "text-slate-200 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

