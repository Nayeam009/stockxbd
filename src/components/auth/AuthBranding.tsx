import { Package, Globe, Shield } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";

/**
 * Left-side branding panel for authentication page (desktop)
 */
export const AuthBranding = () => {
  return (
    <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-center p-12 relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-32 h-32 border-2 border-white rounded-full" />
        <div className="absolute bottom-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
        <div className="absolute top-1/2 left-1/3 w-24 h-24 border-2 border-white rounded-full" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-8">
          <img src={stockXLogo} alt="Stock-X" className="h-14 w-14" />
          <span className="text-3xl font-bold text-white">Stock-X</span>
        </div>

        <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
          L.P.G Inventory &
          <br />
          <span className="text-secondary">Online Delivery Platform</span>
        </h1>

        <p className="text-white/80 text-lg mb-10 max-w-md">
          Complete business management for LPG distributors with real-time tracking and analytics.
        </p>

        {/* Feature Highlights */}
        <div className="space-y-4 mb-10">
          <div className="flex items-center gap-3 text-white/90">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
            <span>Real-time Inventory Management</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Globe className="h-5 w-5" />
            </div>
            <span>Online Marketplace & Delivery</span>
          </div>
          <div className="flex items-center gap-3 text-white/90">
            <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
              <Shield className="h-5 w-5" />
            </div>
            <span>Secure Role-Based Access</span>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="flex gap-8 text-white/90">
          <div>
            <span className="text-3xl font-bold block">500+</span>
            <span className="text-sm text-white/70">Businesses</span>
          </div>
          <div>
            <span className="text-3xl font-bold block">50K+</span>
            <span className="text-sm text-white/70">Deliveries</span>
          </div>
          <div>
            <span className="text-3xl font-bold block">99.9%</span>
            <span className="text-sm text-white/70">Uptime</span>
          </div>
        </div>
      </div>
    </div>
  );
};
