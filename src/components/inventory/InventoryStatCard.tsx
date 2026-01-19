import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type InventoryStatCardProps = {
  value: number | string;
  label: string;
  icon: React.ElementType;
  active?: boolean;
  tone?: "default" | "danger";
  className?: string;
  onClick?: () => void;
};

export function InventoryStatCard({
  value,
  label,
  icon: Icon,
  active,
  tone = "default",
  className,
  onClick,
}: InventoryStatCardProps) {
  const interactive = Boolean(onClick);

  return (
    <Card
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-pressed={interactive ? Boolean(active) : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!onClick) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "select-none",
        "transition-[box-shadow,background-color,transform]",
        "touch-manipulation",
        tone === "danger" ? "bg-destructive/5 border-destructive/20" : "bg-card",
        interactive && "cursor-pointer hover:shadow-sm active:scale-[0.99]",
        active && "ring-2 ring-primary",
        className
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "danger" ? "text-destructive" : "text-primary",
              active ? "opacity-100" : "opacity-80"
            )}
          />
          <div className="min-w-0">
            <p className="text-lg sm:text-2xl font-bold leading-none">{value}</p>
            <p className="mt-1 text-[10px] sm:text-xs text-muted-foreground truncate">
              {label}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
