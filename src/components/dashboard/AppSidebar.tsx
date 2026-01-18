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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const { state, isMobile, setOpenMobile } = useSidebar();
  const { t } = useLanguage();

  // Collapsed means icon-only mode on desktop
  const isCollapsed = state === "collapsed" && !isMobile;
  
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
      case 'manager': return 'bg-secondary/15 text-secondary-foreground border-secondary/30';
      case 'driver': return 'bg-accent/15 text-accent-foreground border-accent/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const renderMenuItem = (item: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }) => {
    const Icon = item.icon;
    const isActive = activeModule === item.id;
    const displayTitle = t(item.titleKey) + (item.titleSuffix || '');
    
    const button = (
      <SidebarMenuButton 
        onClick={() => handleModuleChange(item.id)}
        isActive={isActive}
        className={`relative group transition-all duration-200 ${
          isCollapsed ? 'justify-center px-0' : ''
        } ${
          isActive 
            ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <div className={`flex items-center justify-center h-8 w-8 rounded-lg shrink-0 transition-all duration-200 ${
          isActive 
            ? 'bg-white/20' 
            : 'bg-transparent group-hover:bg-primary/10'
        }`}>
          <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
        </div>
        {!isCollapsed && (
          <div className="flex items-center justify-between w-full ml-2 overflow-hidden">
            <span className="text-sm font-medium truncate">{displayTitle}</span>
            <div className="flex items-center gap-1.5 shrink-0">
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
        {isCollapsed && item.badge && (
          <Badge 
            className="absolute -top-1 -right-1 h-4 min-w-4 p-0 flex items-center justify-center text-[9px] font-bold bg-destructive text-destructive-foreground border-0"
          >
            {item.badge}
          </Badge>
        )}
      </SidebarMenuButton>
    );

    if (isCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <SidebarMenuItem>{button}</SidebarMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {displayTitle}
            {item.badge && (
              <Badge className="h-5 min-w-5 px-1.5 text-[10px] font-bold bg-destructive text-destructive-foreground border-0">
                {item.badge}
              </Badge>
            )}
          </TooltipContent>
        </Tooltip>
      );
    }

    return <SidebarMenuItem key={item.id}>{button}</SidebarMenuItem>;
  };

  const renderNavGroup = (items: { id: string; titleKey: string; titleSuffix?: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup className="py-1">
        {label && !isCollapsed && (
          <SidebarGroupLabel className="text-[10px] uppercase tracking-wider text-muted-foreground/60 font-semibold px-3 py-2 flex items-center gap-2">
            <CircleDot className="h-1.5 w-1.5 text-primary/60" />
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu className={`space-y-0.5 ${isCollapsed ? 'px-1' : 'px-2'}`}>
            {filteredItems.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    );
  };

  return (
    <Sidebar 
      collapsible="icon" 
      className="border-r border-border/40 bg-sidebar shadow-lg transition-all duration-300"
    >
      {/* Header with Logo */}
      <SidebarHeader className={`border-b border-border/40 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`flex items-center transition-all duration-300 ${isCollapsed ? 'justify-center' : 'gap-3'}`}>
          <div className="relative shrink-0">
            <div className={`rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md overflow-hidden transition-all duration-300 ease-out ${isCollapsed ? 'h-8 w-8' : 'h-10 w-10'}`}>
              <img src={stockXLogo} alt="Stock-X" className={`object-contain transition-all duration-300 ${isCollapsed ? 'h-5 w-5' : 'h-7 w-7'}`} />
            </div>
            <div className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-success rounded-full border-2 border-sidebar shadow-sm transition-all duration-300 ${isCollapsed ? 'opacity-0 scale-0' : 'opacity-100 scale-100'}`} />
          </div>
          <div className={`min-w-0 flex-1 transition-all duration-300 ease-out ${isCollapsed ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100'}`}>
            <h2 className="text-base font-bold text-foreground tracking-tight whitespace-nowrap">STOCK X</h2>
            <p className="text-[11px] text-muted-foreground font-medium whitespace-nowrap">LPG Management</p>
          </div>
        </div>
      </SidebarHeader>

      {/* User Profile Card */}
      <div className={`border-b border-border/40 transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0 py-0 px-0' : 'max-h-32 opacity-100 px-3 py-3'}`}>
        <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/50">
          <Avatar className="h-9 w-9 border-2 border-primary/20 shadow-sm shrink-0">
            <AvatarImage src="" />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-semibold text-sm">
              {getInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 overflow-hidden">
            <p className="text-sm font-semibold text-foreground truncate">{userName}</p>
            <Badge className={`mt-0.5 text-[9px] px-2 py-0 h-4 font-medium border capitalize ${getRoleBadgeVariant(userRole)}`}>
              {userRole}
            </Badge>
          </div>
        </div>
      </div>
      
      {/* Collapsed User Avatar */}
      <div className={`border-b border-border/40 flex justify-center transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-20 opacity-100 py-2 px-1' : 'max-h-0 opacity-0 py-0'}`}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Avatar className="h-8 w-8 border-2 border-primary/20 shadow-sm cursor-pointer transition-transform duration-200 hover:scale-105">
              <AvatarImage src="" />
              <AvatarFallback className="bg-gradient-to-br from-primary to-primary-light text-primary-foreground font-semibold text-xs">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
          </TooltipTrigger>
          <TooltipContent side="right">
            <div>
              <p className="font-semibold">{userName}</p>
              <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>

      <SidebarContent className="py-2 overflow-x-hidden transition-all duration-300">
        {renderNavGroup(mainNavItems)}
        
        <div className={`mx-4 h-px bg-border/50 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-2'}`} />
        {renderNavGroup(salesItems, 'Sales')}
        
        <div className={`mx-4 h-px bg-border/50 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-2'}`} />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className={`mx-4 h-px bg-border/50 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-2'}`} />
        {renderNavGroup(operationsItems, 'Operations')}
        
        <div className={`mx-4 h-px bg-border/50 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-2'}`} />
        {renderNavGroup(managementItems, 'Manage')}
        
        <div className={`mx-4 h-px bg-border/50 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-2'}`} />
        {renderNavGroup(otherItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={`border-t border-border/40 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
          <Button 
            variant="ghost" 
            size="sm"
            className="w-full justify-start h-10 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-xl"
            onClick={async () => {
              await supabase.auth.signOut();
              toast({ title: t("logout") });
            }}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2 text-sm font-medium">{t("logout")}</span>
          </Button>
        </div>
        <div className={`flex justify-center transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon"
                className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-lg"
                onClick={async () => {
                  await supabase.auth.signOut();
                  toast({ title: t("logout") });
                }}
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("logout")}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
};
