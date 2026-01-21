import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCcw, ArrowLeft } from "lucide-react";

interface PremiumModuleHeaderProps {
  title: string;
  subtitle: string;
  icon: ReactNode;
  gradientFrom?: string;
  gradientTo?: string;
  onBack?: () => void;
  backLabel?: string;
  onRefresh?: () => void;
  actions?: ReactNode;
}

export const PremiumModuleHeader = ({
  title,
  subtitle,
  icon,
  gradientFrom = "from-primary/5",
  gradientTo = "to-secondary/5",
  onBack,
  backLabel = "← Back",
  onRefresh,
  actions,
}: PremiumModuleHeaderProps) => {
  return (
    <div className="relative">
      <div className={`absolute inset-0 bg-gradient-to-r ${gradientFrom} via-transparent ${gradientTo} rounded-xl -z-10`} />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:p-0">
        <div className="space-y-1">
          {onBack && (
            <Button 
              variant="ghost" 
              onClick={onBack}
              className="mb-2 -ml-2 text-muted-foreground hover:text-foreground h-9 px-3 text-sm touch-manipulation"
            >
              {backLabel}
            </Button>
          )}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shrink-0">
              {icon}
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                {title}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {subtitle}
              </p>
            </div>
          </div>
        </div>
        
        {(onRefresh || actions) && (
          <div className="flex items-center gap-2">
            {actions}
            {onRefresh && (
              <Button 
                variant="outline" 
                size="icon"
                onClick={onRefresh} 
                className="h-11 w-11 shrink-0 touch-manipulation border-border/50 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
                aria-label="Refresh data"
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
