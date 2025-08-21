import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowRight, Truck, BarChart3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import stockXLogo from "@/assets/stock-x-logo.png";
import heroBanner from "@/assets/hero-banner.jpg";

const Welcome = () => {
  return (
    <div className="min-h-screen bg-gradient-surface">
      {/* Header */}
      <header className="container mx-auto px-4 py-6">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <img src={stockXLogo} alt="Stock-X Logo" className="h-12 w-12" />
            <h1 className="text-2xl font-bold text-primary">Stock-X</h1>
          </div>
          <div className="flex items-center space-x-4">
            <Link to="/services">
              <Button variant="ghost">Services</Button>
            </Link>
            <Link to="/auth">
              <Button variant="default">Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-16">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-8">
            <div className="space-y-4">
              <h2 className="text-5xl font-bold text-primary leading-tight">
                Welcome to <span className="text-secondary">Stock-X</span>
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                Your complete LPG delivery management solution. Streamline operations, 
                track inventory, and deliver excellence to your customers with our 
                comprehensive dashboard system.
              </p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Link to="/services">
                <Button size="lg" className="bg-gradient-primary hover:opacity-90 transition-opacity">
                  Explore Services <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  Get Started
                </Button>
              </Link>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-3 gap-6 pt-8">
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-secondary">24/7</div>
                <div className="text-sm text-muted-foreground">Real-time Tracking</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-accent">Smart</div>
                <div className="text-sm text-muted-foreground">ETA Predictions</div>
              </div>
              <div className="text-center space-y-2">
                <div className="text-2xl font-bold text-info">100%</div>
                <div className="text-sm text-muted-foreground">Automated Billing</div>
              </div>
            </div>
          </div>

          <div className="relative">
            <img 
              src={heroBanner} 
              alt="LPG Delivery Management" 
              className="w-full rounded-2xl shadow-elegant-xl"
            />
            <div className="absolute inset-0 bg-gradient-hero opacity-20 rounded-2xl"></div>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="grid md:grid-cols-3 gap-8 pt-24">
          <Card className="p-6 space-y-4 border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 hover:scale-105">
            <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
              <Truck className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-primary">Smart Delivery</h3>
            <p className="text-muted-foreground">
              AI-powered ETA predictions and real-time delivery tracking for optimal route management.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 hover:scale-105">
            <div className="h-12 w-12 bg-gradient-secondary rounded-lg flex items-center justify-center">
              <BarChart3 className="h-6 w-6 text-secondary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-primary">Inventory Control</h3>
            <p className="text-muted-foreground">
              Real-time tracking of cylinders, gas stoves, and stock levels to prevent shortages.
            </p>
          </Card>

          <Card className="p-6 space-y-4 border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 hover:scale-105">
            <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <h3 className="text-xl font-semibold text-primary">Customer Management</h3>
            <p className="text-muted-foreground">
              Comprehensive customer database with purchase history and delivery preferences.
            </p>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Welcome;