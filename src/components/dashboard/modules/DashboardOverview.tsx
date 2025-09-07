import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Users, 
  FileText, 
  IndianRupee, 
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Truck,
  ShoppingCart
} from "lucide-react";

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
}

export const DashboardOverview = ({ analytics, drivers, userRole }: DashboardOverviewProps) => {
  const stats = [
    {
      title: "Today's Revenue",
      value: `₹${analytics.todayRevenue.toLocaleString()}`,
      change: "+12%",
      changeType: "positive" as const,
      icon: IndianRupee,
      description: "From today's sales"
    },
    {
      title: "Monthly Revenue",
      value: `₹${analytics.monthlyRevenue.toLocaleString()}`,
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
      title: "New order from Rajesh Kumar",
      description: "3x 12kg LPG Cylinders - ₹2,850",
      time: "5 min ago",
      status: "pending",
      icon: FileText
    },
    {
      title: "Delivery completed",
      description: "Driver Suresh completed delivery in Sector 14",
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
      description: "₹15,000 payment processed via UPI",
      time: "2 hours ago",
      status: "completed",
      icon: IndianRupee
    }
  ];

  const quickActions = [
    { title: "Add New Order", icon: FileText, color: "bg-primary", module: "online-delivery" },
    { title: "Check Stock", icon: Package, color: "bg-secondary", module: "lpg-stock" },
    { title: "View Customers", icon: Users, color: "bg-accent", module: "community" },
    { title: "Driver Performance", icon: Truck, color: "bg-info", module: "driver-sales" },
    { title: "Daily Sales", icon: TrendingUp, color: "bg-warning", module: "daily-sales" },
    { title: "Delivery Status", icon: ShoppingCart, color: "bg-primary", module: "online-delivery" }
  ];

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
          Here's what's happening with your LPG business today.
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

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activities */}
        <Card className="lg:col-span-2 border-0 shadow-elegant">
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

        {/* Quick Actions */}
        <Card className="border-0 shadow-elegant">
          <CardHeader>
            <CardTitle className="text-primary">Quick Actions</CardTitle>
            <CardDescription>Frequently used features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {quickActions.slice(0, userRole === 'driver' ? 4 : 6).map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="outline"
                  className="w-full justify-start border-border hover:bg-surface hover:border-primary/20 transition-all duration-200"
                >
                  <div className={`h-8 w-8 ${action.color} rounded-lg flex items-center justify-center mr-3`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  <span className="text-sm font-medium">{action.title}</span>
                </Button>
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
                    <p className="text-muted-foreground">Today's Sales: <span className="font-medium text-foreground">₹{driver.todaySales.toLocaleString()}</span></p>
                    <p className="text-muted-foreground">Deliveries: <span className="font-medium text-foreground">{driver.todayDeliveries}</span></p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};