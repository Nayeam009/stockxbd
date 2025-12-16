import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Users, 
  FileText, 
  Banknote, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  Receipt,
  Wallet,
  ClipboardList,
  ChefHat,
  Wrench,
  RefreshCw,
  Tag,
  BarChart3,
  Settings
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

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
      icon: FileText,
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

  const recentActivities = [
    {
      title: "New order from Abdul Rahman",
      description: `3x 12kg LPG Cylinders - ${BANGLADESHI_CURRENCY_SYMBOL}3,600`,
      time: "5 min ago",
      status: "pending",
      icon: FileText
    },
    {
      title: "Delivery completed",
      description: "Driver Mohammad Karim completed delivery in Dhanmondi",
      time: "15 min ago",
      status: "completed",
      icon: CheckCircle
    },
    {
      title: "Low stock alert",
      description: `${analytics.lowStockItems.length} items below minimum stock`,
      time: "1 hour ago",
      status: "warning",
      icon: AlertCircle
    },
    {
      title: "Payment received",
      description: `${BANGLADESHI_CURRENCY_SYMBOL}18,000 payment processed via bKash`,
      time: "2 hours ago",
      status: "completed",
      icon: Banknote
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

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <div className="space-y-8">
      {/* Welcome Section */}
      <div className="space-y-3 animate-fade-in">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome back! 👋
        </h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening with your LPG business in Bangladesh today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <Card 
              key={index} 
              className="group border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 bg-gradient-to-br from-card to-muted/20 hover:scale-105 animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
                <div className="h-10 w-10 bg-gradient-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-200">
                  <Icon className="h-5 w-5 text-primary-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="text-3xl font-bold text-primary">{stat.value}</div>
                  <div className="flex items-center space-x-2">
                    <Badge 
                      variant="secondary" 
                      className={`${stat.changeType === 'positive' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'} font-medium`}
                    >
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {stat.change}
                    </Badge>
                    <span className="text-sm text-muted-foreground">{stat.description}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid lg:grid-cols-1 gap-6">
        {/* Recent Activities */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="h-5 w-5 mr-2" />
              Recent Activities
            </CardTitle>
            <CardDescription>Latest updates from your LPG operations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentActivities.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start space-x-3 p-4 hover:bg-surface rounded-lg transition-colors">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusColors[activity.status as keyof typeof statusColors]}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-foreground">{activity.title}</p>
                    <p className="text-xs text-muted-foreground">{activity.description}</p>
                    <p className="text-xs text-muted-foreground font-medium">{activity.time}</p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* Driver Status - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && (
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-primary">Driver Status</CardTitle>
            <CardDescription>Real-time driver performance and status</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {drivers.map((driver) => (
                <div key={driver.id} className="p-4 bg-surface rounded-lg border border-border">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-foreground">{driver.name}</h4>
                    <Badge 
                      variant="secondary"
                      className={
                        driver.status === 'active' ? 'bg-accent/10 text-accent border-accent/20' :
                        driver.status === 'break' ? 'bg-warning/10 text-warning border-warning/20' :
                        'bg-muted text-muted-foreground border-muted/20'
                      }
                    >
                      {driver.status}
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm">
                    <p className="text-muted-foreground">Today's Sales: <span className="font-medium text-foreground">{BANGLADESHI_CURRENCY_SYMBOL}{driver.todaySales.toLocaleString()}</span></p>
                    <p className="text-muted-foreground">Deliveries: <span className="font-medium text-foreground">{driver.todayDeliveries}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Full Quick Actions Grid */}
      <Card className="border-0 shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-primary text-xl">Quick Actions</CardTitle>
              <CardDescription>Access key features of your business management.</CardDescription>
            </div>
            <Settings className="h-5 w-5 text-muted-foreground cursor-pointer hover:text-primary transition-colors" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-8 gap-4">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleQuickAction(action.module)}
                  className="flex flex-col items-center justify-center p-5 rounded-xl border border-border bg-card hover:bg-surface hover:border-primary/40 hover:shadow-lg transition-all duration-300 group min-h-[100px]"
                >
                  <Icon className="h-7 w-7 text-primary mb-3 group-hover:scale-110 transition-transform duration-200" />
                  <span className="text-sm font-medium text-center text-foreground leading-tight">{action.title}</span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};