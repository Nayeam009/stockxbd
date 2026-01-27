import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * Check if there's a potentially valid session in localStorage.
 * This is a fast, synchronous check to avoid blocking the UI.
 */
const hasLocalSession = (): boolean => {
  try {
    const storageKey = `sb-xupvteigmqcrfluuadte-auth-token`;
    const stored = localStorage.getItem(storageKey);
    if (!stored) return false;
    
    const parsed = JSON.parse(stored);
    const expiresAt = parsed?.expires_at;
    
    // If no expiry or expired, return false
    if (!expiresAt) return false;
    
    // Check if token is expired (with 60 second buffer)
    const now = Math.floor(Date.now() / 1000);
    return expiresAt > now - 60;
  } catch {
    return false;
  }
};

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Start with optimistic state if localStorage has a session
  const hasStoredSession = hasLocalSession();
  
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
    
    // Only run once
    if (initRef.current) return;
    initRef.current = true;

    // Listen to auth state changes - this is the PRIMARY source of truth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      
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

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  // Retry handler
  const handleRetry = useCallback(() => {
    setLoading(true);
    setAuthError(null);
    roleLoadedRef.current = false;
    
    // Force a session refresh
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mountedRef.current) return;
      
      if (error || !session) {
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
