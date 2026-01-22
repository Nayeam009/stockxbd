import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar, SidebarHeader, SidebarFooter } from "@/components/ui/sidebar";
import { BarChart3, Users, Search, Home, Receipt, Tag, Settings, LogOut, Package, ChevronRight, CircleDot, Store, Wallet } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

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
  
  // Primary navigation - Dashboard only
  const mainNavItems = [{
    id: 'overview',
    titleKey: 'overview',
    icon: Home,
    roles: ['owner', 'manager', 'driver']
  }];

  // Business Operations - Core workflows in new order
  const businessItems = [{
    id: 'business-diary',
    titleKey: 'business_diary',
    icon: BarChart3,
    roles: ['owner', 'manager']
  }, {
    id: 'pos',
    titleKey: 'pos',
    icon: Receipt,
    roles: ['owner', 'manager', 'driver']
  }, {
    id: 'community',
    titleKey: 'lpg_marketplace',
    icon: Store,
    roles: ['owner', 'manager'],
    badge: analytics.activeOrders > 0 ? analytics.activeOrders : null
  }];

  // Inventory Management
  const inventoryItems = [{
    id: 'inventory',
    titleKey: 'inventory',
    icon: Package,
    roles: ['owner', 'manager'],
    badge: analytics.lowStockItems.length > 0 ? analytics.lowStockItems.length : null
  }, {
    id: 'product-pricing',
    titleKey: 'product_pricing',
    icon: Tag,
    roles: ['owner', 'manager']
  }];

  // Customer & Utility Management
  const managementItems = [{
    id: 'customers',
    titleKey: 'customers',
    icon: Users,
    roles: ['owner', 'manager']
  }, {
    id: 'utility-expense',
    titleKey: 'utility_expense',
    icon: Wallet,
    roles: ['owner', 'manager']
  }];

  // Analytics & Settings
  const otherItems = [{
    id: 'analysis-search',
    titleKey: 'analysis_search',
    icon: Search,
    roles: ['owner', 'manager']
  }, {
    id: 'settings',
    titleKey: 'settings',
    icon: Settings,
    roles: ['owner']
  }];
  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
    if (isMobile) setOpenMobile(false);
  };
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };
  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'manager':
        return 'bg-secondary/15 text-secondary-foreground border-secondary/30';
      case 'driver':
        return 'bg-accent/15 text-accent-foreground border-accent/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };
  const renderMenuItem = (item: {
    id: string;
    titleKey: string;
    titleSuffix?: string;
    icon: any;
    roles: string[];
    badge?: number | null;
  }) => {
    const Icon = item.icon;
    const isActive = activeModule === item.id;
    const displayTitle = t(item.titleKey) + (item.titleSuffix || '');
    const button = <SidebarMenuButton onClick={() => handleModuleChange(item.id)} isActive={isActive} className={`relative group transition-all duration-200 h-9 ${isCollapsed ? 'justify-center px-0' : 'px-2'} ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'hover:bg-muted text-muted-foreground hover:text-foreground'}`}>
        <div className={`flex items-center justify-center h-7 w-7 rounded-md shrink-0 transition-all duration-200 ${isActive ? 'bg-white/20' : 'bg-transparent group-hover:bg-primary/10'}`}>
          <Icon className={`h-4 w-4 transition-colors ${isActive ? 'text-primary-foreground' : 'text-muted-foreground group-hover:text-primary'}`} />
        </div>
        {!isCollapsed && <div className="flex items-center justify-between w-full ml-1.5 overflow-hidden">
            <span className="text-sm font-medium truncate">{displayTitle}</span>
            <div className="flex items-center gap-1 shrink-0">
              {item.badge && <Badge variant="secondary" className="h-4 min-w-4 px-1 text-[9px] font-bold bg-destructive text-destructive-foreground border-0">
                  {item.badge}
                </Badge>}
              {isActive && <ChevronRight className="h-3.5 w-3.5 opacity-70" />}
            </div>
          </div>}
        {isCollapsed && item.badge && <Badge className="absolute -top-0.5 -right-0.5 h-3.5 min-w-3.5 p-0 flex items-center justify-center text-[8px] font-bold bg-destructive text-destructive-foreground border-0">
            {item.badge}
          </Badge>}
      </SidebarMenuButton>;
    if (isCollapsed) {
      return <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <SidebarMenuItem className="py-0">{button}</SidebarMenuItem>
          </TooltipTrigger>
          <TooltipContent side="right" className="flex items-center gap-2">
            {displayTitle}
            {item.badge && <Badge className="h-4 min-w-4 px-1 text-[9px] font-bold bg-destructive text-destructive-foreground border-0">
                {item.badge}
              </Badge>}
          </TooltipContent>
        </Tooltip>;
    }
    return <SidebarMenuItem key={item.id} className="py-0">{button}</SidebarMenuItem>;
  };
  const renderNavGroup = (items: {
    id: string;
    titleKey: string;
    titleSuffix?: string;
    icon: any;
    roles: string[];
    badge?: number | null;
  }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;
    return <SidebarGroup className="py-0.5">
        {label && !isCollapsed && <SidebarGroupLabel className="text-[9px] uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 py-1 flex items-center gap-1.5 h-6">
            <CircleDot className="h-1 w-1 text-primary/60" />
            {label}
          </SidebarGroupLabel>}
        <SidebarGroupContent>
          <SidebarMenu className={`gap-0 ${isCollapsed ? 'px-1' : 'px-1.5'}`}>
            {filteredItems.map(renderMenuItem)}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>;
  };
  return <Sidebar collapsible="icon" className="border-r border-border/40 bg-sidebar shadow-lg transition-all duration-300">
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

      {/* User Profile - Only show collapsed avatar */}
      {isCollapsed && (
        <div className="border-b border-border/40 flex justify-center py-2">
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
      )}

      <SidebarContent className="py-1 overflow-x-hidden transition-all duration-300">
        {renderNavGroup(mainNavItems)}
        
        <div className={`mx-3 h-px bg-border/40 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-1'}`} />
        {renderNavGroup(businessItems, 'Business')}
        
        <div className={`mx-3 h-px bg-border/40 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-1'}`} />
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        <div className={`mx-3 h-px bg-border/40 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-1'}`} />
        {renderNavGroup(managementItems, 'Management')}
        
        <div className={`mx-3 h-px bg-border/40 transition-all duration-300 ${isCollapsed ? 'opacity-0 my-0' : 'opacity-100 my-1'}`} />
        {renderNavGroup(otherItems)}
      </SidebarContent>

      {/* Footer */}
      <SidebarFooter className={`border-t border-border/40 transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-0 opacity-0' : 'max-h-20 opacity-100'}`}>
          <Button variant="ghost" size="sm" className="w-full justify-start h-10 px-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-xl" onClick={async () => {
          await supabase.auth.signOut();
          toast({
            title: t("logout")
          });
        }}>
            <LogOut className="h-4 w-4" />
            <span className="ml-2 text-sm font-medium">{t("logout")}</span>
          </Button>
        </div>
        <div className={`flex justify-center transition-all duration-300 ease-out overflow-hidden ${isCollapsed ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'}`}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200 rounded-lg" onClick={async () => {
              await supabase.auth.signOut();
              toast({
                title: t("logout")
              });
            }}>
                <LogOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">{t("logout")}</TooltipContent>
          </Tooltip>
        </div>
      </SidebarFooter>
    </Sidebar>;
};