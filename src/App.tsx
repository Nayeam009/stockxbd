import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense, useEffect, memo } from "react";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { NetworkProvider } from "./contexts/NetworkContext";
import { Loader2 } from "lucide-react";
import ErrorBoundary from "./components/ErrorBoundary";
import { supabase } from "./integrations/supabase/client";
import { clearSensitiveStorage } from "./lib/securityUtils";

// Lazy load pages for better performance (code splitting)
const Welcome = lazy(() => import("./pages/Welcome"));
const Community = lazy(() => import("./pages/Community"));
const ShopProfile = lazy(() => import("./pages/ShopProfile"));
const CustomerCart = lazy(() => import("./pages/CustomerCart"));
const CustomerCheckout = lazy(() => import("./pages/CustomerCheckout"));
const CustomerOrders = lazy(() => import("./pages/CustomerOrders"));
const CustomerProfile = lazy(() => import("./pages/CustomerProfile"));

// Lazy load non-critical UI components (deferred)
const Toaster = lazy(() => import("@/components/ui/toaster").then(m => ({ default: m.Toaster })));
const Sonner = lazy(() => import("@/components/ui/sonner").then(m => ({ default: m.Toaster })));

// Simple QueryClient with standard defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: true,
    },
  },
});

// Memoized loading fallback for lazy-loaded pages
const PageLoader = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" aria-label="Loading page" />
  </div>
));

// Security: Clear sensitive data on logout
const useAuthCleanup = () => {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        // Clear all sensitive data from localStorage on logout
        clearSensitiveStorage();
        // Clear React Query cache
        queryClient.clear();
      }
    });

    return () => subscription.unsubscribe();
  }, []);
};

// Wrapper component to use the hook
const AuthCleanupProvider = ({ children }: { children: React.ReactNode }) => {
  useAuthCleanup();
  return <>{children}</>;
};

const App = () => (
  <ErrorBoundary>
    <QueryClientProvider client={queryClient}>
      <NetworkProvider>
        <AuthCleanupProvider>
          <ThemeProvider>
            <LanguageProvider>
              <TooltipProvider>
                {/* Deferred non-critical toasters */}
                <Suspense fallback={null}>
                  <Toaster />
                  <Sonner />
                </Suspense>
                <BrowserRouter>
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Welcome />} />
                        <Route path="/auth" element={<Auth />} />
                        <Route path="/dashboard" element={
                          <ProtectedRoute>
                            <Dashboard />
                          </ProtectedRoute>
                        } />
                        
                        {/* LPG Community E-Commerce Routes */}
                        <Route path="/community" element={<Community />} />
                        <Route path="/community/shop/:shopId" element={<ShopProfile />} />
                        <Route path="/community/cart" element={<CustomerCart />} />
                        <Route path="/community/checkout" element={<CustomerCheckout />} />
                        <Route path="/community/orders" element={<CustomerOrders />} />
                        <Route path="/community/profile" element={<CustomerProfile />} />
                        
                        {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </BrowserRouter>
              </TooltipProvider>
            </LanguageProvider>
          </ThemeProvider>
        </AuthCleanupProvider>
      </NetworkProvider>
    </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
