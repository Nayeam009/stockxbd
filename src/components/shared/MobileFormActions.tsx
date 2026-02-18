import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MobileFormActionsProps {
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  cancelLabel?: string;
  confirmVariant?: 'default' | 'destructive';
  disabled?: boolean;
  loading?: boolean;
  confirmClassName?: string;
}

/**
 * MobileFormActions — sticky footer for dialogs & drawers.
 *
 * On mobile: pins itself to the bottom of the scroll container so the buttons
 * remain visible even when the on-screen keyboard is open.
 * On desktop (sm+): renders as a plain inline footer row.
 */
export const MobileFormActions = ({
  onConfirm,
  onCancel,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmVariant = 'default',
  disabled = false,
  loading = false,
  confirmClassName = '',
}: MobileFormActionsProps) => {
  return (
    <div className="sticky bottom-0 left-0 right-0 bg-card/95 backdrop-blur-sm pt-3 pb-1 border-t border-border/40 flex gap-3 sm:static sm:border-0 sm:bg-transparent sm:backdrop-blur-none sm:pt-0 sm:pb-0 -mx-1 px-1">
      <Button
        variant="outline"
        className="flex-1 h-12 sm:h-11"
        onClick={onCancel}
        type="button"
      >
        {cancelLabel}
      </Button>
      <Button
        variant={confirmVariant}
        className={`flex-1 h-12 sm:h-11 ${confirmClassName}`}
        onClick={onConfirm}
        disabled={disabled || loading}
        type="button"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          confirmLabel
        )}
      </Button>
    </div>
  );
};
