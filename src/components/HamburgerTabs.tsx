import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

export interface TabItem {
  id: string;
  label: string;
  icon?: string;
  activeClass?: string;
  badge?: number;
  onClick?: () => void;
}

export interface ActionItem {
  id: string;
  label: string;
  icon?: string;
  className?: string;
  onClick: () => void;
}

interface HamburgerTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  actions?: ActionItem[];
}

/** Shows current tab + hamburger on small screens; full tab row on wide screens */
export const HamburgerTabs = ({ tabs, activeTab, onTabChange, actions }: HamburgerTabsProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  const anyOpen = open || actionsOpen;

  // Close on outside click
  useEffect(() => {
    if (!anyOpen) return;
    const handler = (e: MouseEvent) => {
      if (open && menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
      if (actionsOpen && actionsRef.current && !actionsRef.current.contains(e.target as Node)) setActionsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, actionsOpen, anyOpen]);

  // Backdrop overlay
  const backdrop = anyOpen ? (
    <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-all duration-300" />
  ) : null;

  // Wide desktop → normal tab row
  if (!isMobile) {
    return (
      <>
        {backdrop}
        <div className="px-4 flex items-center gap-2 pb-2 pt-1 overflow-y-visible">
          <div className="flex gap-1 flex-1 overflow-x-auto" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  tab.onClick?.();
                  onTabChange(tab.id);
                }}
                className={`px-4 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 whitespace-nowrap shrink-0 relative ${
                  activeTab === tab.id
                    ? tab.activeClass || "bg-primary/20 text-primary border border-primary/40"
                    : "text-muted-foreground hover:text-foreground border border-transparent"
                }`}
              >
                {tab.icon ? `${tab.icon} ${tab.label}` : tab.label}
                {tab.badge != null && tab.badge > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions hamburger (desktop) */}
          {actions && actions.length > 0 && (
            <div className="relative z-50" ref={actionsRef}>
              <button
                onClick={() => setActionsOpen(!actionsOpen)}
                className="p-2 rounded-lg border border-accent/40 text-accent hover:text-accent hover:border-accent hover:bg-accent/10 transition-all duration-200"
                aria-label="Toggle actions menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {actionsOpen ? (
                    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  ) : (
                    <>
                      <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                    </>
                  )}
                </svg>
              </button>
              {actionsOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl border border-accent/30 shadow-lg shadow-accent/10 overflow-hidden min-w-[200px]">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick();
                        setActionsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-xs font-display tracking-wider transition-all duration-200 flex items-center gap-2 border-b border-border/50 last:border-b-0 hover:bg-accent/10 ${action.className || "text-muted-foreground hover:text-foreground"}`}
                    >
                      {action.icon && <span>{action.icon}</span>}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </>
    );
  }

  // Small screen → current tab + hamburger(s)
  return (
    <>
      {backdrop}
      <div className="px-4 pb-2 relative" ref={menuRef}>
        <div className="flex items-center gap-2">
          {/* Current tab indicator */}
          <div className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-display tracking-wider ${currentTab.activeClass || "bg-primary/20 text-primary border border-primary/40"}`}>
            {currentTab.icon ? `${currentTab.icon} ${currentTab.label}` : currentTab.label}
          </div>

          {/* Actions hamburger (mobile) */}
          {actions && actions.length > 0 && (
            <div className="relative z-50" ref={actionsRef}>
              <button
                onClick={() => { setActionsOpen(!actionsOpen); setOpen(false); }}
                className="p-2 rounded-lg border border-accent/40 text-accent hover:text-accent hover:border-accent hover:bg-accent/10 transition-all duration-200"
                aria-label="Toggle actions menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {actionsOpen ? (
                    <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  ) : (
                    <>
                      <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                      <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                    </>
                  )}
                </svg>
              </button>
              {actionsOpen && (
                <div className="absolute right-0 top-full mt-1 z-50 glass rounded-xl border border-accent/30 shadow-lg shadow-accent/10 overflow-hidden min-w-[200px]">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick();
                        setActionsOpen(false);
                      }}
                      className={`w-full px-4 py-3 text-left text-xs font-display tracking-wider transition-all duration-200 flex items-center gap-2 border-b border-border/50 last:border-b-0 hover:bg-accent/10 ${action.className || "text-muted-foreground hover:text-foreground"}`}
                    >
                      {action.icon && <span>{action.icon}</span>}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tabs hamburger button */}
          <button
            onClick={() => { setOpen(!open); setActionsOpen(false); }}
            className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-200"
            aria-label="Toggle navigation"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              {open ? (
                <path d="M5 5L15 15M15 5L5 15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              ) : (
                <>
                  <path d="M3 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M3 10H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                  <path d="M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </>
              )}
            </svg>
          </button>
        </div>

        {/* Tabs dropdown */}
        {open && (
          <div className="absolute left-4 right-4 top-full mt-1 z-50 glass rounded-xl border border-border shadow-lg overflow-hidden">
            {tabs
              .filter((t) => t.id !== activeTab)
              .map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    tab.onClick?.();
                    onTabChange(tab.id);
                    setOpen(false);
                  }}
                  className="w-full px-4 py-3 text-left text-xs font-display tracking-wider text-muted-foreground hover:text-foreground hover:bg-primary/10 transition-all duration-200 flex items-center justify-between border-b border-border/50 last:border-b-0 relative"
                >
                  <span>{tab.icon ? `${tab.icon} ${tab.label}` : tab.label}</span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span className="w-5 h-5 bg-amber-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                      {tab.badge}
                    </span>
                  )}
                </button>
              ))}
          </div>
        )}
      </div>
    </>
  );
};
