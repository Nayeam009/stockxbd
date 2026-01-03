import { Home, Receipt, Package, BarChart3, Menu, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useState, useCallback, TouchEvent as ReactTouchEvent } from "react";
import { getNextModule, getModuleNavigationOrder } from "@/hooks/useSwipeNavigation";

interface MobileBottomNavProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
}

const navItems = [
  { id: 'overview', labelKey: 'overview', icon: Home, roles: ['owner', 'manager', 'driver'] },
  { id: 'pos', labelKey: 'pos', icon: Receipt, roles: ['owner', 'manager', 'driver'] },
  { id: 'lpg-stock', labelKey: 'lpg_stock', icon: Package, roles: ['owner', 'manager'] },
  { id: 'analytics', labelKey: 'analysis', icon: BarChart3, roles: ['owner', 'manager'] },
];

const moreItems = [
  { id: 'daily-sales', labelKey: 'daily_sales', roles: ['owner', 'manager'] },
  { id: 'daily-expenses', labelKey: 'daily_expenses', roles: ['owner', 'manager'] },
  { id: 'lpg-stock-20mm', labelKey: 'lpg_stock', suffix: ' (20mm)', roles: ['owner', 'manager'] },
  { id: 'stove-stock', labelKey: 'stove_stock', roles: ['owner', 'manager'] },
  { id: 'regulators', labelKey: 'regulators', roles: ['owner', 'manager'] },
  { id: 'product-pricing', labelKey: 'product_pricing', roles: ['owner', 'manager'] },
  { id: 'orders', labelKey: 'online_delivery', roles: ['owner', 'manager', 'driver'] },
  { id: 'exchange', labelKey: 'exchange', roles: ['owner', 'manager', 'driver'] },
  { id: 'customers', labelKey: 'customers', roles: ['owner', 'manager'] },
  { id: 'staff-salary', labelKey: 'staff_salary', roles: ['owner', 'manager'] },
  { id: 'vehicle-cost', labelKey: 'vehicle_cost', roles: ['owner', 'manager'] },
  { id: 'community', labelKey: 'community', roles: ['owner', 'manager', 'driver'] },
  { id: 'settings', labelKey: 'settings', roles: ['owner', 'manager'] },
];

export const MobileBottomNav = ({ activeModule, setActiveModule, userRole }: MobileBottomNavProps) => {
  const { t } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);

  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));
  const filteredMoreItems = moreItems.filter(item => item.roles.includes(userRole));

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    setSheetOpen(false);
  };

  const handlePrevModule = () => {
    const nextModule = getNextModule(activeModule, 'right', userRole);
    setActiveModule(nextModule);
  };

  const handleNextModule = () => {
    const nextModule = getNextModule(activeModule, 'left', userRole);
    setActiveModule(nextModule);
  };

  // Get current module position for indicator
  const modules = getModuleNavigationOrder(userRole);
  const currentIndex = modules.indexOf(activeModule);
  const totalModules = modules.length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
      {/* Swipe indicator */}
      <div className="flex items-center justify-between px-4 py-1.5 border-b border-border/30 bg-muted/30">
        <button 
          onClick={handlePrevModule}
          className="p-1 rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
        </button>
        <div className="flex items-center gap-1">
          {modules.slice(Math.max(0, currentIndex - 2), currentIndex + 3).map((_, idx) => {
            const actualIdx = Math.max(0, currentIndex - 2) + idx;
            return (
              <div 
                key={actualIdx}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  actualIdx === currentIndex 
                    ? "w-4 bg-primary" 
                    : "w-1.5 bg-muted-foreground/30"
                )}
              />
            );
          })}
        </div>
        <button 
          onClick={handleNextModule}
          className="p-1 rounded-full hover:bg-muted active:scale-95 transition-all"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      <div className="flex items-center justify-around h-14 px-2 safe-area-pb">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => handleModuleChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all duration-200 relative group",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-b-full" />
              )}
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200",
                isActive 
                  ? "bg-primary/15 scale-105" 
                  : "group-active:scale-90"
              )}>
                <Icon className={cn(
                  "h-4 w-4 transition-all",
                  isActive && "stroke-[2.5px]"
                )} />
              </div>
              <span className={cn(
                "text-[9px] font-medium mt-0.5 truncate max-w-[55px]",
                isActive && "font-semibold"
              )}>
                {t(item.labelKey)}
              </span>
            </button>
          );
        })}

        {/* More Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full py-1 px-1 transition-all duration-200 relative group",
                sheetOpen ? "text-primary" : "text-muted-foreground"
              )}
            >
              {sheetOpen && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-primary rounded-b-full" />
              )}
              <div className={cn(
                "flex items-center justify-center h-7 w-7 rounded-lg transition-all duration-200",
                sheetOpen 
                  ? "bg-primary/15 scale-105" 
                  : "group-active:scale-90"
              )}>
                <Menu className={cn(
                  "h-4 w-4 transition-all",
                  sheetOpen && "stroke-[2.5px]"
                )} />
              </div>
              <span className={cn(
                "text-[9px] font-medium mt-0.5",
                sheetOpen && "font-semibold"
              )}>
                {t('more') || 'More'}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[65vh] rounded-t-3xl">
            <SheetHeader className="pb-3 border-b border-border/50">
              <SheetTitle className="text-left text-base">{t('all_modules') || 'All Modules'}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-2.5 py-3 overflow-y-auto max-h-[calc(65vh-70px)]">
              {filteredMoreItems.map((item) => {
                const isActive = activeModule === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleModuleChange(item.id)}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl transition-all duration-200 border",
                      isActive 
                        ? "bg-primary/10 border-primary/30 text-primary" 
                        : "bg-muted/30 border-border/30 text-foreground hover:bg-muted/50 active:scale-95"
                    )}
                  >
                    <span className={cn(
                      "text-[11px] font-medium text-center line-clamp-2",
                      isActive && "font-semibold"
                    )}>
                      {t(item.labelKey)}{item.suffix || ''}
                    </span>
                  </button>
                );
              })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
};
