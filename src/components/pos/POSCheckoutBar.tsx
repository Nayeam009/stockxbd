import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { 
  User, 
  UserPlus, 
  CreditCard, 
  Clock, 
  Loader2,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Customer {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  total_due: number;
  cylinders_due: number;
}

interface POSCheckoutBarProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onCustomerSelect: (customerId: string) => void;
  onAddCustomer: (customer: { name: string; phone: string; address: string }) => Promise<void>;
  subtotal: number;
  discount: string;
  onDiscountChange: (discount: string) => void;
  total: number;
  onCompleteSale: (status: 'completed' | 'pending') => void;
  isProcessing: boolean;
  itemCount: number;
}

export const POSCheckoutBar = ({
  customers,
  selectedCustomerId,
  onCustomerSelect,
  onAddCustomer,
  subtotal,
  discount,
  onDiscountChange,
  total,
  onCompleteSale,
  isProcessing,
  itemCount,
}: POSCheckoutBarProps) => {
  const [showAddCustomer, setShowAddCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ name: "", phone: "", address: "" });
  const [addingCustomer, setAddingCustomer] = useState(false);

  const handleAddCustomer = async () => {
    if (!newCustomer.name.trim()) return;
    setAddingCustomer(true);
    try {
      await onAddCustomer(newCustomer);
      setNewCustomer({ name: "", phone: "", address: "" });
      setShowAddCustomer(false);
    } finally {
      setAddingCustomer(false);
    }
  };

  const discountNum = parseFloat(discount) || 0;

  return (
    <>
      <div className="bg-card border-t shadow-lg">
        {/* Customer & Discount Row */}
        <div className="p-3 sm:p-4 space-y-3 border-b">
          {/* Customer Selection */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Customer</Label>
              <Select
                value={selectedCustomerId || "walkin"}
                onValueChange={onCustomerSelect}
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="Select customer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="walkin">
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Walk-in Customer
                    </span>
                  </SelectItem>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {customer.name}
                        {customer.total_due > 0 && (
                          <span className="text-xs text-destructive">
                            (Due: {BANGLADESHI_CURRENCY_SYMBOL}{customer.total_due})
                          </span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="pt-5">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setShowAddCustomer(true)}
                className="h-10 w-10"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Discount */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Discount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  {BANGLADESHI_CURRENCY_SYMBOL}
                </span>
                <Input
                  type="number"
                  value={discount}
                  onChange={(e) => onDiscountChange(e.target.value)}
                  placeholder="0"
                  className="pl-8 h-10"
                />
              </div>
            </div>
            <div className="flex-1 text-right pt-5">
              <p className="text-xs text-muted-foreground">Subtotal</p>
              <p className="font-semibold">
                {BANGLADESHI_CURRENCY_SYMBOL}{subtotal.toLocaleString()}
              </p>
            </div>
          </div>
        </div>

        {/* Total & Actions */}
        <div className="p-3 sm:p-4 space-y-3">
          {/* Total */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Amount</p>
              {discountNum > 0 && (
                <p className="text-xs text-green-600">
                  -{BANGLADESHI_CURRENCY_SYMBOL}{discountNum.toLocaleString()} discount
                </p>
              )}
            </div>
            <p className="text-2xl sm:text-3xl font-bold text-primary">
              {BANGLADESHI_CURRENCY_SYMBOL}{total.toLocaleString()}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onCompleteSale('pending')}
              disabled={isProcessing || itemCount === 0}
              className="flex-1 h-12 sm:h-14"
            >
              {isProcessing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Save as Due</span>
                </>
              )}
            </Button>
            <Button
              onClick={() => onCompleteSale('completed')}
              disabled={isProcessing || itemCount === 0}
              className={cn(
                "flex-[2] h-12 sm:h-14 text-base font-semibold",
                "bg-primary hover:bg-primary/90"
              )}
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <>
                  <Check className="h-5 w-5 mr-2" />
                  <span>Complete Sale</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Add Customer Dialog */}
      <Dialog open={showAddCustomer} onOpenChange={setShowAddCustomer}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Customer
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Name *</Label>
              <Input
                value={newCustomer.name}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Customer name"
              />
            </div>
            <div>
              <Label>Phone</Label>
              <Input
                value={newCustomer.phone}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Phone number"
              />
            </div>
            <div>
              <Label>Address</Label>
              <Input
                value={newCustomer.address}
                onChange={(e) => setNewCustomer(prev => ({ ...prev, address: e.target.value }))}
                placeholder="Address"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddCustomer(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddCustomer} disabled={!newCustomer.name.trim() || addingCustomer}>
              {addingCustomer ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Add Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
