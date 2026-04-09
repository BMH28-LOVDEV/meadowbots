import { useIsMobile } from "@/hooks/use-mobile";

export interface TabItem {
  id: string;
  label: string;
  icon: string;
  activeClass?: string;
  badge?: number;
  onClick?: () => void;
}

interface MobileTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export const MobileTabBar = ({ tabs, activeTab, onTabChange }: MobileTabBarProps) => {
  const isMobile = useIsMobile();
  if (!isMobile) return null;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-border safe-area-bottom">
      <div className="flex justify-around items-center px-1 py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                tab.onClick?.();
                onTabChange(tab.id);
              }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-lg transition-all duration-200 relative min-w-0 flex-1 ${
                isActive
                  ? tab.activeClass || "text-primary bg-primary/10"
                  : "text-muted-foreground"
              }`}
            >
              <span className="text-lg leading-none">{tab.icon}</span>
              <span className="text-[10px] font-display tracking-wider truncate w-full text-center">
                {tab.label}
              </span>
              {tab.badge && tab.badge > 0 && (
                <span className="absolute -top-0.5 right-1 w-4 h-4 bg-amber-500 rounded-full text-[9px] font-bold text-black flex items-center justify-center">
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export const useResponsiveTabs = () => {
  const isMobile = useIsMobile();
  return { isMobile };
};
