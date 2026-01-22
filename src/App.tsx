import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { lazy, Suspense } from "react";
import Welcome from "./pages/Welcome";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import { ProtectedRoute } from "./components/auth/ProtectedRoute";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { Loader2 } from "lucide-react";

// Lazy load community pages for better performance
const Community = lazy(() => import("./pages/Community"));
const ShopProfile = lazy(() => import("./pages/ShopProfile"));
const CustomerCart = lazy(() => import("./pages/CustomerCart"));
const CustomerCheckout = lazy(() => import("./pages/CustomerCheckout"));
const CustomerOrders = lazy(() => import("./pages/CustomerOrders"));

const queryClient = new QueryClient();

// Loading fallback for lazy-loaded pages
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="h-8 w-8 animate-spin text-primary" />
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
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
                
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </LanguageProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
