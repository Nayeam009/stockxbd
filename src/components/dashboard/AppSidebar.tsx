import { NavLink, useLocation } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ChevronRight,
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

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-secondary/20 text-secondary border-secondary/30';
      case 'manager': return 'bg-accent/20 text-accent border-accent/30';
      case 'driver': return 'bg-primary/20 text-primary border-primary/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderNavGroup = (items: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-0">
        {label && open && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-widest text-muted-foreground/60 font-semibold px-4 py-2.5 flex items-center gap-2">
            <div className="h-1 w-1 rounded-full bg-secondary" />
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className="space-y-1 px-2">
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              const displayTitle = t(item.titleKey) + (item.titleSuffix || '');
              
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => handleModuleChange(item.id)}
                    isActive={isActive}
                    className={`relative group rounded-xl h-11 transition-all duration-300 ${
                      isActive 
                        ? 'bg-gradient-to-r from-primary via-primary to-primary-light text-primary-foreground shadow-lg shadow-primary/25' 
                        : 'hover:bg-muted/80 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-muted/50 group-hover:bg-primary/10 group-hover:scale-105'
                    }`}>
                      <Icon className={`h-4 w-4 transition-all duration-200 ${isActive ? '' : 'group-hover:text-primary'}`} />
                    </div>
                    {open && (
                      <div className="flex items-center justify-between w-full ml-1">
                        <span className="text-[13px] font-medium truncate">{displayTitle}</span>
                        <div className="flex items-center gap-1.5">
                          {item.badge && (
                            <Badge 
                              className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-secondary text-secondary-foreground border-0 shadow-sm animate-pulse"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="h-4 w-4 opacity-80" />}
                        </div>
                      </div>
                    )}
                    {!open && item.badge && (
                      <Badge 
                        className="absolute -top-1.5 -right-1.5 h-5 min-w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-secondary text-secondary-foreground border-0 shadow-md"
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
    <Sidebar collapsible="icon" className="border-r border-border/30 bg-gradient-to-b from-card via-card to-muted/20 shadow-xl">
      {/* Header with Logo */}
      <SidebarHeader className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0 group cursor-pointer">
            <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-105 overflow-hidden">
              <img src={stockXLogo} alt="Stock-X" className="h-8 w-8 object-contain" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-card shadow-sm" />
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          {open && (
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-extrabold text-foreground truncate tracking-tight">STOCK X</h2>
                <Sparkles className="h-3.5 w-3.5 text-secondary" />
              </div>
              <p className="text-[11px] text-muted-foreground truncate font-medium">LPG Management System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Card */}
      {open && (
        <div className="px-3 py-3 border-b border-border/30">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-muted/50 to-muted/30 border border-border/40">
            <Avatar className="h-10 w-10 border-2 border-primary/30 shadow-md">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-secondary text-primary-foreground font-bold text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              <Badge className={`mt-1 text-[9px] px-2 py-0 h-4 font-semibold border capitalize ${getRoleBadgeColor(userRole)}`}>
                {userRole}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="py-4 overflow-x-hidden">
        {renderNavGroup(mainNavItems)}
        
        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        {renderNavGroup(salesItems, 'Sales')}
        
        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        {renderNavGroup(managementItems, 'Manage')}
        
        <div className="my-3 mx-4 h-px bg-gradient-to-r from-transparent via-border/60 to-transparent" />
        {renderNavGroup(otherItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/30 p-3 bg-gradient-to-r from-destructive/5 to-transparent">
        <Button 
          variant="ghost" 
          size={open ? "sm" : "icon"}
          className={`text-muted-foreground hover:text-destructive hover:bg-destructive/15 transition-all duration-300 rounded-xl group ${open ? 'w-full justify-start h-11' : 'w-10 h-10 mx-auto'}`}
          onClick={async () => {
            await supabase.auth.signOut();
            toast({ title: t("logout") });
          }}
        >
          <div className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-300 ${open ? 'bg-destructive/10 group-hover:bg-destructive/20' : ''}`}>
            <LogOut className="h-4 w-4" />
          </div>
          {open && <span className="ml-2 text-[13px] font-medium">{t("logout")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
