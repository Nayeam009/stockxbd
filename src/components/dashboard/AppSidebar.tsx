import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
  SidebarHeader,
  SidebarFooter
} from "@/components/ui/sidebar";
import { 
  BarChart3,
  Package,
  ChefHat,
  Users,
  FileText,
  UserCheck,
  Banknote,
  Truck,
  ShoppingCart,
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
  ChevronRight,
  Flame
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
    { id: 'profile', titleKey: 'profile', icon: User, roles: ['owner', 'manager', 'driver'] },
    { id: 'settings', titleKey: 'settings', icon: Settings, roles: ['owner', 'manager'] },
  ];

  const filterByRole = (items: typeof mainNavItems) => 
    items.filter(item => item.roles.includes(userRole));

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-gradient-to-r from-amber-500 to-orange-500 text-white';
      case 'manager': return 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white';  
      case 'driver': return 'bg-gradient-to-r from-green-500 to-emerald-500 text-white';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderNavGroup = (items: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup>
        {label && open && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-bold px-3 mb-2">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="space-y-1">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              const displayTitle = t(item.titleKey) + (item.titleSuffix || '');
              
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => handleModuleChange(item.id)}
                    isActive={isActive}
                    className={`relative group transition-all duration-200 rounded-xl mx-1 h-10 ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary/15 to-secondary/10 text-primary shadow-sm border-l-3 border-primary' 
                        : 'hover:bg-muted/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                      isActive 
                        ? 'bg-gradient-to-br from-primary to-secondary shadow-md' 
                        : 'bg-muted/50 group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-4 w-4 ${isActive ? 'text-primary-foreground' : 'group-hover:text-primary'}`} />
                    </div>
                    {open && (
                      <div className="flex items-center justify-between w-full ml-1">
                        <span className={`text-sm font-medium ${isActive ? 'text-primary' : ''}`}>{displayTitle}</span>
                        {item.badge && (
                          <Badge 
                            variant="destructive" 
                            className="h-5 min-w-5 px-1.5 text-[10px] font-bold animate-pulse ml-2"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                    {!open && item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[10px] font-bold animate-pulse"
                      >
                        {item.badge}
                      </Badge>
                    )}
                    {isActive && open && (
                      <ChevronRight className="h-4 w-4 text-primary ml-auto" />
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
    <Sidebar collapsible="icon" className="border-r border-border/30 bg-gradient-to-b from-sidebar to-sidebar/95 shadow-xl">
      {/* Modern Header */}
      <SidebarHeader className="border-b border-border/30 p-4 bg-gradient-to-r from-primary/5 to-secondary/5">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-primary to-secondary p-0.5 shadow-lg">
              <img src={stockXLogo} alt="Stock-X Logo" className="h-full w-full rounded-[10px] bg-card object-cover" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-accent rounded-full border-2 border-sidebar ring-2 ring-accent/20"></div>
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent">Stock-X</h2>
              <p className="text-[11px] text-muted-foreground font-medium tracking-wide">LPG Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-3 px-2">
        {renderNavGroup(mainNavItems)}
        
        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(salesItems, 'Sales & Finance')}
        
        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(managementItems, 'Management')}
        
        <div className="my-3 mx-2 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        {renderNavGroup(otherItems, 'Other')}
      </SidebarContent>

      {/* Modern Footer */}
      <SidebarFooter className="border-t border-border/30 p-3 bg-gradient-to-r from-primary/5 to-secondary/5">
        {open ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-muted/50 to-muted/30 rounded-xl border border-border/30 backdrop-blur-sm">
              <div className="h-11 w-11 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shrink-0 shadow-lg ring-2 ring-primary/20">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
                <Badge 
                  className={`mt-1 text-[10px] px-2 py-0 ${getRoleColor(userRole)} border-0 shadow-sm`}
                >
                  {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                </Badge>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              onClick={async () => {
                await supabase.auth.signOut();
                toast({ title: t("logout") });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("logout")}
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-9 w-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
              onClick={async () => {
                await supabase.auth.signOut();
                toast({ title: "Signed out successfully" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};
