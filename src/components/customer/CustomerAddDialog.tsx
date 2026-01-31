import { useState } from "react";
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
import { UserPlus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { sanitizeString, customerSchema } from "@/lib/validationSchemas";
import { logger } from "@/lib/logger";

interface CustomerAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CustomerAddDialog = ({
  open,
  onOpenChange,
  onSuccess
}: CustomerAddDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    total_due: "",
    cylinders_due: "",
    credit_limit: "10000"
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      address: "",
      total_due: "",
      cylinders_due: "",
      credit_limit: "10000"
    });
  };

  const handleAddCustomer = async () => {
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
      const { data: { user } } = await supabase.auth.getUser();
      const { data: ownerId } = await supabase.rpc("get_owner_id");

      const totalDue = parseFloat(formData.total_due) || 0;
      const cylindersDue = parseInt(formData.cylinders_due) || 0;
      const creditLimit = parseFloat(formData.credit_limit) || 10000;

      const { error } = await supabase
        .from('customers')
        .insert({
          name: sanitizeString(formData.name),
          email: formData.email || null,
          phone: formData.phone || null,
          address: formData.address ? sanitizeString(formData.address) : null,
          total_due: totalDue,
          cylinders_due: cylindersDue,
          credit_limit: creditLimit,
          billing_status: totalDue > 0 || cylindersDue > 0 ? 'pending' : 'clear',
          created_by: user?.id,
          owner_id: ownerId || user?.id
        });

      if (error) {
        throw error;
      }

      toast({ title: "Customer added successfully" });
      onOpenChange(false);
      resetForm();
      onSuccess();
    } catch (error: any) {
      logger.error('Error adding customer', error, { component: 'CustomerAddDialog' });
      toast({ 
        title: "Error adding customer", 
        description: error.message, 
        variant: "destructive" 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogContent className="bg-card border-border max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <DialogTitle className="text-lg">Add New Customer</DialogTitle>
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

          {/* Initial Dues Section */}
          <div className="p-3 bg-muted/30 rounded-xl space-y-3">
            <p className="text-sm font-medium text-foreground">Initial Dues (Optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Amount Due ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={formData.total_due}
                  onChange={(e) => setFormData({...formData, total_due: e.target.value})}
                  placeholder="0"
                  className="h-10"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Cylinders Due</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={formData.cylinders_due}
                  onChange={(e) => setFormData({...formData, cylinders_due: e.target.value})}
                  placeholder="0"
                  className="h-10"
                />
              </div>
            </div>
          </div>

          {/* Credit Limit */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Credit Limit ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={formData.credit_limit}
              onChange={(e) => setFormData({...formData, credit_limit: e.target.value})}
              placeholder="10000"
              className="h-11 text-base"
            />
          </div>
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
            onClick={handleAddCustomer}
            className="h-11"
            disabled={isLoading || !formData.name.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Adding...
              </>
            ) : (
              'Add Customer'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
