import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/modules/DashboardOverview";
import { DailySalesModule } from "@/components/dashboard/modules/DailySalesModule";
import { LPGStockModule } from "@/components/dashboard/modules/LPGStockModule";
import { RegulatorsModule } from "@/components/dashboard/modules/RegulatorsModule";
import { StoveStockModule } from "@/components/dashboard/modules/StoveStockModule";
import { OnlineDeliveryModule } from "@/components/dashboard/modules/OnlineDeliveryModule";
import { SearchModule } from "@/components/dashboard/modules/SearchModule";
import { POSModule } from "@/components/dashboard/modules/POSModule";
import { useDashboardData } from "@/hooks/useDashboardData";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'driver'>('driver');
  const [userName, setUserName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Fetch user role from database
  useEffect(() => {
    const fetchUserRole = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserName(user.email || "User");
        
        // Fetch role from user_roles table
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', user.id)
          .single();
        
        if (roleData?.role) {
          setUserRole(roleData.role as 'owner' | 'manager' | 'driver');
        }
      }
      setAuthLoading(false);
    };

    fetchUserRole();
  }, []);

  const {
    salesData,
    stockData,
    drivers,
    customers,
    orders,
    vehicles,
    staff,
    analytics,
    loading,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  } = useDashboardData();

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <div className="h-12 w-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading Stock-X Dashboard</p>
            <p className="text-muted-foreground">Preparing your LPG management system...</p>
          </div>
        </div>
      </div>
    );
  }

  const renderActiveModule = () => {
    switch (activeModule) {
      case "overview":
        return (
          <DashboardOverview
            analytics={analytics}
            drivers={drivers}
            userRole={userRole}
            setActiveModule={setActiveModule}
          />
        );
      case "pos":
        return <POSModule />;
      case "daily-expenses":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Daily Expenses</h2>
              <p className="text-muted-foreground">Track and manage daily business expenses</p>
            </div>
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-lg text-muted-foreground">Daily expenses module coming soon...</p>
            </div>
          </div>
        );
      case "orders":
        return (
          <OnlineDeliveryModule
            orders={orders}
            setOrders={setOrders}
            drivers={drivers}
            userRole={userRole}
          />
        );
      case "regulators":
        return <RegulatorsModule />;
      case "exchange":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Cylinder Exchange</h2>
              <p className="text-muted-foreground">Manage cylinder exchange and refill operations</p>
            </div>
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-lg text-muted-foreground">Exchange module coming soon...</p>
            </div>
          </div>
        );
      case "deliveries":
        return (
          <OnlineDeliveryModule
            orders={orders}
            setOrders={setOrders}
            drivers={drivers}
            userRole={userRole}
          />
        );
      case "customers":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Customer Management</h2>
              <p className="text-muted-foreground">Manage customer database and records</p>
            </div>
            <div className="grid gap-4">
              {customers.slice(0, 10).map((customer) => (
                <div key={customer.id} className="p-4 bg-card rounded-lg border border-border shadow-elegant">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{customer.name}</h3>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      <p className="text-sm text-muted-foreground">{customer.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{customer.totalOrders} orders</p>
                      <p className="text-sm text-muted-foreground">৳{customer.outstanding} outstanding</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "product-pricing":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Product Pricing</h2>
              <p className="text-muted-foreground">Manage product prices and rates</p>
            </div>
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-lg text-muted-foreground">Product pricing module coming soon...</p>
            </div>
          </div>
        );
      case "analytics":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Business Analytics</h2>
              <p className="text-muted-foreground">View detailed business reports and insights</p>
            </div>
            <div className="text-center py-12 bg-card rounded-lg border border-border">
              <p className="text-lg text-muted-foreground">Analytics module coming soon...</p>
            </div>
          </div>
        );
      case "daily-sales":
        return (
          <DailySalesModule
            salesData={salesData}
            setSalesData={setSalesData}
          />
        );
      case "lpg-stock":
        return <LPGStockModule size="22mm" />;
      case "lpg-stock-20mm":
        return <LPGStockModule size="20mm" />;
      case "stove-stock":
        return <StoveStockModule />;
      case "driver-sales":
        return (
          <DailySalesModule
            salesData={salesData.filter(sale => sale.staffName === userName)}
            setSalesData={setSalesData}
          />
        );
      case "community":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">LPG Community Management</h2>
              <p className="text-muted-foreground">Manage customer database and community activities</p>
            </div>
            <div className="grid gap-6">
              {customers.slice(0, 10).map((customer) => (
                <div key={customer.id} className="p-4 bg-background rounded-lg border border-border shadow-elegant">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{customer.name}</h3>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                      <p className="text-sm text-muted-foreground">{customer.address}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{customer.totalOrders} orders</p>
                      <p className="text-sm text-muted-foreground">₹{customer.outstanding} outstanding</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "staff-salary":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Staff Salary Management</h2>
              <p className="text-muted-foreground">Handle payroll and salary records</p>
            </div>
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Staff salary module coming soon...</p>
            </div>
          </div>
        );
      case "vehicle-cost":
        return (
          <div className="space-y-6">
            <div>
              <h2 className="text-3xl font-bold text-primary">Vehicle Cost Management</h2>
              <p className="text-muted-foreground">Monitor vehicle expenses and maintenance</p>
            </div>
            <div className="text-center py-12">
              <p className="text-lg text-muted-foreground">Vehicle cost module coming soon...</p>
            </div>
          </div>
        );
      case "online-delivery":
        return (
          <OnlineDeliveryModule
            orders={orders}
            setOrders={setOrders}
            drivers={drivers}
            userRole={userRole}
          />
        );
      case "search":
        return (
          <SearchModule
            salesData={salesData}
            customers={customers}
            stockData={stockData}
            drivers={drivers}
            userRole={userRole}
          />
        );
      default:
        return (
          <DashboardOverview
            analytics={analytics}
            drivers={drivers}
            userRole={userRole}
          />
        );
    }
  };

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          userRole={userRole}
          userName={userName}
          analytics={analytics}
        />

        <div className="flex-1 flex flex-col overflow-hidden">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userRole={userRole}
            userName={userName}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 animate-fade-in">
              {renderActiveModule()}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;