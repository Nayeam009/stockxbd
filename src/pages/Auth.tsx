import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Shield, Truck, Loader2, Users, Crown, AlertCircle, UserPlus, LogIn, ShoppingCart, Package, Globe, CheckCircle2 } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

type AuthMode = 'signin' | 'signup' | 'invite';
type UserRole = 'owner' | 'manager' | 'driver' | 'customer';

interface RoleOption {
  id: UserRole;
  label: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  borderColor: string;
  features: string[];
}

const roleOptions: RoleOption[] = [
  {
    id: 'customer',
    label: 'Customer',
    description: 'Order LPG online',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
    features: ['Browse nearby LPG shops', 'Place orders online', 'Real-time delivery tracking']
  },
  {
    id: 'owner',
    label: 'Owner',
    description: 'Full business control',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
    features: ['Complete inventory management', 'Team & staff management', 'Business analytics & reports']
  },
  {
    id: 'manager',
    label: 'Manager',
    description: 'Inventory & sales',
    icon: Users,
    color: 'text-primary',
    bgColor: 'bg-primary/5',
    borderColor: 'border-primary',
    features: ['Inventory management', 'Sales & POS access', 'Customer management']
  },
  {
    id: 'driver',
    label: 'Driver',
    description: 'Delivery access',
    icon: Truck,
    color: 'text-slate-600',
    bgColor: 'bg-slate-50 dark:bg-slate-950/30',
    borderColor: 'border-slate-500',
    features: ['Delivery tracking', 'Customer updates', 'Route management']
  }
];

