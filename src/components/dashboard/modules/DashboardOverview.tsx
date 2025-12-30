import { useState, useEffect } from "react";
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
import { supabase } from "@/integrations/supabase/client";
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

interface RecentActivity {
  id: string;
  title: string;
  description: string;
  time: string;
  status: 'pending' | 'completed' | 'warning';
  icon: any;
}

export const DashboardOverview = ({ analytics, drivers, userRole, setActiveModule }: DashboardOverviewProps) => {
  const { t, language } = useLanguage();
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);

  useEffect(() => {
    const fetchRecentActivities = async () => {
      try {
        const activities: RecentActivity[] = [];

        // Fetch recent orders
        const { data: recentOrders } = await supabase
          .from('orders')
          .select('id, customer_name, total_amount, status, created_at')
          .order('created_at', { ascending: false })
          .limit(3);

        if (recentOrders) {
          recentOrders.forEach(order => {
            const timeAgo = getTimeAgo(new Date(order.created_at));
            activities.push({
              id: `order-${order.id}`,
              title: order.status === 'delivered' ? 'Delivery completed' : `New order from ${order.customer_name}`,
              description: order.status === 'delivered' 
                ? `Order delivered to ${order.customer_name}`
                : `Order total: ${BANGLADESHI_CURRENCY_SYMBOL}${order.total_amount.toLocaleString()}`,
              time: timeAgo,
              status: order.status === 'delivered' ? 'completed' : order.status === 'pending' ? 'pending' : 'completed',
              icon: order.status === 'delivered' ? CheckCircle : FileText
            });
          });
        }

        // Fetch recent POS transactions
        const { data: recentTransactions } = await supabase
          .from('pos_transactions')
          .select('id, transaction_number, total, payment_method, created_at')
          .order('created_at', { ascending: false })
          .limit(2);

        if (recentTransactions) {
          recentTransactions.forEach(txn => {
            const timeAgo = getTimeAgo(new Date(txn.created_at));
            activities.push({
              id: `txn-${txn.id}`,
              title: 'Payment received',
              description: `${BANGLADESHI_CURRENCY_SYMBOL}${Number(txn.total).toLocaleString()} via ${txn.payment_method}`,
              time: timeAgo,
              status: 'completed',
              icon: Banknote
            });
          });
        }

        // Add low stock alert if any
        if (analytics.lowStockItems.length > 0) {
          activities.push({
            id: 'low-stock',
            title: 'Low stock alert',
            description: `${analytics.lowStockItems.length} items below minimum stock`,
            time: 'Now',
            status: 'warning',
            icon: AlertCircle
          });
        }

        // Sort by time (most recent first)
        setRecentActivities(activities.slice(0, 5));
      } catch (error) {
        console.error('Error fetching activities:', error);
      } finally {
        setLoadingActivities(false);
      }
    };

    fetchRecentActivities();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => {
        fetchRecentActivities();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pos_transactions' }, () => {
        fetchRecentActivities();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [analytics.lowStockItems.length]);

  const getTimeAgo = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  };

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
    <div className="space-y-4 sm:space-y-6 md:space-y-8 px-1 sm:px-0">
      {/* Welcome Section */}
      <div className="space-y-2 sm:space-y-3 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Welcome back! 👋
        </h1>
        <p className="text-sm sm:text-base md:text-lg text-muted-foreground">
          Here's what's happening with your LPG business today.
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
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
            {loadingActivities ? (
              <div className="text-center py-8 text-muted-foreground">Loading activities...</div>
            ) : recentActivities.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No recent activities. Start by creating orders or making sales!</div>
            ) : (
              recentActivities.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start space-x-3 p-4 hover:bg-surface rounded-lg transition-colors">
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center ${statusColors[activity.status]}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">{activity.description}</p>
                      <p className="text-xs text-muted-foreground font-medium">{activity.time}</p>
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Driver Status - Only for owner/manager */}
      {(userRole === 'owner' || userRole === 'manager') && drivers.length > 0 && (
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
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2 sm:gap-3 md:gap-4">
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
