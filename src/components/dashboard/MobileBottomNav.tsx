import { Home, Receipt, Flame, Tag, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

interface MobileBottomNavProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
}

const navItems = [{
  id: 'overview',
  labelKey: 'overview',
  icon: Home,
  roles: ['owner', 'manager', 'driver']
}, {
  id: 'pos',
  labelKey: 'pos',
  icon: Receipt,
  roles: ['owner', 'manager', 'driver']
}, {
  id: 'inventory',
  labelKey: 'inventory',
  icon: Flame,
  roles: ['owner', 'manager']
}, {
  id: 'product-pricing',
  labelKey: 'product_pricing',
  icon: Tag,
  roles: ['owner', 'manager']
}];
const moreItems = [{
  id: 'business-diary',
  labelKey: 'business_diary',
  roles: ['owner', 'manager']
}, {
  id: 'community',
  labelKey: 'lpg_marketplace',
  roles: ['owner', 'manager']
}, {
  id: 'analysis-search',
  labelKey: 'analysis_search',
  roles: ['owner', 'manager']
}, {
  id: 'customers',
  labelKey: 'customers',
  roles: ['owner', 'manager']
}, {
  id: 'staff-salary',
  labelKey: 'staff_salary',
  roles: ['owner', 'manager']
}, {
  id: 'vehicle-cost',
  labelKey: 'vehicle_cost',
  roles: ['owner', 'manager']
}, {
  id: 'settings',
  labelKey: 'settings',
  roles: ['owner', 'manager']
}];
export const MobileBottomNav = ({
  activeModule,
  setActiveModule,
  userRole
}: MobileBottomNavProps) => {
  const { t } = useLanguage();
  const [sheetOpen, setSheetOpen] = useState(false);
  
  const filteredNavItems = navItems.filter(item => item.roles.includes(userRole));
  const filteredMoreItems = moreItems.filter(item => item.roles.includes(userRole));
  
  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    setSheetOpen(false);
  };
  return <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-card/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_20px_rgba(0,0,0,0.1)]" style={{
    paddingBottom: 'env(safe-area-inset-bottom, 0px)'
  }}>
      {/* Swipe indicator */}
      

      <div className="flex items-center justify-around h-16 px-1">
        {filteredNavItems.map(item => {
        const Icon = item.icon;
        const isActive = activeModule === item.id;
        return <button key={item.id} onClick={() => handleModuleChange(item.id)} aria-label={t(item.labelKey)} aria-current={isActive ? 'page' : undefined} className={cn("flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200 relative group touch-target", isActive ? "text-primary" : "text-muted-foreground")}>
              {isActive && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />}
              <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200", isActive ? "bg-primary/15 scale-105" : "group-active:scale-90")}>
                <Icon className={cn("h-5 w-5 transition-all", isActive && "stroke-[2.5px]")} />
              </div>
              <span className={cn("text-[10px] font-medium mt-1 truncate max-w-[60px]", isActive && "font-semibold")}>
                {t(item.labelKey)}
              </span>
            </button>;
      })}

        {/* More Menu */}
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <button aria-label={t('more') || 'More options'} aria-expanded={sheetOpen} className={cn("flex flex-col items-center justify-center flex-1 h-full py-2 px-1 transition-all duration-200 relative group touch-target", sheetOpen ? "text-primary" : "text-muted-foreground")}>
              {sheetOpen && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />}
              <div className={cn("flex items-center justify-center h-9 w-9 rounded-xl transition-all duration-200", sheetOpen ? "bg-primary/15 scale-105" : "group-active:scale-90")}>
                <Menu className={cn("h-5 w-5 transition-all", sheetOpen && "stroke-[2.5px]")} />
              </div>
              <span className={cn("text-[10px] font-medium mt-1", sheetOpen && "font-semibold")}>
                {t('more') || 'More'}
              </span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-3xl" style={{
          paddingBottom: 'env(safe-area-inset-bottom, 16px)'
        }}>
            <SheetHeader className="pb-4 border-b border-border/50">
              <SheetTitle className="text-left text-lg font-semibold">{t('all_modules') || 'All Modules'}</SheetTitle>
            </SheetHeader>
            <div className="grid grid-cols-3 gap-3 py-4 overflow-y-auto max-h-[calc(70vh-80px)]">
              {filteredMoreItems.map(item => {
              const isActive = activeModule === item.id;
              return <button key={item.id} onClick={() => handleModuleChange(item.id)} aria-current={isActive ? 'page' : undefined} className={cn("flex flex-col items-center justify-center p-4 rounded-xl transition-all duration-200 border min-h-[72px] touch-target", isActive ? "bg-primary/10 border-primary/30 text-primary" : "bg-muted/30 border-border/30 text-foreground hover:bg-muted/50 active:scale-95")}>
                    <span className={cn("text-xs font-medium text-center line-clamp-2", isActive && "font-semibold")}>
                      {t(item.labelKey)}
                    </span>
                  </button>;
            })}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>;
};