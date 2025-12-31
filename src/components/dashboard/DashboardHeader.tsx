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
      case 'owner': return 'bg-primary/15 text-primary border-primary/30';
      case 'manager': return 'bg-secondary/15 text-secondary border-secondary/30';
      case 'driver': return 'bg-accent/15 text-accent border-accent/30';
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
    <header className="sticky top-0 z-50 w-full bg-card/95 backdrop-blur-xl border-b border-border/40 shadow-sm">
      <div className="flex h-16 items-center justify-between px-4 gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-3">
          <SidebarTrigger className="h-9 w-9 hover:bg-primary/10 hover:text-primary rounded-xl transition-all duration-300" />
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-xl hidden md:block">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={language === 'bn' ? 'খুঁজুন...' : 'Search...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-20 h-10 bg-muted/40 border border-border/50 focus:border-primary/50 focus-visible:ring-2 focus-visible:ring-primary/20 rounded-xl text-sm transition-all duration-300"
            />
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2 hidden lg:flex items-center gap-1 text-muted-foreground/60">
              <kbd className="h-5 px-1.5 flex items-center gap-0.5 bg-background border border-border rounded-md text-[10px] font-medium">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-1.5">
          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="md:hidden h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
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
            className="h-9 w-9 rounded-xl hover:bg-primary/10 hover:text-primary transition-all duration-300"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="h-8 w-px bg-gradient-to-b from-transparent via-border to-transparent mx-2 hidden sm:block" />

          {/* User Profile */}
          <div 
            className="flex items-center gap-3 cursor-pointer hover:opacity-90 transition-all duration-300 pl-2"
            onClick={onProfileClick}
          >
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-foreground leading-none">{userName}</p>
              <Badge className={`mt-1 text-[10px] px-2 py-0 h-4 font-medium border ${getRoleColor(userRole)}`}>
                {getRoleLabel(userRole)}
              </Badge>
            </div>
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary via-primary-light to-secondary flex items-center justify-center text-primary-foreground text-sm font-bold shadow-lg">
                {getInitials(userName)}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-success rounded-full border-2 border-card shadow-sm" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};