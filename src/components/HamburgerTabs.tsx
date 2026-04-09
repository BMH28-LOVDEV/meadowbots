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

interface HamburgerTabsProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

/** Shows current tab + hamburger on small screens; full tab row on wide screens */
export const HamburgerTabs = ({ tabs, activeTab, onTabChange }: HamburgerTabsProps) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Wide desktop → normal tab row
  if (!isMobile) {
    return (
      <div className="px-4 flex gap-1 pb-2 pt-1 overflow-x-auto overflow-y-visible" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
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
            {tab.badge && tab.badge > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  }

  // Small screen → current tab + hamburger
  return (
    <div className="px-4 pb-2 relative" ref={menuRef}>
      <div className="flex items-center gap-2">
        {/* Current tab indicator */}
        <div className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-display tracking-wider ${currentTab.activeClass || "bg-primary/20 text-primary border border-primary/40"}`}>
          {currentTab.icon ? `${currentTab.icon} ${currentTab.label}` : currentTab.label}
        </div>

        {/* Hamburger button */}
        <button
          onClick={() => setOpen(!open)}
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

      {/* Dropdown */}
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
                {tab.badge && tab.badge > 0 && (
                  <span className="w-5 h-5 bg-amber-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
