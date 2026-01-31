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
import { logger } from "@/lib/logger";
import type { StaffWithPayments } from "./StaffCard";

interface StaffEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staff: StaffWithPayments | null;
  onSuccess: () => void;
}

export const StaffEditDialog = ({
  open,
  onOpenChange,
  staff,
  onSuccess
}: StaffEditDialogProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    role: "",
    salary: 0,
    phone: ""
  });

  useEffect(() => {
    if (staff && open) {
      setFormData({
        name: staff.name || "",
        role: staff.role || "",
        salary: staff.salary || 0,
        phone: staff.phone || ""
      });
    }
  }, [staff, open]);

  const handleUpdate = async () => {
    if (!staff) return;
    
    if (!formData.name || !formData.salary) {
      toast({ title: "Name and salary are required", variant: "destructive" });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('staff')
        .update({
          name: formData.name,
          role: formData.role,
          salary: formData.salary,
          phone: formData.phone || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', staff.id);

      if (error) throw error;

      toast({ title: "Staff updated successfully" });
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      logger.error('Error updating staff', error, { component: 'StaffEditDialog' });
      toast({ 
        title: "Error updating staff", 
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
            <DialogTitle className="text-lg">Edit Staff Member</DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Name</Label>
            <Input
              className="h-11 text-base"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              placeholder="e.g., Md. Razu"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Role</Label>
            <Input
              className="h-11 text-base"
              value={formData.role}
              onChange={e => setFormData({...formData, role: e.target.value})}
              placeholder="e.g., Manager, Driver"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Monthly Salary ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
            <Input
              className="h-11 text-base"
              type="number"
              inputMode="numeric"
              value={formData.salary || ""}
              onChange={e => setFormData({...formData, salary: Number(e.target.value)})}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">Phone (Optional)</Label>
            <Input
              className="h-11 text-base"
              value={formData.phone}
              onChange={e => setFormData({...formData, phone: e.target.value})}
              placeholder="e.g., 01XXXXXXXXX"
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
            onClick={handleUpdate}
            className="h-11"
            disabled={isLoading || !formData.name || !formData.salary}
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
