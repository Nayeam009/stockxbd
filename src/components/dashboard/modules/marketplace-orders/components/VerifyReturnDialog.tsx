/**
 * Verify Return Dialog Component
 * Modal for verifying returned cylinders before marking delivered
 */

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Cylinder, ShieldCheck } from "lucide-react";
import type { CommunityOrder } from "../types";

interface VerifyReturnDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: CommunityOrder | null;
  returnType: 'empty' | 'leaked';
  onReturnTypeChange: (type: 'empty' | 'leaked') => void;
  onConfirm: () => void;
}

export function VerifyReturnDialog({
  open,
  onOpenChange,
  order,
  returnType,
  onReturnTypeChange,
  onConfirm
}: VerifyReturnDialogProps) {
  if (!order) return null;

  const hasReturnItems = order.items?.some(i => i.return_cylinder_qty > 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            Verify Return & Complete Delivery
          </DialogTitle>
          <DialogDescription>
            Confirm the driver has returned with payment and empty cylinders.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Order Summary */}
          <div className="bg-muted/50 rounded-lg p-3">
            <p className="text-sm font-medium">Order #{order.order_number}</p>
            <p className="text-sm text-muted-foreground">{order.customer_name}</p>
          </div>

          {/* Return Items */}
          {hasReturnItems && (
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-2">
                <Cylinder className="h-4 w-4" />
                Returned Cylinders
              </p>
              
              {order.items?.filter(i => i.return_cylinder_qty > 0).map((item) => (
                <div key={item.id} className="bg-primary/5 rounded-lg p-3">
                  <p className="text-sm font-medium">
                    {item.brand_name} {item.weight} × {item.return_cylinder_qty}
                  </p>
                </div>
              ))}

              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Cylinder condition:</p>
                <div className="flex gap-2">
                  <Button
                    variant={returnType === 'empty' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onReturnTypeChange('empty')}
                  >
                    Empty (Good)
                  </Button>
                  <Button
                    variant={returnType === 'leaked' ? 'destructive' : 'outline'}
                    size="sm"
                    onClick={() => onReturnTypeChange('leaked')}
                  >
                    Leaked/Problem
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Warning */}
          <div className="flex items-start gap-2 text-sm text-muted-foreground bg-warning/10 rounded-lg p-3">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
            <div>
              <p className="font-medium text-warning">This action is final</p>
              <p>Inventory will be updated and payment marked as complete.</p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={onConfirm} className="bg-success hover:bg-success/90">
            <ShieldCheck className="h-4 w-4 mr-2" />
            Verify & Mark Delivered
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
