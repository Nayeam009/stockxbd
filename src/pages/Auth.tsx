import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Truck, Loader2 } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Role information for display only - roles are assigned by the server
  const roleInfo = {
    title: "Driver/Staff",
    icon: Truck,
    description: "New accounts start with driver access. Owners can upgrade roles via team management.",
    access: "Delivery management, customer updates, sales recording"
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (!isLogin && password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        toast({ title: "Welcome back!", description: "Successfully signed in" });
        navigate('/dashboard');
      } else {
        // SECURITY FIX: Do NOT pass role in signup data
        // All new users are assigned 'driver' role by the database trigger
        // Owners must manually upgrade roles via team management
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin
          }
        });

        if (error) throw error;

        toast({ 
          title: "Account created!", 
          description: "You've been assigned driver access. Contact an owner for role upgrades." 
        });
        navigate('/dashboard');
      }
    } catch (error: any) {
      toast({ 
        title: isLogin ? "Sign in failed" : "Sign up failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Link to="/" className="flex items-center space-x-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
          <div className="flex items-center space-x-3">
            <img src={stockXLogo} alt="Stock-X Logo" className="h-8 w-8" />
            <span className="text-xl font-bold text-primary">Stock-X</span>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="text-center space-y-6 mb-12">
            <div className="space-y-2">
              <Badge variant="secondary" className="px-4 py-2">Secure Login</Badge>
              <h1 className="text-3xl font-bold text-primary">User Authentication</h1>
              <p className="text-muted-foreground">
                Choose your role and access the Stock-X dashboard
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Role Information - Display Only */}
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-primary">Account Information</CardTitle>
                <CardDescription>
                  All new accounts are assigned driver access for security
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 border rounded-lg bg-surface/50">
                  <div className="flex items-start space-x-3">
                    <roleInfo.icon className="h-6 w-6 text-primary mt-1" />
                    <div className="flex-1 space-y-2">
                      <h3 className="font-semibold text-primary">{roleInfo.title}</h3>
                      <p className="text-sm text-muted-foreground">{roleInfo.description}</p>
                      <p className="text-xs text-muted-foreground bg-background p-2 rounded">
                        <span className="font-medium">Initial Access:</span> {roleInfo.access}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3 p-4 border rounded-lg border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800">
                  <div className="flex items-center space-x-2">
                    <Shield className="h-5 w-5 text-amber-600" />
                    <h4 className="font-medium text-amber-800 dark:text-amber-200">Role Upgrades</h4>
                  </div>
                  <p className="text-sm text-amber-700 dark:text-amber-300">
                    Need manager or owner access? Contact your team owner to upgrade your role through the team management feature.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Login Form */}
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-primary">
                  {isLogin ? 'Sign In' : 'Create Account'}
                </CardTitle>
                <CardDescription>
                  {isLogin ? 'Enter your credentials to access the dashboard' : 'Create a new account to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      type="email" 
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        disabled={loading}
                      />
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    size="lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {isLogin ? 'Signing In...' : 'Creating Account...'}
                      </>
                    ) : (
                      isLogin ? 'Sign In' : 'Create Account'
                    )}
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {isLogin ? "Don't have an account?" : "Already have an account?"}
                      <Button 
                        variant="link" 
                        className="p-0 ml-1 h-auto text-primary"
                        onClick={() => setIsLogin(!isLogin)}
                        type="button"
                        disabled={loading}
                      >
                        {isLogin ? 'Create one' : 'Sign in'}
                      </Button>
                    </p>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Security Notice */}
          <Card className="mt-8 border-0 bg-gradient-hero shadow-elegant">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-primary-foreground">
                  Secure Role Management
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  Roles are assigned server-side for security. All new users start as drivers and can be promoted by team owners.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;