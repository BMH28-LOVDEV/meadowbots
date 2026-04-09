import { useState, useRef, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent, DrawerTrigger } from "@/components/ui/drawer";

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

export const HamburgerTabs = ({ tabs, activeTab, onTabChange, actions }: HamburgerTabsProps) => {
  const isMobile = useIsMobile();
  const [tabsOpen, setTabsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);

  const currentTab = tabs.find((t) => t.id === activeTab) || tabs[0];

  // Wide desktop → normal tab row with actions hamburger as drawer
  if (!isMobile) {
    return (
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

        {/* Actions drawer trigger (desktop) */}
        {actions && actions.length > 0 && (
          <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
            <DrawerTrigger asChild>
              <button
                className="p-2 rounded-lg border border-accent/40 text-accent hover:border-accent hover:bg-accent/10 transition-all duration-200"
                aria-label="Toggle actions menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent className="glass border-t border-accent/30">
              <div className="px-4 pt-2 pb-6 max-w-lg mx-auto w-full">
                <h3 className="font-display text-xs tracking-wider text-muted-foreground mb-3">COMMANDS</h3>
                <div className="space-y-1">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick();
                        setActionsOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-left text-sm font-display tracking-wider transition-all duration-200 flex items-center gap-3 hover:bg-accent/10 ${action.className || "text-muted-foreground hover:text-foreground"}`}
                    >
                      {action.icon && <span className="text-base">{action.icon}</span>}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}
      </div>
    );
  }

  // Mobile → current tab + two drawer triggers
  return (
    <div className="px-4 pb-2">
      <div className="flex items-center gap-2">
        {/* Current tab indicator */}
        <div className={`flex-1 px-4 py-1.5 rounded-lg text-xs font-display tracking-wider ${currentTab.activeClass || "bg-primary/20 text-primary border border-primary/40"}`}>
          {currentTab.icon ? `${currentTab.icon} ${currentTab.label}` : currentTab.label}
        </div>

        {/* Actions drawer (mobile) */}
        {actions && actions.length > 0 && (
          <Drawer open={actionsOpen} onOpenChange={setActionsOpen}>
            <DrawerTrigger asChild>
              <button
                className="p-2 rounded-lg border border-accent/40 text-accent hover:border-accent hover:bg-accent/10 transition-all duration-200"
                aria-label="Toggle actions menu"
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="10" cy="4" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="10" r="1.5" fill="currentColor" />
                  <circle cx="10" cy="16" r="1.5" fill="currentColor" />
                </svg>
              </button>
            </DrawerTrigger>
            <DrawerContent className="glass border-t border-accent/30">
              <div className="px-4 pt-2 pb-6">
                <h3 className="font-display text-xs tracking-wider text-muted-foreground mb-3">COMMANDS</h3>
                <div className="space-y-1">
                  {actions.map((action) => (
                    <button
                      key={action.id}
                      onClick={() => {
                        action.onClick();
                        setActionsOpen(false);
                      }}
                      className={`w-full px-4 py-3 rounded-lg text-left text-sm font-display tracking-wider transition-all duration-200 flex items-center gap-3 hover:bg-accent/10 ${action.className || "text-muted-foreground hover:text-foreground"}`}
                    >
                      {action.icon && <span className="text-base">{action.icon}</span>}
                      <span>{action.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </DrawerContent>
          </Drawer>
        )}

        {/* Tabs drawer (mobile) */}
        <Drawer open={tabsOpen} onOpenChange={setTabsOpen}>
          <DrawerTrigger asChild>
            <button
              className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary transition-all duration-200"
              aria-label="Toggle navigation"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 5H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 10H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                <path d="M3 15H17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </DrawerTrigger>
          <DrawerContent className="glass border-t border-border">
            <div className="px-4 pt-2 pb-6">
              <h3 className="font-display text-xs tracking-wider text-muted-foreground mb-3">TABS</h3>
              <div className="space-y-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => {
                      tab.onClick?.();
                      onTabChange(tab.id);
                      setTabsOpen(false);
                    }}
                    className={`w-full px-4 py-3 rounded-lg text-left text-sm font-display tracking-wider transition-all duration-200 flex items-center justify-between ${
                      activeTab === tab.id
                        ? tab.activeClass || "bg-primary/20 text-primary border border-primary/40"
                        : "text-muted-foreground hover:text-foreground hover:bg-primary/10"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      {tab.icon && <span className="text-base">{tab.icon}</span>}
                      <span>{tab.label}</span>
                    </span>
                    {tab.badge != null && tab.badge > 0 && (
                      <span className="w-5 h-5 bg-amber-500 rounded-full text-[10px] font-bold text-black flex items-center justify-center">
                        {tab.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </DrawerContent>
        </Drawer>
      </div>
    </div>
  );
};