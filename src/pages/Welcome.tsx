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
  Zap
} from "lucide-react";
import { Link } from "react-router-dom";
import stockXLogo from "@/assets/stock-x-logo.png";
import heroBanner from "@/assets/hero-banner.jpg";

const Welcome = () => {
  const services = [
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Real-time tracking of cylinder and gas inventory levels with automated alerts.",
      features: ["Real-time monitoring", "Stock alerts", "Auto reordering"],
      gradient: "from-primary to-primary-light"
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Comprehensive customer database with contact info and purchase history.",
      features: ["Customer profiles", "Purchase history", "Preferences"],
      gradient: "from-secondary to-secondary-light"
    },
    {
      icon: FileText,
      title: "Order Management",
      description: "Streamlined order processing with delivery scheduling capabilities.",
      features: ["Order processing", "Scheduling", "Status tracking"],
      gradient: "from-accent to-accent-light"
    },
    {
      icon: CreditCard,
      title: "Automated Billing",
      description: "Automated billing and invoicing system with payment tracking.",
      features: ["Auto invoices", "Payment tracking", "Receipts"],
      gradient: "from-info to-info"
    },
    {
      icon: BarChart3,
      title: "Analytics & Reports",
      description: "Comprehensive reporting on operations and delivery performance.",
      features: ["Performance metrics", "Custom dashboards", "Insights"],
      gradient: "from-warning to-warning"
    },
    {
      icon: Clock,
      title: "Smart ETA",
      description: "AI-powered tool providing accurate ETAs for all LPG deliveries.",
      features: ["AI predictions", "Route optimization", "Live updates"],
      gradient: "from-primary to-secondary"
    },
    {
      icon: PieChart,
      title: "Daily Sales",
      description: "Monitor and record day-to-day sales with performance insights.",
      features: ["Sales tracking", "Daily reports", "Trends"],
      gradient: "from-secondary to-accent"
    },
    {
      icon: Truck,
      title: "Driver Management",
      description: "Track driver sales, performance, and delivery efficiency.",
      features: ["Driver profiles", "Performance", "Analytics"],
      gradient: "from-accent to-primary"
    },
    {
      icon: DollarSign,
      title: "Financial Management",
      description: "Handle staff salary, vehicle costs, and financial tracking.",
      features: ["Payroll", "Cost tracking", "Reports"],
      gradient: "from-info to-primary"
    },
    {
      icon: Globe,
      title: "Online Delivery",
      description: "Manage online orders and deliveries with notifications.",
      features: ["Online orders", "Tracking", "Updates"],
      gradient: "from-primary to-info"
    },
    {
      icon: Users,
      title: "LPG Community",
      description: "Manage customer relationships and community engagement.",
      features: ["Community", "Engagement", "Feedback"],
      gradient: "from-secondary to-primary"
    },
    {
      icon: Search,
      title: "Smart Search",
      description: "Quickly find records and information across the platform.",
      features: ["Global search", "Navigation", "Filtering"],
      gradient: "from-accent to-secondary"
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
      {/* Animated Background */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-secondary/8 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-primary/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-3 group cursor-pointer">
              <div className="relative">
                <img 
                  src={stockXLogo} 
                  alt="Stock-X Logo" 
                  className="h-12 w-12 rounded-xl shadow-lg transition-transform duration-300 group-hover:scale-110" 
                />
                <div className="absolute inset-0 bg-secondary/20 rounded-xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-primary tracking-tight">Stock-X</h1>
                <span className="text-xs text-muted-foreground font-medium">LPG Management</span>
              </div>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Features</a>
              <a href="#services" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Services</a>
              <a href="#stats" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">Why Us</a>
            </div>
            <Link to="/auth">
              <Button className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container mx-auto px-4 py-16 lg:py-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 border border-secondary/20 rounded-full">
              <Flame className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium text-secondary">Bangladesh's #1 LPG Solution</span>
            </div>

            <div className="space-y-6">
              <h2 className="text-5xl lg:text-7xl font-bold leading-tight">
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
                  <Zap className="mr-2 h-5 w-5" />
                  Start Free Trial
                </Button>
              </Link>
              <a href="#services">
                <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 border-primary/20 text-primary hover:bg-primary hover:text-primary-foreground transition-all duration-300 text-lg px-8 py-6">
                  Explore Features
                </Button>
              </a>
            </div>

            <div className="flex items-center gap-8 pt-6 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-accent" />
                <span className="text-sm text-muted-foreground">Secure & Reliable</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-info" />
                <span className="text-sm text-muted-foreground">24/7 Support</span>
              </div>
              <div className="flex items-center gap-2">
                <Star className="h-5 w-5 text-warning" />
                <span className="text-sm text-muted-foreground">Top Rated</span>
              </div>
            </div>
          </div>

          <div className="relative lg:pl-8">
            <div className="absolute -top-8 -left-8 w-32 h-32 bg-gradient-to-br from-secondary to-secondary-light rounded-3xl opacity-20 blur-2xl" />
            <div className="absolute -bottom-8 -right-8 w-40 h-40 bg-gradient-to-br from-primary to-primary-light rounded-3xl opacity-20 blur-2xl" />
            
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-border/20">
              <img 
                src={heroBanner} 
                alt="LPG Delivery Management" 
                className="w-full aspect-[4/3] object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/70 via-primary/20 to-transparent" />
              
              <div className="absolute bottom-6 left-6 right-6 bg-card/95 backdrop-blur-md rounded-2xl p-6 shadow-2xl border border-border/50">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-3xl font-bold text-secondary">24/7</div>
                    <div className="text-xs text-muted-foreground mt-1">Real-time Tracking</div>
                  </div>
                  <div className="border-x border-border/50">
                    <div className="text-3xl font-bold text-accent">Smart</div>
                    <div className="text-xs text-muted-foreground mt-1">AI Predictions</div>
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-info">100%</div>
                    <div className="text-xs text-muted-foreground mt-1">Auto Billing</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Highlights */}
      <section id="features" className="container mx-auto px-4 py-16">
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-16 w-16 bg-gradient-to-br from-primary to-primary-light rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Truck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Smart Delivery</h3>
              <p className="text-muted-foreground leading-relaxed">
                AI-powered ETA predictions and real-time delivery tracking for optimal route management.
              </p>
            </div>
          </Card>

          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-16 w-16 bg-gradient-to-br from-secondary to-secondary-light rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <BarChart3 className="h-8 w-8 text-secondary-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Inventory Control</h3>
              <p className="text-muted-foreground leading-relaxed">
                Real-time tracking of cylinders, gas stoves, and stock levels to prevent shortages.
              </p>
            </div>
          </Card>

          <Card className="group p-8 border-0 bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 rounded-3xl overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative space-y-4">
              <div className="h-16 w-16 bg-gradient-to-br from-accent to-accent-light rounded-2xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                <Users className="h-8 w-8 text-accent-foreground" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Customer Management</h3>
              <p className="text-muted-foreground leading-relaxed">
                Comprehensive customer database with purchase history and delivery preferences.
              </p>
            </div>
          </Card>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-primary via-primary-light to-secondary p-12">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxLTEuNzktNC00LTRzLTQgMS43OS00IDQgMS43OSA0IDQgNCA0LTEuNzkgNC00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
          <div className="relative grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {stats.map((stat, index) => (
              <div key={index} className="space-y-2">
                <div className="text-4xl lg:text-5xl font-bold text-primary-foreground">{stat.value}</div>
                <div className="text-primary-foreground/80 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section id="services" className="container mx-auto px-4 py-16">
        <div className="text-center space-y-4 mb-12">
          <Badge variant="secondary" className="px-4 py-2 text-sm">Complete Solution</Badge>
          <h2 className="text-4xl lg:text-5xl font-bold text-foreground">
            Everything You Need
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Comprehensive suite of tools to manage your LPG delivery business efficiently
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card 
                key={index} 
                className="group border-0 bg-card/50 backdrop-blur-sm shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 rounded-2xl overflow-hidden"
              >
                <CardContent className="p-6 space-y-4">
                  <div className={`h-12 w-12 bg-gradient-to-br ${service.gradient} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <Icon className="h-6 w-6 text-primary-foreground" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-foreground mb-2">{service.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{service.description}</p>
                  </div>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="text-xs text-muted-foreground flex items-center gap-2">
                        <CheckCircle2 className="h-3 w-3 text-secondary flex-shrink-0" />
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

      {/* CTA Section */}
      <section className="container mx-auto px-4 py-16">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-card via-card to-muted/50 border border-border/50 p-12 lg:p-16 text-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
          
          <div className="relative space-y-6 max-w-2xl mx-auto">
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground">
              Ready to Transform Your Business?
            </h2>
            <p className="text-lg text-muted-foreground">
              Join hundreds of LPG businesses already using Stock-X to streamline their operations and boost efficiency.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
              <Link to="/auth">
                <Button size="lg" className="bg-gradient-to-r from-primary to-primary-light text-primary-foreground shadow-xl hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 text-lg px-10 py-6">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-12">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-3">
              <img src={stockXLogo} alt="Stock-X Logo" className="h-10 w-10 rounded-lg" />
              <div>
                <h3 className="text-lg font-bold text-primary">Stock-X</h3>
                <p className="text-xs text-muted-foreground">LPG Management Platform</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">© 2024 Stock-X. All rights reserved.</p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <span className="hover:text-primary transition-colors cursor-pointer">Privacy</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Terms</span>
              <span className="hover:text-primary transition-colors cursor-pointer">Contact</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Welcome;