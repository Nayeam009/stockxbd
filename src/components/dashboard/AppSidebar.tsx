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
  
  const mainNavItems = [
    { id: 'overview', title: 'Dashboard', icon: Home, roles: ['owner', 'manager', 'driver'] },
    { id: 'pos', title: 'Point of Sale', icon: Receipt, roles: ['owner', 'manager', 'driver'] },
  ];

  const salesItems = [
    { id: 'daily-sales', title: 'Daily Sales', icon: BarChart3, roles: ['owner', 'manager'] },
    { id: 'daily-expenses', title: 'Daily Expenses', icon: Wallet, roles: ['owner', 'manager'] },
    { id: 'analytics', title: 'Analytics', icon: BarChart3, roles: ['owner', 'manager'] },
  ];

  const inventoryItems = [
    { id: 'lpg-stock', title: 'LPG Stock (22mm)', icon: Flame, roles: ['owner', 'manager'], badge: analytics.lowStockItems.length > 0 ? analytics.lowStockItems.length : null },
    { id: 'lpg-stock-20mm', title: 'LPG Stock (20mm)', icon: Flame, roles: ['owner', 'manager'] },
    { id: 'stove-stock', title: 'Gas Stove', icon: ChefHat, roles: ['owner', 'manager'] },
    { id: 'regulators', title: 'Regulators', icon: Wrench, roles: ['owner', 'manager'] },
    { id: 'product-pricing', title: 'Product Pricing', icon: Tag, roles: ['owner', 'manager'] },
  ];

  const operationsItems = [
    { id: 'orders', title: 'Orders', icon: ClipboardList, roles: ['owner', 'manager', 'driver'], badge: analytics.activeOrders > 0 ? analytics.activeOrders : null },
    { id: 'deliveries', title: 'Deliveries', icon: Truck, roles: ['owner', 'manager', 'driver'] },
    { id: 'exchange', title: 'Exchange', icon: RefreshCw, roles: ['owner', 'manager', 'driver'] },
  ];

  const managementItems = [
    { id: 'customers', title: 'Customers', icon: Users, roles: ['owner', 'manager'] },
    { id: 'staff-salary', title: 'Staff Salary', icon: Banknote, roles: ['owner', 'manager'] },
    { id: 'vehicle-cost', title: 'Vehicle Cost', icon: Truck, roles: ['owner', 'manager'] },
  ];

  const otherItems = [
    { id: 'community', title: 'LPG Community', icon: Users, roles: ['owner', 'manager', 'driver'] },
    { id: 'search', title: 'Search & Reports', icon: Search, roles: ['owner', 'manager'] },
    { id: 'settings', title: 'Settings', icon: Settings, roles: ['owner', 'manager'] },
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

  const renderNavGroup = (items: { id: string; title: string; icon: any; roles: string[]; badge?: number | null }[], label?: string) => {
    const filteredItems = items.filter(item => item.roles.includes(userRole));
    if (filteredItems.length === 0) return null;

    return (
      <SidebarGroup>
        {label && open && (
          <SidebarGroupLabel className="text-xs uppercase tracking-wider text-muted-foreground/70 font-semibold px-3 mb-1">
            {label}
          </SidebarGroupLabel>
        )}
        <SidebarGroupContent>
          <SidebarMenu>
            {filteredItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeModule === item.id;
              
              return (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => handleModuleChange(item.id)}
                    isActive={isActive}
                    className={`relative group transition-all duration-200 rounded-lg mx-2 ${
                      isActive 
                        ? 'bg-primary/10 text-primary border-l-2 border-primary' 
                        : 'hover:bg-accent/50 text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
                    {open && (
                      <div className="flex items-center justify-between w-full">
                        <span className={`font-medium ${isActive ? 'text-primary' : ''}`}>{item.title}</span>
                        {item.badge && (
                          <Badge 
                            variant="destructive" 
                            className="h-5 px-1.5 text-xs animate-pulse ml-2"
                          >
                            {item.badge}
                          </Badge>
                        )}
                      </div>
                    )}
                    {!open && item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs animate-pulse"
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
    <Sidebar collapsible="icon" className="border-r border-border/50 bg-sidebar">
      <SidebarHeader className="border-b border-border/50 p-4">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <img src={stockXLogo} alt="Stock-X Logo" className="h-10 w-10 shrink-0 rounded-lg" />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-500 rounded-full border-2 border-sidebar"></div>
          </div>
          {open && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">Stock-X</h2>
              <p className="text-xs text-muted-foreground">LPG Management System</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="py-2">
        {renderNavGroup(mainNavItems)}
        
        {open && <Separator className="my-2 mx-4 bg-border/50" />}
        {renderNavGroup(salesItems, 'Sales & Finance')}
        
        {open && <Separator className="my-2 mx-4 bg-border/50" />}
        {renderNavGroup(inventoryItems, 'Inventory')}
        
        {open && <Separator className="my-2 mx-4 bg-border/50" />}
        {renderNavGroup(operationsItems, 'Operations')}
        
        {open && <Separator className="my-2 mx-4 bg-border/50" />}
        {renderNavGroup(managementItems, 'Management')}
        
        {open && <Separator className="my-2 mx-4 bg-border/50" />}
        {renderNavGroup(otherItems, 'Other')}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/50 p-4">
        {open ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center space-x-3 p-3 bg-accent/30 rounded-xl border border-border/50">
              <div className="h-10 w-10 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center shrink-0 shadow-lg">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge 
                    className={`text-xs ${getRoleColor(userRole)} border-0`}
                  >
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-muted-foreground hover:text-foreground hover:bg-accent/50"
              onClick={async () => {
                await supabase.auth.signOut();
                toast({ title: "Signed out successfully" });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 bg-gradient-to-br from-primary to-orange-400 rounded-full flex items-center justify-center shadow-lg">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
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
