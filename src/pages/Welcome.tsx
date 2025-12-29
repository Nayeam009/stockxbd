import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Truck, BarChart3, Users, Flame, Shield, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import stockXLogo from "@/assets/stock-x-logo.png";
import heroBanner from "@/assets/hero-banner.jpg";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-secondary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Header */}
      <header className="container mx-auto px-4 py-6 relative z-10">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3 group cursor-pointer">
            <div className="relative">
              <img 
                src={stockXLogo} 
                alt="Stock-X Logo" 
                className="h-14 w-14 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110" 
              />
              <div className="absolute inset-0 bg-secondary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-primary tracking-tight">Stock-X</h1>
              <span className="text-xs text-muted-foreground font-medium">LPG Management</span>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Link to="/services">
              <Button variant="ghost" className="text-foreground hover:text-primary hover:bg-primary/5">
                Services
              </Button>
            </Link>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                Sign In
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12 lg:py-20">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full">
              <Flame className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Bangladesh's #1 LPG Solution</span>
            </div>

            <div className="space-y-6">
              <h2 className="text-5xl lg:text-6xl font-bold leading-tight">
                <span className="text-foreground">Simplify Your</span>
                <br />
                <span className="bg-gradient-to-r from-primary via-primary-light to-secondary bg-clip-text text-transparent">
                  LPG Business
                </span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                All-in-one platform to manage inventory, track deliveries, and grow your LPG distribution business with powerful analytics.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/auth">
                <Button size="lg" className="w-full sm:w-auto bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-lg px-8 py-6">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg px-8 py-6">
                  Explore Features
                </Button>
              </Link>
            </div>

            {/* Trust Indicators */}
            <div className="flex items-center gap-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Secure & Reliable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-info" />
                <span className="text-sm text-muted-foreground">24/7 Support</span>
              </div>
            </div>
          </div>

          {/* Hero Image */}
          <div className="relative lg:pl-8">
            <div className="relative">
              {/* Decorative elements */}
              <div className="absolute -top-6 -left-6 w-24 h-24 bg-gradient-to-br from-secondary to-secondary-light rounded-2xl opacity-20 blur-xl" />
              <div className="absolute -bottom-6 -right-6 w-32 h-32 bg-gradient-to-br from-primary to-primary-light rounded-2xl opacity-20 blur-xl" />
              
              <div className="relative rounded-3xl overflow-hidden shadow-2xl">
                <img 
                  src={heroBanner} 
                  alt="LPG Delivery Management" 
                  className="w-full aspect-[4/3] object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-primary/60 via-transparent to-transparent" />
                
                {/* Floating Stats Card */}
                <div className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur-sm rounded-2xl p-5 shadow-xl border border-border/50">
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-secondary">24/7</div>
                      <div className="text-xs text-muted-foreground">Real-time Tracking</div>
                    </div>
                    <div className="border-x border-border/50">
                      <div className="text-2xl font-bold text-accent">Smart</div>
                      <div className="text-xs text-muted-foreground">ETA Predictions</div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-info">100%</div>
                      <div className="text-xs text-muted-foreground">Automated Billing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="grid md:grid-cols-3 gap-6 pt-24">
          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-14 w-14 bg-gradient-to-br from-primary to-primary-light rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-7 w-7 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Smart Delivery</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered ETA predictions and real-time delivery tracking for optimal route management.
              </p>
            </div>
          </Card>

          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-14 w-14 bg-gradient-to-br from-secondary to-secondary-light rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-7 w-7 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Inventory Control</h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-time tracking of cylinders, gas stoves, and stock levels to prevent shortages.
              </p>
            </div>
          </Card>

          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-2xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-14 w-14 bg-gradient-to-br from-accent to-accent-light rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-7 w-7 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Customer Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Comprehensive customer database with purchase history and delivery preferences.
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 mt-16 border-t border-border/50">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 Stock-X. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/services" className="hover:text-primary transition-colors">Services</Link>
            <span className="hover:text-primary transition-colors cursor-pointer">Privacy</span>
            <span className="hover:text-primary transition-colors cursor-pointer">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;