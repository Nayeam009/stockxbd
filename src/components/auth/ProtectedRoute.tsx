import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { clearStoredAuthSession, hasValidStoredSession } from "@/lib/authUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const withTimeout = async <T,>(promise: Promise<T>, ms: number): Promise<T> => {
  return await Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
  ]);
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Start with optimistic state if localStorage has a session
  const hasStoredSession = hasValidStoredSession();

  const [loading, setLoading] = useState(!hasStoredSession);
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<'error' | 'offline' | null>(null);

  const location = useLocation();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const roleLoadedRef = useRef(false);
  const initRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;

    // Only run once per component mount
    if (initRef.current) return;
    initRef.current = true;

    // Capture the initial session state for safety timeout logic
    const hadStoredSession = hasStoredSession;

    // Safety timeout - if we have a local session but auth doesn't respond in 8s,
    // still allow access (the session was validated on localStorage check)
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;
    if (hadStoredSession) {
      safetyTimeout = setTimeout(() => {
        if (mountedRef.current) {
          console.log('[ProtectedRoute] Safety timeout - allowing access with cached session');
          setLoading(false);
          setAuthenticated(true);
        }
      }, 8000);
    }

    // Listen to auth state changes - this is the PRIMARY source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      // Clear safety timeout since auth responded
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }

      console.log('[ProtectedRoute] Auth event:', event, !!session);

      // Clear any previous errors on new auth events
      setAuthError(null);

      // Handle sign out
      if (!session) {
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        roleLoadedRef.current = false;
        return;
      }

      // Session exists - mark as authenticated immediately
      setAuthenticated(true);
      setLoading(false);

      // Skip role fetch for token refresh events (role doesn't change)
      if (event === 'TOKEN_REFRESHED') {
        return;
      }

      // Fetch role in background (non-blocking)
      // Only fetch once per session to avoid repeated timeouts
      if (!roleLoadedRef.current) {
        roleLoadedRef.current = true;

        try {
          const { data: roleData } = await supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (mountedRef.current) {
            setUserRole(roleData?.role || null);
          }
        } catch (err) {
          // Role fetch failed - continue without it, user can still access dashboard
          console.warn('[ProtectedRoute] Role fetch failed, continuing:', err);
        }
      }
    });

    // HARDENING: If no cached session exists, bootstrap with getSession() so we never
    // stay stuck on the loading screen waiting for an auth event.
    if (!hadStoredSession) {
      (async () => {
        try {
          const { data, error } = await withTimeout(supabase.auth.getSession(), 10000);
          if (!mountedRef.current) return;

          if (error) {
            // Common root cause: stale/invalid refresh token -> clear local auth cache
            const msg = String((error as any)?.message || '').toLowerCase();
            const code = (error as any)?.code;
            if (msg.includes('refresh token') || code === 'refresh_token_not_found') {
              clearStoredAuthSession();
            }
            setAuthenticated(false);
            setLoading(false);
            return;
          }

          if (data?.session) {
            setAuthenticated(true);
          } else {
            setAuthenticated(false);
          }
          setLoading(false);
        } catch (err) {
          if (!mountedRef.current) return;
          // Timeout or network failure
          setAuthError(navigator.onLine ? 'error' : 'offline');
          setAuthenticated(false);
          setLoading(false);
        }
      })();
    }

    return () => {
      mountedRef.current = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - run only once on mount

  // Retry handler
  const handleRetry = useCallback(() => {
    setLoading(true);
    setAuthError(null);
    roleLoadedRef.current = false;

    // Force a session refresh
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mountedRef.current) return;

      if (error || !session) {
        const msg = String((error as any)?.message || '').toLowerCase();
        const code = (error as any)?.code;
        if (msg.includes('refresh token') || code === 'refresh_token_not_found') {
          clearStoredAuthSession();
        }
        setAuthError(navigator.onLine ? 'error' : 'offline');
        setAuthenticated(false);
      } else {
        setAuthenticated(true);
        setAuthError(null);

        // Fetch role
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', session.user.id)
          .maybeSingle()
          .then(({ data }) => {
            if (mountedRef.current) {
              setUserRole(data?.role || null);
            }
          });
      }
      setLoading(false);
    }).catch(() => {
      if (mountedRef.current) {
        setAuthError(navigator.onLine ? 'error' : 'offline');
        setAuthenticated(false);
        setLoading(false);
      }
    });
  }, []);

  // Error Recovery Screen
  if (authError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className={`mx-auto w-16 h-16 rounded-full ${authError === 'offline' ? 'bg-muted' : 'bg-destructive/10'} flex items-center justify-center mb-2`}>
              {authError === 'offline' ? (
                <WifiOff className="h-8 w-8 text-muted-foreground" />
              ) : (
                <ShieldAlert className="h-8 w-8 text-destructive" />
              )}
            </div>
            <CardTitle className="text-xl">
              {authError === 'offline' ? "You're Offline" : 'Authentication Error'}
            </CardTitle>
            <CardDescription>
              {authError === 'offline'
                ? 'No internet connection detected. Please check your network.'
                : 'Unable to verify your session. Please try again.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={handleRetry}
              variant="outline"
              className="w-full h-12 touch-target"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>

            <Button
              onClick={() => navigate('/auth')}
              className="w-full h-12 touch-target"
            >
              <LogIn className="h-4 w-4 mr-2" />
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 animate-fade-in">
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" aria-label="Loading" />
          <p className="text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/auth" replace state={{ from: location }} />;
  }

  // Redirect customers away from dashboard to community
  if (userRole === 'customer' && location.pathname.startsWith('/dashboard')) {
    return <Navigate to="/community" replace />;
  }

  return <>{children}</>;
};
