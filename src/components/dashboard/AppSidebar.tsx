import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  BarChart3,
  Package,
  ChefHat,
  Users,
  Banknote,
  Truck,
  Search,
  Home,
  Receipt,
  Wallet,
  ClipboardList,
  Wrench,
  RefreshCw,
  Tag,
  Settings,
  LogOut,
  Flame,
  ChevronRight
} from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";

interface AppSidebarProps {
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
  userName: string;
  analytics: {
    lowStockItems: any[];
    activeOrders: number;
  };
}

export const AppSidebar = ({ 
  activeModule, 
  setActiveModule, 
  userRole,
  userName,
  analytics 
}: AppSidebarProps) => {
  const { open } = useSidebar();
  const location = useLocation();
  const { t } = useLanguage();
  
  const mainNavItems = [
    { id: 'overview', titleKey: 'overview', icon: Home, roles: ['owner', 'manager', 'driver'] },
    { id: 'pos', titleKey: 'pos', icon: Receipt, roles: ['owner', 'manager', 'driver'] },
  ];

  const salesItems = [
    { id: 'daily-sales', titleKey: 'daily_sales', icon: BarChart3, roles: ['owner', 'manager'] },
    { id: 'daily-expenses', titleKey: 'daily_expenses', icon: Wallet, roles: ['owner', 'manager'] },
    { id: 'analytics', titleKey: 'analysis', icon: BarChart3, roles: ['owner', 'manager'] },
  ];

  const inventoryItems = [
    { id: 'lpg-stock', titleKey: 'lpg_stock', titleSuffix: ' (22mm)', icon: Flame, roles: ['owner', 'manager'], badge: analytics.lowStockItems.length > 0 ? analytics.lowStockItems.length : null },
    { id: 'lpg-stock-20mm', titleKey: 'lpg_stock', titleSuffix: ' (20mm)', icon: Flame, roles: ['owner', 'manager'] },
    { id: 'stove-stock', titleKey: 'stove_stock', icon: ChefHat, roles: ['owner', 'manager'] },
    { id: 'regulators', titleKey: 'regulators', icon: Wrench, roles: ['owner', 'manager'] },
    { id: 'product-pricing', titleKey: 'product_pricing', icon: Tag, roles: ['owner', 'manager'] },
  ];

  const operationsItems = [
    { id: 'orders', titleKey: 'online_delivery', icon: ClipboardList, roles: ['owner', 'manager', 'driver'], badge: analytics.activeOrders > 0 ? analytics.activeOrders : null },
    { id: 'deliveries', titleKey: 'online_delivery', icon: Truck, roles: ['owner', 'manager', 'driver'] },
    { id: 'exchange', titleKey: 'exchange', icon: RefreshCw, roles: ['owner', 'manager', 'driver'] },
  ];

  const managementItems = [
    { id: 'customers', titleKey: 'customers', icon: Users, roles: ['owner', 'manager'] },
    { id: 'staff-salary', titleKey: 'staff_salary', icon: Banknote, roles: ['owner', 'manager'] },
    { id: 'vehicle-cost', titleKey: 'vehicle_cost', icon: Truck, roles: ['owner', 'manager'] },
  ];

  const otherItems = [
    { id: 'community', titleKey: 'community', icon: Users, roles: ['owner', 'manager', 'driver'] },
    { id: 'search', titleKey: 'search', icon: Search, roles: ['owner', 'manager'] },
    { id: 'settings', titleKey: 'settings', icon: Settings, roles: ['owner', 'manager'] },
  ];

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
  };

  const renderNavGroup = (items: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-0">
        {label && open && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-medium px-3 py-2">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="space-y-0.5 px-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              const displayTitle = t(item.titleKey) + (item.titleSuffix || '');
              
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => handleModuleChange(item.id)}
                    isActive={isActive}
                    className={`relative group transition-all duration-300 rounded-xl h-10 ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-md' 
                        : 'hover:bg-primary/10 text-muted-foreground hover:text-primary'
                    }`}
                  >
                    <Icon className={`h-4 w-4 flex-shrink-0 transition-transform duration-200 ${isActive ? '' : 'opacity-70 group-hover:opacity-100 group-hover:scale-110'}`} />
                    {open && (
                      <div className="flex items-center justify-between w-full ml-2">
                        <span className="text-[13px] font-medium truncate">{displayTitle}</span>
                        <div className="flex items-center gap-1.5">
                          {item.badge && (
                            <Badge 
                              className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-secondary text-secondary-foreground border-0"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
                        </div>
                      </div>
                    )}
                    {!open && item.badge && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[9px] font-bold bg-secondary text-secondary-foreground border-0"
                      >
                        {item.badge}
                      </Badge>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-card shadow-lg">
      {/* Header */}
      <SidebarHeader className="p-4 border-b border-border/40 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md">
              <img src={stockXLogo} alt="Stock-X" className="h-6 w-6 object-contain brightness-0 invert" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full border-2 border-card shadow-sm" />
          </div>
          {open && (
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-primary truncate tracking-tight">STOCK X</h2>
              <p className="text-[10px] text-muted-foreground truncate">LPG Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 overflow-x-hidden">
        {renderNavGroup(mainNavItems)}
        
        <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(salesItems, 'Sales')}
        
        <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(managementItems, 'Manage')}
        
        <div className="my-2 mx-3 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(otherItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 p-3 bg-gradient-to-r from-muted/30 to-transparent">
        <Button 
          variant="ghost" 
          size={open ? "sm" : "icon"}
          className={`text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-300 rounded-xl ${open ? 'w-full justify-start h-10' : 'w-9 h-9 mx-auto'}`}
          onClick={async () => {
            await supabase.auth.signOut();
            toast({ title: t("logout") });
          }}
        >
          <LogOut className="h-4 w-4" />
          {open && <span className="ml-2 text-[13px] font-medium">{t("logout")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};