const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const inviteRoleParam = searchParams.get('role');
  
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>('customer');
  const [loading, setLoading] = useState(false);
  const [checkingSystem, setCheckingSystem] = useState(true);
  const [ownersExist, setOwnersExist] = useState(true);
  const [inviteValid, setInviteValid] = useState<boolean | null>(null);
  const [inviteRole, setInviteRole] = useState<string>('');
  const navigate = useNavigate();

  // Check system state on mount
  useEffect(() => {
    const processInviteForExistingUser = async (userId: string, email: string) => {
      if (!inviteCode) return;
      
      try {
        const { data, error } = await supabase.rpc('mark_invite_used', {
          _code: inviteCode,
          _user_id: userId,
          _email: email
        });
        
        if (error || !data) {
          toast({
            title: "Invite Processing Failed",
            description: "Could not process the invite. It may be invalid or already used.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Welcome to the Team!",
            description: `You've been added as ${inviteRoleParam || 'team member'}`,
          });
        }
        navigate('/dashboard');
      } catch (err) {
        console.error('Error processing invite:', err);
        navigate('/dashboard');
      }
    };

    const checkSystemState = async () => {
      setCheckingSystem(true);
      
      try {
        // Check if user is already logged in
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          // If invite code present, process it for existing user
          if (inviteCode) {
            await processInviteForExistingUser(session.user.id, session.user.email || '');
          } else {
            // Check user role and redirect accordingly
            const { data: roleData } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', session.user.id)
              .single();
            
            if (roleData?.role === 'customer') {
              navigate('/community');
            } else {
              navigate('/dashboard');
            }
            return;
          }
        }

        // If invite code is present, validate it
        if (inviteCode) {
          const { data: inviteData, error } = await supabase.rpc('validate_invite', { _code: inviteCode });
          
          if (error || !inviteData || inviteData.length === 0) {
            setInviteValid(false);
            setAuthMode('signin');
            toast({
              title: "Invalid Invite",
              description: "This invite link is invalid or expired",
              variant: "destructive"
            });
          } else {
            setInviteValid(true);
            setInviteRole(inviteData[0].role);
            setAuthMode('invite');
          }
        } else {
          // Check if any owners exist
          const { data: hasOwners, error } = await supabase.rpc('owners_exist');
          
          if (error) {
            console.error('Error checking owners:', error);
            setOwnersExist(true);
          } else {
            setOwnersExist(hasOwners || false);
            // If no owners exist, default to signup for first user
            setAuthMode(hasOwners ? 'signin' : 'signup');
          }
        }
      } catch (err) {
        console.error('Error checking system state:', err);
      }
      
      setCheckingSystem(false);
    };

    checkSystemState();
  }, [inviteCode, navigate, inviteRoleParam]);

  const handleSignUp = async () => {
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Passwords do not match", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: inviteCode 
            ? `${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRoleParam || inviteRole}`
            : window.location.origin,
          data: {
            full_name: fullName || undefined,
            // Pass selected role to database trigger (only for non-invite signups)
            requested_role: inviteCode ? undefined : selectedRole
          }
        }
      });

      if (error) throw error;

      if (data.user) {
        // If invite code present, mark it as used (team member signup)
        if (inviteCode) {
          await supabase.rpc('mark_invite_used', {
            _code: inviteCode,
            _user_id: data.user.id,
            _email: email
          });
          
          toast({ 
            title: "Welcome to the Team!", 
            description: `You've successfully joined as ${getRoleLabel(inviteRole)}` 
          });
        } else {
          // Role is now assigned by database trigger using requested_role from metadata
          toast({ 
            title: "Account Created Successfully!", 
            description: `Welcome! You've signed up as ${getRoleLabel(selectedRole)}` 
          });
        }
        
        // Redirect based on role - customers go to community, others to dashboard
        if (selectedRole === 'customer') {
          navigate('/community');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Registration Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // If invite code present, process it for existing user signing in
      if (inviteCode && data.user) {
        await supabase.rpc('mark_invite_used', {
          _code: inviteCode,
          _user_id: data.user.id,
          _email: email
        });
        
        toast({ 
          title: "Welcome to the Team!", 
          description: `You've joined as ${getRoleLabel(inviteRole)}` 
        });
        navigate('/dashboard');
      } else if (data.user) {
        toast({ title: "Welcome back!", description: "Successfully signed in" });
        
        // Check user role and redirect accordingly
        const { data: roleData } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', data.user.id)
          .single();
        
        if (roleData?.role === 'customer') {
          navigate('/community');
        } else {
          navigate('/dashboard');
        }
      }
    } catch (error: any) {
      toast({ 
        title: "Sign In Failed", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const redirectUrl = inviteCode 
        ? `${window.location.origin}/auth?invite=${inviteCode}&role=${inviteRoleParam || inviteRole}`
        : `${window.location.origin}/auth`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({ 
        title: "Google authentication failed", 
        description: error.message, 
        variant: "destructive" 
      });
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (authMode === 'signin') {
      await handleSignIn();
    } else {
      await handleSignUp();
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      case 'driver': return 'Driver';
      case 'customer': return 'Customer';
      default: return role;
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return Crown;
      case 'manager': return Users;
      case 'customer': return ShoppingCart;
      default: return Truck;
    }
  };

  const isSignUpMode = authMode === 'signup' || authMode === 'invite';
  const selectedRoleData = roleOptions.find(r => r.id === selectedRole);

  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-gradient-hero flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-white" />
          <p className="mt-2 text-white/80">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Side - Hero Branding (Hidden on Mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-hero flex-col justify-center p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-10 w-32 h-32 border-2 border-white rounded-full" />
          <div className="absolute bottom-40 right-20 w-48 h-48 border-2 border-white rounded-full" />
          <div className="absolute top-1/2 left-1/3 w-24 h-24 border-2 border-white rounded-full" />
        </div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <img src={stockXLogo} alt="Stock-X" className="h-14 w-14" />
            <span className="text-3xl font-bold text-white">Stock-X</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-4 leading-tight">
            L.P.G Inventory &
            <br />
            <span className="text-secondary">Online Delivery Platform</span>
          </h1>
          
          <p className="text-white/80 text-lg mb-10 max-w-md">
            Complete business management for LPG distributors with real-time tracking and analytics.
          </p>
          
          {/* Feature Highlights */}
          <div className="space-y-4 mb-10">
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Package className="h-5 w-5" />
              </div>
              <span>Real-time Inventory Management</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Globe className="h-5 w-5" />
              </div>
              <span>Online Marketplace & Delivery</span>
            </div>
            <div className="flex items-center gap-3 text-white/90">
              <div className="h-10 w-10 rounded-lg bg-white/10 flex items-center justify-center">
                <Shield className="h-5 w-5" />
              </div>
              <span>Secure Role-Based Access</span>
            </div>
          </div>
          
          {/* Trust Indicators */}
          <div className="flex gap-8 text-white/90">
            <div>
              <span className="text-3xl font-bold block">500+</span>
              <span className="text-sm text-white/70">Businesses</span>
            </div>
            <div>
              <span className="text-3xl font-bold block">50K+</span>
              <span className="text-sm text-white/70">Deliveries</span>
            </div>
            <div>
              <span className="text-3xl font-bold block">99.9%</span>
              <span className="text-sm text-white/70">Uptime</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Auth Form */}
      <div className="flex-1 flex flex-col">
        {/* Mobile Header */}
        <div className="lg:hidden bg-gradient-hero p-6">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-white/80 hover:text-white transition-colors">
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </Link>
            <div className="flex items-center gap-2">
              <img src={stockXLogo} alt="Stock-X" className="h-10 w-10" />
              <span className="text-xl font-bold text-white">Stock-X</span>
            </div>
          </div>
        </div>

        {/* Desktop Back Button */}
        <div className="hidden lg:block p-6">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* Auth Form Container */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
          <Card className="w-full max-w-md border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              {authMode === 'invite' && inviteValid ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-primary/10 text-primary">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Team Invitation
                  </Badge>
                  <CardTitle className="text-2xl">Join the Team</CardTitle>
                  <CardDescription>
                    You've been invited to join as {getRoleLabel(inviteRole)}
                  </CardDescription>
                </>
              ) : !ownersExist ? (
                <>
                  <Badge variant="secondary" className="w-fit mx-auto mb-2 px-4 py-2 bg-amber-500/10 text-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    First Time Setup
                  </Badge>
                  <CardTitle className="text-2xl">Create Your Account</CardTitle>
                  <CardDescription>
                    Set up the first owner account for your business
                  </CardDescription>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <CardTitle className="text-2xl">Create Account</CardTitle>
                  <CardDescription>
                    Select your role and sign up to get started
                  </CardDescription>
                </>
              ) : (
                <>
                  <CardTitle className="text-2xl">Welcome Back</CardTitle>
                  <CardDescription>
                    Sign in to access your dashboard
                  </CardDescription>
                </>
              )}
            </CardHeader>
            
            <CardContent>
              {/* Invalid Invite Alert */}
              {inviteCode && inviteValid === false && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    This invite link is invalid or expired. Please request a new one.
                  </AlertDescription>
                </Alert>
              )}

              {/* Invite Role Display */}
              {authMode === 'invite' && inviteValid && (
                <div className="p-4 mb-4 rounded-xl border-2 border-primary/20 bg-primary/5">
                  <div className="flex items-center gap-3">
                    {(() => {
                      const RoleIcon = getRoleIcon(inviteRole);
                      return <RoleIcon className="h-8 w-8 text-primary" />;
                    })()}
                    <div>
                      <h3 className="font-semibold text-primary">{getRoleLabel(inviteRole)} Role</h3>
                      <p className="text-sm text-muted-foreground">
                        {inviteRole === 'manager' 
                          ? 'Access to inventory, sales, and team coordination'
                          : inviteRole === 'driver'
                            ? 'Access to deliveries and customer updates'
                            : 'Full access to all features'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Visual Role Selection Cards - Only for Sign Up without invite */}
              {authMode === 'signup' && !inviteCode && ownersExist && (
                <div className="mb-6">
                  <Label className="mb-3 block">Select Your Role</Label>
                  <div className="grid grid-cols-2 gap-3">
                    {roleOptions.map((role) => {
                      const Icon = role.icon;
                      const isSelected = selectedRole === role.id;
                      return (
                        <button
                          key={role.id}
                          type="button"
                          onClick={() => setSelectedRole(role.id)}
                          disabled={loading}
                          className={`p-4 rounded-xl border-2 transition-all text-left ${
                            isSelected 
                              ? `${role.borderColor} ${role.bgColor}` 
                              : 'border-border hover:border-muted-foreground/50'
                          }`}
                        >
                          <Icon className={`h-7 w-7 mx-auto mb-2 ${role.color}`} />
                          <span className="font-semibold text-sm block text-center">{role.label}</span>
                          <span className="text-xs text-muted-foreground block text-center">{role.description}</span>
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Selected Role Features */}
                  {selectedRoleData && (
                    <div className="mt-4 p-3 rounded-lg bg-muted/50">
                      <p className="text-xs font-medium text-muted-foreground mb-2">What you'll get:</p>
                      <ul className="space-y-1">
                        {selectedRoleData.features.map((feature, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className={`h-3 w-3 ${selectedRoleData.color}`} />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* First Owner Badge */}
              {!ownersExist && authMode === 'signup' && (
                <div className="p-4 mb-4 rounded-xl border-2 border-amber-500 bg-amber-50 dark:bg-amber-950/30">
                  <div className="flex items-center gap-3">
                    <Crown className="h-8 w-8 text-amber-600" />
                    <div>
                      <h3 className="font-semibold text-amber-800 dark:text-amber-200">Owner Account</h3>
                      <p className="text-sm text-amber-700 dark:text-amber-300">
                        Full control over all business features
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name - Only for Sign Up */}
                {isSignUpMode && (
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name (Optional)</Label>
                    <Input 
                      id="fullName" 
                      type="text" 
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={loading}
                      className="h-12"
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder={isSignUpMode ? "Create a password (min 6 characters)" : "Enter your password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                    className="h-12"
                  />
                </div>

                {/* Confirm Password - Only for Sign Up */}
                {isSignUpMode && (
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm Password</Label>
                    <Input 
                      id="confirmPassword" 
                      type="password" 
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                      className="h-12"
                    />
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-opacity text-base"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                    </>
                  ) : (
                    <>
                      {authMode === 'signin' ? (
                        <>
                          <LogIn className="mr-2 h-5 w-5" />
                          Sign In
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-5 w-5" />
                          Create Account
                        </>
                      )}
                    </>
                  )}
                </Button>

                {/* Divider */}
                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                  </div>
                </div>

                {/* Google OAuth */}
                <Button 
                  type="button"
                  variant="outline"
                  className="w-full h-12"
                  onClick={handleGoogleAuth}
                  disabled={loading}
                >
                  <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  Continue with Google
                </Button>

                {/* Toggle Between Sign In and Sign Up */}
                <div className="pt-4 border-t border-border">
                  {authMode === 'invite' ? (
                    <div className="text-center space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-11"
                        onClick={() => setAuthMode('signin')}
                        type="button"
                        disabled={loading}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In Instead
                      </Button>
                    </div>
                  ) : authMode === 'signin' ? (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Don't have an account yet?
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-11"
                        onClick={() => setAuthMode('signup')}
                        type="button"
                        disabled={loading}
                      >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Create New Account
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        Team member? Ask your owner for an invite link
                      </p>
                    </div>
                  ) : (
                    <div className="text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Already have an account?
                      </p>
                      <Button 
                        variant="outline" 
                        className="w-full h-11"
                        onClick={() => setAuthMode('signin')}
                        type="button"
                        disabled={loading}
                      >
                        <LogIn className="mr-2 h-4 w-4" />
                        Sign In Instead
                      </Button>
                    </div>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* Footer */}
        <div className="p-4 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>
    </div>
  );
};

export default Auth;
