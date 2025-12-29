import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { DashboardOverview } from "@/components/dashboard/modules/DashboardOverview";
import { DailySalesModule } from "@/components/dashboard/modules/DailySalesModule";
import { DailyExpensesModule } from "@/components/dashboard/modules/DailyExpensesModule";
import { AnalysisModule } from "@/components/dashboard/modules/AnalysisModule";
import { LPGStockModule } from "@/components/dashboard/modules/LPGStockModule";
import { RegulatorsModule } from "@/components/dashboard/modules/RegulatorsModule";
import { StoveStockModule } from "@/components/dashboard/modules/StoveStockModule";
import { OnlineDeliveryModule } from "@/components/dashboard/modules/OnlineDeliveryModule";
import { SearchModule } from "@/components/dashboard/modules/SearchModule";
import { POSModule } from "@/components/dashboard/modules/POSModule";
import { CommunityModule } from "@/components/dashboard/modules/CommunityModule";
import { ProductPricingModule } from "@/components/dashboard/modules/ProductPricingModule";
import { VehicleCostModule } from "@/components/dashboard/modules/VehicleCostModule";
import { StaffSalaryModule } from "@/components/dashboard/modules/StaffSalaryModule";
import { CustomerManagementModule } from "@/components/dashboard/modules/CustomerManagementModule";
import { SettingsModule } from "@/components/dashboard/modules/SettingsModule";
import { ProfileModule } from "@/components/dashboard/modules/ProfileModule";
import { ExchangeModule } from "@/components/dashboard/modules/ExchangeModule";
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
        return <DailyExpensesModule />;
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
        return <ExchangeModule />;
      case "profile":
        return <ProfileModule />;
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
        return <CustomerManagementModule />;
      case "settings":
        return <SettingsModule />;
      case "product-pricing":
        return <ProductPricingModule />;
      case "analytics":
        return <AnalysisModule />;
      case "daily-sales":
        return <DailySalesModule />;
      case "lpg-stock":
        return <LPGStockModule size="22mm" />;
      case "lpg-stock-20mm":
        return <LPGStockModule size="20mm" />;
      case "stove-stock":
        return <StoveStockModule />;
      case "driver-sales":
        return <DailySalesModule />;
      case "community":
        return <CommunityModule />;
      case "staff-salary":
        return <StaffSalaryModule />;
      case "vehicle-cost":
        return <VehicleCostModule />;
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
            onSettingsClick={() => setActiveModule("settings")}
            onProfileClick={() => setActiveModule("profile")}
          />

          {/* Main Content */}
          <main className="flex-1 overflow-auto bg-gradient-to-b from-background to-muted/30">
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