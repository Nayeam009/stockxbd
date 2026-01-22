import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  ShoppingCart, 
  User, 
  Home, 
  Menu,
  LogOut,
  LayoutDashboard,
  Store,
  Package
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CommunityHeaderProps {
  cartItemCount?: number;
  userRole?: string | null;
  userName?: string | null;
  onCartClick?: () => void;
}

export const CommunityHeader = ({ 
  cartItemCount = 0, 
  userRole, 
  userName,
  onCartClick 
}: CommunityHeaderProps) => {
  const navigate = useNavigate();
  const isOwnerOrManager = userRole === 'owner' || userRole === 'manager';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast({ title: "Logged out successfully" });
    navigate('/auth');
  };

  const NavLinks = () => (
    <>
      <Link to="/community">
        <Button variant="ghost" size="sm">
          <Home className="h-4 w-4 mr-2" />
          Home
        </Button>
      </Link>
      <Link to="/community/orders">
        <Button variant="ghost" size="sm">
          <Package className="h-4 w-4 mr-2" />
          Orders
        </Button>
      </Link>
      {isOwnerOrManager && (
        <Link to="/dashboard">
          <Button variant="ghost" size="sm" className="text-primary">
            <LayoutDashboard className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/community" className="flex items-center space-x-2">
          <img src={stockXLogo} alt="LPG Community" className="h-8 w-8" />
          <div className="hidden sm:block">
            <span className="font-bold text-primary">LPG</span>
            <span className="text-muted-foreground"> Community</span>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-1">
          <NavLinks />
        </nav>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Dashboard Button - Owner/Manager only */}
          {isOwnerOrManager && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="hidden sm:flex items-center gap-2 bg-primary hover:bg-primary/90"
                >
                  <Store className="h-4 w-4" />
                  <span className="hidden md:inline">My Shop</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Go to Shop Dashboard</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Cart Button */}
          <Button 
            variant="outline" 
            size="icon" 
            className="relative"
            onClick={onCartClick}
          >
            <ShoppingCart className="h-5 w-5" />
            {cartItemCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs bg-primary"
              >
                {cartItemCount}
              </Badge>
            )}
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {userName && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={() => navigate('/community/profile')}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/community/orders')}>
                <Package className="h-4 w-4 mr-2" />
                My Orders
              </DropdownMenuItem>
              {isOwnerOrManager && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                    <LayoutDashboard className="h-4 w-4 mr-2" />
                    Shop Dashboard
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <img src={stockXLogo} alt="LPG Community" className="h-6 w-6" />
                  LPG Community
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col space-y-2 mt-6">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
