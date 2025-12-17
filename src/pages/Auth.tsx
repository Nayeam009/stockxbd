import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Truck, Loader2 } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Auth = () => {
  const [userType, setUserType] = useState<string>("manager");
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const userTypes = [
    {
      id: "owner",
      title: "Owner",
      description: "Full system access and management",
      icon: Shield,
      access: "Complete dashboard access, reporting, financial management"
    },
    {
      id: "manager",
      title: "Manager",
      description: "Operations and staff management",
      icon: Users,
      access: "Inventory, orders, customer management, staff oversight"
    },
    {
      id: "driver",
      title: "Driver/Staff",
      description: "Field operations and deliveries",
      icon: Truck,
      access: "Delivery management, customer updates, sales recording"
    }
  ];

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
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role: userType,
            }
          }
        });

        if (error) throw error;

        toast({ title: "Account created!", description: "Welcome to Stock-X" });
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
            {/* User Type Selection */}
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-primary">Select Your Role</CardTitle>
                <CardDescription>
                  Different roles have access to different features and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <RadioGroup value={userType} onValueChange={setUserType}>
                  {userTypes.map((type) => {
                    const Icon = type.icon;
                    return (
                      <div key={type.id} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-surface/50 transition-colors">
                        <RadioGroupItem value={type.id} id={type.id} className="mt-1" />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center space-x-3">
                            <Icon className="h-5 w-5 text-primary" />
                            <Label htmlFor={type.id} className="font-semibold text-primary cursor-pointer">
                              {type.title}
                            </Label>
                          </div>
                          <p className="text-sm text-muted-foreground">{type.description}</p>
                          <p className="text-xs text-muted-foreground bg-surface p-2 rounded">
                            <span className="font-medium">Access:</span> {type.access}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </RadioGroup>
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

          {/* Role Information */}
          <Card className="mt-8 border-0 bg-gradient-hero shadow-elegant">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-primary-foreground">
                  Access Level: {userTypes.find(u => u.id === userType)?.title}
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  {userTypes.find(u => u.id === userType)?.access}
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