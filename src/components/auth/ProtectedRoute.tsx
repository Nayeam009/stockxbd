import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn, WifiOff, Clock, ShieldAlert } from "lucide-react";
import { getSessionWithRetry, AuthTimeoutError, isOnline, clearAuthCache } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

// Module-level persistent auth state - survives component remounts and tab switches
let persistentAuthState = {
  authenticated: false,
  userRole: null as string | null,
  lastVerified: 0,
  userId: null as string | null,
};

const AUTH_STATE_TTL = 600000; // 10 minutes - trust cached auth for longer

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(() => {
    // If we have recent persistent auth, skip loading entirely
    const timeSinceVerified = Date.now() - persistentAuthState.lastVerified;
    return !(persistentAuthState.authenticated && timeSinceVerified < AUTH_STATE_TTL);
  });
  const [authenticated, setAuthenticated] = useState(persistentAuthState.authenticated);
  const [userRole, setUserRole] = useState<string | null>(persistentAuthState.userRole);
  const [authError, setAuthError] = useState<'timeout' | 'expired' | 'offline' | 'fatal' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingCache, setUsingCache] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Refs for tracking
  const isVerifyingRef = useRef(false);
  const mountedRef = useRef(true);
  
  // Cache for quick visibility recovery - extended to 5 minutes
  const lastAuthCheckRef = useRef<number>(persistentAuthState.lastVerified);
  const cachedAuthRef = useRef<boolean>(persistentAuthState.authenticated);
  const cachedRoleRef = useRef<string | null>(persistentAuthState.userRole);

  const checkAuthAndRole = useCallback(async (isVisibilityCheck = false) => {
    // Prevent concurrent verification
    if (isVerifyingRef.current) {
      console.log('[Auth] Verification already in progress');
      return;
    }
    
    try {
      isVerifyingRef.current = true;
      
      // PRIORITY 1: Use persistent module state if fresh
      const timeSinceVerified = Date.now() - persistentAuthState.lastVerified;
      if (persistentAuthState.authenticated && timeSinceVerified < AUTH_STATE_TTL) {
        console.log('[Auth] Using persistent auth state, age:', Math.round(timeSinceVerified / 1000), 's');
        setAuthenticated(true);
        setUserRole(persistentAuthState.userRole);
        setLoading(false);
        
        // Do background validation only if stale by half TTL
        if (timeSinceVerified > AUTH_STATE_TTL / 2 && !isVisibilityCheck) {
          getSessionWithRetry().catch(() => {});
        }
        return;
      }

      // PRIORITY 2: Offline detection - use cache immediately if offline
      if (!isOnline()) {
        if (cachedAuthRef.current) {
          console.log('[Auth] Offline - using cached auth');
          setAuthenticated(true);
          setUserRole(cachedRoleRef.current);
          setUsingCache(true);
          setLoading(false);
          return;
        }
      }

      // PRIORITY 3: If visibility check and we have recent cache (within 5 min), use cache
      if (isVisibilityCheck && cachedAuthRef.current) {
        const timeSinceLastCheck = Date.now() - lastAuthCheckRef.current;
        if (timeSinceLastCheck < 300000) { // 5 minutes
          console.log('[Auth] Tab visible - using cached auth, age:', Math.round(timeSinceLastCheck / 1000), 's');
          return; // Keep current state, no reload needed
        }
      }

      // Reset error state
      setAuthError(null);

      // PRIORITY 4: Fetch fresh session
      const { data: { session } } = await getSessionWithRetry();
      
      // Check if we're using cached session
      const isCached = session && !session.access_token;
      setUsingCache(isCached);
      
      if (!session) {
        // No session at all - redirect to login
        setAuthenticated(false);
        cachedAuthRef.current = false;
        persistentAuthState.authenticated = false;
        persistentAuthState.userRole = null;
        setAuthError('expired');
        setLoading(false);
        return;
      }

     // CRITICAL FIX: If using cached session without access token, skip database query
     // and use cached role immediately to prevent hanging on invalid auth
     if (isCached || !session.access_token) {
       console.log('[Auth] Using cached session - skipping database query');
       if (cachedRoleRef.current || persistentAuthState.userRole) {
         setAuthenticated(true);
         setUserRole(cachedRoleRef.current || persistentAuthState.userRole);
         setLoading(false);
         return;
       }
       // No cached role available - set defaults
       setAuthenticated(true);
       setUserRole('customer');
       setLoading(false);
       return;
     }

      // Use cached role if available and this is a visibility check
      if (isVisibilityCheck && cachedRoleRef.current) {
        setAuthenticated(true);
        setUserRole(cachedRoleRef.current);
        lastAuthCheckRef.current = Date.now();
        return;
      }

      // Fetch user role with generous timeout
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const roleTimeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 10000) // 10s timeout for role fetch
      );

      const roleResult = await Promise.race([rolePromise, roleTimeoutPromise]);
      const roleData = roleResult && 'data' in roleResult ? roleResult.data : null;

      // Update all caches
      const role = roleData?.role || null;
      setAuthenticated(true);
      setUserRole(role);
      
      cachedAuthRef.current = true;
      cachedRoleRef.current = role;
      lastAuthCheckRef.current = Date.now();
      
      // Update persistent state
      persistentAuthState.authenticated = true;
      persistentAuthState.userRole = role;
      persistentAuthState.lastVerified = Date.now();
      persistentAuthState.userId = session.user.id;
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      
      // Increment retry count for UI feedback
      setRetryCount(prev => prev + 1);
      
      // FALLBACK: If we have ANY cached auth, use it
      if (cachedAuthRef.current || persistentAuthState.authenticated) {
        console.log('[Auth] Error occurred but using cached auth');
        setAuthenticated(true);
        setUserRole(cachedRoleRef.current || persistentAuthState.userRole);
        setUsingCache(true);
        setLoading(false);
        return;
      }
      
      // If offline and we have cache, use it
      if (!isOnline()) {
        setAuthError('offline');
        setLoading(false);
        return;
      }
      
      // Determine error type
      if (error instanceof AuthTimeoutError) {
        setAuthError(retryCount >= 2 ? 'fatal' : 'timeout');
      } else {
        setAuthError('expired');
      }
      
      // Clear cache and stop loading
      setAuthenticated(false);
      cachedAuthRef.current = false;
      cachedRoleRef.current = null;
      persistentAuthState.authenticated = false;
      setLoading(false);
    } finally {
      isVerifyingRef.current = false;
    }
  }, [retryCount]);

  const handleClearCacheAndRetry = async () => {
    console.log('[Auth] Clearing cache and retrying...');
    clearAuthCache();
    await supabase.auth.signOut();
    setRetryCount(0);
    setAuthError(null);
    setLoading(true);
    checkAuthAndRole();
  };

  // Handle visibility changes for instant tab recovery
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkAuthAndRole(true); // Visibility check - use cache if valid
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleVisibility);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleVisibility);
    };
  }, [checkAuthAndRole]);

  useEffect(() => {
    mountedRef.current = true;
    
    // If we have recent persistent auth, skip initial check entirely
    const timeSinceVerified = Date.now() - persistentAuthState.lastVerified;
    if (persistentAuthState.authenticated && timeSinceVerified < AUTH_STATE_TTL) {
      console.log('[Auth] Using persistent state on mount');
      setAuthenticated(true);
      setUserRole(persistentAuthState.userRole);
      setLoading(false);
    } else {
      checkAuthAndRole();
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;
      
      if (!session) {
        setAuthenticated(false);
        setUserRole(null);
        cachedAuthRef.current = false;
        cachedRoleRef.current = null;
        persistentAuthState.authenticated = false;
        persistentAuthState.userRole = null;
        setLoading(false);
        return;
      }

      // Fetch role on auth state change
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (mountedRef.current) {
        const role = roleData?.role || null;
        setAuthenticated(true);
        setUserRole(role);
        cachedAuthRef.current = true;
        cachedRoleRef.current = role;
        lastAuthCheckRef.current = Date.now();
        
        // Update persistent state
        persistentAuthState.authenticated = true;
        persistentAuthState.userRole = role;
        persistentAuthState.lastVerified = Date.now();
        persistentAuthState.userId = session.user.id;
        
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [checkAuthAndRole]);

  // Session Expired / Timeout Recovery Screen
  if (authError) {
    const errorConfig = {
      timeout: {
        icon: <Clock className="h-8 w-8 text-amber-500" />,
        title: 'Connection Slow',
        description: `Connection attempt ${retryCount}/2 timed out. Check your internet and try again.`,
        bgColor: 'bg-amber-500/10'
      },
      fatal: {
        icon: <ShieldAlert className="h-8 w-8 text-destructive" />,
        title: 'Cannot Connect',
        description: 'Unable to reach the server after multiple attempts. Your session may have expired.',
        bgColor: 'bg-destructive/10'
      },
      offline: {
        icon: <WifiOff className="h-8 w-8 text-muted-foreground" />,
        title: 'You\'re Offline',
        description: 'No internet connection detected. Please check your network.',
        bgColor: 'bg-muted'
      },
      expired: {
        icon: <RefreshCw className="h-8 w-8 text-primary" />,
        title: 'Session Expired',
        description: 'Your session has expired. Please sign in again to continue.',
        bgColor: 'bg-primary/10'
      }
    };
    
    const config = errorConfig[authError];
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className={`mx-auto w-16 h-16 rounded-full ${config.bgColor} flex items-center justify-center mb-2`}>
              {config.icon}
            </div>
            <CardTitle className="text-xl">{config.title}</CardTitle>
            <CardDescription>{config.description}</CardDescription>
            
            {/* Retry progress indicator */}
            {(authError === 'timeout' || authError === 'fatal') && retryCount > 0 && (
              <div className="pt-2">
                <Progress value={(retryCount / 2) * 100} className="h-2" />
                <p className="text-xs text-muted-foreground mt-1">
                  {retryCount < 2 ? 'Auto-retrying...' : 'Max retries reached'}
                </p>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-3">
            {authError === 'fatal' && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>
                  Try clearing your session and signing in again. This often resolves connection issues.
                </AlertDescription>
              </Alert>
            )}
            
            <Button 
              onClick={() => {
                setLoading(true);
                setAuthError(null);
                setRetryCount(0);
                checkAuthAndRole();
              }} 
              variant="outline"
              className="w-full h-12 touch-target"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            {authError === 'fatal' && (
              <Button 
                onClick={handleClearCacheAndRetry}
                variant="outline"
                className="w-full h-12 touch-target"
              >
                <ShieldAlert className="h-4 w-4 mr-2" />
                Clear Session & Retry
              </Button>
            )}
            
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
          <p className="text-muted-foreground">
            {retryCount > 0 ? `Retrying connection (${retryCount}/2)...` : 'Loading your dashboard...'}
          </p>
          {retryCount > 0 && (
            <p className="text-xs text-muted-foreground">
              Slow connection detected. Please wait...
            </p>
          )}
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

  // Show banner if using cached auth
  if (usingCache && authenticated) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500/10 border-b border-amber-500/20 p-2">
          <p className="text-center text-sm text-amber-700 dark:text-amber-400">
            <WifiOff className="inline h-4 w-4 mr-1" />
            Using offline mode - Some features may be limited
          </p>
        </div>
        <div className="pt-10">
          {children}
        </div>
      </>
    );
  }

  return <>{children}</>;
};
