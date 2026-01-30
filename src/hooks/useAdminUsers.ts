import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface AdminUserData {
  id: string;
  fullName: string;
  phone: string | null;
  role: 'owner' | 'manager' | 'customer';
  isBlocked: boolean;
  isAdmin: boolean;
  hasShop: boolean;
  shopName: string | null;
  createdAt: string;
}

interface UseAdminUsersReturn {
  users: AdminUserData[];
  loading: boolean;
  error: string | null;
  isVerifiedAdmin: boolean | null;
  currentUserId: string | null;
  refetch: () => Promise<void>;
  blockUser: (userId: string, block: boolean) => Promise<boolean>;
  deleteUser: (userId: string) => Promise<boolean>;
  stats: {
    total: number;
    owners: number;
    managers: number;
    customers: number;
    blocked: number;
    shops: number;
    admins: number;
  };
}

export const useAdminUsers = (): UseAdminUsersReturn => {
  const [users, setUsers] = useState<AdminUserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVerifiedAdmin, setIsVerifiedAdmin] = useState<boolean | null>(null);
  const currentUserId = useRef<string | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Verify admin status on mount
  useEffect(() => {
    const verifyAdmin = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsVerifiedAdmin(false);
          return;
        }
        
        currentUserId.current = user.id;
        
        const { data, error } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();
        
        if (error) {
          console.error('Admin verification error:', error);
          setIsVerifiedAdmin(false);
          return;
        }
        
        setIsVerifiedAdmin(!!data);
      } catch (err) {
        console.error('Admin verification failed:', err);
        setIsVerifiedAdmin(false);
      }
    };
    
    verifyAdmin();
  }, []);

  const fetchUsers = useCallback(async () => {
    if (isVerifiedAdmin !== true) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // Parallel fetch with timeout
      const timeoutPromise = new Promise<never>((_, reject) => 
        setTimeout(() => reject(new Error('Request timeout - please try again')), 15000)
      );
      
      const fetchPromise = Promise.all([
        supabase.from('user_roles').select('user_id, role, created_at'),
        supabase.from('profiles').select('user_id, full_name, phone'),
        supabase.from('user_status').select('user_id, is_blocked'),
        supabase.from('shop_profiles').select('owner_id, shop_name'),
        supabase.from('admin_users').select('user_id'),
      ]);
      
      const results = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>;
      
      const [rolesResult, profilesResult, statusResult, shopsResult, adminsResult] = results;
      
      if (rolesResult.error) throw rolesResult.error;
      
      const rolesData = rolesResult.data || [];
      const profilesData = profilesResult.data || [];
      const statusData = statusResult.data || [];
      const shopsData = shopsResult.data || [];
      const adminsData = adminsResult.data || [];
      
      // Create lookup maps for O(1) access
      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));
      const statusMap = new Map(statusData.map(s => [s.user_id, s]));
      const shopsMap = new Map(shopsData.map(s => [s.owner_id, s]));
      const adminsSet = new Set(adminsData.map(a => a.user_id));
      
      // Combine data
      const combinedUsers: AdminUserData[] = rolesData.map(role => {
        const profile = profilesMap.get(role.user_id);
        const status = statusMap.get(role.user_id);
        const shop = shopsMap.get(role.user_id);
        
        return {
          id: role.user_id,
          fullName: profile?.full_name || 'Unknown User',
          phone: profile?.phone || null,
          role: role.role as 'owner' | 'manager' | 'customer',
          isBlocked: status?.is_blocked || false,
          isAdmin: adminsSet.has(role.user_id),
          hasShop: !!shop,
          shopName: shop?.shop_name || null,
          createdAt: role.created_at,
        };
      });
      
      // Sort: admins first, then by name
      combinedUsers.sort((a, b) => {
        if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
        return a.fullName.localeCompare(b.fullName);
      });
      
      setUsers(combinedUsers);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [isVerifiedAdmin]);

  // Initial fetch when admin is verified
  useEffect(() => {
    if (isVerifiedAdmin === true) {
      fetchUsers();
    }
  }, [isVerifiedAdmin, fetchUsers]);

  // Real-time subscriptions
  useEffect(() => {
    if (isVerifiedAdmin !== true) return;
    
    // Debounce refetch to avoid multiple rapid updates
    let debounceTimer: NodeJS.Timeout;
    const debouncedRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(fetchUsers, 500);
    };
    
    channelRef.current = supabase
      .channel('admin-users-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_roles' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_status' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, debouncedRefetch)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'shop_profiles' }, debouncedRefetch)
      .subscribe();
    
    return () => {
      clearTimeout(debounceTimer);
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [isVerifiedAdmin, fetchUsers]);

  const blockUser = useCallback(async (userId: string, block: boolean): Promise<boolean> => {
    try {
      const { error } = await supabase
        .from('user_status')
        .upsert({
          user_id: userId,
          is_blocked: block,
          blocked_at: block ? new Date().toISOString() : null,
          blocked_by: currentUserId.current
        }, { onConflict: 'user_id' });

      if (error) throw error;

      // Optimistic update
      setUsers(prev => prev.map(u => 
        u.id === userId ? { ...u, isBlocked: block } : u
      ));

      return true;
    } catch (err: any) {
      console.error('Error blocking user:', err);
      throw new Error(err.message || 'Failed to update user status');
    }
  }, []);

  const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
    try {
      // Delete from user_roles
      const { error: roleError } = await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      if (roleError) throw roleError;

      // Delete from user_status if exists
      await supabase
        .from('user_status')
        .delete()
        .eq('user_id', userId);

      // Optimistic update
      setUsers(prev => prev.filter(u => u.id !== userId));

      return true;
    } catch (err: any) {
      console.error('Error deleting user:', err);
      throw new Error(err.message || 'Failed to delete user');
    }
  }, []);

  // Calculate stats
  const stats = {
    total: users.length,
    owners: users.filter(u => u.role === 'owner').length,
    managers: users.filter(u => u.role === 'manager').length,
    customers: users.filter(u => u.role === 'customer').length,
    blocked: users.filter(u => u.isBlocked).length,
    shops: users.filter(u => u.hasShop).length,
    admins: users.filter(u => u.isAdmin).length,
  };

  return {
    users,
    loading,
    error,
    isVerifiedAdmin,
    currentUserId: currentUserId.current,
    refetch: fetchUsers,
    blockUser,
    deleteUser,
    stats,
  };
};
