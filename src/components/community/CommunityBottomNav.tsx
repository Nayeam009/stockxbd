import { useNavigate, useLocation } from "react-router-dom";
import { Home, ShoppingCart, User, Package, LayoutDashboard } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommunityBottomNavProps {
  cartItemCount?: number;
  userRole?: string | null;
}

export const CommunityBottomNav = ({ 
  cartItemCount = 0,
  userRole 
}: CommunityBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

  // Different nav items for owners/managers vs regular customers
  const navItems = isOwnerOrManager ? [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/community'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      path: '/community/orders'
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      path: '/community/cart',
      badge: cartItemCount
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      path: '/dashboard',
      highlight: true
    }
  ] : [
    {
      id: 'home',
      label: 'Home',
      icon: Home,
      path: '/community'
    },
    {
      id: 'orders',
      label: 'Orders',
      icon: Package,
      path: '/community/orders'
    },
    {
      id: 'cart',
      label: 'Cart',
      icon: ShoppingCart,
      path: '/community/cart',
      badge: cartItemCount
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      path: '/community/profile'
    }
  ];

  const isActive = (path: string) => {
    if (path === '/community') {
      return location.pathname === '/community' || location.pathname.startsWith('/community/shop/');
    }
    if (path === '/dashboard') {
      return location.pathname.startsWith('/dashboard');
    }
    return location.pathname === path;
  };

  return (
    <nav 
      className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/95 backdrop-blur-xl border-t border-border"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Community navigation"
    >
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          const isHighlight = 'highlight' in item && item.highlight;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative touch-target min-h-[64px]",
                active 
                  ? isHighlight ? "text-blue-600" : "text-primary"
                  : isHighlight 
                    ? "text-blue-500/70 hover:text-blue-600 active:scale-95" 
                    : "text-muted-foreground hover:text-foreground active:scale-95"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} aria-hidden="true" />
                {'badge' in item && item.badge !== undefined && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] bg-primary"
                    aria-label={`${item.badge} items in cart`}
                  >
                    {item.badge > 9 ? '9+' : item.badge}
                  </Badge>
                )}
              </div>
              <span className={cn(
                "text-[10px] font-medium",
                active && "font-semibold"
              )}>
                {item.label}
              </span>
              
              {/* Active indicator */}
              {active && (
                <div 
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full",
                    isHighlight ? "bg-blue-600" : "bg-primary"
                  )}
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
