/**
 * Offline Indicator Component
 * Phase 8: Shows offline status and sync information
 */

import { useNetwork } from '@/contexts/NetworkContext';
import { WifiOff, RefreshCw, Cloud, CloudOff, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';

interface OfflineIndicatorProps {
  className?: string;
  compact?: boolean;
}

export const OfflineIndicator = ({ className, compact = false }: OfflineIndicatorProps) => {
  const { isOnline, isSyncing, pendingSyncCount, lastSyncedAt, syncNow } = useNetwork();

  // Don't show anything if online with no pending
  if (isOnline && pendingSyncCount === 0 && !isSyncing && !compact) {
    return null;
  }

  // Compact mode for header
  if (compact) {
    if (!isOnline) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-warning/10 text-warning text-xs font-medium">
          <WifiOff className="h-3 w-3" />
          <span className="hidden sm:inline">Offline</span>
        </div>
      );
    }

    if (isSyncing) {
      return (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
          <RefreshCw className="h-3 w-3 animate-spin" />
          <span className="hidden sm:inline">Syncing...</span>
        </div>
      );
    }

    if (pendingSyncCount > 0) {
      return (
        <button
          onClick={() => syncNow()}
          className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/10 text-secondary text-xs font-medium hover:bg-secondary/20 transition-colors"
        >
          <Cloud className="h-3 w-3" />
          <span>{pendingSyncCount} pending</span>
        </button>
      );
    }

    return null;
  }

  // Full banner mode
  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-40 transition-all duration-300',
        // Position above mobile bottom nav when on mobile
        'bottom-mobile-nav md:bottom-0',
        className
      )}
    >
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-warning/95 backdrop-blur-sm text-warning-foreground px-4 py-2.5 flex items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-full bg-warning-foreground/10">
              <WifiOff className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">You're offline</p>
              <p className="text-xs opacity-80 hidden sm:block">
                Changes will sync when you're back online
                {pendingSyncCount > 0 && ` (${pendingSyncCount} pending)`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Syncing Banner */}
      {isOnline && isSyncing && (
        <div className="bg-primary/95 backdrop-blur-sm text-primary-foreground px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-primary-foreground/10">
              <RefreshCw className="h-4 w-4 animate-spin" />
            </div>
            <div>
              <p className="font-medium text-sm">Syncing your changes...</p>
              <p className="text-xs opacity-80">
                {pendingSyncCount > 0 ? `${pendingSyncCount} items remaining` : 'Almost done'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending Sync Banner */}
      {isOnline && !isSyncing && pendingSyncCount > 0 && (
        <div className="bg-secondary/95 backdrop-blur-sm text-secondary-foreground px-4 py-3 flex items-center justify-between gap-4 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-secondary-foreground/10">
              <Cloud className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-sm">{pendingSyncCount} changes pending</p>
              <p className="text-xs opacity-80">
                {lastSyncedAt 
                  ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`
                  : 'Ready to sync'}
              </p>
            </div>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => syncNow()}
            className="bg-secondary-foreground/10 hover:bg-secondary-foreground/20 text-secondary-foreground"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Sync Now
          </Button>
        </div>
      )}
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

// Hook to use in transaction cards
export const useSyncStatus = (id: string) => {
  const { isOfflineId } = require('@/lib/offlineDB');
  return {
    isPending: isOfflineId(id),
    isSynced: !isOfflineId(id),
  };
};
