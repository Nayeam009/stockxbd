import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getStoredSessionSnapshot } from "@/lib/authUtils";

export type UserRole = 'owner' | 'manager' | 'customer' | 'super_admin';

interface UserRoleData {
  userRole: UserRole;
  userName: string;
  userId: string | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Get cached session data from localStorage
 * Fast, synchronous check to avoid blocking UI
 */
const getStoredSession = (): { userId: string; email: string; role?: string } | null => {
  try {
    const snapshot = getStoredSessionSnapshot();
    if (!snapshot) return null;
    
    // Check if session is still valid (with 60s buffer)
    const now = Math.floor(Date.now() / 1000);
    if (snapshot.expiresAt <= now - 60) return null;
    
    // Try to get cached role from sessionStorage
    const cachedRole = sessionStorage.getItem(`user-role-${snapshot.userId}`);
    
    return { 
      userId: snapshot.userId, 
      email: snapshot.email || '', 
      role: cachedRole || undefined 
    };
  } catch {
    return null;
  }
};

/**
 * useUserRole - Fetches and caches user role data
 * 
 * Features:
 * 1. Instant UI with cached role from sessionStorage
 * 2. Background refresh from database
 * 3. Non-blocking - dashboard renders immediately
 */
export const useUserRole = (): UserRoleData => {
  // Get initial session once (stable reference)
  const initialSession = useMemo(() => getStoredSession(), []);
  
  // Initialize with cached data for instant UI
  const [userRole, setUserRole] = useState<UserRole>(
    (initialSession?.role as UserRole) || 'customer'
  );
  const [userName, setUserName] = useState<string>(
    initialSession?.email?.split('@')[0] || 'User'
  );
  const [userId, setUserId] = useState<string | null>(
    initialSession?.userId || null
  );
  const [loading, setLoading] = useState(!initialSession);
  const [error, setError] = useState<string | null>(null);
  
  const mountedRef = useRef(true);
  const fetchedRef = useRef(false);
  const initRef = useRef(false);

  const fetchUserData = useCallback(async (uid?: string) => {
    const targetUserId = uid || userId;
    if (!targetUserId) {
      setLoading(false);
      return;
    }
    
    // Prevent duplicate fetches
    if (fetchedRef.current && !uid) return;
    fetchedRef.current = true;
    
    try {
      setError(null);
      
      // Fetch role and profile in parallel with timeout
      const timeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000)
      );
      
      const fetchPromise = Promise.all([
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', targetUserId)
          .maybeSingle(),
        supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', targetUserId)
          .maybeSingle()
      ]);
      
      const result = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (!mountedRef.current) return;
      
      if (result && Array.isArray(result)) {
        const [roleResult, profileResult] = result;
        
        const role = roleResult.data?.role as UserRole || 'customer';
        const displayName = profileResult.data?.full_name || userName;
        
        setUserRole(role);
        setUserName(displayName);
        
        // Cache role for fast access on next page load
        sessionStorage.setItem(`user-role-${targetUserId}`, role);
      }
    } catch (err) {
      console.warn('[useUserRole] Error fetching user data:', err);
      if (mountedRef.current) {
        setError('Failed to load user data');
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [userId, userName]);

  useEffect(() => {
    mountedRef.current = true;
    
    // Prevent double initialization
    if (initRef.current) return;
    initRef.current = true;
    
    // If we have a stored session, fetch role data
    if (initialSession && !fetchedRef.current) {
      fetchUserData(initialSession.userId);
    }
    
    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      
      if (!session) {
        // Signed out
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        setLoading(false);
        fetchedRef.current = false;
        return;
      }
      
      // Update user info immediately
      setUserId(session.user.id);
      setUserName(session.user.email?.split('@')[0] || 'User');
      setLoading(false);
      
      // Skip role refresh for token refresh events
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      // Fetch role for new/changed sessions
      if (!fetchedRef.current || event === 'SIGNED_IN') {
        fetchedRef.current = false; // Allow refetch
        fetchUserData(session.user.id);
      }
    });
    
    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, initialSession]);

  return { userRole, userName, userId, loading, error, refetch: fetchUserData };
};
