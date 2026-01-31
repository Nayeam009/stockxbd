/**
 * Module Load Error Card
 * Shows inline error when a module fails to load or times out.
 * Mobile-friendly with 48px touch targets.
 */

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw, ArrowLeft, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModuleLoadErrorCardProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  onGoBack?: () => void;
  isTimeout?: boolean;
  isOffline?: boolean;
  className?: string;
}

export const ModuleLoadErrorCard = ({
  title = "Failed to Load",
  message = "There was a problem loading this content. Please try again.",
  onRetry,
  onGoBack,
  isTimeout = false,
  isOffline = false,
  className
}: ModuleLoadErrorCardProps) => {
  const Icon = isOffline ? WifiOff : AlertTriangle;
  const displayTitle = isOffline 
    ? "You're Offline" 
    : isTimeout 
      ? "Loading Timed Out" 
      : title;
  const displayMessage = isOffline
    ? "Please check your internet connection and try again."
    : isTimeout
      ? "The server is taking too long to respond. Your data may still be loading in the background."
      : message;

  return (
    <Card className={cn(
      "border-dashed border-2",
      isOffline ? "border-warning/50 bg-warning/5" : "border-destructive/30 bg-destructive/5",
      className
    )}>
      <CardContent className="flex flex-col items-center justify-center py-12 px-6 text-center">
        <div className={cn(
          "h-16 w-16 rounded-2xl flex items-center justify-center mb-4",
          isOffline ? "bg-warning/20" : "bg-destructive/10"
        )}>
          <Icon className={cn(
            "h-8 w-8",
            isOffline ? "text-warning" : "text-destructive"
          )} />
        </div>
        
        <h3 className="text-base font-semibold text-foreground mb-2">
          {displayTitle}
        </h3>
        
        <p className="text-sm text-muted-foreground max-w-sm mb-6">
          {displayMessage}
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="h-12 flex-1 touch-target"
              disabled={isOffline}
            >
              <RefreshCcw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          )}
          
          {onGoBack && (
            <Button
              variant="outline"
              onClick={onGoBack}
              className="h-12 flex-1 touch-target"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ModuleLoadErrorCard;
