import { useState } from "react";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardSidebar } from "@/components/dashboard/DashboardSidebar";
import { DashboardOverview } from "@/components/dashboard/modules/DashboardOverview";
import { DailySalesModule } from "@/components/dashboard/modules/DailySalesModule";
import { LPGStockModule } from "@/components/dashboard/modules/LPGStockModule";
import { StoveStockModule } from "@/components/dashboard/modules/StoveStockModule";
import { OnlineDeliveryModule } from "@/components/dashboard/modules/OnlineDeliveryModule";
import { SearchModule } from "@/components/dashboard/modules/SearchModule";
import { useDashboardData } from "@/hooks/useDashboardData";

const Dashboard = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Mock user data - in real app this would come from auth context
  const userRole: 'owner' | 'manager' | 'driver' = "owner"; // Can be 'owner', 'manager', or 'driver'
  const userName = "John Doe";

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

  if (loading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-muted-foreground">Loading dashboard...</p>
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
          />
        );
      case "daily-sales":
        return (
          <DailySalesModule
            salesData={salesData}
            setSalesData={setSalesData}
          />
        );
      case "lpg-stock":
        return (
          <LPGStockModule
            stockData={stockData}
            setStockData={setStockData}
          />
        );
      case "stove-stock":
        return (
          <StoveStockModule
            stockData={stockData}
            setStockData={setStockData}
          />
        );
      case "driver-sales":
        return (
          <DailySalesModule
            salesData={salesData.filter(sale => userRole === 'driver' ? sale.staffName === userName : true)}
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
    <div className="min-h-screen bg-surface">
      <DashboardHeader
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        userRole={userRole}
        userName={userName}
      />

      <div className="flex">
        <DashboardSidebar
          sidebarOpen={sidebarOpen}
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          userRole={userRole}
          analytics={analytics}
        />

        {/* Main Content */}
        <main className="flex-1 p-6">
          {renderActiveModule()}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;