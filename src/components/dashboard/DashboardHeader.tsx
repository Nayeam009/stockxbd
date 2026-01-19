import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { Search, Settings, Command } from "lucide-react";

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
  userName: string;
  onSettingsClick?: () => void;
  onProfileClick?: () => void;
}

export const DashboardHeader = ({
  searchQuery,
  setSearchQuery,
  userRole,
  userName,
  onSettingsClick,
  onProfileClick
}: DashboardHeaderProps) => {
  const { t, language } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-primary/15 text-primary border-primary/30';
      case 'manager':
        return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'driver':
        return 'bg-accent/15 text-accent border-accent/30';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner':
        return language === 'bn' ? 'মালিক' : 'Owner';
      case 'manager':
        return language === 'bn' ? 'ম্যানেজার' : 'Manager';
      case 'driver':
        return language === 'bn' ? 'ড্রাইভার' : 'Driver';
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
          <SidebarTrigger className="h-8 w-8 sm:h-9 sm:w-9 hover:bg-primary/10 hover:text-primary rounded-lg sm:rounded-xl transition-all duration-300" />
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
            className="sm:hidden h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Settings - Hidden on mobile */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onSettingsClick} 
            className="hidden sm:flex h-8 w-8 sm:h-9 sm:w-9 rounded-lg sm:rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="h-6 sm:h-8 w-px bg-gradient-to-b from-transparent via-border to-transparent mx-1 sm:mx-2 hidden sm:block" />

          {/* User Profile */}
          <div 
            className="flex items-center gap-2 sm:gap-3 cursor-pointer hover:opacity-90 transition-all duration-300 pl-1 sm:pl-2" 
            onClick={onProfileClick}
          >
            <div className="hidden md:block text-right min-w-0">
              <p className="text-xs sm:text-sm font-semibold text-foreground leading-none truncate max-w-[120px] lg:max-w-[150px]">
                {userName}
              </p>
              <Badge className={`mt-1 text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0 h-4 font-medium border ${getRoleColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </Badge>
            </div>
            <div className="relative flex-shrink-0">
              <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-primary-foreground text-xs sm:text-sm font-bold shadow-lg">
                {getInitials(userName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 sm:h-3 sm:w-3 bg-success rounded-full border-2 border-card shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};