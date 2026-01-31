import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Fuel, Wrench, Receipt } from "lucide-react";
import { format } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

export interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
  is_active: boolean;
  last_odometer: number | null;
}

export interface VehicleCost {
  id: string;
  vehicle_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  cost_date: string;
  liters_filled: number | null;
  odometer_reading: number | null;
  vehicle?: Vehicle;
}

interface VehicleCostCardProps {
  cost: VehicleCost;
  onDelete?: (cost: VehicleCost) => void;
}

const getCostTypeIcon = (type: string) => {
  switch (type) {
    case "Fuel": return <Fuel className="h-3.5 w-3.5" />;
    case "Maintenance": return <Wrench className="h-3.5 w-3.5" />;
    case "Repairs": return <Wrench className="h-3.5 w-3.5" />;
    default: return <Receipt className="h-3.5 w-3.5" />;
  }
};

const getCostTypeColor = (type: string) => {
  switch (type) {
    case "Fuel": return "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400";
    case "Maintenance": return "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400";
    case "Repairs": return "bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400";
    default: return "bg-gray-100 text-gray-600 dark:bg-gray-900/30 dark:text-gray-400";
  }
};

export const VehicleCostCard = ({
  cost,
  onDelete
}: VehicleCostCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${getCostTypeColor(cost.cost_type)}`}>
              {getCostTypeIcon(cost.cost_type)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm truncate">{cost.vehicle?.name || 'Unknown'}</p>
                <span className="text-xs px-2 py-0.5 bg-muted rounded-full">{cost.cost_type}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {format(new Date(cost.cost_date), 'MMM dd, yyyy')}
              </p>
              {cost.description && (
                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {cost.description}
                </p>
              )}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="font-bold text-foreground tabular-nums">
              {BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}
            </p>
            {cost.cost_type === "Fuel" && cost.liters_filled && (
              <p className="text-[10px] text-muted-foreground">
                {cost.liters_filled}L
                {cost.odometer_reading ? ` @ ${cost.odometer_reading.toLocaleString()} km` : ''}
              </p>
            )}
          </div>
        </div>

        {onDelete && (
          <div className="flex justify-end mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => onDelete(cost)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
