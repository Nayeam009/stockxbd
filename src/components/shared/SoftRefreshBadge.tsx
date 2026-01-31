/**
 * Soft Refresh Badge
 * Shows a subtle "Refreshing..." indicator during background updates
 * without blanking the UI.
 */

import { RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface SoftRefreshBadgeProps {
  isRefreshing: boolean;
  className?: string;
}

export const SoftRefreshBadge = ({ isRefreshing, className }: SoftRefreshBadgeProps) => {
  if (!isRefreshing) return null;

  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full",
      "bg-primary/10 text-primary text-xs font-medium",
      "animate-pulse",
      className
    )}>
      <RefreshCw className="h-3 w-3 animate-spin" />
      <span>Refreshing...</span>
    </div>
  );
};

export default SoftRefreshBadge;
