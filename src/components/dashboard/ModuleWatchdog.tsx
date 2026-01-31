/**
 * Module Watchdog Component
 * Safety net that shows a fallback if any module stays in loading state too long.
 * Prevents users from getting permanently stuck.
 */

import { useState, useEffect, useRef, ReactNode, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCcw, Home, Clock, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface ModuleWatchdogProps {
  children: ReactNode;
  moduleName?: string;
  timeoutMs?: number;
  isLoading?: boolean;
  onRetry?: () => void;
}

export const ModuleWatchdog = ({
  children,
  moduleName = "Module",
  timeoutMs = 12000,
  isLoading = false,
  onRetry
}: ModuleWatchdogProps) => {
  const navigate = useNavigate();
  const [showFallback, setShowFallback] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const startTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleGoHome = useCallback(() => {
    navigate('/dashboard?module=overview', { replace: true });
  }, [navigate]);

  const handleRetry = useCallback(() => {
    setShowFallback(false);
    setElapsedTime(0);
    startTimeRef.current = Date.now();
    onRetry?.();
  }, [onRetry]);

  useEffect(() => {
    // Only track time when loading
    if (!isLoading) {
      startTimeRef.current = null;
      setElapsedTime(0);
      setShowFallback(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Start tracking
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now();
    }

    // Update elapsed time every second
    intervalRef.current = setInterval(() => {
      if (startTimeRef.current) {
        const elapsed = Date.now() - startTimeRef.current;
        setElapsedTime(elapsed);

        // Show fallback after timeout
        if (elapsed >= timeoutMs) {
          setShowFallback(true);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      }
    }, 500);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isLoading, timeoutMs]);

  // Show fallback overlay on top of children (don't unmount children)
  if (showFallback && isLoading) {
    return (
      <div className="relative min-h-[300px]">
        {/* Keep children rendered but hidden */}
        <div className="opacity-30 pointer-events-none blur-sm">
          {children}
        </div>

        {/* Fallback overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm rounded-lg">
          <Card className="max-w-md w-full mx-4 border-warning/50 shadow-lg">
            <CardContent className="py-8 px-6 text-center">
              <div className="h-14 w-14 rounded-2xl bg-warning/20 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-7 w-7 text-warning" />
              </div>
              
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Taking Too Long
              </h3>
              
              <p className="text-sm text-muted-foreground mb-2">
                {moduleName} is taking longer than expected to load.
              </p>
              
              <p className="text-xs text-muted-foreground/70 mb-6">
                Time elapsed: {Math.round(elapsedTime / 1000)}s
              </p>

              <div className="flex flex-col gap-3">
                <Button
                  onClick={handleRetry}
                  className="h-12 w-full touch-target"
                >
                  <RefreshCcw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handleGoHome}
                  className="h-12 w-full touch-target"
                >
                  <Home className="h-4 w-4 mr-2" />
                  Go to Overview
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};

export default ModuleWatchdog;
