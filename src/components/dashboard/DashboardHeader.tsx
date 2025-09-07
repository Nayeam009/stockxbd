import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { 
  Search, 
  Bell, 
  Settings, 
  User
} from "lucide-react";

interface DashboardHeaderProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  userRole: 'owner' | 'manager' | 'driver';
  userName: string;
}

export const DashboardHeader = ({ 
  searchQuery, 
  setSearchQuery,
  userRole,
  userName 
}: DashboardHeaderProps) => {
  const [notifications] = useState(3);

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-primary text-primary-foreground';
      case 'manager': return 'bg-secondary text-secondary-foreground';
      case 'driver': return 'bg-accent text-accent-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center justify-between px-4">
        {/* Left Section */}
        <div className="flex items-center space-x-4">
          <SidebarTrigger className="hover:bg-accent hover:text-accent-foreground" />
          
          <div className="hidden md:block">
            <h1 className="text-lg font-semibold text-primary">Stock-X Dashboard</h1>
          </div>
        </div>

        {/* Center Section - Search */}
        <div className="flex-1 max-w-md mx-4 hidden lg:block">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers, orders, products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-muted/50 border-border focus:border-primary transition-colors"
            />
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-center space-x-2">
          {/* Mobile Search */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="lg:hidden"
          >
            <Search className="h-4 w-4" />
          </Button>

          {/* Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative"
          >
            <Bell className="h-4 w-4" />
            {notifications > 0 && (
              <Badge className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center bg-destructive text-destructive-foreground text-xs animate-pulse">
                {notifications}
              </Badge>
            )}
          </Button>

          {/* Settings */}
          <Button 
            variant="ghost" 
            size="icon"
          >
            <Settings className="h-4 w-4" />
          </Button>

          {/* User Profile */}
          <div className="flex items-center space-x-3 pl-3 border-l border-border">
            <Badge 
              variant="secondary" 
              className={getRoleColor(userRole)}
            >
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </Badge>
            
            <div className="hidden sm:flex items-center space-x-2">
              <div className="h-8 w-8 bg-gradient-primary rounded-full flex items-center justify-center">
                <User className="h-4 w-4 text-primary-foreground" />
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-foreground">{userName}</p>
                <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};