import { useState } from "react";
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
  Settings
} from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";

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
  
  const navigationItems = [
    { id: 'overview', title: 'Dashboard', icon: Home, roles: ['owner', 'manager', 'driver'] },
    { id: 'pos', title: 'Point of Sale', icon: Receipt, roles: ['owner', 'manager', 'driver'] },
    { id: 'daily-sales', title: 'Daily Sales', icon: BarChart3, roles: ['owner', 'manager'] },
    { id: 'daily-expenses', title: 'Daily Expenses', icon: Wallet, roles: ['owner', 'manager'] },
    { id: 'orders', title: 'Orders', icon: ClipboardList, roles: ['owner', 'manager', 'driver'], badge: analytics.activeOrders > 0 ? analytics.activeOrders : null },
    { id: 'lpg-stock', title: 'LPG Stock', icon: Package, roles: ['owner', 'manager'], badge: analytics.lowStockItems.length > 0 ? analytics.lowStockItems.length : null },
    { id: 'stove-stock', title: 'Gas Stove', icon: ChefHat, roles: ['owner', 'manager'] },
    { id: 'regulators', title: 'Regulators', icon: Wrench, roles: ['owner', 'manager'] },
    { id: 'exchange', title: 'Exchange', icon: RefreshCw, roles: ['owner', 'manager', 'driver'] },
    { id: 'deliveries', title: 'Deliveries', icon: Truck, roles: ['owner', 'manager', 'driver'] },
    { id: 'customers', title: 'Customers', icon: Users, roles: ['owner', 'manager'] },
    { id: 'vehicle-cost', title: 'Vehicle Cost', icon: Truck, roles: ['owner', 'manager'] },
    { id: 'staff-salary', title: 'Staff Salary', icon: Banknote, roles: ['owner', 'manager'] },
    { id: 'product-pricing', title: 'Product Pricing', icon: Tag, roles: ['owner', 'manager'] },
    { id: 'community', title: 'LPG Community', icon: Users, roles: ['owner', 'manager', 'driver'] },
    { id: 'analytics', title: 'Analytics', icon: BarChart3, roles: ['owner', 'manager'] },
    { id: 'search', title: 'Search & Reports', icon: Search, roles: ['owner', 'manager'] }
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  const handleModuleChange = (moduleId: string) => {
    setActiveModule(moduleId);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-primary text-primary-foreground';
      case 'manager': return 'bg-secondary text-secondary-foreground';  
      case 'driver': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center space-x-3">
          <img src={stockXLogo} alt="Stock-X Logo" className="h-8 w-8 shrink-0" />
          {open && (
            <div className="animate-fade-in">
              <h2 className="text-lg font-bold text-sidebar-primary">Stock-X</h2>
              <p className="text-xs text-sidebar-foreground/70">LPG Management</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
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
                      className="relative group transition-all duration-200 hover:bg-sidebar-accent"
                    >
                      <Icon className="h-4 w-4" />
                      {open && (
                        <div className="flex items-center justify-between w-full">
                          <span className="font-medium">{item.title}</span>
                          {item.badge && (
                            <Badge 
                              variant="destructive" 
                              className="h-5 px-1.5 text-xs animate-pulse"
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
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        {open ? (
          <div className="space-y-3 animate-fade-in">
            <div className="flex items-center space-x-3 p-3 bg-sidebar-accent rounded-lg">
              <div className="h-10 w-10 bg-gradient-primary rounded-full flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-sidebar-foreground truncate">{userName}</p>
                <div className="flex items-center space-x-2">
                  <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
                  <Badge 
                    variant="secondary" 
                    className={`text-xs ${getRoleColor(userRole)}`}
                  >
                    {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center">
            <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
};