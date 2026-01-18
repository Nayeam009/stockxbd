import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Truck, Banknote } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format, startOfMonth, endOfMonth } from "date-fns";

interface Vehicle {
  id: string;
  name: string;
  license_plate: string | null;
  is_active: boolean;
}

interface VehicleCost {
  id: string;
  vehicle_id: string;
  cost_type: string;
  description: string | null;
  amount: number;
  cost_date: string;
  vehicle?: Vehicle;
}

const COST_TYPES = ["Fuel", "Maintenance", "Repairs", "Insurance", "Registration", "Other"];

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
  });

  const [newVehicle, setNewVehicle] = useState({
    name: "",
    license_plate: "",
  });

  useEffect(() => {
    fetchData();
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

    const { error } = await supabase.from("vehicle_costs").insert({
      ...newCost,
      created_by: user.user.id,
    });

    if (error) {
      toast({ title: "Error adding cost", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Cost added successfully" });
      setCostDialogOpen(false);
      setNewCost({
        vehicle_id: "",
        cost_type: "Fuel",
        description: "",
        amount: 0,
        cost_date: format(new Date(), "yyyy-MM-dd"),
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

  const getCostTypeBadgeVariant = (type: string) => {
    switch (type) {
      case "Fuel": return "default";
      case "Maintenance": return "secondary";
      case "Repairs": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-foreground">Vehicle Costs</h2>
          <p className="text-muted-foreground">Log and monitor all your vehicle and fleet costs.</p>
        </div>
        <div className="flex gap-3">
          <Dialog open={vehicleDialogOpen} onOpenChange={setVehicleDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Truck className="h-4 w-4" />
                Add Vehicle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg">Add New Vehicle</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vehicle Name</Label>
                  <Input 
                    value={newVehicle.name}
                    onChange={e => setNewVehicle({...newVehicle, name: e.target.value})}
                    placeholder="e.g., Truck 1"
                    className="h-11 text-base"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">License Plate (Optional)</Label>
                  <Input 
                    value={newVehicle.license_plate}
                    onChange={e => setNewVehicle({...newVehicle, license_plate: e.target.value})}
                    placeholder="e.g., DHA-1234"
                    className="h-11 text-base"
                  />
                </div>
                <Button onClick={handleAddVehicle} className="w-full h-11 text-base">Add Vehicle</Button>
              </div>
            </DialogContent>
          </Dialog>
          <Dialog open={costDialogOpen} onOpenChange={setCostDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Cost
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-md p-4 sm:p-6">
              <DialogHeader>
                <DialogTitle className="text-lg">Add Vehicle Cost</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Vehicle</Label>
                  <Select 
                    value={newCost.vehicle_id} 
                    onValueChange={v => setNewCost({...newCost, vehicle_id: v})}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue placeholder="Select vehicle" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.map(v => (
                        <SelectItem key={v.id} value={v.id} className="py-3">{v.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Cost Type</Label>
                  <Select 
                    value={newCost.cost_type} 
                    onValueChange={v => setNewCost({...newCost, cost_type: v})}
                  >
                    <SelectTrigger className="h-11 text-base">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map(type => (
                        <SelectItem key={type} value={type} className="py-3">{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description</Label>
                  <Input 
                    value={newCost.description}
                    onChange={e => setNewCost({...newCost, description: e.target.value})}
                    placeholder="e.g., Diesel top-up"
                    className="h-11 text-base"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Amount (৳)</Label>
                    <Input 
                      type="number"
                      value={newCost.amount}
                      onChange={e => setNewCost({...newCost, amount: Number(e.target.value)})}
                      className="h-11 text-base"
                      inputMode="numeric"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Date</Label>
                    <Input 
                      type="date"
                      value={newCost.cost_date}
                      onChange={e => setNewCost({...newCost, cost_date: e.target.value})}
                      className="h-11 text-base"
                    />
                  </div>
                </div>
                <Button onClick={handleAddCost} className="w-full h-11 text-base">Add Cost</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vehicles</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{vehicles.length}</div>
            <p className="text-xs text-muted-foreground">Total vehicles in your fleet.</p>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost (This Month)</CardTitle>
            <Banknote className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">৳{getThisMonthTotal().toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Sum of all vehicle expenses this month.</p>
          </CardContent>
        </Card>
      </div>

      {/* Cost History */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Cost History</CardTitle>
          <CardDescription>A log of all vehicle-related expenses.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Cost Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-center">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {costs.map(cost => {
                const vehicle = vehicles.find(v => v.id === cost.vehicle_id);
                return (
                  <TableRow key={cost.id}>
                    <TableCell className="whitespace-nowrap">
                      {format(new Date(cost.cost_date), "MMM d, yyyy")}
                    </TableCell>
                    <TableCell className="font-medium">{vehicle?.name || "Unknown"}</TableCell>
                    <TableCell>
                      <Badge variant={getCostTypeBadgeVariant(cost.cost_type)}>
                        {cost.cost_type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{cost.description || "-"}</TableCell>
                    <TableCell className="text-right font-medium">
                      ৳{Number(cost.amount).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button 
                        variant="ghost" 
                        size="icon"
                        onClick={() => handleDeleteCost(cost.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {costs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              No costs recorded yet. Add your first vehicle cost to get started.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};