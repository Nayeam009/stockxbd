import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { logger } from "@/lib/logger";
import type { StaffWithPayments } from "./StaffCard";

interface StaffDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffWithPayments | null;
  onSuccess: () => void;
}

export const StaffDeleteDialog = ({
  open,
  onOpenChange,
  staff,
  onSuccess
}: StaffDeleteDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    if (!staff) return;
    setIsLoading(true);

    try {
      // Soft delete - set is_active to false
      const { error } = await supabase
        .from('staff')
        .update({ is_active: false })
        .eq('id', staff.id);

      if (error) throw error;

      toast({ title: "Staff removed successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error('Error deleting staff', error, { component: 'StaffDeleteDialog' });
      toast({ 
        title: "Error removing staff", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Remove Staff Member
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to remove <strong>{staff?.name}</strong>? 
            </p>
            <p className="text-xs text-muted-foreground">
              This will deactivate the staff member. Their payment history will be preserved.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel className="h-11" disabled={isLoading}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="h-11 bg-destructive hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Removing...
              </>
            ) : (
              'Remove Staff'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
