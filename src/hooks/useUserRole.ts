import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getSessionWithRetry, AuthTimeoutError, isOnline, getCachedUserId } from "@/lib/authUtils";

export type UserRole = 'owner' | 'manager' | 'customer';

interface UserRoleData {
  userRole: UserRole;
  userName: string;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Module-level cache for instant recovery on tab switch - persistent across component remounts
let cachedRole: UserRole | null = null;
let cachedName: string | null = null;
let cachedUserId: string | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 600000; // 10 minutes cache - be very aggressive about using cache

// Try to restore from localStorage on module load
try {
  const storedRole = localStorage.getItem('stockx.user.role');
  const storedName = localStorage.getItem('stockx.user.name');
  const storedUserId = localStorage.getItem('stockx.user.id');
  const storedTime = localStorage.getItem('stockx.user.timestamp');
  
  if (storedRole && storedTime) {
    const age = Date.now() - parseInt(storedTime);
    if (age < CACHE_DURATION) {
      cachedRole = storedRole as UserRole;
      cachedName = storedName || 'User';
      cachedUserId = storedUserId;
      lastFetchTime = parseInt(storedTime);
    }
  }
} catch (e) {
  // Ignore localStorage errors
}

export const useUserRole = (): UserRoleData => {
  const [userRole, setUserRole] = useState<UserRole>(cachedRole || 'customer');
  const [userName, setUserName] = useState<string>(cachedName || 'User');
  const [userId, setUserId] = useState<string | null>(cachedUserId || getCachedUserId());
  const [loading, setLoading] = useState(!cachedRole); // No loading if we have cache
  const [error, setError] = useState<string | null>(null);
  const isInitialLoadRef = useRef(!cachedRole);
  const isFetchingRef = useRef(false);

  const fetchUserData = useCallback(async (isSoftRefresh = false) => {
    // Prevent concurrent fetches
    if (isFetchingRef.current) {
      console.log('[UserRole] Fetch already in progress, skipping');
      return;
    }
    
    try {
      isFetchingRef.current = true;
      
      // PRIORITY 1: Use module cache if fresh
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (cachedRole && cachedName && timeSinceLastFetch < CACHE_DURATION) {
        console.log('[UserRole] Using cached data, age:', Math.round(timeSinceLastFetch / 1000), 's');
        setUserRole(cachedRole);
        setUserName(cachedName);
        setUserId(cachedUserId);
        setLoading(false);
        isInitialLoadRef.current = false;
        return;
      }
      
      // PRIORITY 2: Network-aware - if offline and we have cache, use it immediately
      const online = typeof navigator !== 'undefined' ? navigator.onLine : true;
      if (!online || !isOnline()) {
        console.log('[UserRole] Offline mode detected');
        if (cachedRole && cachedName) {
          console.log('[UserRole] Using cached data for offline mode');
          setUserRole(cachedRole);
          setUserName(cachedName);
          setUserId(cachedUserId);
          setLoading(false);
          isInitialLoadRef.current = false;
          return;
        }
        // No cache available - set defaults for offline
        console.log('[UserRole] No cache available for offline, using defaults');
        setUserRole('customer');
        setUserName('Guest');
        setLoading(false);
        isInitialLoadRef.current = false;
        return;
      }

      // Only show loading on initial load, not soft refreshes
      if (!isSoftRefresh && isInitialLoadRef.current) {
        setLoading(true);
      }
      setError(null);

      // Use retry-protected session fetch with cache fallback
      const { data: { session } } = await getSessionWithRetry(2, true); // 2 retries with cache
      
      if (!session?.user) {
        // Only clear cache if we got a definitive "no session" response
        if (!isSoftRefresh) {
          cachedRole = null;
          cachedName = null;
          cachedUserId = null;
        }
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
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

      // Race each query against a generous timeout
      const timeoutPromise = <T>(ms: number): Promise<T | null> => 
        new Promise(resolve => setTimeout(() => resolve(null), ms));

      const [roleResult, profileResult] = await Promise.all([
        Promise.race([rolePromise, timeoutPromise<typeof rolePromise>(15000)]),
        Promise.race([profilePromise, timeoutPromise<typeof profilePromise>(15000)])
      ]);

      // Handle role result
      if (roleResult && 'data' in roleResult && roleResult.data) {
        const role = roleResult.data.role as UserRole;
        setUserRole(role);
        cachedRole = role;
      } else {
        // If role fetch failed but we have cache, use it
        if (cachedRole && isSoftRefresh) {
          setUserRole(cachedRole);
        } else {
          console.warn('[UserRole] No role data, using customer default');
        }
      }

      // Use full name from profile, or email prefix, or 'User'
      const profileData = profileResult && 'data' in profileResult ? profileResult.data : null;
      const displayName = profileData?.full_name || 
                         session.user.email?.split('@')[0] || 
                         cachedName || // Fallback to cached name
                         'User';
      setUserName(displayName);
      cachedName = displayName;
      cachedUserId = session.user.id;
      
      // Update cache timestamp and persist to localStorage
      lastFetchTime = Date.now();
      try {
        localStorage.setItem('stockx.user.role', cachedRole || 'customer');
        localStorage.setItem('stockx.user.name', cachedName || 'User');
        localStorage.setItem('stockx.user.id', cachedUserId || '');
        localStorage.setItem('stockx.user.timestamp', lastFetchTime.toString());
      } catch (e) {
        // Ignore localStorage errors
      }

    } catch (err) {
      console.error('Error in useUserRole:', err);
      
      // On timeout, use cache if available, otherwise set defaults
      if (err instanceof AuthTimeoutError) {
        if (cachedRole && cachedName) {
          console.warn('[UserRole] Timeout - using cached data');
          setUserRole(cachedRole);
          setUserName(cachedName);
          setUserId(cachedUserId);
        } else {
          // Only set error on initial load
          if (!isSoftRefresh) {
            setError('Connection timed out');
          }
          setUserRole('customer');
          setUserName('Guest');
        }
      } else {
        if (!isSoftRefresh && !cachedRole) {
          setError('An error occurred while fetching user data');
        }
      }
    } finally {
      isFetchingRef.current = false;
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
        // Network-aware: if offline, use cache without refresh
        if (!isOnline() && cachedRole) {
          return;
        }
        
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
    
    // Also listen for online event to refresh when connection is restored
    const handleOnline = () => {
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch > CACHE_DURATION / 2) { // Refresh if stale by half the cache time
        fetchUserData(true);
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    window.addEventListener('online', handleOnline);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
      window.removeEventListener('online', handleOnline);
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
