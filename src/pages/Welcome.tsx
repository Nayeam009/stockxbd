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
  X
} from "lucide-react";
import { Link } from "react-router-dom";
import { useState } from "react";
import stockXLogo from "@/assets/stock-x-logo.png";
import heroBanner from "@/assets/hero-banner.jpg";

const Welcome = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const services = [
    {
      icon: PieChart,
      title: "Daily Sales Management",
      description: "Efficiently track and manage all your daily sales activities with comprehensive reporting.",
      features: ["Add, edit & view daily sales", "Track by staff/driver", "Multiple payment methods", "Export PDF/Excel"],
    },
    {
      icon: Package,
      title: "LPG Stock Management",
      description: "Track your LPG cylinder inventory in real-time with automated alerts and comprehensive tracking.",
      features: ["Real-time cylinder tracking", "Low-stock alerts", "QR code tracking", "Stock movement history"],
    },
    {
      icon: Flame,
      title: "Gas Stove Inventory",
      description: "Comprehensive inventory management for LPG stoves and accessories with real-time tracking.",
      features: ["Track by model/brand", "Auto-update on sale", "Accessory management", "Usage history"],
    },
    {
      icon: Truck,
      title: "Driver's Sales",
      description: "Monitor and analyze individual driver performance with detailed sales tracking and reporting.",
      features: ["Driver performance", "Payment tracking", "Daily/weekly reports", "Commission calculation"],
    },
    {
      icon: Users,
      title: "LPG Community",
      description: "Build and manage your customer database with comprehensive tracking and communication tools.",
      features: ["Customer database", "Order history", "SMS/Email alerts", "Loyalty tracking"],
    },
    {
      icon: DollarSign,
      title: "Staff Salary",
      description: "Streamline your payroll process with automated calculations and comprehensive salary management.",
      features: ["Payroll automation", "Salary slips", "Commission calculation", "Bank transfer integration"],
    },
    {
      icon: CreditCard,
      title: "Vehicle Cost",
      description: "Track and manage all vehicle-related expenses to optimize your fleet operations and costs.",
      features: ["Fuel tracking", "Maintenance logs", "Cost analysis", "Vehicle performance"],
    },
    {
      icon: FileText,
      title: "Daily Expenses",
      description: "Monitor and control daily operational expenses with detailed categorization and reporting.",
      features: ["Expense categories", "Receipt tracking", "Budget alerts", "Monthly summaries"],
    },
    {
      icon: Globe,
      title: "Online Delivery",
      description: "Manage online orders and deliveries with real-time notifications and tracking.",
      features: ["Online order management", "Delivery tracking", "Customer notifications", "Route optimization"],
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive reporting on operations and delivery performance with actionable insights.",
      features: ["Performance metrics", "Custom dashboards", "Trend analysis", "Export options"],
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Quickly find records and information across the entire platform with intelligent filtering.",
      features: ["Global search", "Quick navigation", "Advanced filters", "Recent history"],
    },
    {
      icon: Clock,
      title: "Smart ETA",
      description: "AI-powered tool providing accurate ETAs for all LPG deliveries with route optimization.",
      features: ["AI predictions", "Route optimization", "Live tracking", "Delay notifications"],
    }
  ];

  const stats = [
    { value: "500+", label: "Active Businesses" },
    { value: "50K+", label: "Daily Deliveries" },
    { value: "99.9%", label: "Uptime" },
    { value: "24/7", label: "Support" }
  ];

  const highlights = [
    { icon: Truck, title: "Smart Delivery", description: "AI-powered ETA predictions and real-time delivery tracking for optimal route management." },
    { icon: BarChart3, title: "Inventory Control", description: "Real-time tracking of cylinders, gas stoves, and stock levels to prevent shortages." },
    { icon: Users, title: "Customer Management", description: "Comprehensive customer database with purchase history and delivery preferences." }
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
              <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
              <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Success Stories</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-2 lg:gap-3">
              <Link to="/auth">
                <Button variant="outline" size="sm" className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-xs lg:text-sm px-3 lg:px-4">
                  Free Demo
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="sm" className="btn-cta text-secondary-foreground font-semibold text-xs lg:text-sm px-3 lg:px-4">
                  Get Started
                  <ArrowRight className="ml-1 lg:ml-2 h-3 w-3 lg:h-4 lg:w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 -mr-1 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5 sm:h-6 sm:w-6 text-primary" /> : <Menu className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-card border-b border-border shadow-xl py-4 px-4 space-y-3 animate-fade-in">
              <a href="#features" className="block py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors">Features</a>
              <a href="#services" className="block py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors">How It Works</a>
              <a href="#stats" className="block py-2.5 px-3 text-sm font-medium text-muted-foreground hover:text-primary hover:bg-muted/50 rounded-lg transition-colors">Success Stories</a>
              <div className="pt-2 space-y-2">
                <Link to="/auth" className="block">
                  <Button variant="outline" className="w-full border-primary/20 text-primary">
                    Free Demo
                  </Button>
                </Link>
                <Link to="/auth" className="block">
                  <Button className="w-full btn-cta text-secondary-foreground font-semibold">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
      </header>

{/* Hero Section */}
      <section className="relative hero-gradient text-primary-foreground py-12 sm:py-16 lg:py-24 xl:py-28 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="container mx-auto px-4 sm:px-6 relative">
          <div className="max-w-4xl mx-auto text-center space-y-5 sm:space-y-6 lg:space-y-8">
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/15 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
              <Flame className="h-3 w-3 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              Complete LPG Business Management
            </Badge>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-extrabold leading-tight px-2">
              Complete Feature Set for
              <br />
              <span className="text-secondary">LPG Business Excellence</span>
            </h1>
            
            <p className="text-sm sm:text-base md:text-lg lg:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed px-4">
              From daily sales to delivery tracking, STOCK X has every tool you need to streamline your LPG operations
            </p>

            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center pt-2 sm:pt-4 px-4 sm:px-0">
              <Link to="/auth" className="w-full sm:w-auto">
                <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-5 lg:py-6 w-full">
                  <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <a href="#services" className="w-full sm:w-auto">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-sm sm:text-base lg:text-lg px-6 sm:px-8 py-4 sm:py-5 lg:py-6 w-full">
                  Explore Features
                </Button>
              </a>
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

      {/* Feature Highlights */}
      <section id="features" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16 -mt-6 sm:-mt-8 relative z-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="feature-card p-5 sm:p-6 lg:p-8 shadow-lg hover:shadow-2xl">
                <div className="space-y-3 sm:space-y-4">
                  <div className="feature-icon w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 lg:h-7 lg:w-7 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
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

      {/* Services Grid */}
      <section id="services" className="container mx-auto px-4 sm:px-6 py-10 sm:py-12 lg:py-16">
        <div className="text-center space-y-3 sm:space-y-4 mb-8 sm:mb-10 lg:mb-12">
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium">
            Complete Solution
          </Badge>
          <h2 className="text-xl sm:text-2xl lg:text-3xl xl:text-4xl font-extrabold text-foreground px-4">
            Everything You Need to Manage Your
            <span className="gradient-text-hero block mt-1 sm:mt-2">LPG Business</span>
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-2xl mx-auto px-4">
            Comprehensive suite of tools designed specifically for LPG distributors
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="feature-card group overflow-hidden">
                <CardContent className="p-4 sm:p-5 lg:p-6 space-y-3 sm:space-y-4">
                  <div className="feature-icon w-12 h-12 sm:w-14 sm:h-14 lg:w-16 lg:h-16">
                    <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mb-1 sm:mb-2">{service.title}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed line-clamp-2">{service.description}</p>
                  </div>
                  <ul className="space-y-1.5 sm:space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="text-[11px] sm:text-xs text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                        <CheckCircle2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-accent flex-shrink-0" />
                        <span className="truncate">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Testimonial / Success Section */}
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
                  "With STOCK X's sales management, we reduced reporting time by 80% and increased our sales team's productivity by 35%. The real-time tracking has been a game-changer for our delivery operations."
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
                <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-sm sm:text-base lg:text-lg px-6 sm:px-8 lg:px-10 py-4 sm:py-5 lg:py-6 w-full">
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
                <li><a href="#services" className="hover:text-secondary transition-colors">How It Works</a></li>
                <li><a href="#stats" className="hover:text-secondary transition-colors">Success Stories</a></li>
                <li><Link to="/auth" className="hover:text-secondary transition-colors">Get Started</Link></li>
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
