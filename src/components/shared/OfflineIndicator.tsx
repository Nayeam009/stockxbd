/**
 * Offline Indicator Component
 * Shows simple offline status
 */

import { useNetwork } from '@/contexts/NetworkContext';
import { WifiOff, CheckCircle2, CloudOff } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const OfflineIndicator = ({ className, compact = false }: OfflineIndicatorProps) => {
  const { isOnline } = useNetwork();

  // Don't show anything if online
  if (isOnline) {
    return null;
  }

  // Compact mode for header
  if (compact) {
    return (
      <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 text-warning text-xs font-medium">
        <WifiOff className="h-3 w-3" />
        <span className="hidden sm:inline">Offline</span>
      </div>
    );
  }

  // Full banner mode
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 transition-all duration-300',
        'bottom-mobile-nav md:bottom-0',
        className
      )}
    >
      <div className="bg-warning/95 backdrop-blur-sm text-warning-foreground px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-full bg-warning-foreground/10">
            <WifiOff className="h-4 w-4" />
          </div>
          <div>
            <p className="font-medium text-sm">You're offline</p>
            <p className="text-xs opacity-80 hidden sm:block">
              Please check your internet connection
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Mini sync status for use in headers/cards
export const SyncStatusBadge = ({ 
  synced,
  className 
}: { 
  synced: boolean;
  className?: string;
}) => {
  if (synced) {
    return (
      <div className={cn(
        'flex items-center gap-1 text-xs text-success',
        className
      )}>
        <CheckCircle2 className="h-3 w-3" />
        <span>Synced</span>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex items-center gap-1 text-xs text-warning',
      className
    )}>
      <CloudOff className="h-3 w-3" />
      <span>Pending</span>
    </div>
  );
};

// Hook for sync status (always synced now - no offline storage)
export const useSyncStatus = (_id: string) => {
  return {
    isPending: false,
    isSynced: true,
  };
};
