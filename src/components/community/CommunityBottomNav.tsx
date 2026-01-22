import { useNavigate, useLocation } from "react-router-dom";
import { Home, Search, ShoppingCart, User, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface CommunityBottomNavProps {
  cartItemCount?: number;
}

export const CommunityBottomNav = ({ cartItemCount = 0 }: CommunityBottomNavProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
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
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 sm:hidden bg-background/95 backdrop-blur-xl border-t border-border safe-area-bottom">
      <div className="grid grid-cols-4 h-16">
        {navItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors relative",
                active 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <Icon className={cn("h-5 w-5", active && "stroke-[2.5px]")} />
                {item.badge !== undefined && item.badge > 0 && (
                  <Badge 
                    className="absolute -top-2 -right-2 h-4 min-w-4 flex items-center justify-center p-0 text-[10px] bg-primary"
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
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
