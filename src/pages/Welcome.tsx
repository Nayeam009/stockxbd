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
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <img 
                  src={stockXLogo} 
                  alt="Stock-X Logo" 
                  className="h-12 w-12 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-105" 
                />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary tracking-tight">STOCK X</h1>
                <span className="text-xs text-muted-foreground font-medium">LPG Management</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
              <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Success Stories</a>
            </div>

            {/* CTA Buttons */}
            <div className="hidden md:flex items-center gap-3">
              <Link to="/auth">
                <Button variant="outline" className="border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300">
                  Free Demo
                </Button>
              </Link>
              <Link to="/auth">
                <Button className="btn-cta text-secondary-foreground font-semibold">
                  Get Started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>

            {/* Mobile Menu Button */}
            <button 
              className="md:hidden p-2 rounded-lg hover:bg-muted transition-colors"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="h-6 w-6 text-primary" /> : <Menu className="h-6 w-6 text-primary" />}
            </button>
          </nav>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden absolute top-full left-0 right-0 bg-card border-b border-border shadow-lg py-4 px-4 space-y-4">
              <a href="#features" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#services" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">How It Works</a>
              <a href="#stats" className="block py-2 text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Success Stories</a>
              <Link to="/auth" className="block">
                <Button className="w-full btn-cta text-secondary-foreground font-semibold">
                  Request Free Demo
                </Button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative hero-gradient text-primary-foreground py-20 lg:py-28 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
        </div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <Badge className="bg-white/10 text-white border-white/20 hover:bg-white/15 px-4 py-2 text-sm font-medium">
              <Flame className="h-4 w-4 mr-2" />
              Complete LPG Business Management
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight">
              Complete Feature Set for
              <br />
              <span className="text-secondary">LPG Business Excellence</span>
            </h1>
            
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed">
              From daily sales to delivery tracking, STOCK X has every tool you need to streamline your LPG operations
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-lg px-8 py-6 w-full sm:w-auto">
                  <Play className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <a href="#services">
                <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20 hover:border-white/40 transition-all duration-300 text-lg px-8 py-6 w-full sm:w-auto">
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
      <section id="features" className="container mx-auto px-4 py-16 -mt-8 relative z-10">
        <div className="grid md:grid-cols-3 gap-6">
          {highlights.map((item, index) => {
            const Icon = item.icon;
            return (
              <Card key={index} className="feature-card p-8 shadow-lg hover:shadow-2xl">
                <div className="space-y-4">
                  <div className="feature-icon">
                    <Icon className="h-7 w-7 text-primary transition-colors duration-300 group-hover:text-primary-foreground" />
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{item.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{item.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden hero-gradient p-12">
          <div className="absolute inset-0 opacity-20" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.3'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-4xl lg:text-5xl font-extrabold text-white">{stat.value}</div>
                <div className="text-white/80 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <Badge className="bg-secondary/10 text-secondary border-secondary/20 px-4 py-2 text-sm font-medium">
            Complete Solution
          </Badge>
          <h2 className="text-3xl lg:text-4xl font-extrabold text-foreground">
            Everything You Need to Manage Your
            <span className="gradient-text-hero block mt-2">LPG Business</span>
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Comprehensive suite of tools designed specifically for LPG distributors
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="feature-card group overflow-hidden">
                <CardContent className="p-6 space-y-4">
                  <div className="feature-icon">
                    <Icon className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors duration-300" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-accent flex-shrink-0" />
                        {feature}
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
      <section className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden bg-muted/50 border border-border/50 p-12 lg:p-16">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <Badge className="bg-success/10 text-success border-success/20 px-4 py-2">
                <Star className="h-4 w-4 mr-2" />
                Customer Success
              </Badge>
              <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
                Trusted by LPG Businesses Across Bangladesh
              </h2>
              <p className="text-lg text-muted-foreground">
                Join hundreds of distributors who have transformed their operations with Stock-X.
              </p>
              
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-secondary">+45%</div>
                  <div className="text-sm text-muted-foreground">Efficiency Increase</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-accent">-30%</div>
                  <div className="text-sm text-muted-foreground">Operational Costs</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-success">99%</div>
                  <div className="text-sm text-muted-foreground">Stock Accuracy</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-primary">2x</div>
                  <div className="text-sm text-muted-foreground">Faster Deliveries</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="bg-card rounded-2xl p-8 shadow-xl border border-border/50">
                <div className="flex items-start gap-4 mb-6">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary-light flex items-center justify-center text-primary-foreground font-bold text-lg">
                    RK
                  </div>
                  <div>
                    <h4 className="font-bold text-foreground">Rajesh Kumar</h4>
                    <p className="text-sm text-muted-foreground">CityGas Distributors, Dhaka</p>
                  </div>
                </div>
                <blockquote className="text-muted-foreground italic leading-relaxed">
                  "With STOCK X's sales management, we reduced reporting time by 80% and increased our sales team's productivity by 35%. The real-time tracking has been a game-changer for our delivery operations."
                </blockquote>
                <div className="flex items-center gap-1 mt-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-warning text-warning" />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden hero-gradient p-12 lg:p-16 text-center">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.4'%3E%3Cpath d='M36 34c0-2.21-1.79-4-4-4s-4 1.79-4 4 1.79 4 4 4 4-1.79 4-4z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />
          
          <div className="relative space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-white">
              Ready to Transform Your LPG Business?
            </h2>
            <p className="text-lg text-white/80">
              Join hundreds of LPG businesses already using Stock-X to streamline their operations and boost efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="btn-cta text-secondary-foreground font-bold text-lg px-10 py-6 w-full sm:w-auto">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer-gradient text-white">
        <div className="container mx-auto px-4 py-16">
          <div className="grid md:grid-cols-4 gap-12">
            {/* Company Info */}
            <div className="md:col-span-2 space-y-6">
              <div className="flex items-center space-x-3">
                <img src={stockXLogo} alt="Stock-X Logo" className="h-12 w-12 rounded-xl bg-white/10 p-1" />
                <div>
                  <h3 className="text-xl font-bold">STOCK X</h3>
                  <p className="text-sm text-white/60">LPG Management Platform</p>
                </div>
              </div>
              <p className="text-white/70 leading-relaxed max-w-md">
                Bangladesh's leading LPG business management solution. Streamline your operations, boost efficiency, and grow your business with our comprehensive platform.
              </p>
              <div className="flex items-center gap-4">
                <div className="social-icon">
                  <Mail className="h-5 w-5" />
                </div>
                <div className="social-icon">
                  <Phone className="h-5 w-5" />
                </div>
                <div className="social-icon">
                  <Globe className="h-5 w-5" />
                </div>
              </div>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Quick Links</h4>
              <ul className="space-y-3 text-white/70">
                <li><a href="#features" className="hover:text-secondary transition-colors">Features</a></li>
                <li><a href="#services" className="hover:text-secondary transition-colors">How It Works</a></li>
                <li><a href="#stats" className="hover:text-secondary transition-colors">Success Stories</a></li>
                <li><Link to="/auth" className="hover:text-secondary transition-colors">Get Started</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h4 className="font-bold text-lg">Contact Us</h4>
              <ul className="space-y-3 text-white/70">
                <li className="flex items-center gap-3">
                  <MapPin className="h-5 w-5 text-secondary" />
                  <span>Dhaka, Bangladesh</span>
                </li>
                <li className="flex items-center gap-3">
                  <Phone className="h-5 w-5 text-secondary" />
                  <span>+880 1XXX-XXXXXX</span>
                </li>
                <li className="flex items-center gap-3">
                  <Mail className="h-5 w-5 text-secondary" />
                  <span>support@stockx.com</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t border-white/10 mt-12 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-white/60">© 2024 STOCK X. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-white/60">
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
