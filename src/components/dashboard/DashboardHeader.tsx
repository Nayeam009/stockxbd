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
  User,
  Sun,
  Moon
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
      case 'owner': return 'bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-md';
      case 'manager': return 'bg-gradient-to-r from-secondary to-secondary-light text-secondary-foreground shadow-md';
      case 'driver': return 'bg-gradient-to-r from-accent to-accent-light text-accent-foreground shadow-md';
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

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/80 backdrop-blur-lg supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 gap-4">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <SidebarTrigger className="hover:bg-accent/10 hover:text-accent transition-colors rounded-lg" />
          
          <div className="hidden md:flex items-center gap-3">
            <div className="h-9 w-9 bg-gradient-to-br from-primary to-secondary rounded-xl flex items-center justify-center shadow-md">
              <span className="text-primary-foreground font-bold text-sm">SX</span>
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                Stock-X
              </h1>
              <p className="text-[10px] text-muted-foreground -mt-0.5">
                {language === 'bn' ? 'এলপিজি ম্যানেজমেন্ট' : 'LPG Management'}
              </p>
            </div>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              placeholder={language === 'bn' ? 'গ্রাহক, অর্ডার, পণ্য খুঁজুন...' : 'Search customers, orders, products...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/30 border-border hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all rounded-xl"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center gap-2">
          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden hover:bg-primary/10 rounded-xl"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Theme Toggle */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={toggleTheme}
            className="hover:bg-primary/10 rounded-xl transition-colors"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4 text-warning" />
            ) : (
              <Moon className="h-4 w-4 text-primary" />
            )}
          </Button>

          {/* Notifications */}
          <NotificationCenter />

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
            onClick={onSettingsClick}
            className="hover:bg-primary/10 rounded-xl transition-colors"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Profile */}
          <div 
            className="flex items-center gap-3 pl-3 border-l border-border cursor-pointer hover:opacity-80 transition-opacity"
            onClick={onProfileClick}
          >
            <Badge 
              className={`${getRoleColor(userRole)} border-0 font-medium`}
            >
              {getRoleLabel(userRole)}
            </Badge>
            
            <div className="hidden sm:flex items-center gap-3">
              <div className="h-9 w-9 bg-gradient-to-br from-primary via-secondary to-accent rounded-xl flex items-center justify-center shadow-md ring-2 ring-background">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-foreground leading-tight">{userName}</p>
                <p className="text-[10px] text-muted-foreground">{getRoleLabel(userRole)}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};