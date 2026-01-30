import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Shield,
  Users,
  Search,
  Ban,
  Trash2,
  UserCheck,
  RefreshCw,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";
import { useAdminUsers, type AdminUserData } from "@/hooks/useAdminUsers";
import { AdminUserCard, AdminUserCardSkeleton } from "@/components/admin/AdminUserCard";
import { AdminStatsGrid } from "@/components/admin/AdminStatsGrid";
import { AdminAccessDenied } from "@/components/admin/AdminAccessDenied";

type FilterTab = 'all' | 'owners' | 'managers' | 'customers' | 'blocked';

export const AdminPanelModule = () => {
  const {
    users,
    loading,
    error,
    isVerifiedAdmin,
    currentUserId,
    refetch,
    blockUser,
    deleteUser,
    stats,
  } = useAdminUsers();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog states
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; user: AdminUserData | null }>({ 
    open: false, 
    user: null 
  });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: AdminUserData | null }>({ 
    open: false, 
    user: null 
  });

  // Filter users based on search and tab
  const filteredUsers = useMemo(() => {
    return users.filter(user => {
      // Search filter - matches name or phone
      const matchesSearch = 
        searchQuery === "" ||
        user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.phone?.includes(searchQuery) ||
        user.shopName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Tab filter
      let matchesTab = true;
      switch (activeTab) {
        case 'owners':
          matchesTab = user.role === 'owner';
          break;
        case 'managers':
          matchesTab = user.role === 'manager';
          break;
        case 'customers':
          matchesTab = user.role === 'customer';
          break;
        case 'blocked':
          matchesTab = user.isBlocked;
          break;
      }
      
      return matchesSearch && matchesTab;
    });
  }, [users, searchQuery, activeTab]);

  // Handle block/unblock
  const handleBlockUser = async (user: AdminUserData) => {
    try {
      setActionLoading(user.id);
      const newBlockedStatus = !user.isBlocked;
      
      await blockUser(user.id, newBlockedStatus);
      
      toast.success(
        newBlockedStatus 
          ? `${user.fullName} has been blocked` 
          : `${user.fullName} has been unblocked`
      );
    } catch (err: any) {
      toast.error(err.message || 'Failed to update user status');
    } finally {
      setActionLoading(null);
      setBlockDialog({ open: false, user: null });
    }
  };

  // Handle delete
  const handleDeleteUser = async (user: AdminUserData) => {
    try {
      setActionLoading(user.id);
      
      await deleteUser(user.id);
      
      toast.success(`${user.fullName} has been removed from the system`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete user');
    } finally {
      setActionLoading(null);
      setDeleteDialog({ open: false, user: null });
    }
  };

  // Admin verification in progress
  if (isVerifiedAdmin === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground text-sm">Verifying admin access...</p>
        </div>
      </div>
    );
  }

  // Not an admin
  if (isVerifiedAdmin === false) {
    return <AdminAccessDenied />;
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <PremiumModuleHeader
        icon={<Shield className="h-6 w-6 text-primary-foreground" />}
        title="Admin Panel"
        subtitle="Manage all users, shops, and platform access"
      />

      {/* Stats Grid */}
      <AdminStatsGrid stats={stats} loading={loading} />

      {/* User Management */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>
                View and manage all platform users
              </CardDescription>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()} 
              disabled={loading}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Error State */}
          {error && (
            <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => refetch()}
                className="ml-auto text-destructive hover:text-destructive"
              >
                Retry
              </Button>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, phone, or shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filter Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as FilterTab)}>
            <TabsList className="w-full justify-start overflow-x-auto flex-nowrap">
              <TabsTrigger value="all" className="text-xs sm:text-sm">
                All ({stats.total})
              </TabsTrigger>
              <TabsTrigger value="owners" className="text-xs sm:text-sm">
                Owners ({stats.owners})
              </TabsTrigger>
              <TabsTrigger value="managers" className="text-xs sm:text-sm">
                Managers ({stats.managers})
              </TabsTrigger>
              <TabsTrigger value="customers" className="text-xs sm:text-sm">
                Customers ({stats.customers})
              </TabsTrigger>
              <TabsTrigger value="blocked" className="text-xs sm:text-sm">
                Blocked ({stats.blocked})
              </TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <AdminUserCardSkeleton key={i} />
                  ))}
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-40" />
                  <p className="font-medium">No users found</p>
                  <p className="text-sm mt-1">
                    {searchQuery 
                      ? "Try adjusting your search query" 
                      : "No users match the current filter"
                    }
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[450px] sm:h-[500px] pr-2">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <AdminUserCard
                        key={user.id}
                        user={user}
                        isCurrentUser={user.id === currentUserId}
                        isActionLoading={actionLoading === user.id}
                        onBlock={() => setBlockDialog({ open: true, user })}
                        onDelete={() => setDeleteDialog({ open: true, user })}
                      />
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Block Confirmation Dialog */}
      <AlertDialog 
        open={blockDialog.open} 
        onOpenChange={(open) => setBlockDialog({ open, user: blockDialog.user })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {blockDialog.user?.isBlocked ? (
                <>
                  <UserCheck className="h-5 w-5 text-primary" />
                  Unblock User
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-destructive" />
                  Block User
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                {blockDialog.user?.isBlocked
                  ? `Are you sure you want to unblock ${blockDialog.user?.fullName}? They will regain full access to the platform.`
                  : `Are you sure you want to block ${blockDialog.user?.fullName}? They will lose all access to the platform.`
                }
              </p>
              {blockDialog.user?.phone && (
                <p className="text-xs text-muted-foreground">
                  Phone: {blockDialog.user.phone}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockDialog.user && handleBlockUser(blockDialog.user)}
              disabled={actionLoading !== null}
              className={blockDialog.user?.isBlocked ? '' : 'bg-destructive hover:bg-destructive/90'}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {blockDialog.user?.isBlocked ? 'Unblock' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={deleteDialog.open} 
        onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Are you sure you want to delete <strong>{deleteDialog.user?.fullName}</strong>? 
                This will remove their role and access from the system.
              </p>
              <p className="text-destructive font-medium text-sm">
                This action cannot be undone.
              </p>
              {deleteDialog.user?.hasShop && (
                <p className="text-xs text-muted-foreground">
                  ⚠️ This user has a shop: {deleteDialog.user.shopName}
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.user && handleDeleteUser(deleteDialog.user)}
              disabled={actionLoading !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
