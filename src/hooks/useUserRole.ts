import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionWithTimeout, AuthTimeoutError } from "@/lib/authUtils";

export type UserRole = 'owner' | 'manager' | 'customer';

interface UserRoleData {
  userRole: UserRole;
  userName: string;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Module-level cache for instant recovery on tab switch
let cachedRole: UserRole | null = null;
let cachedName: string | null = null;
let cachedUserId: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 60000; // 1 minute cache

export const useUserRole = (): UserRoleData => {
  const [userRole, setUserRole] = useState<UserRole>(cachedRole || 'customer');
  const [userName, setUserName] = useState<string>(cachedName || 'User');
  const [userId, setUserId] = useState<string | null>(cachedUserId);
  const [loading, setLoading] = useState(!cachedRole); // No loading if we have cache
  const [error, setError] = useState<string | null>(null);
  const isInitialLoadRef = useRef(!cachedRole);

  const fetchUserData = useCallback(async (isSoftRefresh = false) => {
    try {
      // Only show loading on initial load, not soft refreshes
      if (!isSoftRefresh && isInitialLoadRef.current) {
        setLoading(true);
      }
      setError(null);

      // Use timeout-protected session fetch
      const { data: { session } } = await getSessionWithTimeout();
      
      if (!session?.user) {
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        cachedRole = null;
        cachedName = null;
        cachedUserId = null;
        return;
      }

      setUserId(session.user.id);
      cachedUserId = session.user.id;

      // Fetch role and profile in parallel with individual timeouts
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const profilePromise = supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', session.user.id)
        .maybeSingle();

      // Race each query against a timeout
      const timeoutPromise = <T>(ms: number): Promise<T | null> => 
        new Promise(resolve => setTimeout(() => resolve(null), ms));

      const [roleResult, profileResult] = await Promise.all([
        Promise.race([rolePromise, timeoutPromise<typeof rolePromise>(5000)]),
        Promise.race([profilePromise, timeoutPromise<typeof profilePromise>(5000)])
      ]);

      // Handle role result
      if (roleResult && 'data' in roleResult && roleResult.data) {
        const role = roleResult.data.role as UserRole;
        setUserRole(role);
        cachedRole = role;
      } else if (roleResult && 'error' in roleResult && roleResult.error) {
        console.error('Error fetching role:', roleResult.error);
        setError('Failed to fetch user role');
      }

      // Use full name from profile, or email prefix, or 'User'
      const profileData = profileResult && 'data' in profileResult ? profileResult.data : null;
      const displayName = profileData?.full_name || 
                         session.user.email?.split('@')[0] || 
                         'User';
      setUserName(displayName);
      cachedName = displayName;
      
      // Update cache timestamp
      lastFetchTime = Date.now();

    } catch (err) {
      console.error('Error in useUserRole:', err);
      
      // On timeout, use cache if available, otherwise set defaults
      if (err instanceof AuthTimeoutError) {
        if (cachedRole && cachedName) {
          setUserRole(cachedRole);
          setUserName(cachedName);
          setUserId(cachedUserId);
        } else {
          setError('Connection timed out');
          setUserRole('customer');
          setUserName('Guest');
        }
      } else {
        setError('An error occurred while fetching user data');
      }
    } finally {
      if (isInitialLoadRef.current) {
        setLoading(false);
        isInitialLoadRef.current = false;
      }
    }
  }, []);

  // Handle visibility changes for instant tab recovery
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const timeSinceLastFetch = Date.now() - lastFetchTime;
        
        // Use cache if fresh, otherwise soft refresh
        if (cachedRole && timeSinceLastFetch < CACHE_DURATION) {
          // Cache is fresh, no need to refetch
          return;
        }
        
        // Cache is stale, do a soft refresh
        fetchUserData(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [fetchUserData]);

  useEffect(() => {
    // If we have cache, use it immediately
    if (cachedRole && cachedName) {
      setUserRole(cachedRole);
      setUserName(cachedName);
      setUserId(cachedUserId);
      setLoading(false);
      
      // Still refresh in background if cache is stale
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch > CACHE_DURATION) {
        fetchUserData(true);
      }
    } else {
      fetchUserData();
    }

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      // Clear cache on auth change
      cachedRole = null;
      cachedName = null;
      cachedUserId = null;
      isInitialLoadRef.current = true;
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
    refetch: () => fetchUserData(false)
  };
};
