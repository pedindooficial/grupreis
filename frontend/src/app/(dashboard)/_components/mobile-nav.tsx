import { Link, useLocation, useNavigate } from "react-router-dom";
import { ReactNode, useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface NavItem {
  label: string;
  href: string;
  icon: ReactNode;
  badge?: number | null;
}

export default function MobileNav({ items }: { items: NavItem[] }) {
  const location = useLocation();
  const pathname = location.pathname;
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleItemClick = (href: string) => {
    navigate(href);
    setIsOpen(false);
  };

  const currentActiveItem = items.find(item => 
    item.href === "/" ? pathname === "/" : pathname.startsWith(item.href)
  );

  return (
    <>
      {/* Floating Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center justify-center w-12 h-10 sm:w-14 sm:h-12 rounded-lg shadow-lg touch-manipulation transition-all duration-200 active:scale-95 ${
          isOpen
            ? 'bg-emerald-500 text-white shadow-emerald-500/50'
            : 'bg-slate-800/95 text-slate-200 hover:bg-slate-700/95 hover:text-white backdrop-blur-md border border-white/10 shadow-black/20'
        }`}
        aria-label="Menu"
      >
        <div className="flex flex-col gap-1.5">
          <span className={`block h-0.5 w-4 sm:w-5 bg-current transition-all duration-300 ${isOpen ? 'rotate-45 translate-y-1.5' : ''}`}></span>
          <span className={`block h-0.5 w-4 sm:w-5 bg-current transition-all duration-300 ${isOpen ? 'opacity-0' : ''}`}></span>
          <span className={`block h-0.5 w-4 sm:w-5 bg-current transition-all duration-300 ${isOpen ? '-rotate-45 -translate-y-1.5' : ''}`}></span>
        </div>
      </button>

      {/* Menu Overlay */}
      {isOpen && typeof window !== 'undefined' && createPortal(
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-[9996] bg-black/60 backdrop-blur-sm md:hidden"
            onClick={() => setIsOpen(false)}
          />
          
          {/* Menu Panel */}
          <div className="fixed top-0 left-0 right-0 bottom-0 z-[9997] bg-slate-900 overflow-hidden flex flex-col md:hidden">
            {/* Header */}
            <div className="px-6 py-6 border-b border-white/10 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-white">Menu de Navegação</h2>
                <p className="text-sm text-slate-400 mt-1">Selecione uma opção</p>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-slate-300 hover:text-white"
                aria-label="Fechar menu"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-1">
              {items.map((item) => {
                const isActive =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

                return (
                  <button
                    key={item.href}
                    onClick={() => handleItemClick(item.href)}
                    className={`w-full flex items-center gap-4 rounded-xl px-4 py-4 min-h-[64px] touch-manipulation transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                        : "text-slate-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                    }`}
                  >
                    <span className={`flex-shrink-0 ${isActive ? "text-xl" : "text-lg"}`}>
                      {item.icon}
                    </span>
                    <span className={`flex-1 text-left font-semibold ${isActive ? "text-base" : "text-sm"}`}>
                      {item.label}
                    </span>
                    {item.badge && item.badge > 0 && (
                      <span className="flex-shrink-0 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <span className="flex-shrink-0 text-emerald-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Current Page Indicator */}
            {currentActiveItem && (
              <div className="px-6 py-3 border-t border-white/10 bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <span className="text-emerald-400">{currentActiveItem.icon}</span>
                  <div className="flex-1">
                    <p className="text-xs text-slate-400">Página atual</p>
                    <p className="text-sm font-semibold text-white">{currentActiveItem.label}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>,
        document.body
      )}
    </>
  );
}

