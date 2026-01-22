import { useState, useEffect, useCallback, TouchEvent } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GlobalCommandPalette } from "@/components/dashboard/GlobalCommandPalette";
import { DashboardOverview } from "@/components/dashboard/modules/DashboardOverview";
import { BusinessDiaryModule } from "@/components/dashboard/modules/BusinessDiaryModule";
import { InventoryModule } from "@/components/dashboard/modules/InventoryModule";
import { MarketplaceOrdersModule } from "@/components/dashboard/modules/MarketplaceOrdersModule";
import { AnalysisSearchReportModule } from "@/components/dashboard/modules/AnalysisSearchReportModule";
import { POSModule } from "@/components/dashboard/modules/POSModule";
import { CommunityModule } from "@/components/dashboard/modules/CommunityModule";
import { ProductPricingModule } from "@/components/dashboard/modules/ProductPricingModule";
import { UtilityExpenseModule } from "@/components/dashboard/modules/UtilityExpenseModule";
import { CustomerManagementModule } from "@/components/dashboard/modules/CustomerManagementModule";
import { SettingsModule } from "@/components/dashboard/modules/SettingsModule";
import { ProfileModule } from "@/components/dashboard/modules/ProfileModule";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getNextModule } from "@/hooks/useSwipeNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
const Dashboard = () => {
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  // Development mode - hardcoded owner role (auth disabled)
  const userRole = 'owner' as const;
  const userName = "Shop Owner";
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

  // Auth disabled for development - skipping role fetch

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

  if (loading) {
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
        return <POSModule userRole={userRole} userName={userName} />;
      case "inventory":
      case "pob":
        return <InventoryModule />;
      case "marketplace-orders":
        return <MarketplaceOrdersModule />;
      case "profile":
        return <ProfileModule />;
      case "customers":
        return <CustomerManagementModule />;
      case "settings":
        return <SettingsModule />;
      case "product-pricing":
        return <ProductPricingModule />;
      case "business-diary":
      case "daily-sales":
      case "daily-expenses":
      case "analytics":
      case "driver-sales":
        return <BusinessDiaryModule />;
      case "community":
        return <CommunityModule />;
      case "utility-expense":
      case "staff-salary":
      case "vehicle-cost":
        return <UtilityExpenseModule />;
      case "search":
      case "analysis-search":
        return (
          <AnalysisSearchReportModule
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
