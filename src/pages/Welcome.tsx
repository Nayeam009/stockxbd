import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowRight, 
  Truck, 
  BarChart3, 
  Users, 
  Flame, 
  Shield, 
  Clock,
  Package,
  FileText,
  CreditCard,
  PieChart,
  DollarSign,
  Globe,
  Search,
  CheckCircle2,
  Star,
  Zap,
  Phone,
  Mail,
  MapPin,
  Play,
  Menu,
  X,
  ShoppingCart,
  Bell,
  MapPinned,
  Boxes
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import stockXLogo from "@/assets/stock-x-logo.png";
import heroLpgImage from "@/assets/hero-lpg-cylinders.png";

const Welcome = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const mainFeatures = [
    {
      icon: Package,
      title: "L.P.G Inventory Management",
      description: "Complete real-time tracking of all cylinders, stoves, and regulators with automated alerts.",
      features: [
        "Real-time cylinder stock levels",
        "Low-stock & refill alerts",
        "POB/POS auto-sync",
        "Multi-brand tracking",
        "Empty cylinder returns"
      ],
      gradient: "from-primary to-primary-light",
      cta: "Explore Inventory"
    },
    {
      icon: Truck,
      title: "Online Delivery Platform",
      description: "Complete marketplace for LPG businesses with real-time order tracking and customer notifications.",
      features: [
        "Online order placement",
        "Real-time delivery tracking",
        "Customer notifications",
        "Shop profile & products",
        "Order management"
      ],
      gradient: "from-secondary to-secondary-light",
      cta: "View Marketplace"
    }
  ];

  const services = [
    {
      icon: PieChart,
      title: "Daily Sales (POS)",
      description: "Track all daily sales with comprehensive reporting and multi-payment support.",
    },
    {
      icon: FileText,
      title: "Business Diary",
      description: "Monitor all expenses and income with detailed categorization and analysis.",
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Complete customer database with payment tracking and order history.",
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive profit/loss reports with actionable business insights.",
    },
    {
      icon: DollarSign,
      title: "Staff & Salary",
      description: "Manage staff payments, commissions, and monthly salary tracking.",
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Quickly find customers, products, and transactions across the platform.",
    }
  ];

  const stats = [
    { value: "500+", label: "Active Businesses" },
    { value: "50K+", label: "Daily Deliveries" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" }
  ];

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-card/95 backdrop-blur-xl border-b border-border/50 shadow-sm">
        <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-3 sm:py-4">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer">
              <div className="relative flex-shrink-0">
                <img 
                  src={stockXLogo} 
                  alt="Stock-X Logo" 
                  className="h-9 w-9 sm:h-11 sm:w-11 lg:h-12 lg:w-12 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg lg:text-xl font-bold text-primary tracking-tight truncate">STOCK X</h1>
                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium hidden xs:block">LPG Management</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center space-x-6 xl:space-x-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Services</a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Pricing</a>
              <Link to="/community" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Marketplace</Link>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Link to="/auth">
                <Button size="sm" className="btn-cta text-secondary-foreground font-semibold text-xs lg:text-sm px-3 lg:px-4">
                  Get Started
                  <ArrowRight className="ml-1 lg:ml-2 h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 -mr-1 rounded-lg hover:bg-muted transition-colors touch-target min-h-[44px] min-w-[44px] flex items-center justify-center"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-primary" aria-hidden="true" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <nav 
              className="md:hidden absolute top-full left-0 right-0 bg-card border-b border-border shadow-xl py-4 px-4 space-y-2 animate-fade-in z-50"
              aria-label="Mobile navigation"
            >
              <a href="#features" className="flex items-center py-3 px-4 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors touch-target min-h-[48px]">Features</a>
              <a href="#services" className="flex items-center py-3 px-4 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors touch-target min-h-[48px]">Services</a>
              <a href="#pricing" className="flex items-center py-3 px-4 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors touch-target min-h-[48px]">Pricing</a>
              <Link to="/community" className="flex items-center py-3 px-4 text-base font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors touch-target min-h-[48px]">Marketplace</Link>
              <div className="pt-3 space-y-2">
                <Link to="/auth" className="block">
                  <Button className="w-full btn-cta text-secondary-foreground font-semibold h-12 touch-target text-base">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Button>
                </Link>
              </div>
            </nav>
          )}
        </div>
      </header>

      {/* Hero Section - Split Layout */}
      <section className="relative hero-gradient text-primary-foreground overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center py-10 sm:py-14 lg:py-20">
            {/* Left: Text Content */}
            <div className="text-center lg:text-left space-y-5 sm:space-y-6 order-2 lg:order-1">
              <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/15 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium inline-flex">
                <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                #1 LPG Business Platform in Bangladesh
              </Badge>
              
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight">
                <span className="text-white">STOCK X</span>
                <br />
                <span className="text-secondary">L.P.G Inventory &</span>
                <br />
                <span className="text-secondary">Online Delivery Platform</span>
              </h1>
              
              <p className="text-sm sm:text-base lg:text-lg text-white/80 max-w-xl mx-auto lg:mx-0 leading-relaxed">
                Complete business management solution for LPG distributors. Track inventory, manage customers, process sales, and deliver online — all in one platform.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start pt-2">
                <Link to="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 w-full">
                    <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Start Free Trial
                  </Button>
                </Link>
                <Link to="/community" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-sm sm:text-base px-6 sm:px-8 h-12 sm:h-14 w-full">
                    <ShoppingCart className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Explore Marketplace
                  </Button>
                </Link>
              </div>

              {/* Quick Stats in Hero */}
              <div className="grid grid-cols-3 gap-4 pt-4 lg:pt-6 max-w-md mx-auto lg:mx-0">
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-white">500+</div>
                  <div className="text-[10px] sm:text-xs text-white/60">Businesses</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-white">50K+</div>
                  <div className="text-[10px] sm:text-xs text-white/60">Deliveries/Day</div>
                </div>
                <div className="text-center lg:text-left">
                  <div className="text-xl sm:text-2xl font-bold text-white">99.9%</div>
                  <div className="text-[10px] sm:text-xs text-white/60">Uptime</div>
                </div>
              </div>
            </div>

            {/* Right: Hero Image */}
            <div className="relative order-1 lg:order-2">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Glow Effect */}
                <div className="absolute -inset-4 bg-secondary/20 rounded-3xl blur-2xl" />
                
                <img 
                  src={heroLpgImage} 
                  alt="LPG Cylinders - Stock X Inventory Management" 
                  className="relative w-full h-auto rounded-2xl sm:rounded-3xl shadow-2xl border-4 border-white/10"
                  loading="eager"
                  decoding="async"
                  width="600"
                  height="400"
                />

                {/* Floating Badge - Inventory */}
                <div className="absolute -bottom-4 -left-4 sm:bottom-4 sm:left-4 bg-card text-foreground rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-border/50 hidden sm:flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary-light flex items-center justify-center">
                    <Boxes className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">Real-Time Stock</div>
                    <div className="font-bold text-sm sm:text-base">1,250 Cylinders</div>
                  </div>
                </div>

                {/* Floating Badge - Delivery */}
                <div className="absolute -top-4 -right-4 sm:top-4 sm:right-4 bg-card text-foreground rounded-xl sm:rounded-2xl p-3 sm:p-4 shadow-xl border border-border/50 hidden sm:flex items-center gap-3">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-secondary to-secondary-light flex items-center justify-center">
                    <Bell className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-muted-foreground">New Order</div>
                    <div className="font-bold text-sm sm:text-base text-success">+12 Today</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Wave Bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="hsl(var(--background))"/>
          </svg>
        </div>
      </section>

      {/* Two Main Feature Highlights */}
      <section id="features" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16 -mt-6 sm:-mt-8 relative z-10">
        <div className="text-center mb-8 sm:mb-10">
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 px-3 sm:px-4 py-1.5 text-xs sm:text-sm font-medium">
            Core Features
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-foreground mt-3">
            Two Powerful Platforms, One Solution
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-5 sm:gap-6 lg:gap-8">
          {mainFeatures.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-2xl group">
                {/* Gradient Top Bar */}
                <div className={`h-2 bg-gradient-to-r ${feature.gradient}`} />
                
                <CardContent className="p-5 sm:p-6 lg:p-8 space-y-4 sm:space-y-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-14 w-14 sm:h-16 sm:w-16 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center flex-shrink-0 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <Icon className="h-7 w-7 sm:h-8 sm:w-8 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg sm:text-xl lg:text-2xl font-bold text-foreground">{feature.title}</h3>
                      <p className="text-sm sm:text-base text-muted-foreground mt-1">{feature.description}</p>
                    </div>
                  </div>
                  
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    {feature.features.map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="h-4 w-4 text-success flex-shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link to="/auth" className="block pt-2">
                    <Button className={`w-full h-11 sm:h-12 font-semibold bg-gradient-to-r ${feature.gradient} hover:opacity-90 text-white`}>
                      {feature.cta}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden hero-gradient p-6 sm:p-8 lg:p-12">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          <div className="relative grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-1 sm:space-y-2 p-2 sm:p-0">
                <div className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl font-extrabold text-white">{stat.value}</div>
                <div className="text-xs sm:text-sm lg:text-base text-white/80 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid - Simplified 6 Items */}
      <section id="services" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10 lg:mb-12">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
            Complete Solution
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-foreground px-4">
            More Powerful Features
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Everything you need to run your LPG business efficiently
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="feature-card group overflow-hidden">
                <CardContent className="p-4 sm:p-5 lg:p-6 space-y-3">
                  <div className="feature-icon w-12 h-12 sm:w-14 sm:h-14">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-sm sm:text-base lg:text-lg font-bold text-foreground">{service.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-1 line-clamp-2">{service.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-muted/50 border border-border/50 p-6 sm:p-8 lg:p-12 xl:p-16">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="space-y-4 sm:space-y-6">
              <Badge className="bg-success/10 text-success border-success/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm">
                <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                Customer Success
              </Badge>
              <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-foreground">
                Trusted by LPG Businesses Across Bangladesh
              </h2>
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground">
                Join hundreds of distributors who have transformed their operations with Stock-X.
              </p>
              
              <div className="grid grid-cols-2 gap-4 sm:gap-6 pt-2 sm:pt-4">
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-secondary">+45%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Efficiency Increase</div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-accent">-30%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Operational Costs</div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-success">99%</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Stock Accuracy</div>
                </div>
                <div className="space-y-0.5 sm:space-y-1">
                  <div className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary">2x</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">Faster Deliveries</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card rounded-xl sm:rounded-2xl p-5 sm:p-6 lg:p-8 shadow-xl border border-border/50">
                <div className="flex items-start gap-3 sm:gap-4 mb-4 sm:mb-6">
                  <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-primary-foreground font-bold text-sm sm:text-lg flex-shrink-0">
                    RK
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-foreground text-sm sm:text-base">Rajesh Kumar</h4>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">CityGas Distributors, Dhaka</p>
                  </div>
                </div>
                <blockquote className="text-sm sm:text-base text-muted-foreground italic leading-relaxed">
                  "With STOCK X's inventory management and online delivery platform, we reduced reporting time by 80% and increased our sales team's productivity by 35%. The real-time tracking has been a game-changer."
                </blockquote>
                <div className="flex items-center gap-0.5 sm:gap-1 mt-3 sm:mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 sm:h-5 sm:w-5 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10 lg:mb-12">
          <Badge className="bg-primary/10 text-primary border-primary/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
            <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
            Simple Pricing
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-foreground px-4">
            Choose Your Plan
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Affordable plans designed to grow with your LPG business
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-4xl mx-auto">
          {/* Pro Plan */}
          <Card className="relative overflow-hidden border-2 border-border hover:border-primary/50 transition-all duration-300 hover:shadow-xl">
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Pro</h3>
                <p className="text-sm text-muted-foreground">Perfect for small businesses</p>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary">৳500</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Full Inventory Management</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>POS & Daily Sales</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Customer Management</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Basic Reports</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Up to 3 Staff Accounts</span>
                </li>
              </ul>

              <Link to="/auth" className="block">
                <Button variant="outline" className="w-full h-12 sm:h-14 text-sm sm:text-base font-semibold border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-all">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>

          {/* Premium Plan */}
          <Card className="relative overflow-hidden border-2 border-primary shadow-xl bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="absolute top-0 right-0 bg-secondary text-secondary-foreground px-3 py-1 text-xs sm:text-sm font-bold rounded-bl-lg">
              Most Popular
            </div>
            <CardContent className="p-6 sm:p-8 space-y-6">
              <div className="space-y-2">
                <h3 className="text-xl sm:text-2xl font-bold text-foreground">Premium</h3>
                <p className="text-sm text-muted-foreground">For growing businesses</p>
              </div>
              
              <div className="flex items-baseline gap-1">
                <span className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-primary">৳1000</span>
                <span className="text-muted-foreground">/month</span>
              </div>

              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Online Delivery Platform</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Advanced Analytics</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Vehicle Cost Tracking</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Unlimited Staff Accounts</span>
                </li>
                <li className="flex items-center gap-3 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                  <span>Priority Support</span>
                </li>
              </ul>

              <Link to="/auth" className="block">
                <Button className="w-full h-12 sm:h-14 text-sm sm:text-base font-bold btn-cta text-secondary-foreground">
                  Get Premium
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden hero-gradient p-6 sm:p-8 lg:p-12 xl:p-16 text-center">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          
          <div className="relative space-y-4 sm:space-y-6 max-w-2xl mx-auto">
            <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-bold text-white px-4">
              Ready to Transform Your LPG Business?
            </h2>
            <p className="text-sm sm:text-base lg:text-lg text-white/80 px-4">
              Join hundreds of LPG businesses already using Stock-X to streamline their operations and boost efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 px-4 sm:px-0">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-sm sm:text-base lg:text-lg px-6 sm:px-8 lg:px-10 h-12 sm:h-14 w-full">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4 sm:h-5 sm:w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-gradient text-white">
        <div className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Company Info */}
            <div className="sm:col-span-2 space-y-4 sm:space-y-6">
              <div className="flex items-center gap-2 sm:gap-3">
                <img src={stockXLogo} alt="Stock-X Logo" className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-white/10 p-1" />
                <div>
                  <h3 className="text-lg sm:text-xl font-bold">STOCK X</h3>
                  <p className="text-xs sm:text-sm text-white/60">LPG Management Platform</p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-white/70 leading-relaxed max-w-md">
                Bangladesh's leading LPG business management solution. Streamline your operations, boost efficiency, and grow your business with our comprehensive platform.
              </p>
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="social-icon w-9 h-9 sm:w-10 sm:h-10">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="social-icon w-9 h-9 sm:w-10 sm:h-10">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
                <div className="social-icon w-9 h-9 sm:w-10 sm:h-10">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-bold text-base sm:text-lg">Quick Links</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-white/70">
                <li><a href="#features" className="hover:text-secondary transition-colors">Features</a></li>
                <li><a href="#services" className="hover:text-secondary transition-colors">Services</a></li>
                <li><a href="#pricing" className="hover:text-secondary transition-colors">Pricing</a></li>
                <li><Link to="/community" className="hover:text-secondary transition-colors">Marketplace</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-3 sm:space-y-4">
              <h4 className="font-bold text-base sm:text-lg">Contact Us</h4>
              <ul className="space-y-2 sm:space-y-3 text-sm sm:text-base text-white/70">
                <li className="flex items-center gap-2 sm:gap-3">
                  <MapPin className="h-4 w-4 sm:h-5 sm:w-5 text-secondary flex-shrink-0" />
                  <span>Dhaka, Bangladesh</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <Phone className="h-4 w-4 sm:h-5 sm:w-5 text-secondary flex-shrink-0" />
                  <span>+880 1XXX-XXXXXX</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <Mail className="h-4 w-4 sm:h-5 sm:w-5 text-secondary flex-shrink-0" />
                  <span className="truncate">support@stockx.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-8 sm:mt-10 lg:mt-12 pt-6 sm:pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs sm:text-sm text-white/60 text-center sm:text-left">© 2024 STOCK X. All rights reserved.</p>
            <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 text-xs sm:text-sm text-white/60">
              <span className="hover:text-secondary transition-colors cursor-pointer">Privacy Policy</span>
              <span className="hover:text-secondary transition-colors cursor-pointer">Terms of Service</span>
              <span className="hover:text-secondary transition-colors cursor-pointer">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;
