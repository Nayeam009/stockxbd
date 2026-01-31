import React, { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, ArrowRight, Plus, Loader2, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";

interface Exchange {
  id: string;
  user_id: string;
  author_name: string;
  from_brand: string;
  from_weight: string;
  to_brand: string;
  to_weight: string;
  quantity: number;
  status: string;
  created_at: string;
}

interface LPGBrand {
  id: string;
  name: string;
  size: string;
  weight: string;
}

interface ExchangeModuleProps {
  onBack?: () => void;
}

// Weight options matching inventory system
const WEIGHT_OPTIONS_22MM = ["5.5kg", "12kg", "12.5kg", "25kg", "35kg", "45kg"];
const WEIGHT_OPTIONS_20MM = ["5kg", "10kg", "12kg", "15kg", "21kg", "35kg"];
const ALL_WEIGHTS = [...new Set([...WEIGHT_OPTIONS_22MM, ...WEIGHT_OPTIONS_20MM])];

export const ExchangeModule = ({ onBack }: ExchangeModuleProps) => {
  const [exchanges, setExchanges] = useState<Exchange[]>([]);
  const [brands, setBrands] = useState<LPGBrand[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [softLoading, setSoftLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState("User");

  const [fromBrand, setFromBrand] = useState("");
  const [fromWeight, setFromWeight] = useState("");
  const [toBrand, setToBrand] = useState("");
  const [toWeight, setToWeight] = useState("");
  const [quantity, setQuantity] = useState(1);

  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const fetchExchanges = useCallback(async (isSoftRefresh = false) => {
    if (!isSoftRefresh && exchanges.length === 0) {
      setInitialLoading(true);
    } else {
      setSoftLoading(true);
    }
    setLoadError(null);

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), 10000)
      );

      const fetchPromise = supabase
        .from('cylinder_exchanges')
        .select('*')
        .order('created_at', { ascending: false });

      const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

      if (error) {
        throw error;
      }
      setExchanges(data || []);
    } catch (error: any) {
      if (exchanges.length === 0) {
        setLoadError(error.message || 'Failed to load exchanges');
      }
      toast.error("Failed to load exchanges");
    } finally {
      setInitialLoading(false);
      setSoftLoading(false);
    }
  }, [exchanges.length]);

  const fetchBrands = async () => {
    const { data } = await supabase
      .from('lpg_brands')
      .select('id, name, size, weight')
      .eq('is_active', true)
      .order('name');
    
    setBrands(data || []);
  };

  const debouncedFetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchExchanges(true), 1000);
  }, [fetchExchanges]);

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setUserName(user.email?.split('@')[0] || 'User');
      }
      await Promise.all([fetchExchanges(), fetchBrands()]);
    };
    init();

    // Subscribe to realtime updates with debouncing
    const channel = supabase
      .channel('exchanges')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'cylinder_exchanges' }, () => {
        debouncedFetch();
      })
      .subscribe();

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      supabase.removeChannel(channel);
    };
  }, [fetchExchanges, debouncedFetch]);

  const handleSubmit = async () => {
    if (!fromBrand || !fromWeight || !toBrand || !toWeight) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!currentUserId) {
      toast.error("Please log in to create an exchange");
      return;
    }

    setSubmitting(true);
    try {
      // Find the brand records to update inventory
      const fromBrandRecord = brands.find(b => b.name === fromBrand);
      const toBrandRecord = brands.find(b => b.name === toBrand);

      // Update inventory: deduct from "from" brand's empty, add to "to" brand's empty
      if (fromBrandRecord) {
        // Get current empty count
        const { data: fromData } = await supabase
          .from('lpg_brands')
          .select('empty_cylinder')
          .eq('id', fromBrandRecord.id)
          .single();
        
        if (fromData) {
          const newEmptyCount = Math.max(0, (fromData.empty_cylinder || 0) - quantity);
          await supabase
            .from('lpg_brands')
            .update({ empty_cylinder: newEmptyCount })
            .eq('id', fromBrandRecord.id);
        }
      }

      if (toBrandRecord) {
        // Get current empty count
        const { data: toData } = await supabase
          .from('lpg_brands')
          .select('empty_cylinder')
          .eq('id', toBrandRecord.id)
          .single();
        
        if (toData) {
          const newEmptyCount = (toData.empty_cylinder || 0) + quantity;
          await supabase
            .from('lpg_brands')
            .update({ empty_cylinder: newEmptyCount })
            .eq('id', toBrandRecord.id);
        }
      }

      // Record the exchange
      const { error } = await supabase.from('cylinder_exchanges').insert({
        user_id: currentUserId,
        author_name: userName,
        from_brand: fromBrand,
        from_weight: fromWeight,
        to_brand: toBrand,
        to_weight: toWeight,
        quantity: quantity
      });

      if (error) throw error;

      toast.success("Exchange completed & inventory updated!");
      setFromBrand("");
      setFromWeight("");
      setToBrand("");
      setToWeight("");
      setQuantity(1);
      await fetchExchanges(true);
    } catch (error: any) {
      toast.error(error.message || "Failed to create exchange");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('cylinder_exchanges')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success("Exchange deleted");
      setExchanges(exchanges.filter(e => e.id !== id));
    } catch (error: any) {
      toast.error("Failed to delete exchange");
    }
  };

  // Show skeleton during initial load
  if (initialLoading && exchanges.length === 0) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted rounded-lg" />
        <div className="h-48 bg-muted rounded-lg" />
      </div>
    );
  }

  // Show error state
  if (loadError && exchanges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-destructive">{loadError}</p>
        <Button onClick={() => fetchExchanges()}>Retry</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        {onBack && (
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <div>
          <h2 className="text-2xl font-bold text-foreground">Cylinder Exchange</h2>
          <p className="text-muted-foreground">Log an exchange of empty cylinders and post it to the community.</p>
        </div>
      </div>

      {/* New Exchange Form */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold italic">New Exchange</CardTitle>
          <p className="text-sm text-muted-foreground">Select the brands and weights to exchange, specify the quantity, and confirm.</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-[1fr_auto_1fr] gap-6 items-end">
            {/* From Section */}
            <div className="space-y-4">
              <Label className="text-muted-foreground font-medium">From (Empty)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={fromBrand} onValueChange={setFromBrand}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={fromWeight} onValueChange={setFromWeight}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_WEIGHTS.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center pb-2">
              <ArrowRight className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* To Section */}
            <div className="space-y-4">
              <Label className="text-muted-foreground font-medium">To (Empty)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Select value={toBrand} onValueChange={setToBrand}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                  <SelectContent>
                    {brands.map(brand => (
                      <SelectItem key={brand.id} value={brand.name}>
                        {brand.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={toWeight} onValueChange={setToWeight}>
                  <SelectTrigger className="bg-muted/50 border-border">
                    <SelectValue placeholder="Weight" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_WEIGHTS.map(w => (
                      <SelectItem key={w} value={w}>{w}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Amount */}
          <div className="flex flex-col items-center gap-3">
            <Label className="text-muted-foreground font-medium">Amount</Label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-full max-w-md text-center bg-muted/50 border-border text-lg font-medium"
              min={1}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 px-8"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Confirm Exchange & Post
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Exchange History */}
      <Card className="border-0 shadow-lg bg-card">
        <CardHeader>
          <CardTitle className="text-lg font-semibold italic">Exchange History</CardTitle>
          <p className="text-sm text-muted-foreground">A log of all past cylinder exchanges.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50 hover:bg-muted/50">
                <TableHead className="text-muted-foreground">Date</TableHead>
                <TableHead className="text-muted-foreground">From</TableHead>
                <TableHead className="text-muted-foreground">To</TableHead>
                <TableHead className="text-muted-foreground text-center">Quantity</TableHead>
                <TableHead className="text-muted-foreground">Posted By</TableHead>
                <TableHead className="text-center text-muted-foreground">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {exchanges.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No exchanges yet. Create your first exchange above.
                  </TableCell>
                </TableRow>
              ) : (
                exchanges.map(exchange => (
                  <TableRow key={exchange.id} className="border-b border-border/50">
                    <TableCell className="text-muted-foreground">
                      {format(new Date(exchange.created_at), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{exchange.from_brand}</span>
                      <span className="text-muted-foreground ml-2">({exchange.from_weight})</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium text-foreground">{exchange.to_brand}</span>
                      <span className="text-muted-foreground ml-2">({exchange.to_weight})</span>
                    </TableCell>
                    <TableCell className="text-center font-medium">{exchange.quantity}</TableCell>
                    <TableCell className="text-muted-foreground">{exchange.author_name}</TableCell>
                    <TableCell className="text-center">
                      {exchange.user_id === currentUserId && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(exchange.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
