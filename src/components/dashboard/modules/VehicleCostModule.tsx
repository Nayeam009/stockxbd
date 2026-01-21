import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Truck, Banknote, Gauge, AlertTriangle, Fuel } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";

interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
  is_active: boolean;
  last_odometer: number | null;
}

interface VehicleCost {
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

const COST_TYPES = ["Fuel", "Maintenance", "Repairs", "Insurance", "Registration", "Other"];

// Fuel theft threshold - if km/liter < this, flag as suspicious
const FUEL_EFFICIENCY_THRESHOLD = 3;

export const VehicleCostModule = () => {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [costs, setCosts] = useState<VehicleCost[]>([]);
  const [loading, setLoading] = useState(true);
  const [costDialogOpen, setCostDialogOpen] = useState(false);
  const [vehicleDialogOpen, setVehicleDialogOpen] = useState(false);

  const [newCost, setNewCost] = useState({
    vehicle_id: "",
    cost_type: "Fuel",
    description: "",
    amount: 0,
    cost_date: format(new Date(), "yyyy-MM-dd"),
    liters_filled: 0,
    odometer_reading: 0,
  });

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    license_plate: "",
  });

  useEffect(() => {
    fetchData();
  }, []);

  // Real-time vehicle sync
  useEffect(() => {
    const channels = [
      supabase.channel('vehicles-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicles' }, 
        () => fetchData()
      ).subscribe(),
      supabase.channel('vehicle-costs-realtime').on('postgres_changes', 
        { event: '*', schema: 'public', table: 'vehicle_costs' }, 
        () => fetchData()
      ).subscribe(),
    ];
    
    return () => channels.forEach(ch => supabase.removeChannel(ch));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [vehiclesRes, costsRes] = await Promise.all([
      supabase.from("vehicles").select("*").eq("is_active", true).order("name"),
      supabase.from("vehicle_costs").select("*, vehicle:vehicles(*)").order("cost_date", { ascending: false }),
    ]);

    if (vehiclesRes.data) setVehicles(vehiclesRes.data);
    if (costsRes.data) setCosts(costsRes.data as VehicleCost[]);
    setLoading(false);
  };

  const handleAddCost = async () => {
    if (!newCost.vehicle_id || !newCost.amount) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const vehicle = vehicles.find(v => v.id === newCost.vehicle_id);
    
    // Prepare cost data
    const costData: any = {
      vehicle_id: newCost.vehicle_id,
      cost_type: newCost.cost_type,
      description: newCost.description || null,
      amount: newCost.amount,
      cost_date: newCost.cost_date,
      created_by: user.user.id,
    };

    // Add fuel-specific fields
    if (newCost.cost_type === "Fuel") {
      costData.liters_filled = newCost.liters_filled || null;
      costData.odometer_reading = newCost.odometer_reading || null;
    }

    const { error } = await supabase.from("vehicle_costs").insert(costData);

    if (error) {
      toast({ title: "Error adding cost", description: error.message, variant: "destructive" });
    } else {
      // Update vehicle's last odometer if fuel entry
      if (newCost.cost_type === "Fuel" && newCost.odometer_reading > 0 && vehicle) {
        await supabase
          .from("vehicles")
          .update({ last_odometer: newCost.odometer_reading })
          .eq("id", newCost.vehicle_id);
      }

      // Auto-sync to daily expenses
      await supabase.from("daily_expenses").insert({
        expense_date: newCost.cost_date,
        category: "Transport",
        description: `${newCost.cost_type} - ${vehicle?.name || 'Vehicle'}${newCost.description ? ': ' + newCost.description : ''}`,
        amount: newCost.amount,
        created_by: user.user.id,
      });

      toast({ title: "Cost added successfully" });
      setCostDialogOpen(false);
      setNewCost({
        vehicle_id: "",
        cost_type: "Fuel",
        description: "",
        amount: 0,
        cost_date: format(new Date(), "yyyy-MM-dd"),
        liters_filled: 0,
        odometer_reading: 0,
      });
      fetchData();
    }
  };

  const handleAddVehicle = async () => {
    if (!newVehicle.name) {
      toast({ title: "Vehicle name is required", variant: "destructive" });
      return;
    }

    const { data: user } = await supabase.auth.getUser();
    if (!user.user) return;

    const { error } = await supabase.from("vehicles").insert({
      ...newVehicle,
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error adding vehicle", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Vehicle added successfully" });
      setVehicleDialogOpen(false);
      setNewVehicle({ name: "", license_plate: "" });
      fetchData();
    }
  };

  const handleDeleteCost = async (id: string) => {
    const { error } = await supabase.from("vehicle_costs").delete().eq("id", id);
    if (error) {
      toast({ title: "Error deleting cost", variant: "destructive" });
    } else {
      toast({ title: "Cost deleted" });
      fetchData();
    }
  };

  const getThisMonthTotal = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return costs
      .filter(c => {
        const date = new Date(c.cost_date);
        return date >= start && date <= end;
      })
      .reduce((sum, c) => sum + Number(c.amount), 0);
  };

  const getThisMonthFuelTotal = () => {
    const start = startOfMonth(new Date());
    const end = endOfMonth(new Date());
    return costs
      .filter(c => {
        const date = new Date(c.cost_date);
        return date >= start && date <= end && c.cost_type === "Fuel";
      })
      .reduce((sum, c) => sum + Number(c.amount), 0);
  };

  const calculateMileage = (cost: VehicleCost): { kmPerLiter: number; isSuspicious: boolean } | null => {
    if (cost.cost_type !== "Fuel" || !cost.liters_filled || !cost.odometer_reading) {
      return null;
    }

    const vehicle = vehicles.find(v => v.id === cost.vehicle_id);
    const previousOdometer = vehicle?.last_odometer || 0;
    
    // Find previous fuel entry for this vehicle
    const vehicleFuelCosts = costs
      .filter(c => c.vehicle_id === cost.vehicle_id && c.cost_type === "Fuel" && c.odometer_reading)
      .sort((a, b) => new Date(b.cost_date).getTime() - new Date(a.cost_date).getTime());
    
    const costIndex = vehicleFuelCosts.findIndex(c => c.id === cost.id);
    const previousFuelEntry = vehicleFuelCosts[costIndex + 1];
    
    const prevOdo = previousFuelEntry?.odometer_reading || previousOdometer;
    
    if (prevOdo && cost.odometer_reading > prevOdo) {
      const kmTraveled = cost.odometer_reading - prevOdo;
      const kmPerLiter = kmTraveled / cost.liters_filled;
      return {
        kmPerLiter: Math.round(kmPerLiter * 10) / 10,
        isSuspicious: kmPerLiter < FUEL_EFFICIENCY_THRESHOLD
      };
    }
    
    return null;
  };

  const getCostTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Fuel": return "default";
      case "Maintenance": return "secondary";
      case "Repairs": return "destructive";
      default: return "outline";
    }
  };

  const getSelectedVehicleOdometer = () => {
    const vehicle = vehicles.find(v => v.id === newCost.vehicle_id);
    return vehicle?.last_odometer || 0;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-foreground">Vehicle Costs</h2>
          <p className="text-xs sm:text-sm text-muted-foreground">Log and monitor all your vehicle and fleet costs.</p>
        </div>
        <div className="flex gap-2 sm:gap-3">
          <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-9">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Add Vehicle</span>
                <span className="sm:hidden">Vehicle</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Vehicle Name</Label>
                  <Input 
                    value={newVehicle.name}
                    onChange={e => setNewVehicle({...newVehicle, name: e.target.value})}
                    placeholder="e.g., Truck 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>License Plate (Optional)</Label>
                  <Input 
                    value={newVehicle.license_plate}
                    onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})}
                    placeholder="e.g., DHA-1234"
                  />
                </div>
                <Button onClick={handleAddVehicle} className="w-full">Add Vehicle</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2 h-9">
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Add Cost</span>
                <span className="sm:hidden">Cost</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add Vehicle Cost</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Vehicle</Label>
                  <Select 
                    value={newCost.vehicle_id} 
                    onValueChange={v => setNewCost({...newCost, vehicle_id: v})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Cost Type</Label>
                  <Select 
                    value={newCost.cost_type} 
                    onValueChange={v => setNewCost({...newCost, cost_type: v})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Fuel-specific fields */}
                {newCost.cost_type === "Fuel" && (
                  <>
                    <div className="p-3 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Fuel className="h-4 w-4 text-primary" />
                        Fuel Details
                      </div>
                      {getSelectedVehicleOdometer() > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Last odometer: {getSelectedVehicleOdometer().toLocaleString()} km
                        </p>
                      )}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-xs">Liters Filled</Label>
                          <Input 
                            type="number"
                            inputMode="decimal"
                            value={newCost.liters_filled || ""}
                            onChange={e => setNewCost({...newCost, liters_filled: Number(e.target.value)})}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Odometer (km)</Label>
                          <Input 
                            type="number"
                            inputMode="numeric"
                            value={newCost.odometer_reading || ""}
                            onChange={e => setNewCost({...newCost, odometer_reading: Number(e.target.value)})}
                            placeholder="0"
                            className="h-9"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={newCost.description}
                    onChange={e => setNewCost({...newCost, description: e.target.value})}
                    placeholder="e.g., Diesel top-up"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="space-y-2">
                    <Label>Amount ({BANGLADESHI_CURRENCY_SYMBOL})</Label>
                    <Input 
                      type="number"
                      inputMode="numeric"
                      value={newCost.amount || ""}
                      onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Date</Label>
                    <Input 
                      type="date"
                      value={newCost.cost_date}
                      onChange={e => setNewCost({...newCost, cost_date: e.target.value})}
                    />
                  </div>
                </div>
                <Button onClick={handleAddCost} className="w-full">Add Cost</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Truck className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{vehicles.length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Total Vehicles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <Banknote className="h-4 w-4 sm:h-5 sm:w-5 text-destructive" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{getThisMonthTotal().toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">This Month</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Fuel className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-lg sm:text-2xl lg:text-3xl font-bold">{BANGLADESHI_CURRENCY_SYMBOL}{getThisMonthFuelTotal().toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Fuel Cost</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="h-9 w-9 sm:h-11 sm:w-11 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
                <Gauge className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl lg:text-3xl font-bold">{costs.filter(c => c.cost_type === "Fuel").length}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground truncate">Fuel Entries</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost History */}
      <Card className="border-border">
        <CardHeader className="p-3 sm:p-4 pb-2">
          <CardTitle className="text-base sm:text-lg">Cost History</CardTitle>
          <CardDescription className="text-xs sm:text-sm">A log of all vehicle-related expenses.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-4 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs whitespace-nowrap">Date</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Vehicle</TableHead>
                  <TableHead className="text-xs whitespace-nowrap">Type</TableHead>
                  <TableHead className="text-xs whitespace-nowrap hidden sm:table-cell">Description</TableHead>
                  <TableHead className="text-xs whitespace-nowrap hidden md:table-cell">Efficiency</TableHead>
                  <TableHead className="text-xs text-right whitespace-nowrap">Amount</TableHead>
                  <TableHead className="text-xs text-center whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {costs.map(cost => {
                  const vehicle = vehicles.find(v => v.id === cost.vehicle_id);
                  const mileage = calculateMileage(cost);
                  
                  return (
                    <TableRow key={cost.id}>
                      <TableCell className="whitespace-nowrap text-xs sm:text-sm py-2 sm:py-3">
                        {format(new Date(cost.cost_date), "MMM d")}
                      </TableCell>
                      <TableCell className="font-medium text-xs sm:text-sm py-2 sm:py-3">{vehicle?.name || "Unknown"}</TableCell>
                      <TableCell className="py-2 sm:py-3">
                        <Badge variant={getCostTypeBadgeVariant(cost.cost_type)} className="text-[10px] sm:text-xs">
                          {cost.cost_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-xs hidden sm:table-cell py-2 sm:py-3">{cost.description || "-"}</TableCell>
                      <TableCell className="hidden md:table-cell py-2 sm:py-3">
                        {mileage ? (
                          <div className="flex items-center gap-1">
                            {mileage.isSuspicious && (
                              <AlertTriangle className="h-3 w-3 text-destructive" />
                            )}
                            <span className={`text-xs font-medium ${mileage.isSuspicious ? 'text-destructive' : 'text-success'}`}>
                              {mileage.kmPerLiter} km/L
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-xs sm:text-sm py-2 sm:py-3">
                        {BANGLADESHI_CURRENCY_SYMBOL}{Number(cost.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-center py-2 sm:py-3">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => handleDeleteCost(cost.id)}
                          className="text-destructive hover:text-destructive h-8 w-8"
                        >
                          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
          {costs.length === 0 && (
            <div className="text-center py-8 sm:py-12 text-muted-foreground text-sm">
              No costs recorded yet. Add your first vehicle cost to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};