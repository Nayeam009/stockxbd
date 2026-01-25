import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, LogIn } from "lucide-react";
import { getSessionWithTimeout, AuthTimeoutError } from "@/lib/authUtils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [authError, setAuthError] = useState<'timeout' | 'expired' | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  
  // Cache for quick visibility recovery
  const lastAuthCheckRef = useRef<number>(0);
  const cachedAuthRef = useRef<boolean>(false);
  const cachedRoleRef = useRef<string | null>(null);

  const checkAuthAndRole = useCallback(async (isVisibilityCheck = false) => {
    try {
      // If visibility check and we have recent cache (within 30s), use cache
      if (isVisibilityCheck && cachedAuthRef.current) {
        const timeSinceLastCheck = Date.now() - lastAuthCheckRef.current;
        if (timeSinceLastCheck < 30000) {
          // Still validate session in background without blocking
          getSessionWithTimeout().then(({ data: { session } }) => {
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

      const { data: { session } } = await getSessionWithTimeout();
      
      if (!session) {
        setAuthenticated(false);
        cachedAuthRef.current = false;
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
      
      // Determine error type
      if (error instanceof AuthTimeoutError) {
        setAuthError('timeout');
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <RefreshCw className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">
              {authError === 'timeout' ? 'Connection Timeout' : 'Session Expired'}
            </CardTitle>
            <CardDescription>
              {authError === 'timeout' 
                ? 'The connection is taking too long. Please try again.'
                : 'Your session has expired. Please sign in again to continue.'
              }
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
