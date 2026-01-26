import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  Store,
  Search,
  Ban,
  Trash2,
  UserCheck,
  Crown,
  Loader2,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ShoppingBag
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PremiumModuleHeader } from "@/components/shared/PremiumModuleHeader";

interface UserData {
  id: string;
  email: string;
  created_at: string;
  role: string;
  is_blocked: boolean;
  has_shop: boolean;
  shop_name?: string;
}

export const AdminPanelModule = () => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  
  // Dialog states
  const [blockDialog, setBlockDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; user: UserData | null }>({ open: false, user: null });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      
      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');
      
      if (rolesError) throw rolesError;

      // Fetch user status (blocked users)
      const { data: statusData } = await supabase
        .from('user_status')
        .select('user_id, is_blocked');

      // Fetch shop profiles
      const { data: shopsData } = await supabase
        .from('shop_profiles')
        .select('owner_id, shop_name');

      // Fetch profiles for names
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, full_name');

      // Combine data
      const combinedUsers: UserData[] = rolesData.map(role => {
        const status = statusData?.find(s => s.user_id === role.user_id);
        const shop = shopsData?.find(s => s.owner_id === role.user_id);
        const profile = profilesData?.find(p => p.user_id === role.user_id);
        
        return {
          id: role.user_id,
          email: profile?.full_name || 'Unknown User',
          created_at: new Date().toISOString(),
          role: role.role,
          is_blocked: status?.is_blocked || false,
          has_shop: !!shop,
          shop_name: shop?.shop_name
        };
      });

      setUsers(combinedUsers);
    } catch (error: any) {
      console.error('Error fetching users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleBlockUser = async (user: UserData) => {
    try {
      setActionLoading(user.id);
      
      const newBlockedStatus = !user.is_blocked;
      
      // Upsert user status
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: user.id,
          is_blocked: newBlockedStatus,
          blocked_at: newBlockedStatus ? new Date().toISOString() : null,
          blocked_by: (await supabase.auth.getUser()).data.user?.id
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Update local state
      setUsers(prev => prev.map(u => 
        u.id === user.id ? { ...u, is_blocked: newBlockedStatus } : u
      ));

      toast.success(newBlockedStatus ? 'User blocked successfully' : 'User unblocked successfully');
    } catch (error: any) {
      console.error('Error blocking user:', error);
      toast.error('Failed to update user status');
    } finally {
      setActionLoading(null);
      setBlockDialog({ open: false, user: null });
    }
  };

  const handleDeleteUser = async (user: UserData) => {
    try {
      setActionLoading(user.id);
      
      // Delete user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', user.id);

      if (roleError) throw roleError;

      // Delete user status if exists
      await supabase
        .from('user_status')
        .delete()
        .eq('user_id', user.id);

      // Update local state
      setUsers(prev => prev.filter(u => u.id !== user.id));

      toast.success('User removed from system');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
    } finally {
      setActionLoading(null);
      setDeleteDialog({ open: false, user: null });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.shop_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    switch (activeTab) {
      case 'owners':
        return matchesSearch && user.role === 'owner';
      case 'managers':
        return matchesSearch && user.role === 'manager';
      case 'customers':
        return matchesSearch && user.role === 'customer';
      case 'blocked':
        return matchesSearch && user.is_blocked;
      default:
        return matchesSearch;
    }
  });

  const stats = {
    total: users.length,
    owners: users.filter(u => u.role === 'owner').length,
    managers: users.filter(u => u.role === 'manager').length,
    customers: users.filter(u => u.role === 'customer').length,
    blocked: users.filter(u => u.is_blocked).length,
    shops: users.filter(u => u.has_shop).length
  };

  const getRoleBadge = (role: string, isBlocked: boolean) => {
    if (isBlocked) {
      return <Badge variant="destructive" className="gap-1"><Ban className="h-3 w-3" /> Blocked</Badge>;
    }
    
    switch (role) {
      case 'owner':
        return <Badge className="bg-primary/20 text-primary border-primary/30 gap-1"><Crown className="h-3 w-3" /> Owner</Badge>;
      case 'manager':
        return <Badge className="bg-secondary/20 text-secondary-foreground border-secondary/30 gap-1"><UserCheck className="h-3 w-3" /> Manager</Badge>;
      case 'customer':
        return <Badge className="bg-accent/20 text-accent-foreground border-accent/30 gap-1"><ShoppingBag className="h-3 w-3" /> Customer</Badge>;
      case 'admin':
        return <Badge className="bg-primary/30 text-primary border-primary/40 gap-1"><ShieldCheck className="h-3 w-3" /> Admin</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <PremiumModuleHeader
        icon={<Shield className="h-6 w-6 text-primary-foreground" />}
        title="Admin Panel"
        subtitle="Manage all users, shops, and system settings"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="bg-gradient-to-br from-muted/50 to-muted">
          <CardContent className="p-4 text-center">
            <Users className="h-5 w-5 mx-auto text-muted-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
          <CardContent className="p-4 text-center">
            <Crown className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.owners}</p>
            <p className="text-xs text-muted-foreground">Owners</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-secondary/20 to-secondary/10">
          <CardContent className="p-4 text-center">
            <UserCheck className="h-5 w-5 mx-auto text-secondary-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.managers}</p>
            <p className="text-xs text-muted-foreground">Managers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-accent/20 to-accent/10">
          <CardContent className="p-4 text-center">
            <ShoppingBag className="h-5 w-5 mx-auto text-accent-foreground mb-1" />
            <p className="text-2xl font-bold">{stats.customers}</p>
            <p className="text-xs text-muted-foreground">Customers</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-primary/15 to-secondary/10">
          <CardContent className="p-4 text-center">
            <Store className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{stats.shops}</p>
            <p className="text-xs text-muted-foreground">Active Shops</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-destructive/10 to-destructive/5">
          <CardContent className="p-4 text-center">
            <Ban className="h-5 w-5 mx-auto text-destructive mb-1" />
            <p className="text-2xl font-bold">{stats.blocked}</p>
            <p className="text-xs text-muted-foreground">Blocked</p>
          </CardContent>
        </Card>
      </div>

      {/* User Management */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all platform users</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search users by name or shop..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="w-full justify-start overflow-x-auto">
              <TabsTrigger value="all">All ({stats.total})</TabsTrigger>
              <TabsTrigger value="owners">Owners ({stats.owners})</TabsTrigger>
              <TabsTrigger value="managers">Managers ({stats.managers})</TabsTrigger>
              <TabsTrigger value="customers">Customers ({stats.customers})</TabsTrigger>
              <TabsTrigger value="blocked">Blocked ({stats.blocked})</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="mt-4">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No users found</p>
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-2">
                    {filteredUsers.map((user) => (
                      <div
                        key={user.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          user.is_blocked ? 'bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900' : 'bg-card'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <Avatar className="h-10 w-10 shrink-0">
                            <AvatarFallback className={user.is_blocked ? 'bg-red-200 text-red-700' : ''}>
                              {getInitials(user.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium truncate">{user.email}</p>
                            <div className="flex items-center gap-2 flex-wrap">
                              {getRoleBadge(user.role, user.is_blocked)}
                              {user.has_shop && (
                                <Badge variant="outline" className="gap-1 text-xs">
                                  <Store className="h-3 w-3" />
                                  {user.shop_name || 'Shop'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <Button
                            variant={user.is_blocked ? "outline" : "secondary"}
                            size="sm"
                            onClick={() => setBlockDialog({ open: true, user })}
                            disabled={actionLoading === user.id}
                            className="h-8"
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : user.is_blocked ? (
                              <>
                                <UserCheck className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Unblock</span>
                              </>
                            ) : (
                              <>
                                <Ban className="h-4 w-4 mr-1" />
                                <span className="hidden sm:inline">Block</span>
                              </>
                            )}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => setDeleteDialog({ open: true, user })}
                            disabled={actionLoading === user.id}
                            className="h-8"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Block Confirmation Dialog */}
      <AlertDialog open={blockDialog.open} onOpenChange={(open) => setBlockDialog({ open, user: blockDialog.user })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {blockDialog.user?.is_blocked ? (
                <>
                  <UserCheck className="h-5 w-5 text-accent-foreground" />
                  Unblock User
                </>
              ) : (
                <>
                  <Ban className="h-5 w-5 text-destructive" />
                  Block User
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockDialog.user?.is_blocked
                ? `Are you sure you want to unblock ${blockDialog.user?.email}? They will regain access to the platform.`
                : `Are you sure you want to block ${blockDialog.user?.email}? They will lose access to the platform.`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => blockDialog.user && handleBlockUser(blockDialog.user)}
              className={blockDialog.user?.is_blocked ? '' : 'bg-red-600 hover:bg-red-700'}
            >
              {blockDialog.user?.is_blocked ? 'Unblock' : 'Block'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(open) => setDeleteDialog({ open, user: deleteDialog.user })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Delete User
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteDialog.user?.email}</strong>? 
              This will remove their role and access from the system. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteDialog.user && handleDeleteUser(deleteDialog.user)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
