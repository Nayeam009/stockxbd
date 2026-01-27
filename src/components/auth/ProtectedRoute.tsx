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

  const checkAuthAndRole = useCallback(async () => {
    try {
      setAuthError(null);

      // Check if offline
      if (!navigator.onLine) {
        setAuthError('offline');
        setLoading(false);
        return;
      }

      // Get session directly from Supabase
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setAuthenticated(false);
        setLoading(false);
        return;
      }

      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      if (mountedRef.current) {
        setAuthenticated(true);
        setUserRole(roleData?.role || null);
        setLoading(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      
      if (!navigator.onLine) {
        setAuthError('offline');
      } else {
        setAuthError('error');
      }
      
      setAuthenticated(false);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    checkAuthAndRole();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!mountedRef.current) return;
      
      if (!session) {
        setAuthenticated(false);
        setUserRole(null);
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
        setAuthenticated(true);
        setUserRole(roleData?.role || null);
        setLoading(false);
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, [checkAuthAndRole]);

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
