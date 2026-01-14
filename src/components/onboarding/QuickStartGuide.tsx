import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  Flame, 
  Package, 
  Truck, 
  Users, 
  DollarSign, 
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  Wallet,
  BarChart3,
  Car
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface QuickStartGuideProps {
  onClose: () => void;
  onNavigate: (module: string) => void;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  module: string;
  features: string[];
  demoData: string;
}

const steps: Step[] = [
  {
    id: "overview",
    title: "Dashboard Overview",
    description: "Your command center for the entire LPG business. See key metrics, quick actions, and real-time status at a glance.",
    icon: <LayoutDashboard className="h-8 w-8" />,
    module: "overview",
    features: [
      "Today's revenue and sales summary",
      "Low stock alerts and warnings",
      "Active orders and deliveries",
      "Quick navigation to all modules"
    ],
    demoData: "Demo data shows sample metrics to help you understand the layout."
  },
  {
    id: "lpg-stock",
    title: "LPG Cylinder Inventory",
    description: "Manage your LPG gas cylinder stock across different brands, sizes, and states (package, refill, empty, problem).",
    icon: <Flame className="h-8 w-8" />,
    module: "lpg-stock",
    features: [
      "Track multiple LPG brands (Omera, Bashundhara, etc.)",
      "Monitor package vs refill cylinder counts",
      "Record empty returns and problem cylinders",
      "Color-coded brand identification"
    ],
    demoData: "4 demo LPG brands with sample stock quantities are pre-loaded."
  },
  {
    id: "stoves",
    title: "Stove & Regulator Stock",
    description: "Keep track of stoves and regulators inventory with quantities, brands, and pricing.",
    icon: <Package className="h-8 w-8" />,
    module: "stove-stock",
    features: [
      "Stove inventory by brand and burner type",
      "Regulator stock by size (22mm, 20mm)",
      "Price management for each item",
      "Low stock warnings"
    ],
    demoData: "Sample stoves (RFL, Walton, Minister) and regulators (HP, Supergas) are included."
  },
  {
    id: "pos",
    title: "Point of Sale (POS)",
    description: "Process in-store sales quickly with our intuitive POS system. Add products, apply discounts, and complete transactions.",
    icon: <ShoppingCart className="h-8 w-8" />,
    module: "pos",
    features: [
      "Quick product search and selection",
      "Multiple payment methods (Cash, Mobile, Card)",
      "Discount application",
      "Transaction history"
    ],
    demoData: "Use your inventory items to create sales transactions."
  },
  {
    id: "orders",
    title: "Online Delivery Orders",
    description: "Manage delivery orders from receiving to completion. Assign drivers, track status, and handle payments.",
    icon: <Truck className="h-8 w-8" />,
    module: "online-delivery",
    features: [
      "Create and manage delivery orders",
      "Assign orders to drivers",
      "Track order status (Pending → Delivered)",
      "Payment status tracking"
    ],
    demoData: "Create orders for your demo customers to see the workflow."
  },
  {
    id: "customers",
    title: "Customer Management",
    description: "Maintain your customer database with contact info, outstanding dues, and cylinder tracking.",
    icon: <Users className="h-8 w-8" />,
    module: "customers",
    features: [
      "Customer profiles with contact details",
      "Track outstanding payments (dues)",
      "Monitor cylinders held by customers",
      "Record payment history"
    ],
    demoData: "3 demo customers (Restaurant, Household, Shop) with sample data."
  },
  {
    id: "pricing",
    title: "Product Pricing",
    description: "Set and manage prices for all products with company, distributor, and retail price tiers.",
    icon: <DollarSign className="h-8 w-8" />,
    module: "product-pricing",
    features: [
      "Multi-tier pricing (Company → Distributor → Retail)",
      "LPG refill and package prices",
      "Stove and regulator pricing",
      "Easy price updates"
    ],
    demoData: "Sample pricing for LPG refills, stoves, and regulators."
  },
  {
    id: "expenses",
    title: "Daily Expenses",
    description: "Track all business expenses by category to understand your costs and maintain profitability.",
    icon: <Wallet className="h-8 w-8" />,
    module: "daily-expenses",
    features: [
      "Record daily business expenses",
      "Categorize by type (Fuel, Maintenance, etc.)",
      "View expense history",
      "Monthly expense summaries"
    ],
    demoData: "Add your first expense to start tracking costs."
  },
  {
    id: "staff",
    title: "Staff & Vehicles",
    description: "Manage your team and fleet. Track salaries, vehicle costs, and maintenance.",
    icon: <Car className="h-8 w-8" />,
    module: "staff-salary",
    features: [
      "Staff profiles with salary info",
      "Record salary payments",
      "Vehicle cost tracking (fuel, repairs)",
      "Payment history"
    ],
    demoData: "Demo staff (Driver, Helper) and vehicles (Truck, Van) are included."
  },
  {
    id: "analytics",
    title: "Analytics & Reports",
    description: "Visualize your business performance with charts and insights to make data-driven decisions.",
    icon: <BarChart3 className="h-8 w-8" />,
    module: "analytics",
    features: [
      "Revenue trends and charts",
      "Sales performance analysis",
      "Expense breakdown",
      "Inventory movement tracking"
    ],
    demoData: "Charts will populate as you add real transaction data."
  },
  {
    id: "settings",
    title: "Settings & Team",
    description: "Configure your business, invite team members, and customize the app to your needs.",
    icon: <Settings className="h-8 w-8" />,
    module: "settings",
    features: [
      "Business information setup",
      "Invite managers and drivers",
      "Language and theme preferences",
      "Delete demo data when ready"
    ],
    demoData: "Use the 'Demo Data' card in Settings to remove sample data."
  }
];

