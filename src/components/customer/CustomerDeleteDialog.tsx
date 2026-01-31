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
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertTriangle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { logger } from "@/lib/logger";
import type { Customer } from "./CustomerCard";

interface CustomerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export const CustomerDeleteDialog = ({
  open,
  onOpenChange,
  customer,
  onSuccess
}: CustomerDeleteDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const hasDues = customer && (customer.total_due > 0 || customer.cylinders_due > 0);

  const handleDelete = async () => {
    if (!customer) return;
    setIsLoading(true);

    try {
      // First delete related payments
      await supabase
        .from('customer_payments')
        .delete()
        .eq('customer_id', customer.id);

      // Then delete the customer
      const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', customer.id);

      if (error) {
        throw error;
      }

      toast({ title: "Customer deleted successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error('Error deleting customer', error, { component: 'CustomerDeleteDialog' });
      toast({ 
        title: "Error deleting customer", 
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
            Delete Customer
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{customer?.name}</strong>? 
              This action cannot be undone.
            </p>
            
            {hasDues && (
              <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/30">
                <p className="text-sm text-destructive font-medium mb-2">
                  ⚠️ Warning: This customer has outstanding dues
                </p>
                <div className="flex gap-3">
                  <Badge variant="destructive" className="text-xs">
                    {BANGLADESHI_CURRENCY_SYMBOL}{customer?.total_due.toLocaleString()} Due
                  </Badge>
                  {customer && customer.cylinders_due > 0 && (
                    <Badge variant="outline" className="text-xs border-destructive text-destructive">
                      {customer.cylinders_due} Cylinders
                    </Badge>
                  )}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              All payment history and transaction links will also be deleted.
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
                Deleting...
              </>
            ) : (
              'Delete Customer'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
