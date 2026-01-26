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

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<'timeout' | 'expired' | 'offline' | 'fatal' | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [usingCache, setUsingCache] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Cache for quick visibility recovery - extended to 60 seconds
  const lastAuthCheckRef = useRef<number>(0);
  const cachedAuthRef = useRef<boolean>(false);
  const cachedRoleRef = useRef<string | null>(null);

  const checkAuthAndRole = useCallback(async (isVisibilityCheck = false) => {
    try {
      // Offline detection - use cache immediately if offline
      if (!isOnline() && cachedAuthRef.current) {
        console.log('[Auth] Offline - using cached auth');
        setAuthenticated(true);
        setUserRole(cachedRoleRef.current);
        setLoading(false);
        return;
      }

      // If visibility check and we have recent cache (within 60s), use cache
      if (isVisibilityCheck && cachedAuthRef.current) {
        const timeSinceLastCheck = Date.now() - lastAuthCheckRef.current;
        if (timeSinceLastCheck < 60000) { // Extended from 30s to 60s
          // Still validate session in background without blocking
          getSessionWithRetry(1).then(({ data: { session } }) => {
            if (!session && cachedAuthRef.current) {
              setAuthenticated(false);
              cachedAuthRef.current = false;
            }
          }).catch(() => {
            // Ignore background validation errors
          });
          return;
        }
      }

      // Reset error state
      setAuthError(null);

      // Use retry logic for session check
      const { data: { session } } = await getSessionWithRetry();
      
      // Check if we're using cached session (indicated by lack of recent timestamp)
      const isCached = session && !session.access_token;
      setUsingCache(isCached);
      
      if (!session) {
        setAuthenticated(false);
        cachedAuthRef.current = false;
        setAuthError('expired');
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

      // Fetch user role with a shorter timeout
      const rolePromise = supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      const roleTimeoutPromise = new Promise<null>((resolve) => 
        setTimeout(() => resolve(null), 5000)
      );

      const roleResult = await Promise.race([rolePromise, roleTimeoutPromise]);
      const roleData = roleResult && 'data' in roleResult ? roleResult.data : null;

      setAuthenticated(true);
      setUserRole(roleData?.role || null);
      
      // Update cache
      cachedAuthRef.current = true;
      cachedRoleRef.current = roleData?.role || null;
      lastAuthCheckRef.current = Date.now();
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      
      // Increment retry count for UI feedback
      setRetryCount(prev => prev + 1);
      
      // If offline and we have cache, use it
      if (!isOnline() && cachedAuthRef.current) {
        setAuthError('offline');
        setAuthenticated(true);
        setUserRole(cachedRoleRef.current);
        setUsingCache(true);
        setLoading(false);
        return;
      }
      
      // Determine error type
      if (error instanceof AuthTimeoutError) {
        // After 2 failed attempts, consider it fatal
        setAuthError(retryCount >= 2 ? 'fatal' : 'timeout');
      } else if (!isOnline()) {
        setAuthError('offline');
      } else {
        setAuthError('expired');
      }
      
      // Clear cache and stop loading
      setAuthenticated(false);
      cachedAuthRef.current = false;
      cachedRoleRef.current = null;
      setLoading(false);
    }
  }, []);

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
    let mounted = true;

    checkAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mounted) return;
      
      if (!session) {
        setAuthenticated(false);
        setUserRole(null);
        cachedAuthRef.current = false;
        cachedRoleRef.current = null;
        setLoading(false);
        return;
      }

      // Fetch role on auth state change
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (mounted) {
        setAuthenticated(true);
        setUserRole(roleData?.role || null);
        cachedAuthRef.current = true;
        cachedRoleRef.current = roleData?.role || null;
        lastAuthCheckRef.current = Date.now();
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
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
