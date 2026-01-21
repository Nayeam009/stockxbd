import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  colorScheme?: 'emerald' | 'rose' | 'muted';
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: ReactNode;
  className?: string;
}

const colorConfig = {
  emerald: {
    border: "border-emerald-200 dark:border-emerald-800/50",
    background: "bg-emerald-50/50 dark:bg-emerald-950/20",
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconColor: "text-emerald-500",
    buttonBorder: "border-emerald-200 dark:border-emerald-800",
    buttonText: "text-emerald-600 dark:text-emerald-400",
    buttonHover: "hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
  },
  rose: {
    border: "border-rose-200 dark:border-rose-800/50",
    background: "bg-rose-50/50 dark:bg-rose-950/20",
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconColor: "text-rose-500",
    buttonBorder: "border-rose-200 dark:border-rose-800",
    buttonText: "text-rose-600 dark:text-rose-400",
    buttonHover: "hover:bg-rose-50 dark:hover:bg-rose-950/50"
  },
  muted: {
    border: "border-border",
    background: "bg-muted/30",
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
    buttonBorder: "border-border",
    buttonText: "text-foreground",
    buttonHover: "hover:bg-muted"
  }
};

export const EmptyStateCard = ({
  icon,
  title,
  subtitle,
  colorScheme = 'muted',
  actionLabel,
  onAction,
  actionIcon,
  className,
}: EmptyStateCardProps) => {
  const colors = colorConfig[colorScheme];
  
  return (
    <Card className={cn(
      "border-dashed border-2",
      colors.border,
      colors.background,
      className
    )}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
          colors.iconBg
        )}>
          <div className={colors.iconColor}>
            {icon}
          </div>
        </div>
        <p className="text-base font-semibold text-foreground">{title}</p>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">
          {subtitle}
        </p>
        {actionLabel && onAction && (
          <Button 
            variant="outline" 
            className={cn(
              "mt-4 h-11 touch-manipulation",
              colors.buttonBorder,
              colors.buttonText,
              colors.buttonHover
            )}
            onClick={onAction}
          >
            {actionIcon}
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
};
