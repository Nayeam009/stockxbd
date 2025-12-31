import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationCenter } from "@/components/notifications/NotificationCenter";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { 
  Search, 
  Settings, 
  Sun,
  Moon,
  Command
} from "lucide-react";

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
      case 'owner': return 'bg-primary/10 text-primary border-primary/20';
      case 'manager': return 'bg-secondary/10 text-secondary border-secondary/20';
      case 'driver': return 'bg-accent/10 text-accent border-accent/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return language === 'bn' ? 'মালিক' : 'Owner';
      case 'manager': return language === 'bn' ? 'ম্যানেজার' : 'Manager';
      case 'driver': return language === 'bn' ? 'ড্রাইভার' : 'Driver';
      default: return role;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/50">
      <div className="flex h-14 items-center justify-between px-4 gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-8 w-8 hover:bg-muted rounded-lg transition-colors" />
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={language === 'bn' ? 'খুঁজুন...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-20 h-9 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-lg text-sm"
            />
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2 hidden lg:flex items-center gap-1 text-muted-foreground/60">
              <kbd className="h-5 px-1.5 flex items-center gap-0.5 bg-background border border-border rounded text-[10px] font-medium">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1">
          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-8 w-8 rounded-lg"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSettingsClick}
            className="h-8 w-8 rounded-lg hover:bg-muted transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="h-6 w-px bg-border mx-2 hidden sm:block" />

          {/* User Profile */}
          <div 
            className="flex items-center gap-2.5 cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onProfileClick}
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-foreground leading-none">{userName}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{getRoleLabel(userRole)}</p>
            </div>
            <div className="relative">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-primary-foreground text-xs font-semibold">
                {getInitials(userName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 bg-green-500 rounded-full border-2 border-background" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};