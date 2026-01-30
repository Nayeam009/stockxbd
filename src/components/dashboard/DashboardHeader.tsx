import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { UniversalNotificationCenter } from "@/components/notifications/UniversalNotificationCenter";
import { OfflineIndicator } from "@/components/shared/OfflineIndicator";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { useNetwork } from "@/contexts/NetworkContext";
import { Search, Settings, Command, Store, Globe, Shield } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userRole: 'owner' | 'manager';
  userName: string;
  isAdmin?: boolean;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
}

export const DashboardHeader = ({
  searchQuery,
  setSearchQuery,
  userRole,
  userName,
  isAdmin = false,
  onSettingsClick,
  onProfileClick
}: DashboardHeaderProps) => {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const { isOnline } = useNetwork();
  const navigate = useNavigate();
  const [shopId, setShopId] = useState<string | null>(null);

  // Fetch shop ID for owner
  useEffect(() => {
    const fetchShopId = async () => {
      if (userRole !== 'owner') return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from('shop_profiles')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (data) {
        setShopId(data.id);
      }
    };

    fetchShopId();
  }, [userRole]);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'manager':
        return 'bg-secondary/15 text-secondary border-secondary/30';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return language === 'bn' ? 'মালিক' : 'Owner';
      case 'manager':
        return language === 'bn' ? 'ম্যানেজার' : 'Manager';
      default:
        return role;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Open command palette
  const openCommandPalette = () => {
    window.dispatchEvent(new CustomEvent('open-command-palette'));
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="flex h-14 sm:h-16 items-center justify-between px-2 sm:px-4 gap-2 sm:gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-2 sm:gap-3">
          <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 hover:text-primary rounded-lg sm:rounded-xl transition-all duration-300" aria-label="Toggle sidebar navigation" />
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md lg:max-w-xl hidden sm:block">
          <button
            onClick={openCommandPalette}
            className="w-full relative group flex items-center"
          >
            <div className="w-full flex items-center gap-2 px-3 sm:px-3.5 h-9 sm:h-10 bg-muted/40 border border-border/50 hover:border-primary/50 rounded-lg sm:rounded-xl text-sm transition-all duration-300 cursor-pointer">
              <Search className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-muted-foreground text-sm flex-1 text-left">
                {language === 'bn' ? 'খুঁজুন...' : 'Search...'}
              </span>
              <div className="hidden lg:flex items-center gap-1 text-muted-foreground/60">
                <kbd className="h-5 px-1.5 flex items-center gap-0.5 bg-background border border-border rounded-md text-[10px] font-medium">
                  <Command className="h-2.5 w-2.5" />K
                </kbd>
              </div>
            </div>
          </button>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Mobile Search */}
          <Button
            variant="ghost"
            size="icon"
            onClick={openCommandPalette}
            aria-label="Search"
            className="sm:hidden h-9 w-9 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300 touch-target-44"
          >
            <Search className="h-4 w-4" aria-hidden="true" />
          </Button>

          {/* Offline Status Indicator */}
          <OfflineIndicator />

          {/* Notifications */}
          <UniversalNotificationCenter userRole={userRole} />

          {/* Admin Panel Button - Admin only */}
          {isAdmin && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate('/dashboard?module=admin-panel')}
                  aria-label="Admin Panel"
                  className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-all duration-300"
                >
                  <Shield className="h-4 w-4" aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Admin Panel</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Marketplace Button - Owner only */}
          {userRole === 'owner' && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate('/community')}
                    aria-label="Browse Marketplace"
                    className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl hover:bg-secondary/20 hover:text-secondary transition-all duration-300"
                  >
                    <Globe className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Browse Marketplace</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate(shopId ? `/community/shop/${shopId}` : '/community')}
                    aria-label="View My Shop"
                    className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
                  >
                    <Store className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>View My Shop</p>
                </TooltipContent>
              </Tooltip>
            </>
          )}

          {/* Settings - Hidden on mobile */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onSettingsClick}
            aria-label="Settings"
            className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>

        </div>
      </div>
    </header>
  );
};