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
  ChefHat,
  Users,
  Banknote,
  Truck,
  Search,
  Home,
  Receipt,
  Wallet,
  Wrench,
  RefreshCw,
  Tag,
  Settings,
  LogOut,
  Flame,
  ChevronRight,
  CircleDot
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
  const { open, isMobile, setOpenMobile } = useSidebar();
  const { t } = useLanguage();

  // On mobile, the sidebar is a sheet (openMobile) and should always render in "expanded" mode.
  // On desktop, "open" controls expanded vs icon-collapsed.
  const sidebarExpanded = isMobile ? true : open;
  
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
    { id: 'orders', titleKey: 'online_delivery', icon: Truck, roles: ['owner', 'manager', 'driver'], badge: analytics.activeOrders > 0 ? analytics.activeOrders : null },
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
    if (isMobile) setOpenMobile(false);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-primary/15 text-primary border-primary/30';
      case 'manager': return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'driver': return 'bg-accent/15 text-accent border-accent/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderNavGroup = (items: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-1">
        {label && sidebarExpanded && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/50 font-semibold px-4 py-2 flex items-center gap-2">
            <CircleDot className="h-2 w-2 text-primary/60" />
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
                    className={`relative group rounded-xl h-11 transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                        : 'hover:bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className={`flex items-center justify-center h-8 w-8 rounded-lg transition-all duration-200 ${
                      isActive 
                        ? 'bg-white/20' 
                        : 'bg-transparent group-hover:bg-primary/10'
                    }`}>
                      <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
                    </div>
                    {sidebarExpanded && (
                      <div className="flex items-center justify-between w-full ml-1">
                        <span className="text-sm font-medium truncate">{displayTitle}</span>
                        <div className="flex items-center gap-1.5">
                          {item.badge && (
                            <Badge 
                              variant="secondary"
                              className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground border-0 animate-pulse"
                            >
                              {item.badge}
                            </Badge>
                          )}
                          {isActive && <ChevronRight className="h-4 w-4 opacity-70" />}
                        </div>
                      </div>
                    )}
                    {!sidebarExpanded && item.badge && (
                      <Badge 
                        className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground border-0"
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
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/40 bg-sidebar shadow-lg"
    >
      {/* Header with Logo */}
      <SidebarHeader className="p-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className="relative flex-shrink-0">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md overflow-hidden">
              <img src={stockXLogo} alt="Stock-X" className="h-7 w-7 object-contain" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full border-2 border-sidebar shadow-sm" />
          </div>
          {sidebarExpanded && (
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold text-foreground tracking-tight">STOCK X</h2>
              <p className="text-[11px] text-muted-foreground font-medium">LPG Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      {/* User Profile Card */}
      {sidebarExpanded && (
        <div className="px-3 py-3 border-b border-border/40">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
            <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm flex-shrink-0">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-semibold text-sm">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
              <Badge className={`mt-0.5 text-[9px] px-2 py-0 h-4 font-medium border capitalize ${getRoleBadgeVariant(userRole)}`}>
                {userRole}
              </Badge>
            </div>
          </div>
        </div>
      )}

      <SidebarContent className="py-3 overflow-x-hidden safe-area-pb">
        {renderNavGroup(mainNavItems)}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(salesItems, 'Sales')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(managementItems, 'Manage')}
        
        <div className="my-2 mx-4 h-px bg-border/50" />
        {renderNavGroup(otherItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className="border-t border-border/40 p-3">
        <Button 
          variant="ghost" 
          size={sidebarExpanded ? "sm" : "icon"}
          className={`text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors rounded-xl ${sidebarExpanded ? 'w-full justify-start h-10 px-3' : 'w-10 h-10 mx-auto'}`}
          onClick={async () => {
            await supabase.auth.signOut();
            toast({ title: t("logout") });
          }}
        >
          <LogOut className="h-4 w-4" />
          {sidebarExpanded && <span className="ml-2 text-sm font-medium">{t("logout")}</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
};
