import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

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
 * Check if there's a potentially valid session in localStorage.
 * This is a fast, synchronous check to avoid blocking the UI.
 */
const getStoredSession = (): { userId: string; email: string; role?: string } | null => {
  try {
    const storageKey = `sb-xupvteigmqcrfluuadte-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    const expiresAt = parsed?.expires_at;
    const userId = parsed?.user?.id;
    const email = parsed?.user?.email;

    // If no expiry or expired, return null
    if (!expiresAt || !userId) return null;

    // Check if token is expired (with 60 second buffer)
    const now = Math.floor(Date.now() / 1000);
    if (expiresAt <= now - 60) return null;

    // Check for cached role
    const cachedRole = sessionStorage.getItem(`user-role-${userId}`);

    return { userId, email: email || '', role: cachedRole || undefined };
  } catch {
    return null;
  }
};

export const useUserRole = (): UserRoleData => {
  // Get initial stored session once using useMemo to prevent recalculation
  const initialStoredSession = useMemo(() => getStoredSession(), []);

  // Use cached role if available for instant UI
  const [userRole, setUserRole] = useState<UserRole>(
    (initialStoredSession?.role as UserRole) || 'customer'
  );
  const [userName, setUserName] = useState<string>(initialStoredSession?.email?.split('@')[0] || 'User');
  const [userId, setUserId] = useState<string | null>(initialStoredSession?.userId || null);
  const [loading, setLoading] = useState(!initialStoredSession);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const roleLoadedRef = useRef(false);
  const initRef = useRef(false);

  const fetchUserData = useCallback(async (uid?: string) => {
    const targetUserId = uid || userId;
    if (!targetUserId) {
      setLoading(false);
      return;
    }

    try {
      setError(null);

      // Fetch role and profile in parallel
      const [roleResult, profileResult] = await Promise.all([
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

      if (!mountedRef.current) return;

      const role = roleResult.data?.role as UserRole || 'customer';
      const displayName = profileResult.data?.full_name || userName;

      setUserRole(role);
      setUserName(displayName);
      roleLoadedRef.current = true;

      // Cache role in sessionStorage for fast access on next page load
      if (targetUserId) {
        sessionStorage.setItem(`user-role-${targetUserId}`, role);
      }
    } catch (err) {
      console.warn('[useUserRole] Error fetching user data:', err);
      if (mountedRef.current) setError('Failed to load user data');
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [userId, userName]);

  useEffect(() => {
    mountedRef.current = true;

    // Only run once per component mount
    if (initRef.current) return;
    initRef.current = true;

    // If we have a stored session, fetch role data immediately
    if (initialStoredSession && !roleLoadedRef.current) {
      fetchUserData(initialStoredSession.userId);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (!session) {
        setUserRole('customer');
        setUserName('Guest');
        setUserId(null);
        setLoading(false);
        roleLoadedRef.current = false;
        return;
      }

      // Update user ID immediately
      setUserId(session.user.id);
      setUserName(session.user.email?.split('@')[0] || 'User');
      setLoading(false);

      // Skip role refresh for token refresh events
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // Fetch role data for new sessions
      if (!roleLoadedRef.current) {
        fetchUserData(session.user.id);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [fetchUserData, initialStoredSession]); // initialStoredSession is stable (useMemo)

  return { userRole, userName, userId, loading, error, refetch: fetchUserData };
};
