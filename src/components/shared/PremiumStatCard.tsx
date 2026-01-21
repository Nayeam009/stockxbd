import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PremiumStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  colorScheme?: 'emerald' | 'rose' | 'amber' | 'purple' | 'primary' | 'muted';
  showTopBar?: boolean;
  className?: string;
}

const colorConfig = {
  emerald: {
    gradient: "from-emerald-500/10 via-emerald-500/5",
    bar: "from-emerald-500 to-emerald-400",
    icon: "bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-400"
  },
  rose: {
    gradient: "from-rose-500/10 via-rose-500/5",
    bar: "from-rose-500 to-rose-400",
    icon: "bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-400"
  },
  amber: {
    gradient: "from-amber-500/10 via-amber-500/5",
    bar: "from-amber-500 to-amber-400",
    icon: "bg-amber-500/20",
    text: "text-amber-600 dark:text-amber-400"
  },
  purple: {
    gradient: "from-purple-500/10 via-purple-500/5",
    bar: "from-purple-500 to-purple-400",
    icon: "bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-400"
  },
  primary: {
    gradient: "from-primary/10 via-primary/5",
    bar: "from-primary to-primary/80",
    icon: "bg-primary/20",
    text: "text-primary"
  },
  muted: {
    gradient: "from-muted/50 via-muted/30",
    bar: "",
    icon: "bg-primary/10",
    text: "text-foreground"
  }
};

export const PremiumStatCard = ({
  title,
  value,
  subtitle,
  icon,
  colorScheme = 'primary',
  showTopBar = true,
  className,
}: PremiumStatCardProps) => {
  const colors = colorConfig[colorScheme];
  
  return (
    <Card className={cn(
      "relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300",
      className
    )}>
      <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} to-transparent`} />
      {showTopBar && colors.bar && (
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${colors.bar}`} />
      )}
      <CardContent className="relative p-3 sm:p-5">
        <div className="flex items-center gap-3">
          <div className={cn(
            "h-9 w-9 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0",
            colors.icon
          )}>
            {icon}
          </div>
          <div className="min-w-0">
            <p className={cn(
              "text-xl sm:text-3xl font-bold tabular-nums truncate",
              colors.text
            )}>
              {value}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">
              {title}
            </p>
            {subtitle && (
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
