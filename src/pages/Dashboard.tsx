import { useState, useEffect, useCallback, TouchEvent } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GlobalCommandPalette } from "@/components/dashboard/GlobalCommandPalette";
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
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getNextModule } from "@/hooks/useSwipeNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  const [userRole, setUserRole] = useState<'owner' | 'manager' | 'driver'>('driver');
  const [userName, setUserName] = useState("");
  const [authLoading, setAuthLoading] = useState(true);
  const isMobile = useIsMobile();

  // Swipe gesture state
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const minSwipeDistance = 80;

  const onTouchStart = useCallback((e: TouchEvent<HTMLElement>) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  }, []);

  const onTouchMove = useCallback((e: TouchEvent<HTMLElement>) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      const nextModule = getNextModule(activeModule, 'left', userRole);
      setActiveModule(nextModule);
    }
    if (isRightSwipe) {
      const nextModule = getNextModule(activeModule, 'right', userRole);
      setActiveModule(nextModule);
    }
  }, [touchStart, touchEnd, activeModule, userRole]);

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

  // Listen for module navigation events from other components
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail && typeof e.detail === 'string') {
        setActiveModule(e.detail);
      }
    };

    window.addEventListener('navigate-module', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate-module', handleNavigate as EventListener);
    };
  }, []);

  const {
    salesData,
    stockData,
    cylinderStock,
    drivers,
    customers,
    orders,
    vehicles,
    staff,
    analytics,
    loading,
    refetch,
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
            cylinderStock={cylinderStock}
            userRole={userRole}
            setActiveModule={setActiveModule}
            onRefresh={refetch}
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
      case "lpg-stock-20mm":
        return <LPGStockModule />;
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
      case "deliveries":
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
            cylinderStock={cylinderStock}
            userRole={userRole}
            setActiveModule={setActiveModule}
            onRefresh={refetch}
          />
        );
    }
  };

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/30">
        <AppSidebar
          activeModule={activeModule}
          setActiveModule={setActiveModule}
          userRole={userRole}
          userName={userName}
          analytics={analytics}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userRole={userRole}
            userName={userName}
            onSettingsClick={() => setActiveModule("settings")}
            onProfileClick={() => setActiveModule("profile")}
          />

          {/* Main Content with Swipe Support */}
          <main 
            className="flex-1 overflow-auto pb-mobile-nav"
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchMove={isMobile ? onTouchMove : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
          >
            <div className="container mx-auto p-3 sm:p-4 md:p-6 animate-fade-in max-w-7xl">
              {renderActiveModule()}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activeModule={activeModule}
            setActiveModule={setActiveModule}
            userRole={userRole}
          />
        </div>
        
        {/* Global Command Palette */}
        <GlobalCommandPalette 
          userRole={userRole}
          setActiveModule={setActiveModule}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
