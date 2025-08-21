import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { 
  ArrowLeft, 
  Package, 
  Users, 
  FileText, 
  CreditCard, 
  BarChart3, 
  Clock, 
  Truck,
  PieChart,
  Wrench,
  DollarSign,
  Globe,
  Search
} from "lucide-react";
import stockXLogo from "@/assets/stock-x-logo.png";

const Services = () => {
  const services = [
    {
      icon: Package,
      title: "Inventory Tracking",
      description: "Real-time tracking of cylinder and gas inventory levels with automated alerts.",
      features: ["Real-time monitoring", "Stock level alerts", "Automated reordering"],
      category: "Core"
    },
    {
      icon: Users,
      title: "Customer Management",
      description: "Comprehensive customer database with contact information and purchase history.",
      features: ["Customer profiles", "Purchase history", "Delivery preferences"],
      category: "Core"
    },
    {
      icon: FileText,
      title: "Order Management",
      description: "Streamlined order processing interface with delivery scheduling capabilities.",
      features: ["Order processing", "Delivery scheduling", "Status tracking"],
      category: "Core"
    },
    {
      icon: CreditCard,
      title: "Automated Billing",
      description: "Automated billing and invoicing system with payment tracking.",
      features: ["Auto-generated invoices", "Payment tracking", "Receipt management"],
      category: "Financial"
    },
    {
      icon: BarChart3,
      title: "Reporting & Analytics",
      description: "Comprehensive reporting on operations, delivery performance, and inventory.",
      features: ["Operational reports", "Performance metrics", "Custom dashboards"],
      category: "Analytics"
    },
    {
      icon: Clock,
      title: "Smart ETA",
      description: "AI-powered tool that provides accurate ETAs for all LPG deliveries.",
      features: ["AI predictions", "Real-time updates", "Route optimization"],
      category: "AI-Powered"
    },
    {
      icon: PieChart,
      title: "Daily Sales Management",
      description: "Monitor and record day-to-day sales activities with performance insights.",
      features: ["Sales tracking", "Performance metrics", "Daily reports"],
      category: "Sales"
    },
    {
      icon: Truck,
      title: "Driver Management",
      description: "Track driver sales, performance, and delivery efficiency.",
      features: ["Driver profiles", "Sales tracking", "Performance analytics"],
      category: "Operations"
    },
    {
      icon: DollarSign,
      title: "Financial Management",
      description: "Handle staff salary, vehicle costs, and comprehensive financial tracking.",
      features: ["Payroll management", "Cost tracking", "Financial reports"],
      category: "Financial"
    },
    {
      icon: Globe,
      title: "Online Delivery",
      description: "Manage online orders and deliveries with customer notifications.",
      features: ["Online orders", "Delivery tracking", "Customer updates"],
      category: "Digital"
    },
    {
      icon: Users,
      title: "LPG Community",
      description: "Manage customer relationships and community engagement activities.",
      features: ["Community management", "Customer engagement", "Feedback system"],
      category: "Community"
    },
    {
      icon: Search,
      title: "Navigation & Search",
      description: "Quickly find records, features, and information across the platform.",
      features: ["Global search", "Quick navigation", "Smart filtering"],
      category: "Utility"
    }
  ];

  const categoryColors = {
    "Core": "bg-primary text-primary-foreground",
    "Financial": "bg-accent text-accent-foreground",
    "Analytics": "bg-info text-info-foreground",
    "AI-Powered": "bg-secondary text-secondary-foreground",
    "Sales": "bg-warning text-warning-foreground",
    "Operations": "bg-primary text-primary-foreground",
    "Digital": "bg-info text-info-foreground",
    "Community": "bg-accent text-accent-foreground",
    "Utility": "bg-muted text-muted-foreground"
  };

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
            <Link to="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
            <Link to="/auth">
              <Button variant="default">Sign In</Button>
            </Link>
          </div>
        </nav>
      </header>

      {/* Services Content */}
      <main className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <div className="space-y-2">
            <Badge variant="secondary" className="px-4 py-2">Page 2</Badge>
            <h2 className="text-4xl font-bold text-primary">Our Services</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Stock-X provides a comprehensive suite of tools to manage your LPG delivery business efficiently. 
              From inventory tracking to customer management, we've got you covered.
            </p>
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <Card key={index} className="border-0 shadow-elegant hover:shadow-elegant-lg transition-all duration-300 hover:scale-105">
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center">
                      <Icon className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <Badge 
                      className={categoryColors[service.category as keyof typeof categoryColors]}
                    >
                      {service.category}
                    </Badge>
                  </div>
                  <div>
                    <CardTitle className="text-primary">{service.title}</CardTitle>
                    <CardDescription className="mt-2">{service.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {service.features.map((feature, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground flex items-center">
                        <div className="h-1.5 w-1.5 bg-secondary rounded-full mr-3"></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="text-center space-y-6 mt-24">
          <Card className="inline-block p-8 border-0 bg-gradient-hero shadow-elegant-xl">
            <div className="space-y-4">
              <h3 className="text-2xl font-bold text-primary-foreground">Ready to Get Started?</h3>
              <p className="text-primary-foreground/80">
                Join the Stock-X platform and transform your LPG delivery operations today.
              </p>
              <Link to="/auth">
                <Button size="lg" variant="secondary" className="mt-4">
                  Access Dashboard
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Services;