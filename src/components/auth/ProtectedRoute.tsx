import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<'error' | 'offline' | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const loadingRef = useRef(true);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  const withTimeout = useCallback(async <T,>(promiseLike: PromiseLike<T>, ms: number, label: string): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const timeoutPromise = new Promise<never>((_, reject) => {
      timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    });

    try {
      // Supabase query builders are PromiseLike (thenable) but not full Promises.
      // Normalize to a real Promise so Promise.race works reliably.
      return await Promise.race([Promise.resolve(promiseLike), timeoutPromise]);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }, []);

  const checkAuthAndRole = useCallback(async () => {
    // Always enter a known loading state (prevents stale UI on refresh)
    setAuthError(null);
    setLoading(true);

    // Check if offline
    if (!navigator.onLine) {
      setAuthError('offline');
      setAuthenticated(false);
      setUserRole(null);
      setLoading(false);
      return;
    }

    try {
      // Get session with hard timeout protection
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        8000,
        'Auth session check'
      );
      
      if (sessionError || !session) {
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Session OK → authenticate immediately.
      // Role fetch is best-effort; it must NEVER block the dashboard.
      setAuthenticated(true);

      try {
        const { data: roleData } = await withTimeout(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle(),
          8000,
          'Role fetch'
        );

        if (mountedRef.current) {
          setUserRole(roleData?.role || null);
        }
      } catch (roleError) {
        // IMPORTANT: Do not show auth error UI for role fetch timeouts.
        // We keep the user authenticated and let the app retry later.
        console.warn('[ProtectedRoute] Role fetch failed (initial), continuing:', roleError);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      if (!mountedRef.current) return;

      setAuthError(navigator.onLine ? 'error' : 'offline');
      setAuthenticated(false);
      setUserRole(null);
      setLoading(false);
    }
  }, [withTimeout]);

  useEffect(() => {
    mountedRef.current = true;
    checkAuthAndRole();

    // Safety timeout - prevent infinite loading
    const safetyTimeout = setTimeout(() => {
      if (!mountedRef.current) return;

      // Only fire if we're still loading.
      if (!loadingRef.current) return;

      // If we're still loading after the max wait, force an error recovery UI.
      // This prevents refresh freezes even when the auth SDK/network hangs.
      if (mountedRef.current) {
        console.warn('[ProtectedRoute] Safety timeout reached');
        setAuthError(navigator.onLine ? 'error' : 'offline');
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
      }
    }, 10000); // 10 second max wait

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;

      // TOKEN_REFRESHED happens frequently and should never block UI.
      // Role doesn't change on token refresh → skip role fetch to avoid timeouts on refresh.
      if (event === 'TOKEN_REFRESHED') {
        setAuthError(null);
        setAuthenticated(!!session);
        setLoading(false);
        return;
      }

      setAuthError(null);
      setLoading(true);

      if (!session) {
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return;
      }

      // Session OK
      setAuthenticated(true);

      try {
        const { data: roleData } = await withTimeout(
          supabase
            .from('user_roles')
            .select('role')
            .eq('user_id', session.user.id)
            .maybeSingle(),
          8000,
          'Role fetch (auth change)'
        );

        if (mountedRef.current) {
          setUserRole(roleData?.role || null);
        }
      } catch (e) {
        // Same principle: role fetch failures must NOT break auth.
        console.warn('[ProtectedRoute] Role fetch failed (auth change), continuing:', e);
      } finally {
        if (mountedRef.current) setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, [checkAuthAndRole, withTimeout]);

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
              onClick={() => {
                setLoading(true);
                setAuthError(null);
                checkAuthAndRole();
              }} 
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
