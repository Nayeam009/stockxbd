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
    <div className="space-y-4 sm:space-y-6 lg:space-y-8 px-1 sm:px-2 md:px-0">
      {/* Modern Welcome Section with Gradient Background */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl hero-gradient p-4 sm:p-6 lg:p-8 text-primary-foreground shadow-xl">
        <div className="absolute inset-0 opacity-20" style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }} />
        <div className="relative z-10">
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-extrabold mb-1 sm:mb-2">
            Welcome back! 👋
          </h1>
          <p className="text-white/80 text-xs sm:text-sm md:text-base max-w-lg">
            Here's what's happening with your LPG business today. Manage your operations efficiently.
          </p>
        </div>
        <div className="absolute -bottom-12 -right-12 h-28 sm:h-40 w-28 sm:w-40 rounded-full bg-secondary/30 blur-3xl float-animation"></div>
        <div className="absolute -top-12 -left-12 h-24 sm:h-32 w-24 sm:w-32 rounded-full bg-accent/20 blur-3xl float-animation" style={{ animationDelay: '3s' }}></div>
      </div>

      {/* Stats Cards - Modern Glass Design */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4 lg:gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          const iconGradients = [
            'from-primary to-primary-light',
            'from-secondary to-secondary-light',
            'from-accent to-accent-light',
            'from-success to-accent'
          ];
          return (
            <Card 
              key={index} 
              className="group relative overflow-hidden border border-border/40 shadow-md sm:shadow-lg hover:shadow-xl transition-all duration-500 bg-card hover:-translate-y-1 sm:hover:-translate-y-2"
            >
              <div className="absolute top-0 right-0 h-16 sm:h-24 w-16 sm:w-24 bg-gradient-to-bl from-primary/5 to-transparent rounded-bl-full transition-all duration-500 group-hover:from-primary/10"></div>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 p-3 sm:p-4 pb-1 sm:pb-2">
                <CardTitle className="text-[10px] sm:text-xs lg:text-sm font-medium text-muted-foreground truncate pr-2">
                  {stat.title}
                </CardTitle>
                <div className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 bg-gradient-to-br ${iconGradients[index]} rounded-lg sm:rounded-xl flex items-center justify-center shadow-md sm:shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500 flex-shrink-0`}>
                  <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 pt-0">
                <div className="space-y-1 sm:space-y-2">
                  <div className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-extrabold text-foreground truncate">{stat.value}</div>
                  <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                    <Badge 
                      className={`${stat.changeType === 'positive' ? 'bg-success/15 text-success border-success/30' : 'bg-destructive/15 text-destructive border-destructive/30'} font-semibold text-[10px] sm:text-xs border px-1 sm:px-1.5`}
                    >
                      <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-0.5 sm:mr-1" />
                      {stat.change}
                    </Badge>
                    <span className="text-[10px] sm:text-xs text-muted-foreground hidden lg:inline truncate">{stat.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Driver Status - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && drivers.length > 0 && (
        <Card className="border border-border/40 shadow-md sm:shadow-lg bg-card overflow-hidden">
          <CardHeader className="p-3 sm:p-4 lg:pb-4 bg-gradient-to-r from-accent/5 to-transparent border-b border-border/40">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-accent to-accent-light flex items-center justify-center shadow-md flex-shrink-0">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-accent-foreground" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-base sm:text-lg font-bold truncate">Driver Status</CardTitle>
                <CardDescription className="text-xs sm:text-sm truncate">Real-time driver performance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 lg:pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-3 sm:p-4 bg-muted/30 rounded-lg sm:rounded-xl border border-border/40 hover:border-primary/40 hover:shadow-md transition-all duration-300 group">
                  <div className="flex items-center justify-between mb-2 sm:mb-3 gap-2">
                    <h4 className="font-semibold text-sm sm:text-base text-foreground group-hover:text-primary transition-colors truncate">{driver.name}</h4>
                    <Badge 
                      className={`text-[10px] sm:text-xs font-semibold border flex-shrink-0 ${
                        driver.status === 'active' ? 'bg-success/15 text-success border-success/30' :
                        driver.status === 'break' ? 'bg-warning/15 text-warning border-warning/30' :
                        'bg-muted text-muted-foreground border-border'
                      }`}
                    >
                      {driver.status}
                    </Badge>
                  </div>
                  <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sales</span>
                      <span className="font-bold text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{driver.todaySales.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Deliveries</span>
                      <span className="font-bold text-foreground">{driver.todayDeliveries}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions Grid - Modern Design */}
      <Card className="border border-border/40 shadow-md sm:shadow-lg bg-card overflow-hidden">
        <CardHeader className="p-3 sm:p-4 lg:pb-4 bg-gradient-to-r from-primary/5 to-transparent border-b border-border/40">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center shadow-md flex-shrink-0">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-base sm:text-lg font-bold truncate">Quick Actions</CardTitle>
              <CardDescription className="text-xs sm:text-sm truncate">Access key features instantly</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-3 sm:p-4 lg:pt-6">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 lg:gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.module)}
                  className="group flex flex-col items-center justify-center p-2.5 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl border border-border/40 bg-muted/20 hover:bg-primary/10 hover:border-primary/40 hover:shadow-lg transition-all duration-300 min-h-[70px] sm:min-h-[90px] lg:min-h-[100px]"
                >
                  <div className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 rounded-lg sm:rounded-xl bg-gradient-to-br from-muted to-muted/30 group-hover:from-primary/20 group-hover:to-secondary/20 flex items-center justify-center mb-1.5 sm:mb-2 transition-all duration-300 group-hover:scale-110">
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-primary transition-transform duration-200" />
                  </div>
                  <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-center text-foreground leading-tight line-clamp-2">{action.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
