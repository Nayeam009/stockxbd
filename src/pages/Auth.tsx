import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Users, Truck } from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";

const Auth = () => {
  const [userType, setUserType] = useState<string>("manager");
  const [isLogin, setIsLogin] = useState(true);
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, navigate to dashboard
    navigate('/dashboard');
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
              <Badge variant="secondary" className="px-4 py-2">Page 3</Badge>
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
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input 
                      id="password" 
                      type="password" 
                      placeholder="Enter your password" 
                      required
                    />
                  </div>

                  {!isLogin && (
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input 
                        id="confirmPassword" 
                        type="password" 
                        placeholder="Confirm your password" 
                        required
                      />
                    </div>
                  )}

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary hover:opacity-90 transition-opacity"
                    size="lg"
                  >
                    {isLogin ? 'Sign In' : 'Create Account'}
                  </Button>

                  <div className="text-center space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {isLogin ? "Don't have an account?" : "Already have an account?"}
                      <Button 
                        variant="link" 
                        className="p-0 ml-1 h-auto text-primary"
                        onClick={() => setIsLogin(!isLogin)}
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