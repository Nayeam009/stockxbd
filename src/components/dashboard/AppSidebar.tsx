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
  UserCheck,
  Banknote,
  Truck,
  Search,
  Home,
  User,
  Receipt,
  Wallet,
  ClipboardList,
  Wrench,
  RefreshCw,
  Tag,
  Settings,
  LogOut,
  Flame,
  Sparkles
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
      <SidebarGroup>
        {label && open && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground/70 font-semibold px-4 mb-1">
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
                    className={`relative group transition-all duration-300 rounded-lg h-10 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/25' 
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`h-7 w-7 rounded-md flex items-center justify-center transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary-foreground/20' 
                        : 'bg-transparent group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'group-hover:text-primary'}`} />
                    </div>
                    {open && (
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-sm font-medium ${isActive ? 'text-primary-foreground' : ''}`}>{displayTitle}</span>
                        {item.badge && (
                          <Badge 
                            variant="destructive" 
                            className="h-5 min-w-5 px-1.5 text-[10px] font-bold ml-2"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                    {!open && item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] font-bold"
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
    <Sidebar collapsible="icon" className="border-r border-border/40 bg-card/50 backdrop-blur-xl">
      {/* Clean Header */}
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="h-10 w-10 rounded-full border-2 border-foreground/80 flex items-center justify-center bg-card shadow-sm">
              <img src={stockXLogo} alt="Stock-X" className="h-6 w-6 object-contain opacity-70" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-card"></div>
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="text-base font-semibold text-foreground tracking-tight">Stock-X</h2>
              <p className="text-[11px] text-muted-foreground">LPG Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-4">
        {renderNavGroup(mainNavItems)}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(salesItems, 'Sales & Finance')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(managementItems, 'Management')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(otherItems, 'Other')}
      </SidebarContent>

      {/* Clean Footer - Just Sign Out */}
      <SidebarFooter className="border-t border-border/40 p-3">
        <Button 
          variant="ghost" 
          size={open ? "default" : "icon"}
          className={`text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ${open ? 'w-full justify-start' : 'w-9 h-9 mx-auto'}`}
          onClick={async () => {
            await supabase.auth.signOut();
            toast({ title: t("logout") });
          }}
        >
          <LogOut className="h-4 w-4" />
          {open && <span className="ml-2">{t("logout")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
