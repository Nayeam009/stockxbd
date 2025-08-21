import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Package, 
  Users, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Clock, 
  Truck,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Menu
} from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const stats = [
    {
      title: "Total Cylinders",
      value: "1,247",
      change: "+12%",
      changeType: "positive" as const,
      icon: Package,
      description: "Cylinders in inventory"
    },
    {
      title: "Active Orders",
      value: "89",
      change: "+23%",
      changeType: "positive" as const,
      icon: FileText,
      description: "Orders in progress"
    },
    {
      title: "Total Customers",
      value: "456",
      change: "+8%",
      changeType: "positive" as const,
      icon: Users,
      description: "Registered customers"
    },
    {
      title: "Monthly Revenue",
      value: "₹2,34,567",
      change: "+15%",
      changeType: "positive" as const,
      icon: DollarSign,
      description: "This month's earnings"
    }
  ];

  const recentActivities = [
    {
      title: "New order from Rajesh Kumar",
      description: "5x LPG Cylinders - Delivery scheduled",
      time: "5 min ago",
      status: "pending",
      icon: FileText
    },
    {
      title: "Delivery completed",
      description: "Driver #12 completed delivery to Sector 14",
      time: "15 min ago",
      status: "completed",
      icon: CheckCircle
    },
    {
      title: "Low stock alert",
      description: "Gas stove inventory below 20 units",
      time: "1 hour ago",
      status: "warning",
      icon: AlertCircle
    },
    {
      title: "Payment received",
      description: "₹15,000 payment processed successfully",
      time: "2 hours ago",
      status: "completed",
      icon: CreditCard
    }
  ];

  const quickActions = [
    { title: "Add New Order", icon: FileText, color: "bg-primary", path: "/orders/new" },
    { title: "Check Inventory", icon: Package, color: "bg-secondary", path: "/inventory" },
    { title: "View Customers", icon: Users, color: "bg-accent", path: "/customers" },
    { title: "Generate Report", icon: BarChart3, color: "bg-info", path: "/reports" },
    { title: "Track Deliveries", icon: Truck, color: "bg-warning", path: "/deliveries" },
    { title: "Smart ETA", icon: Clock, color: "bg-primary", path: "/eta" }
  ];

  const statusColors = {
    pending: "bg-warning/10 text-warning border-warning/20",
    completed: "bg-accent/10 text-accent border-accent/20",
    warning: "bg-destructive/10 text-destructive border-destructive/20"
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="bg-background border-b border-border shadow-elegant">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center space-x-3">
              <img src={stockXLogo} alt="Stock-X Logo" className="h-8 w-8" />
              <h1 className="text-xl font-bold text-primary">Stock-X Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <Badge variant="secondary">Manager</Badge>
            <div className="flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <span className="text-xs font-semibold text-primary-foreground">JD</span>
              </div>
              <span className="text-sm font-medium text-foreground">John Doe</span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`${sidebarOpen ? 'w-64' : 'w-16'} bg-background border-r border-border transition-all duration-300 hidden lg:block`}>
          <nav className="p-4 space-y-2">
            {quickActions.map((action, index) => {
              const Icon = action.icon;
              return (
                <Button
                  key={index}
                  variant="ghost"
                  className={`w-full justify-start ${sidebarOpen ? 'px-3' : 'px-2'} hover:bg-surface`}
                >
                  <div className={`h-8 w-8 ${action.color} rounded-lg flex items-center justify-center mr-3`}>
                    <Icon className="h-4 w-4 text-white" />
                  </div>
                  {sidebarOpen && <span className="text-sm">{action.title}</span>}
                </Button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6 space-y-6">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-primary">Welcome back, John! 👋</h2>
            <p className="text-muted-foreground">Here's what's happening with your LPG business today.</p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card key={index} className="border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      {stat.title}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="text-2xl font-bold text-primary">{stat.value}</div>
                      <div className="flex items-center space-x-2">
                        <Badge 
                          variant="secondary" 
                          className={stat.changeType === 'positive' ? 'bg-accent/10 text-accent border-accent/20' : 'bg-destructive/10 text-destructive border-destructive/20'}
                        >
                          <TrendingUp className="h-3 w-3 mr-1" />
                          {stat.change}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{stat.description}</span>
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
                <CardTitle className="text-primary">Recent Activities</CardTitle>
                <CardDescription>Latest updates from your LPG operations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {recentActivities.map((activity, index) => {
                  const Icon = activity.icon;
                  return (
                    <div key={index} className="flex items-start space-x-3 p-3 hover:bg-surface rounded-lg transition-colors">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center ${statusColors[activity.status as keyof typeof statusColors]}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <p className="text-sm font-medium text-foreground">{activity.title}</p>
                        <p className="text-xs text-muted-foreground">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">{activity.time}</p>
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
                {quickActions.slice(0, 4).map((action, index) => {
                  const Icon = action.icon;
                  return (
                    <Button
                      key={index}
                      variant="outline"
                      className="w-full justify-start border-border hover:bg-surface hover:border-primary/20"
                    >
                      <div className={`h-6 w-6 ${action.color} rounded flex items-center justify-center mr-3`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm">{action.title}</span>
                    </Button>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;