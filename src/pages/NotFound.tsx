import { useLocation, Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Home, ArrowLeft, Search, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  // Fix common broken/encoded dashboard module URLs (e.g. "/dashboard%3Fmodule=settings")
  useEffect(() => {
    const path = location.pathname;
    const lower = path.toLowerCase();
    const prefix = "/dashboard%3fmodule=";

    if (lower.startsWith(prefix)) {
      const module = decodeURIComponent(path.slice(prefix.length));
      // Preserve expected dashboard routing format
      navigate(`/dashboard?module=${encodeURIComponent(module)}`, { replace: true });
    }
  }, [location.pathname, navigate]);

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full border border-border/40 shadow-xl">
        <CardHeader className="text-center space-y-4">
          {/* Stock-X Branding */}
          <div className="mx-auto h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
            <span className="text-2xl font-bold text-primary-foreground">X</span>
          </div>
          
          <div className="space-y-2">
            <CardTitle className="text-6xl font-extrabold text-primary tabular-nums">
              404
            </CardTitle>
            <CardDescription className="text-lg">
              Oops! This page doesn't exist
            </CardDescription>
          </div>
          
          <p className="text-sm text-muted-foreground">
            The page <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{location.pathname}</code> could not be found.
          </p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Quick Navigation */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
              asChild 
              variant="default" 
              className="h-12 touch-target"
            >
              <Link to="/" className="flex items-center gap-2">
                <Home className="h-4 w-4" aria-hidden="true" />
                <span>Home</span>
              </Link>
            </Button>
            
            <Button 
              asChild 
              variant="outline" 
              className="h-12 touch-target"
            >
              <Link to="/community" className="flex items-center gap-2">
                <Store className="h-4 w-4" aria-hidden="true" />
                <span>Marketplace</span>
              </Link>
            </Button>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>
          
          <Button 
            variant="ghost" 
            className="w-full h-11 text-muted-foreground hover:text-foreground"
            onClick={() => window.history.back()}
          >
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            Go back to previous page
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default NotFound;
