import { useState, useEffect, useCallback, TouchEvent, Suspense, lazy, useTransition } from "react";
import { useLocation, useNavigate, Navigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { GlobalCommandPalette } from "@/components/dashboard/GlobalCommandPalette";
import { MobileBottomNav } from "@/components/dashboard/MobileBottomNav";
import { ModuleSkeleton, QuickLoader } from "@/components/dashboard/ModuleSkeleton";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { OfflineErrorBoundary } from "@/components/shared/OfflineErrorBoundary";
import { useDashboardData } from "@/hooks/useDashboardData";
import { getNextModule } from "@/hooks/useSwipeNavigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useUserRole } from "@/hooks/useUserRole";
import { useNetwork } from "@/contexts/NetworkContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

// Lazy load heavy modules for faster initial render
const DashboardOverview = lazy(() => import("@/components/dashboard/modules/DashboardOverview").then(m => ({ default: m.DashboardOverview })));
const BusinessDiaryModule = lazy(() => import("@/components/dashboard/modules/BusinessDiaryModule").then(m => ({ default: m.BusinessDiaryModule })));
const InventoryModule = lazy(() => import("@/components/dashboard/modules/InventoryModule").then(m => ({ default: m.InventoryModule })));
const MarketplaceOrdersModule = lazy(() => import("@/components/dashboard/modules/MarketplaceOrdersModule").then(m => ({ default: m.MarketplaceOrdersModule })));
const AnalysisSearchReportModule = lazy(() => import("@/components/dashboard/modules/AnalysisSearchReportModule").then(m => ({ default: m.AnalysisSearchReportModule })));
const POSModule = lazy(() => import("@/components/dashboard/modules/POSModule").then(m => ({ default: m.POSModule })));
const CommunityModule = lazy(() => import("@/components/dashboard/modules/CommunityModule").then(m => ({ default: m.CommunityModule })));
const ProductPricingModule = lazy(() => import("@/components/dashboard/modules/ProductPricingModule").then(m => ({ default: m.ProductPricingModule })));
const UtilityExpenseModule = lazy(() => import("@/components/dashboard/modules/UtilityExpenseModule").then(m => ({ default: m.UtilityExpenseModule })));
const CustomerManagementModule = lazy(() => import("@/components/dashboard/modules/CustomerManagementModule").then(m => ({ default: m.CustomerManagementModule })));
const SettingsModule = lazy(() => import("@/components/dashboard/modules/SettingsModule").then(m => ({ default: m.SettingsModule })));
const ProfileModule = lazy(() => import("@/components/dashboard/modules/ProfileModule").then(m => ({ default: m.ProfileModule })));
const MyShopProfileModule = lazy(() => import("@/components/dashboard/modules/MyShopProfileModule").then(m => ({ default: m.MyShopProfileModule })));
const AdminPanelModule = lazy(() => import("@/components/dashboard/modules/AdminPanelModule").then(m => ({ default: m.AdminPanelModule })));
const Dashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Get module from URL or default to overview
  const params = new URLSearchParams(location.search);
  const moduleFromUrl = params.get('module') || 'overview';

  const [activeModule, setActiveModule] = useState(moduleFromUrl);
  const [searchQuery, setSearchQuery] = useState("");

  // Performance: React 18 transitions for non-blocking module switches
  const [isPending, startTransition] = useTransition();

  // Track loaded modules for instant revisit rendering
  const [loadedModules, setLoadedModules] = useState<Set<string>>(new Set(['overview']));
  const [hasInitiallyLoaded, setHasInitiallyLoaded] = useState(false);

  // Sync activeModule with URL changes
  useEffect(() => {
    const param = params.get('module');
    if (param && param !== activeModule) {
      setActiveModule(param);
      setLoadedModules(prev => new Set([...prev, param]));
    }
  }, [location.search]);

  // Smooth module switching with transitions
  const handleModuleChange = useCallback((module: string) => {
    startTransition(() => {
      setActiveModule(module);
      setLoadedModules(prev => new Set([...prev, module]));
      // Update URL
      navigate(`/dashboard?module=${module}`, { replace: true });
    });
  }, [navigate]);

  // Use real authentication - fetch user role from database
  const { userRole, userName, userId, loading: authLoading, error: authError } = useUserRole();

  // Check if user is super admin - with timeout protection
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!userId) {
      setIsAdmin(false);
      return;
    }

    // Owner can also be admin - check admin_users table

    // Check admin_users table with timeout
    const checkAdmin = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) =>
          setTimeout(() => resolve(null), 3000)
        );

        const queryPromise = supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle();

        const result = await Promise.race([queryPromise, timeoutPromise]);

        if (result && 'data' in result) {
          setIsAdmin(!!result.data);
        }
      } catch (error) {
        console.warn('[Dashboard] Admin check failed:', error);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [userId, userRole]);
  // Get network status for offline handling
  const { isOnline } = useNetwork();

  const isMobile = useIsMobile();

  // Mark initial load complete for animation control
  useEffect(() => {
    const timer = setTimeout(() => setHasInitiallyLoaded(true), 100);
    return () => clearTimeout(timer);
  }, []);

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

    // Only owner and manager can use swipe navigation on dashboard
    const swipeRole = userRole === 'owner' ? 'owner' : 'manager';

    if (isLeftSwipe) {
      const nextModule = getNextModule(activeModule, 'left', swipeRole);
      handleModuleChange(nextModule);
    }
    if (isRightSwipe) {
      const nextModule = getNextModule(activeModule, 'right', swipeRole);
      handleModuleChange(nextModule);
    }
  }, [touchStart, touchEnd, activeModule, userRole, handleModuleChange]);

  // Listen for module navigation events from other components
  useEffect(() => {
    const handleNavigate = (e: CustomEvent) => {
      if (e.detail && typeof e.detail === 'string') {
        handleModuleChange(e.detail);
      }
    };

    window.addEventListener('navigate-module', handleNavigate as EventListener);
    return () => {
      window.removeEventListener('navigate-module', handleNavigate as EventListener);
    };
  }, [handleModuleChange]);

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
    softLoading,
    refetch,
    setSalesData,
    setStockData,
    setDrivers,
    setCustomers,
    setOrders,
  } = useDashboardData();

  // Never block on loading - always show dashboard with skeleton states
  // Auth is already verified by ProtectedRoute
  
  // Brief loading state only if auth is still initializing AND no userId yet
  // This should be very rare since ProtectedRoute already verified auth
  if (authLoading && !userId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Safety RBAC: if a customer ever reaches /dashboard (e.g. role gate failed upstream), redirect.
  // Wait until authLoading is false so we don't mis-route owners during initial role fetch.
  if (!authLoading && userRole === 'customer') {
    return <Navigate to="/community" replace />;
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

  // Get sanitized role for components - customers should not reach here (redirected by ProtectedRoute)
  // Managers and owners are the only valid dashboard roles
  const dashboardRole: 'owner' | 'manager' = userRole === 'owner' ? 'owner' : 'manager';
  const navRole = dashboardRole;

  const renderActiveModule = () => {
    // Check if this module was previously loaded for faster revisit
    const isFirstLoad = !loadedModules.has(activeModule);

    const moduleContent = (() => {
      switch (activeModule) {
        case "overview":
          return (
            <DashboardOverview
              analytics={analytics}
              drivers={drivers}
              cylinderStock={cylinderStock}
              userRole={dashboardRole}
              setActiveModule={handleModuleChange}
              onRefresh={refetch}
            />
          );
        case "pos":
          return <POSModule userRole={dashboardRole} userName={userName} />;
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
        case "admin-panel":
          return isAdmin ? <AdminPanelModule /> : null;
        case "utility-expense":
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
              userRole={dashboardRole}
            />
          );
        default:
          return (
            <DashboardOverview
              analytics={analytics}
              drivers={drivers}
              cylinderStock={cylinderStock}
              userRole={dashboardRole}
              setActiveModule={handleModuleChange}
              onRefresh={refetch}
            />
          );
      }
    })();

    return (
      <OfflineErrorBoundary moduleName={activeModule}>
        <Suspense fallback={isFirstLoad ? <ModuleSkeleton /> : <QuickLoader />}>
          <div className="module-transition module-enter">
            {moduleContent}
          </div>
        </Suspense>
      </OfflineErrorBoundary>
    );
  };

  return (
    <SidebarProvider defaultOpen={false}>
      {/* Soft loading indicator - shows during background refresh */}
      {softLoading && (
        <div className="fixed top-0 left-0 right-0 h-0.5 bg-primary/20 z-[100]">
          <div className="h-full bg-primary animate-[loading_1s_ease-in-out_infinite] w-1/3" />
        </div>
      )}

      {/* Transition pending indicator - shows during module switch */}
      {isPending && !softLoading && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-primary/20 z-[100]">
          <div className="h-full w-1/3 bg-primary rounded-r-full animate-pulse transition-loading" />
        </div>
      )}

      <div className="min-h-screen flex w-full bg-gradient-to-br from-background via-background to-muted/30">
        <AppSidebar
          activeModule={activeModule}
          setActiveModule={handleModuleChange}
          userRole={dashboardRole}
          userName={userName}
          analytics={analytics}
          isAdmin={isAdmin}
        />

        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          <DashboardHeader
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            userRole={dashboardRole}
            userName={userName}
            isAdmin={isAdmin}
            onSettingsClick={() => handleModuleChange("settings")}
            onProfileClick={() => handleModuleChange("profile")}
          />

          {/* Main Content with Swipe Support */}
          <main
            className="flex-1 overflow-auto pb-mobile-nav"
            onTouchStart={isMobile ? onTouchStart : undefined}
            onTouchMove={isMobile ? onTouchMove : undefined}
            onTouchEnd={isMobile ? onTouchEnd : undefined}
          >
            <div className={cn(
              "container mx-auto p-3 sm:p-4 md:p-6 max-w-7xl",
              !hasInitiallyLoaded && "animate-fade-in"
            )}>
              {renderActiveModule()}
            </div>
          </main>

          {/* Mobile Bottom Navigation */}
          <MobileBottomNav
            activeModule={activeModule}
            setActiveModule={handleModuleChange}
            userRole={navRole}
          />

          {/* Offline Status Indicator */}
          <OfflineIndicator />
        </div>

        {/* Global Command Palette */}
        <GlobalCommandPalette
          userRole={dashboardRole}
          setActiveModule={handleModuleChange}
        />
      </div>
    </SidebarProvider>
  );
};

export default Dashboard;
