import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BarChart3,
  Package,
  ChefHat,
  Users,
  FileText,
  UserCheck,
  IndianRupee,
  Truck,
  ShoppingCart,
  Search,
  Home,
  Bell
} from "lucide-react";

interface DashboardSidebarProps {
  sidebarOpen: boolean;
  activeModule: string;
  setActiveModule: (module: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
  analytics: {
    lowStockItems: any[];
    activeOrders: number;
  };
}

export const DashboardSidebar = ({ 
  sidebarOpen, 
  activeModule, 
  setActiveModule, 
  userRole,
  analytics 
}: DashboardSidebarProps) => {
  
  const navigationItems = [
    { 
      id: 'overview', 
      title: 'Dashboard', 
      icon: Home, 
      color: 'bg-primary', 
      roles: ['owner', 'manager', 'driver'] 
    },
    { 
      id: 'daily-sales', 
      title: 'Daily Sales', 
      icon: BarChart3, 
      color: 'bg-secondary', 
      roles: ['owner', 'manager'],
      badge: null
    },
    { 
      id: 'lpg-stock', 
      title: 'LPG Stock', 
      icon: Package, 
      color: 'bg-accent', 
      roles: ['owner', 'manager'],
      badge: analytics.lowStockItems.length > 0 ? analytics.lowStockItems.length : null
    },
    { 
      id: 'stove-stock', 
      title: 'Stove Stock', 
      icon: ChefHat, 
      color: 'bg-info', 
      roles: ['owner', 'manager'] 
    },
    { 
      id: 'driver-sales', 
      title: 'Driver Sales', 
      icon: UserCheck, 
      color: 'bg-warning', 
      roles: ['owner', 'manager', 'driver'] 
    },
    { 
      id: 'community', 
      title: 'LPG Community', 
      icon: Users, 
      color: 'bg-primary', 
      roles: ['owner', 'manager', 'driver'] 
    },
    { 
      id: 'staff-salary', 
      title: 'Staff Salary', 
      icon: IndianRupee, 
      color: 'bg-secondary', 
      roles: ['owner', 'manager'] 
    },
    { 
      id: 'vehicle-cost', 
      title: 'Vehicle Cost', 
      icon: Truck, 
      color: 'bg-accent', 
      roles: ['owner', 'manager'] 
    },
    { 
      id: 'online-delivery', 
      title: 'Online Delivery', 
      icon: ShoppingCart, 
      color: 'bg-info', 
      roles: ['owner', 'manager', 'driver'],
      badge: analytics.activeOrders > 0 ? analytics.activeOrders : null
    },
    { 
      id: 'search', 
      title: 'Search & Reports', 
      icon: Search, 
      color: 'bg-warning', 
      roles: ['owner', 'manager'] 
    }
  ];

  const filteredItems = navigationItems.filter(item => 
    item.roles.includes(userRole)
  );

  return (
    <aside className={`${
      sidebarOpen ? 'w-64' : 'w-16'
    } bg-background border-r border-border transition-all duration-300 hidden lg:block`}>
      
      <nav className="p-4 space-y-2">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeModule === item.id;
          
          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={`w-full justify-start ${
                sidebarOpen ? 'px-3' : 'px-2'
              } ${
                isActive 
                  ? 'bg-primary text-primary-foreground shadow-md' 
                  : 'hover:bg-surface hover:text-foreground'
              } transition-all duration-200`}
              onClick={() => setActiveModule(item.id)}
            >
              <div className={`h-8 w-8 ${
                isActive ? 'bg-primary-light' : item.color
              } rounded-lg flex items-center justify-center mr-3 relative`}>
                <Icon className="h-4 w-4 text-white" />
                {item.badge && (
                  <Badge className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs">
                    {item.badge}
                  </Badge>
                )}
              </div>
              {sidebarOpen && (
                <div className="flex items-center justify-between w-full">
                  <span className="text-sm font-medium">{item.title}</span>
                  {item.badge && !isActive && (
                    <Badge variant="secondary" className="ml-2 h-5 text-xs">
                      {item.badge}
                    </Badge>
                  )}
                </div>
              )}
            </Button>
          );
        })}
      </nav>

      {/* User Role Info */}
      {sidebarOpen && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-surface rounded-lg p-3 border border-border">
            <div className="flex items-center space-x-2">
              <div className="h-2 w-2 bg-accent rounded-full animate-pulse"></div>
              <span className="text-xs text-muted-foreground">
                Logged in as {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};