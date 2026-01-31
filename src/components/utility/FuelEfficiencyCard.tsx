import { Card, CardContent } from "@/components/ui/card";
import { Fuel, TrendingUp } from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import type { VehicleCost } from "./VehicleCostCard";

interface FuelEfficiencyCardProps {
  costs: VehicleCost[];
  vehicleName?: string;
}

export const FuelEfficiencyCard = ({
  costs,
  vehicleName
}: FuelEfficiencyCardProps) => {
  // Calculate fuel efficiency (km/L)
  const calculateEfficiency = (): { efficiency: number; totalKm: number; totalLiters: number; avgCostPerKm: number } => {
    const fuelCosts = costs.filter(c => 
      c.cost_type === 'Fuel' && 
      c.liters_filled && 
      c.liters_filled > 0 &&
      c.odometer_reading && 
      c.odometer_reading > 0
    );
    
    if (fuelCosts.length < 2) {
      return { efficiency: 0, totalKm: 0, totalLiters: 0, avgCostPerKm: 0 };
    }

    // Sort by odometer to get distance traveled
    const sorted = [...fuelCosts].sort((a, b) => 
      (a.odometer_reading || 0) - (b.odometer_reading || 0)
    );
    
    const firstReading = sorted[0].odometer_reading || 0;
    const lastReading = sorted[sorted.length - 1].odometer_reading || 0;
    const totalKm = lastReading - firstReading;
    
    // Sum liters (excluding first fill as we don't know the tank state)
    const totalLiters = sorted.slice(1).reduce((sum, c) => sum + (c.liters_filled || 0), 0);
    const totalCost = sorted.slice(1).reduce((sum, c) => sum + Number(c.amount), 0);
    
    const efficiency = totalLiters > 0 ? totalKm / totalLiters : 0;
    const avgCostPerKm = totalKm > 0 ? totalCost / totalKm : 0;

    return { 
      efficiency: Math.round(efficiency * 10) / 10, 
      totalKm, 
      totalLiters: Math.round(totalLiters * 10) / 10,
      avgCostPerKm: Math.round(avgCostPerKm * 100) / 100
    };
  };

  const stats = calculateEfficiency();

  if (stats.efficiency === 0) {
    return null; // Don't show card if not enough data
  }

  return (
    <Card className="relative overflow-hidden border-0 shadow-md bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-950/30 dark:to-cyan-950/30">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-400 to-cyan-500" />
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-xl bg-teal-100 dark:bg-teal-900/50 flex items-center justify-center">
            <Fuel className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <p className="text-sm font-semibold text-foreground">Fuel Efficiency</p>
              {vehicleName && (
                <span className="text-xs px-2 py-0.5 bg-teal-500/20 text-teal-700 dark:text-teal-300 rounded-full">
                  {vehicleName}
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 bg-white/50 dark:bg-white/5 rounded-lg">
                <p className="text-lg font-bold text-teal-600 dark:text-teal-400 tabular-nums">
                  {stats.efficiency}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">km/L</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-white/5 rounded-lg">
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {stats.totalKm.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">Total km</p>
              </div>
              <div className="text-center p-2 bg-white/50 dark:bg-white/5 rounded-lg">
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {BANGLADESHI_CURRENCY_SYMBOL}{stats.avgCostPerKm}
                </p>
                <p className="text-[10px] text-muted-foreground uppercase">per km</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
