import { useState, useEffect, useCallback, useRef } from "react";
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

  const mountedRef = useRef(true);
  const requestIdRef = useRef(0);

  const withTimeout = useCallback(async <T,>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });

    try {
      return await Promise.race([Promise.resolve(promiseLike), timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const fetchUserData = useCallback(async () => {
    const requestId = ++requestIdRef.current;
    try {
      setLoading(true);
      setError(null);
      
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        8000,
        'Auth session check'
      );

      if (!mountedRef.current || requestId !== requestIdRef.current) return;
      
      if (!session?.user) {
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        return;
      }

      setUserId(session.user.id);

      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await withTimeout(
        Promise.all([
          Promise.resolve(
            supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .maybeSingle()
          ),
          Promise.resolve(
            supabase
              .from('profiles')
              .select('full_name')
              .eq('user_id', session.user.id)
              .maybeSingle()
          ),
        ]),
        8000,
        'Role/profile fetch'
      );

      if (!mountedRef.current || requestId !== requestIdRef.current) return;

      const role = roleResult.data?.role as UserRole || 'customer';
      const displayName = profileResult.data?.full_name || 
                         session.user.email?.split('@')[0] || 'User';
      
      setUserRole(role);
      setUserName(displayName);
    } catch (err) {
      console.error('Error in useUserRole:', err);
      if (mountedRef.current) setError('Failed to load user data');
    } finally {
      if (mountedRef.current && requestId === requestIdRef.current) setLoading(false);
    }
  }, [withTimeout]);

  useEffect(() => {
    mountedRef.current = true;
    fetchUserData();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchUserData();
    });

    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1; // invalidate in-flight requests
      subscription.unsubscribe();
    };
  }, [fetchUserData]);

  return { userRole, userName, userId, loading, error, refetch: fetchUserData };
};
