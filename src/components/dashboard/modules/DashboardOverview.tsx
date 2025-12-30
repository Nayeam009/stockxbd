import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Banknote, 
  TrendingUp,
  Truck,
  Receipt,
  Wallet,
  ClipboardList,
  ChefHat,
  Wrench,
  RefreshCw,
  Tag,
  BarChart3,
  Settings,
  Package
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { useLanguage } from "@/contexts/LanguageContext";

interface DashboardOverviewProps {
  analytics: {
    todayRevenue: number;
    monthlyRevenue: number;
    lowStockItems: any[];
    activeOrders: number;
    totalCustomers: number;
    activeDrivers: number;
  };
  drivers: any[];
  userRole: string;
  setActiveModule?: (module: string) => void;
}

export const DashboardOverview = ({ analytics, drivers, userRole, setActiveModule }: DashboardOverviewProps) => {
  const { t } = useLanguage();

  const stats = [
    {
      title: "Today's Revenue",
      value: `${BANGLADESHI_CURRENCY_SYMBOL}${analytics.todayRevenue.toLocaleString()}`,
      change: "+12%",
      changeType: "positive" as const,
      icon: Banknote,
      description: "From today's sales"
    },
    {
      title: "Monthly Revenue",
      value: `${BANGLADESHI_CURRENCY_SYMBOL}${analytics.monthlyRevenue.toLocaleString()}`,
      change: "+23%",
      changeType: "positive" as const,
      icon: TrendingUp,
      description: "This month's total"
    },
    {
      title: "Active Orders",
      value: analytics.activeOrders.toString(),
      change: "+8%",
      changeType: "positive" as const,
      icon: ClipboardList,
      description: "Orders in progress"
    },
    {
      title: "Total Customers",
      value: analytics.totalCustomers.toString(),
      change: "+15%",
      changeType: "positive" as const,
      icon: Users,
      description: "Registered customers"
    }
  ];

  const quickActions = [
    { title: "Point of Sale", icon: Receipt, module: "pos" },
    { title: "Daily Sales", icon: BarChart3, module: "daily-sales" },
    { title: "Daily Expenses", icon: Wallet, module: "daily-expenses" },
    { title: "Orders", icon: ClipboardList, module: "orders" },
    { title: "LPG Stock", icon: Package, module: "lpg-stock" },
    { title: "Gas Stove", icon: ChefHat, module: "stove-stock" },
    { title: "Regulators", icon: Wrench, module: "regulators" },
    { title: "Exchange", icon: RefreshCw, module: "exchange" },
    { title: "Deliveries", icon: Truck, module: "deliveries" },
    { title: "Customers", icon: Users, module: "customers" },
    { title: "Vehicle Cost", icon: Truck, module: "vehicle-cost" },
    { title: "Staff Salary", icon: Banknote, module: "staff-salary" },
    { title: "Product Pricing", icon: Tag, module: "product-pricing" },
    { title: "LPG Community", icon: Users, module: "community" },
    { title: "Analytics", icon: BarChart3, module: "analytics" }
  ];

  const handleQuickAction = (module: string) => {
    if (setActiveModule) {
      setActiveModule(module);
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 px-2 sm:px-0">
      {/* Modern Welcome Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary via-primary-dark to-secondary p-6 sm:p-8 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50"></div>
        <div className="relative z-10">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-primary-foreground/80 text-sm sm:text-base max-w-lg">
            Here's what's happening with your LPG business today. Manage your operations efficiently.
          </p>
        </div>
        <div className="absolute -bottom-8 -right-8 h-32 w-32 rounded-full bg-secondary/20 blur-2xl"></div>
        <div className="absolute -top-8 -left-8 h-24 w-24 rounded-full bg-primary-light/20 blur-2xl"></div>
      </div>

      {/* Stats Cards - Modern Glass Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const gradients = [
            'from-primary/10 to-primary/5',
            'from-secondary/10 to-secondary/5',
            'from-accent/10 to-accent/5',
            'from-info/10 to-info/5'
          ];
          return (
            <Card 
              key={index} 
              className={`group relative overflow-hidden border border-border/50 shadow-md hover:shadow-xl transition-all duration-300 bg-gradient-to-br ${gradients[index]} backdrop-blur-sm hover:-translate-y-1`}
            >
              <div className="absolute top-0 right-0 h-20 w-20 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-9 w-9 sm:h-10 sm:w-10 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  <div className="text-xl sm:text-2xl md:text-3xl font-bold text-foreground">{stat.value}</div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="secondary" 
                      className={`${stat.changeType === 'positive' ? 'bg-accent/20 text-accent' : 'bg-destructive/20 text-destructive'} font-medium text-xs border-0`}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stat.change}
                    </Badge>
                    <span className="text-xs text-muted-foreground hidden sm:inline">{stat.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Driver Status - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && drivers.length > 0 && (
        <Card className="border border-border/50 shadow-md bg-card/80 backdrop-blur-sm">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center">
                <Truck className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle className="text-lg">Driver Status</CardTitle>
                <CardDescription>Real-time driver performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-4 bg-muted/30 rounded-xl border border-border/50 hover:border-primary/30 transition-colors">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-foreground">{driver.name}</h4>
                    <Badge 
                      variant="secondary"
                      className={`text-xs ${
                        driver.status === 'active' ? 'bg-accent/20 text-accent' :
                        driver.status === 'break' ? 'bg-warning/20 text-warning' :
                        'bg-muted text-muted-foreground'
                      }`}
                    >
                      {driver.status}
                    </Badge>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales</span>
                      <span className="font-medium text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{driver.todaySales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deliveries</span>
                      <span className="font-medium text-foreground">{driver.todayDeliveries}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid - Modern Design */}
      <Card className="border border-border/50 shadow-md bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Settings className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-lg">Quick Actions</CardTitle>
              <CardDescription>Access key features instantly</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.module)}
                  className="group flex flex-col items-center justify-center p-4 sm:p-5 rounded-xl border border-border/50 bg-muted/20 hover:bg-primary/10 hover:border-primary/40 transition-all duration-300 min-h-[90px] sm:min-h-[100px]"
                >
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-muted to-muted/50 group-hover:from-primary/20 group-hover:to-secondary/20 flex items-center justify-center mb-2 transition-all duration-300">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:scale-110 transition-transform duration-200" />
                  </div>
                  <span className="text-xs sm:text-sm font-medium text-center text-foreground leading-tight">{action.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