export const QuickStartGuide = ({ onClose, onNavigate }: QuickStartGuideProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const step = steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (!completedSteps.includes(step.id)) {
      setCompletedSteps([...completedSteps, step.id]);
    }
    if (isLastStep) {
      handleFinish();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGoToModule = () => {
    onNavigate(step.module);
    onClose();
  };

  const handleFinish = () => {
    // Mark guide as completed in localStorage
    localStorage.setItem("quickstart-completed", "true");
    onClose();
  };

  const handleSkip = () => {
    localStorage.setItem("quickstart-completed", "true");
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={() => handleSkip()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden p-0">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground p-6 relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={handleSkip}
          >
            <X className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-primary-foreground/20 rounded-lg">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Quick Start Guide</h2>
              <p className="text-sm opacity-90">Learn how to use Stock-X in minutes</p>
            </div>
          </div>
          
          {/* Progress */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-primary-foreground/20 rounded-full h-2">
              <div 
                className="bg-primary-foreground h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium">
              {currentStep + 1} / {steps.length}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[50vh]">
          {/* Step Header */}
          <div className="flex items-start gap-4">
            <div className="p-3 bg-primary/10 text-primary rounded-xl">
              {step.icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-foreground">{step.title}</h3>
                {completedSteps.includes(step.id) && (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                )}
              </div>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          </div>

          {/* Features List */}
          <div className="space-y-3">
            <h4 className="font-semibold text-foreground">Key Features:</h4>
            <ul className="space-y-2">
              {step.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Demo Data Info */}
          <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Sparkles className="h-5 w-5 text-amber-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">Demo Data</p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">{step.demoData}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Step Indicators */}
        <div className="px-6 pb-2">
          <div className="flex justify-center gap-1.5">
            {steps.map((s, index) => (
              <button
                key={s.id}
                onClick={() => setCurrentStep(index)}
                className={`h-2 rounded-full transition-all duration-200 ${
                  index === currentStep 
                    ? "w-6 bg-primary" 
                    : completedSteps.includes(s.id)
                      ? "w-2 bg-green-500"
                      : "w-2 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t p-4 flex items-center justify-between bg-muted/30">
          <Button
            variant="ghost"
            onClick={handlePrev}
            disabled={isFirstStep}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleGoToModule}
              className="gap-1"
            >
              Try it now
              <ArrowRight className="h-4 w-4" />
            </Button>

            <Button onClick={handleNext} className="gap-1">
              {isLastStep ? (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Finish
                </>
              ) : (
                <>
                  Next
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const useQuickStartGuide = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [isNewOwner, setIsNewOwner] = useState(false);

  useEffect(() => {
    const checkIfNewOwner = async () => {
      // Check if guide was already completed
      const completed = localStorage.getItem("quickstart-completed");
      if (completed === "true") {
        return;
      }

      // Check if user is an owner
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (roleData?.role === 'owner') {
        // Check if they have demo data (indicates new signup)
        const { data: demoCount } = await supabase.rpc('count_demo_data');
        
        if (demoCount && demoCount > 0) {
          setIsNewOwner(true);
          // Show guide after a short delay for better UX
          setTimeout(() => setShowGuide(true), 1500);
        }
      }
    };

    checkIfNewOwner();
  }, []);

  const openGuide = () => setShowGuide(true);
  const closeGuide = () => setShowGuide(false);

  return { showGuide, isNewOwner, openGuide, closeGuide };
};
