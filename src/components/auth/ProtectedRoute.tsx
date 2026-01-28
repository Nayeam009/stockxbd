import { useEffect, useState, useRef, useCallback } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn, WifiOff, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  clearStoredAuthSession, 
  hasValidStoredSession, 
  getSessionWithTimeout,
  isRefreshTokenError 
} from "@/lib/authUtils";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - Handles auth gating with resilient session detection
 * 
 * Key features:
 * 1. Optimistic rendering if localStorage has valid session
 * 2. Hard timeout (8s) prevents infinite loading
 * 3. Stale refresh tokens are detected and cleared
 * 4. Works across preview/published domains
 */
export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  // Optimistic: if localStorage has session, render immediately
  const hasStoredSession = hasValidStoredSession();
  
  const [loading, setLoading] = useState(!hasStoredSession);
  const [authenticated, setAuthenticated] = useState(hasStoredSession);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<'error' | 'offline' | null>(null);
  
  const location = useLocation();
  const navigate = useNavigate();
  const mountedRef = useRef(true);
  const initCompleteRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    
    // Prevent double initialization
    if (initCompleteRef.current) return;
    initCompleteRef.current = true;
    
    let safetyTimeout: ReturnType<typeof setTimeout> | null = null;
    
    // CRITICAL: Safety net - never stay loading forever
    // If we have a stored session, allow access after 5s regardless
    if (hasStoredSession) {
      safetyTimeout = setTimeout(() => {
        if (mountedRef.current && loading) {
          console.log('[ProtectedRoute] Safety timeout - allowing cached session');
          setLoading(false);
          setAuthenticated(true);
        }
      }, 5000);
    } else {
      // No stored session - still don't hang forever
      safetyTimeout = setTimeout(() => {
        if (mountedRef.current && loading) {
          console.log('[ProtectedRoute] No session timeout - redirecting to auth');
          setLoading(false);
          setAuthenticated(false);
        }
      }, 10000);
    }
    
    // Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mountedRef.current) return;
      
      console.log('[ProtectedRoute] Auth event:', event, !!session);
      
      // Clear any errors on new auth events
      setAuthError(null);
      
      if (!session) {
        // No session - user is signed out
        if (event === 'SIGNED_OUT') {
          clearStoredAuthSession();
        }
        setAuthenticated(false);
        setUserRole(null);
        setLoading(false);
        return;
      }
      
      // Session exists - mark authenticated immediately
      setAuthenticated(true);
      setLoading(false);
      
      // Clear safety timeout since we got auth response
      if (safetyTimeout) {
        clearTimeout(safetyTimeout);
        safetyTimeout = null;
      }
      
      // Skip role fetch for token refresh (role doesn't change)
      if (event === 'TOKEN_REFRESHED') {
        return;
      }
      
      // Fetch role in background (non-blocking)
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
        console.warn('[ProtectedRoute] Role fetch failed:', err);
      }
    });
    
    // Bootstrap: If no stored session, verify with server
    if (!hasStoredSession) {
      (async () => {
        try {
          const { session, error } = await getSessionWithTimeout(8000);
          
          if (!mountedRef.current) return;
          
          if (error) {
            console.warn('[ProtectedRoute] Session check error:', error);
            
            // Clear stale tokens
            if (isRefreshTokenError(error)) {
              clearStoredAuthSession();
            }
            
            setAuthError(navigator.onLine ? 'error' : 'offline');
            setAuthenticated(false);
            setLoading(false);
            return;
          }
          
          if (session) {
            setAuthenticated(true);
          } else {
            setAuthenticated(false);
          }
          setLoading(false);
          
        } catch (err) {
          console.warn('[ProtectedRoute] Bootstrap error:', err);
          if (mountedRef.current) {
            setAuthError(navigator.onLine ? 'error' : 'offline');
            setAuthenticated(false);
            setLoading(false);
          }
        }
      })();
    }
    
    return () => {
      mountedRef.current = false;
      if (safetyTimeout) clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []); // Empty deps - run only once

  // Retry handler
  const handleRetry = useCallback(() => {
    setLoading(true);
    setAuthError(null);
    
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (!mountedRef.current) return;
      
      if (error || !session) {
        if (error && isRefreshTokenError(error)) {
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
              {authError === 'offline' ? "You're Offline" : 'Session Expired'}
            </CardTitle>
            <CardDescription>
              {authError === 'offline'
                ? 'No internet connection detected. Please check your network.'
                : 'Your session has expired. Please sign in again.'}
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
              onClick={() => {
                clearStoredAuthSession();
                navigate('/auth');
              }}
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
          <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto" aria-label="Verifying session" />
          <p className="text-muted-foreground">Verifying session...</p>
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
