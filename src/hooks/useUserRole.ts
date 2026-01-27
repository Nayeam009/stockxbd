import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type UserRole = 'owner' | 'manager' | 'customer';

interface UserRoleData {
  userRole: UserRole;
  userName: string;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export const useUserRole = (): UserRoleData => {
  const [userRole, setUserRole] = useState<UserRole>('customer');
  const [userName, setUserName] = useState<string>('User');
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setError(null);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', session.user.id)
          .maybeSingle()
      ]);

      const role = roleResult.data?.role as UserRole || 'customer';
      const displayName = profileResult.data?.full_name || 
                         session.user.email?.split('@')[0] || 'User';
      
      setUserRole(role);
      setUserName(displayName);
    } catch (err) {
      console.error('Error in useUserRole:', err);
      setError('Failed to load user data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      setLoading(true);
      fetchUserData();
    });

    return () => subscription.unsubscribe();
  }, [fetchUserData]);

  return { userRole, userName, userId, loading, error, refetch: fetchUserData };
};
