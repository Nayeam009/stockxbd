import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'owner' | 'manager' | 'driver' | 'staff' | 'customer';

interface UserRoleData {
  userRole: UserRole;
  userName: string;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserRole = (): UserRoleData => {
  const [userRole, setUserRole] = useState<UserRole>('driver');
  const [userName, setUserName] = useState<string>('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUserRole('driver');
        setUserName('Guest');
        setUserId(null);
        return;
      }

      setUserId(session.user.id);

      // Fetch role from user_roles table
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (roleError) {
        console.error('Error fetching role:', roleError);
        setError('Failed to fetch user role');
      } else if (roleData) {
        setUserRole(roleData.role as UserRole);
      }

      // Fetch profile for user name
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
      }

      // Use full name from profile, or email prefix, or 'User'
      const displayName = profileData?.full_name || 
                         session.user.email?.split('@')[0] || 
                         'User';
      setUserName(displayName);

    } catch (err) {
      console.error('Error in useUserRole:', err);
      setError('An error occurred while fetching user data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return {
    userRole,
    userName,
    userId,
    loading,
    error,
    refetch: fetchUserData
  };
};
