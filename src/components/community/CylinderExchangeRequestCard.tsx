import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  RefreshCcw, 
  Send, 
  Loader2,
  Package
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface CylinderExchangeRequestCardProps {
  targetShopId: string;
  requesterShopId: string;
  requesterId: string;
  targetShopName: string;
}

interface LPGBrand {
  id: string;
  name: string;
  weight: string;
  empty_cylinder: number;
}

export const CylinderExchangeRequestCard = ({ 
  targetShopId, 
  requesterShopId,
  requesterId,
  targetShopName 
}: CylinderExchangeRequestCardProps) => {
  const [brands, setBrands] = useState<LPGBrand[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  
  // Form state
  const [selectedBrand, setSelectedBrand] = useState("");
  const [selectedWeight, setSelectedWeight] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetchBrands();
  }, []);

  const fetchBrands = async () => {
    try {
      // Fetch brands with empty cylinders from requester's inventory
      const { data, error } = await supabase
        .from('lpg_brands')
        .select('id, name, weight, empty_cylinder')
        .gt('empty_cylinder', 0)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedBrand || !selectedWeight || quantity < 1) {
      toast({ 
        title: "Please fill all fields", 
        variant: "destructive" 
      });
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('cylinder_exchange_requests')
        .insert({
          requester_shop_id: requesterShopId,
          requester_id: requesterId,
          target_shop_id: targetShopId,
          brand_name: selectedBrand,
          weight: selectedWeight,
          quantity: quantity,
          notes: notes || null,
          status: 'pending'
        });

      if (error) throw error;

      toast({ 
        title: "Request sent!", 
        description: `Exchange request sent to ${targetShopName}` 
      });

      // Reset form
      setSelectedBrand("");
      setSelectedWeight("");
      setQuantity(1);
      setNotes("");
    } catch (error: any) {
      console.error('Error sending request:', error);
      toast({ 
        title: "Failed to send request", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setSending(false);
    }
  };

  // Get unique weights for selected brand
  const availableWeights = [...new Set(
    brands
      .filter(b => b.name === selectedBrand)
      .map(b => b.weight)
  )];

  // Get max quantity for selected brand/weight
  const selectedBrandData = brands.find(
    b => b.name === selectedBrand && b.weight === selectedWeight
  );
  const maxQuantity = selectedBrandData?.empty_cylinder || 0;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (brands.length === 0) {
    return (
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-6 text-center">
          <Package className="h-10 w-10 mx-auto text-amber-500 mb-3" />
          <p className="font-medium">No Empty Cylinders</p>
          <p className="text-sm text-muted-foreground">
            You don't have any empty cylinders to exchange
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-primary/30">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <RefreshCcw className="h-5 w-5 text-primary" />
          Request Empty Cylinder Exchange
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Request empty cylinders from {targetShopName} for refill exchange
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Brand Selection */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Brand</Label>
            <Select 
              value={selectedBrand} 
              onValueChange={(v) => { 
                setSelectedBrand(v); 
                setSelectedWeight(""); 
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select brand" />
              </SelectTrigger>
              <SelectContent>
                {[...new Set(brands.map(b => b.name))].map(name => (
                  <SelectItem key={name} value={name}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label>Weight</Label>
            <Select 
              value={selectedWeight} 
              onValueChange={setSelectedWeight}
              disabled={!selectedBrand}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {availableWeights.map(weight => (
                  <SelectItem key={weight} value={weight}>{weight}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quantity */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Quantity</Label>
            {selectedBrandData && (
              <Badge variant="secondary" className="text-xs">
                Max: {maxQuantity} available
              </Badge>
            )}
          </div>
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Math.min(maxQuantity, Math.max(1, parseInt(e.target.value) || 1)))}
            min={1}
            max={maxQuantity}
            className="h-11"
          />
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label>Notes (optional)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Any special instructions..."
            rows={2}
          />
        </div>

        {/* Submit */}
        <Button 
          onClick={handleSubmit} 
          disabled={sending || !selectedBrand || !selectedWeight}
          className="w-full h-12"
        >
          {sending ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Send Exchange Request
        </Button>
      </CardContent>
    </Card>
  );
};
