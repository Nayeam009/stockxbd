import { useEffect, useState, useCallback, useRef } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const location = useLocation();
  
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
          supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session && cachedAuthRef.current) {
              setAuthenticated(false);
              cachedAuthRef.current = false;
            }
          });
          return;
        }
      }

      const { data: { session } } = await supabase.auth.getSession();
      
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

      // Fetch user role
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', session.user.id)
        .maybeSingle();

      setAuthenticated(true);
      setUserRole(roleData?.role || null);
      
      // Update cache
      cachedAuthRef.current = true;
      cachedRoleRef.current = roleData?.role || null;
      lastAuthCheckRef.current = Date.now();
      
      setLoading(false);
    } catch (error) {
      console.error('Auth check error:', error);
      setAuthenticated(false);
      cachedAuthRef.current = false;
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
