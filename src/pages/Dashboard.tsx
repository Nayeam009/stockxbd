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
import { MyShopProfileModule } from "@/components/dashboard/modules/MyShopProfileModule";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getNextModule } from "@/hooks/useSwipeNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { Loader2 } from "lucide-react";

const Dashboard = () => {
  const [activeModule, setActiveModule] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");
  
  // Use real authentication - fetch user role from database
  const { userRole, userName, loading: authLoading, error: authError } = useUserRole();
  
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

    // Use actual role for swipe navigation (staff and customer use limited nav)
    const swipeRole = userRole === 'customer' ? 'staff' : userRole;

    if (isLeftSwipe) {
      const nextModule = getNextModule(activeModule, 'left', swipeRole);
      setActiveModule(nextModule);
    }
    if (isRightSwipe) {
      const nextModule = getNextModule(activeModule, 'right', swipeRole);
      setActiveModule(nextModule);
    }
  }, [touchStart, touchEnd, activeModule, userRole]);

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
    loading: dataLoading,
    refetch,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  } = useDashboardData();

  // Combined loading state
  const loading = authLoading || dataLoading;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" aria-label="Loading dashboard" />
          <div className="space-y-2">
            <p className="text-lg font-medium text-foreground">Loading Stock-X Dashboard</p>
            <p className="text-muted-foreground">Preparing your LPG management system...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if auth failed
  if (authError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4 p-6 max-w-md">
          <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-destructive text-xl">!</span>
          </div>
          <h2 className="text-lg font-semibold text-foreground">Failed to Load</h2>
          <p className="text-muted-foreground">{authError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  // Get sanitized role for components that expect specific types
  const dashboardRole = userRole === 'customer' ? 'driver' : userRole;
  const navRole = userRole === 'customer' ? 'driver' : userRole;

  const renderActiveModule = () => {
    switch (activeModule) {
      case "overview":
        return (
          <DashboardOverview
            analytics={analytics}
            drivers={drivers}
            cylinderStock={cylinderStock}
            userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
            setActiveModule={setActiveModule}
            onRefresh={refetch}
          />
        );
      case "pos":
        return <POSModule userRole={dashboardRole as 'owner' | 'manager' | 'driver'} userName={userName} />;
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
      case "my-shop":
        return <MyShopProfileModule />;
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
            userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
          />
        );
      default:
        return (
          <DashboardOverview
            analytics={analytics}
            drivers={drivers}
            cylinderStock={cylinderStock}
            userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
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
          userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
          userName={userName}
          analytics={analytics}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
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
            userRole={navRole as 'owner' | 'manager' | 'driver' | 'staff'}
          />
        </div>
        
        {/* Global Command Palette */}
        <GlobalCommandPalette 
          userRole={dashboardRole as 'owner' | 'manager' | 'driver'}
          setActiveModule={setActiveModule}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
