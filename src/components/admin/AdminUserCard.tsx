import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Ban,
  UserCheck,
  Trash2,
  Store,
  Crown,
  ShoppingBag,
  Shield,
  Loader2,
  Phone,
} from "lucide-react";
import type { AdminUserData } from "@/hooks/useAdminUsers";

interface AdminUserCardProps {
  user: AdminUserData;
  isCurrentUser: boolean;
  isActionLoading: boolean;
  onBlock: () => void;
  onDelete: () => void;
}

export const AdminUserCard = ({
  user,
  isCurrentUser,
  isActionLoading,
  onBlock,
  onDelete,
}: AdminUserCardProps) => {
  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U';
  };

  const getRoleBadge = () => {
    if (user.isBlocked) {
      return (
        <Badge variant="destructive" className="gap-1 text-xs">
          <Ban className="h-3 w-3" /> Blocked
        </Badge>
      );
    }
    
    if (user.isAdmin) {
      return (
        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
          <Shield className="h-3 w-3" /> Admin
        </Badge>
      );
    }
    
    switch (user.role) {
      case 'owner':
        return (
          <Badge className="bg-primary/20 text-primary border-primary/30 gap-1 text-xs">
            <Crown className="h-3 w-3" /> Owner
          </Badge>
        );
      case 'manager':
        return (
          <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 gap-1 text-xs">
            <UserCheck className="h-3 w-3" /> Manager
          </Badge>
        );
      case 'customer':
        return (
          <Badge className="bg-accent/20 text-accent-foreground border-accent/30 gap-1 text-xs">
            <ShoppingBag className="h-3 w-3" /> Customer
          </Badge>
        );
      default:
        return <Badge variant="secondary">{user.role}</Badge>;
    }
  };

  const getCardStyles = () => {
    if (user.isBlocked) {
      return 'bg-destructive/5 border-destructive/20 dark:bg-destructive/10';
    }
    if (isCurrentUser) {
      return 'bg-primary/5 border-primary/20 ring-2 ring-primary/20';
    }
    if (user.isAdmin) {
      return 'bg-amber-500/5 border-amber-500/20';
    }
    return 'bg-card hover:bg-muted/50';
  };

  return (
    <div
      className={`flex items-center justify-between p-3 sm:p-4 rounded-xl border transition-all duration-200 ${getCardStyles()}`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Avatar className={`h-10 w-10 sm:h-11 sm:w-11 shrink-0 ring-2 ${
          user.isBlocked 
            ? 'ring-destructive/30' 
            : user.isAdmin 
              ? 'ring-amber-500/30' 
              : 'ring-border'
        }`}>
          <AvatarFallback className={`font-semibold text-sm ${
            user.isBlocked 
              ? 'bg-destructive/20 text-destructive' 
              : user.isAdmin
                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-400'
                : 'bg-primary/10 text-primary'
          }`}>
            {getInitials(user.fullName)}
          </AvatarFallback>
        </Avatar>
        
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm sm:text-base truncate max-w-[120px] sm:max-w-[200px]">
              {user.fullName}
            </p>
            {isCurrentUser && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-primary/10 text-primary border-primary/30">
                You
              </Badge>
            )}
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            {getRoleBadge()}
            {user.hasShop && (
              <Badge variant="outline" className="gap-1 text-[10px] px-1.5">
                <Store className="h-2.5 w-2.5" />
                <span className="truncate max-w-[60px] sm:max-w-[100px]">
                  {user.shopName || 'Shop'}
                </span>
              </Badge>
            )}
          </div>
          
          {user.phone && (
            <div className="flex items-center gap-1 text-muted-foreground">
              <Phone className="h-3 w-3" />
              <span className="text-xs">{user.phone}</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 ml-2">
        <Button
          variant={user.isBlocked ? "outline" : "secondary"}
          size="sm"
          onClick={onBlock}
          disabled={isActionLoading || isCurrentUser}
          className="h-8 sm:h-9 px-2 sm:px-3 text-xs sm:text-sm"
          title={isCurrentUser ? "Cannot block yourself" : user.isBlocked ? "Unblock user" : "Block user"}
        >
          {isActionLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : user.isBlocked ? (
            <>
              <UserCheck className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Unblock</span>
            </>
          ) : (
            <>
              <Ban className="h-3.5 w-3.5 sm:mr-1" />
              <span className="hidden sm:inline">Block</span>
            </>
          )}
        </Button>
        
        <Button
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={isActionLoading || isCurrentUser}
          className="h-8 sm:h-9 px-2 sm:px-3"
          title={isCurrentUser ? "Cannot delete yourself" : "Delete user"}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

// Loading skeleton for user cards
export const AdminUserCardSkeleton = () => (
  <div className="flex items-center justify-between p-3 sm:p-4 rounded-xl border bg-card animate-pulse">
    <div className="flex items-center gap-3 flex-1">
      <Skeleton className="h-10 w-10 sm:h-11 sm:w-11 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <Skeleton className="h-8 w-16 sm:w-20" />
      <Skeleton className="h-8 w-8" />
    </div>
  </div>
);
