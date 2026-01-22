import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, Shield, Truck, Loader2, Users, Crown, AlertCircle, UserPlus, LogIn, ShoppingCart } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AuthMode = 'signin' | 'signup' | 'invite';
type UserRole = 'owner' | 'manager' | 'driver' | 'customer';

const Auth = () => {
  const [searchParams] = useSearchParams();
  const inviteCode = searchParams.get('invite');
  const inviteRoleParam = searchParams.get('role');
  
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>('owner');
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
            navigate('/dashboard');
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
      } else {
        toast({ title: "Welcome back!", description: "Successfully signed in" });
      }
      
      navigate('/dashboard');
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
        : `${window.location.origin}/dashboard`;

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

  if (checkingSystem) {
    return (
      <div className="min-h-screen bg-gradient-surface flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="mt-2 text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

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
          {/* Title Section */}
          <div className="text-center space-y-6 mb-12">
            <div className="space-y-2">
              {authMode === 'invite' && inviteValid ? (
                <>
                  <Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary">
                    <UserPlus className="h-3 w-3 mr-1" />
                    Team Invitation
                  </Badge>
                  <h1 className="text-3xl font-bold text-primary">Join the Team</h1>
                  <p className="text-muted-foreground">
                    You've been invited to join as {getRoleLabel(inviteRole)}
                  </p>
                </>
              ) : !ownersExist ? (
                <>
                  <Badge variant="secondary" className="px-4 py-2 bg-amber-500/10 text-amber-600">
                    <Crown className="h-3 w-3 mr-1" />
                    First Time Setup
                  </Badge>
                  <h1 className="text-3xl font-bold text-primary">Create Your Account</h1>
                  <p className="text-muted-foreground">
                    Set up your business by creating the first owner account
                  </p>
                </>
              ) : authMode === 'signup' ? (
                <>
                  <Badge variant="secondary" className="px-4 py-2 bg-primary/10 text-primary">
                    <UserPlus className="h-3 w-3 mr-1" />
                    New Account
                  </Badge>
                  <h1 className="text-3xl font-bold text-primary">Sign Up</h1>
                  <p className="text-muted-foreground">
                    Create your account to start managing your LPG business
                  </p>
                </>
              ) : (
                <>
                  <Badge variant="secondary" className="px-4 py-2">
                    <LogIn className="h-3 w-3 mr-1" />
                    Welcome Back
                  </Badge>
                  <h1 className="text-3xl font-bold text-primary">Sign In</h1>
                  <p className="text-muted-foreground">
                    Enter your credentials to access your dashboard
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Information Card */}
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-primary">
                  {authMode === 'invite' 
                    ? 'Your Role' 
                    : isSignUpMode 
                      ? 'What You Get'
                      : 'Access Your Business'
                  }
                </CardTitle>
                <CardDescription>
                  {authMode === 'invite' 
                    ? `You'll be joining as ${getRoleLabel(inviteRole)}`
                    : isSignUpMode
                      ? 'Full access to all Stock-X features'
                      : 'Sign in to manage your inventory and sales'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Invite Role Display */}
                {authMode === 'invite' && inviteValid && (
                  <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-start space-x-3">
                      {(() => {
                        const RoleIcon = getRoleIcon(inviteRole);
                        return <RoleIcon className="h-6 w-6 text-primary mt-1" />;
                      })()}
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-primary">{getRoleLabel(inviteRole)} Role</h3>
                        <p className="text-sm text-muted-foreground">
                          {inviteRole === 'manager' 
                            ? 'Full access to inventory, sales, and team management'
                            : 'Access to deliveries, customer updates, and sales recording'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* First Owner Setup */}
                {!ownersExist && authMode === 'signup' && (
                  <div className="p-4 border rounded-lg bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800">
                    <div className="flex items-start space-x-3">
                      <Crown className="h-6 w-6 text-amber-600 mt-1" />
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-amber-800 dark:text-amber-200">Owner Access</h3>
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          Full control over business settings, team management, and all features
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* New Shop Owner Signup */}
                {authMode === 'signup' && ownersExist && !inviteCode && (
                  <div className="p-4 border rounded-lg bg-primary/5 border-primary/20">
                    <div className="flex items-start space-x-3">
                      <Crown className="h-6 w-6 text-primary mt-1" />
                      <div className="flex-1 space-y-2">
                        <h3 className="font-semibold text-primary">Shop Owner Account</h3>
                        <p className="text-sm text-muted-foreground">
                          Create your own independent shop with full owner access to all features
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invalid Invite Alert */}
                {inviteCode && !inviteValid && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      This invite link is invalid or has expired. Please request a new invite from your team owner.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Sign In Info */}
                {authMode === 'signin' && !inviteCode && (
                  <div className="space-y-4">
                    <div className="space-y-3 p-4 border rounded-lg border-border bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Shield className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">Secure Access</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Your data is protected with industry-standard encryption and secure authentication.
                      </p>
                    </div>

                    <div className="space-y-3 p-4 border rounded-lg border-border bg-muted/30">
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-primary" />
                        <h4 className="font-medium text-foreground">Team Members</h4>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Joining as a team member? Ask your shop owner for an invite link or QR code.
                      </p>
                    </div>
                  </div>
                )}

                {/* Sign Up Features */}
                {isSignUpMode && !inviteCode && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-foreground">What's included:</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>Inventory & Stock Management</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>Point of Sale (POS) System</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>Customer Management</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>Team & Staff Management</span>
                      </li>
                      <li className="flex items-center space-x-2">
                        <div className="w-1.5 h-1.5 bg-primary rounded-full" />
                        <span>Analytics & Reports</span>
                      </li>
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Auth Form */}
            <Card className="border-0 shadow-elegant">
              <CardHeader>
                <CardTitle className="text-primary">
                  {authMode === 'signin' ? 'Sign In' : 'Sign Up'}
                </CardTitle>
                <CardDescription>
                  {authMode === 'invite' 
                    ? 'Create an account to accept the team invitation'
                    : authMode === 'signup'
                      ? 'Fill in your details to create your account'
                      : 'Enter your email and password to continue'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
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
                      />
                    </div>
                  )}

                  {/* Role Selection - Only for Sign Up without invite */}
                  {authMode === 'signup' && !inviteCode && (
                    <div className="space-y-2">
                      <Label htmlFor="role">Select Your Role</Label>
                      <Select 
                        value={selectedRole} 
                        onValueChange={(value: UserRole) => setSelectedRole(value)}
                        disabled={loading}
                      >
                        <SelectTrigger id="role" className="w-full">
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="customer">
                            <div className="flex items-center space-x-2">
                              <ShoppingCart className="h-4 w-4 text-emerald-600" />
                              <span>Customer - Order LPG online</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="owner">
                            <div className="flex items-center space-x-2">
                              <Crown className="h-4 w-4 text-amber-600" />
                              <span>Owner - Full business control</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="manager">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-primary" />
                              <span>Manager - Inventory & sales access</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="driver">
                            <div className="flex items-center space-x-2">
                              <Truck className="h-4 w-4 text-muted-foreground" />
                              <span>Driver - Delivery access</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedRole === 'customer' && 'Browse shops and order LPG products for home delivery'}
                        {selectedRole === 'owner' && 'Full control over business settings, team, and all features'}
                        {selectedRole === 'manager' && 'Access to inventory, sales, customers, and team coordination'}
                        {selectedRole === 'driver' && 'Access to deliveries, customer updates, and sales recording'}
                      </p>
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
                        {authMode === 'signin' ? 'Signing In...' : 'Creating Account...'}
                      </>
                    ) : (
                      <>
                        {authMode === 'signin' ? (
                          <>
                            <LogIn className="mr-2 h-4 w-4" />
                            Sign In
                          </>
                        ) : (
                          <>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Sign Up
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
                    className="w-full"
                    size="lg"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
                          className="w-full"
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
                          className="w-full"
                          onClick={() => setAuthMode('signup')}
                          type="button"
                          disabled={loading}
                        >
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create New Account
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Team members? Ask your owner for an invite link
                        </p>
                      </div>
                    ) : (
                      <div className="text-center space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Already have an account?
                        </p>
                        <Button 
                          variant="outline" 
                          className="w-full"
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

          {/* Info Footer */}
          <Card className="mt-8 border-0 bg-gradient-hero shadow-elegant">
            <CardContent className="p-6">
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold text-primary-foreground">
                  {authMode === 'invite' 
                    ? 'Joining a Team'
                    : isSignUpMode
                      ? 'Getting Started'
                      : 'Need Help?'
                  }
                </h3>
                <p className="text-primary-foreground/80 text-sm">
                  {authMode === 'invite' 
                    ? 'After joining, your team owner can manage your access level from Settings.'
                    : isSignUpMode
                      ? 'After signing up, you can invite team members from the Settings page.'
                      : 'Contact your shop owner if you need an invite link or have forgotten your password.'
                  }
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
