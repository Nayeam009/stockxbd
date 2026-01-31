import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";
import type { Customer } from "./CustomerCard";

interface CustomerEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
  onSuccess: () => void;
}

export const CustomerEditDialog = ({
  open,
  onOpenChange,
  customer,
  onSuccess
}: CustomerEditDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: ""
  });

  useEffect(() => {
    if (customer && open) {
      setFormData({
        name: customer.name || "",
        email: customer.email || "",
        phone: customer.phone || "",
        address: customer.address || ""
      });
    }
  }, [customer, open]);

  const handleUpdateCustomer = async () => {
    if (!customer) return;

    // Validate customer input using Zod schema
    const result = customerSchema.safeParse({
      name: formData.name,
      phone: formData.phone || null,
      address: formData.address || null,
    });

    if (!result.success) {
      toast({
        title: "Invalid input",
        description: result.error.errors[0]?.message || "Please check your input",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('customers')
        .update({
          name: sanitizeString(formData.name),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address ? sanitizeString(formData.address) : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', customer.id);

      if (error) {
        throw error;
      }

      toast({ title: "Customer updated successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error('Error updating customer', error, { component: 'CustomerEditDialog' });
      toast({ 
        title: "Error updating customer", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
              <Edit className="h-5 w-5 text-blue-500" />
            </div>
            <DialogTitle className="text-lg">Edit Customer</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name - Required */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Rahim Mia"
              className="h-11 text-base"
            />
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone Number</Label>
            <Input
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              placeholder="e.g., 01XXXXXXXXX"
              className="h-11 text-base"
              type="tel"
            />
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Email (Optional)</Label>
            <Input
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="e.g., customer@email.com"
              className="h-11 text-base"
              type="email"
            />
          </div>

          {/* Address */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Address</Label>
            <Input
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              placeholder="e.g., House 12, Road 5, Dhanmondi"
              className="h-11 text-base"
            />
          </div>

          {/* Current Dues (Read-only) */}
          {customer && (customer.total_due > 0 || customer.cylinders_due > 0) && (
            <div className="p-3 bg-muted/30 rounded-xl">
              <p className="text-xs text-muted-foreground mb-2">Current Dues (use Settle to modify)</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center">
                  <p className="text-sm font-bold text-rose-600 tabular-nums">
                    {BANGLADESHI_CURRENCY_SYMBOL}{customer.total_due.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Amount Due</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-purple-600 tabular-nums">
                    {customer.cylinders_due} pcs
                  </p>
                  <p className="text-[10px] text-muted-foreground">Cylinders Due</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-11"
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleUpdateCustomer}
            className="h-11"
            disabled={isLoading || !formData.name.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Changes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
