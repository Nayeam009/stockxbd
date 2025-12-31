import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, Camera, X, Keyboard, Package, AlertCircle, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface ScannedProduct {
  id: string;
  type: 'lpg' | 'stove' | 'regulator';
  name: string;
  details: string;
  price: number;
  stock: number;
  sku?: string;
}

interface BarcodeScannerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductFound: (product: ScannedProduct) => void;
}

export const BarcodeScanner = ({ open, onOpenChange, onProductFound }: BarcodeScannerProps) => {
  const [scanMode, setScanMode] = useState<'keyboard' | 'camera'>('keyboard');
  const [manualCode, setManualCode] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [lastScanned, setLastScanned] = useState<ScannedProduct | null>(null);
  const [scanBuffer, setScanBuffer] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Focus input when dialog opens
  useEffect(() => {
    if (open && scanMode === 'keyboard' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, scanMode]);

  // Handle barcode scanner input (fast sequential keypresses)
  useEffect(() => {
    if (!open || scanMode !== 'keyboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if dialog is open and no input is focused (except our scanner input)
      if (document.activeElement !== inputRef.current) return;

      // Clear previous timeout
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }

      // If Enter is pressed, process the buffer
      if (e.key === 'Enter' && scanBuffer.length > 0) {
        handleSearch(scanBuffer);
        setScanBuffer("");
        return;
      }

      // Only capture alphanumeric keys
      if (e.key.length === 1 && /[a-zA-Z0-9-_]/.test(e.key)) {
        setScanBuffer(prev => prev + e.key);
        setManualCode(prev => prev + e.key);
      }

      // Set timeout to process buffer (for scanner that doesn't send Enter)
      scanTimeoutRef.current = setTimeout(() => {
        if (scanBuffer.length >= 6) {
          handleSearch(scanBuffer);
        }
        setScanBuffer("");
      }, 300);
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (scanTimeoutRef.current) {
        clearTimeout(scanTimeoutRef.current);
      }
    };
  }, [open, scanMode, scanBuffer]);

  const handleSearch = useCallback(async (code: string) => {
    if (!code.trim() || code.length < 3) {
      toast({ title: "Please enter a valid code", variant: "destructive" });
      return;
    }

    setIsSearching(true);
    const searchCode = code.trim().toUpperCase();

    try {
      // Search in LPG brands
      const { data: lpgData } = await supabase
        .from('lpg_brands')
        .select('*')
        .eq('is_active', true)
        .or(`name.ilike.%${searchCode}%`);

      if (lpgData && lpgData.length > 0) {
        const brand = lpgData[0];
        const product: ScannedProduct = {
          id: brand.id,
          type: 'lpg',
          name: brand.name,
          details: `${brand.weight} - ${brand.size}`,
          price: 0, // Price comes from product_prices
          stock: brand.refill_cylinder + brand.package_cylinder,
          sku: brand.name.toUpperCase().replace(/\s+/g, '-')
        };
        setLastScanned(product);
        setIsSearching(false);
        return;
      }

      // Search in stoves
      const { data: stoveData } = await supabase
        .from('stoves')
        .select('*')
        .eq('is_active', true)
        .or(`brand.ilike.%${searchCode}%,model.ilike.%${searchCode}%`);

      if (stoveData && stoveData.length > 0) {
        const stove = stoveData[0];
        const product: ScannedProduct = {
          id: stove.id,
          type: 'stove',
          name: `${stove.brand} ${stove.model}`,
          details: `${stove.burners} Burner`,
          price: Number(stove.price),
          stock: stove.quantity,
          sku: `${stove.brand}-${stove.model}`.toUpperCase().replace(/\s+/g, '-')
        };
        setLastScanned(product);
        setIsSearching(false);
        return;
      }

      // Search in regulators
      const { data: regulatorData } = await supabase
        .from('regulators')
        .select('*')
        .eq('is_active', true)
        .or(`brand.ilike.%${searchCode}%,type.ilike.%${searchCode}%`);

      if (regulatorData && regulatorData.length > 0) {
        const regulator = regulatorData[0];
        const product: ScannedProduct = {
          id: regulator.id,
          type: 'regulator',
          name: regulator.brand,
          details: regulator.type,
          price: 0,
          stock: regulator.quantity,
          sku: `${regulator.brand}-${regulator.type}`.toUpperCase().replace(/\s+/g, '-')
        };
        setLastScanned(product);
        setIsSearching(false);
        return;
      }

      // No product found
      toast({ title: "Product not found", description: `No product matches code: ${searchCode}`, variant: "destructive" });
      setLastScanned(null);
    } catch (error) {
      console.error('Barcode search error:', error);
      toast({ title: "Search failed", variant: "destructive" });
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleManualSearch = () => {
    handleSearch(manualCode);
  };

  const handleAddToCart = () => {
    if (lastScanned) {
      onProductFound(lastScanned);
      toast({ title: "Product added to cart", description: lastScanned.name });
      setManualCode("");
      setLastScanned(null);
      onOpenChange(false);
    }
  };

  const handleClear = () => {
    setManualCode("");
    setLastScanned(null);
    inputRef.current?.focus();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-5 w-5 text-primary" />
            Barcode Scanner
          </DialogTitle>
          <DialogDescription>
            Scan product barcode or enter code manually for quick lookup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'keyboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('keyboard')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Scanner / Manual
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setScanMode('camera')}
              className="flex-1"
              disabled
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera (Soon)
            </Button>
          </div>

          {/* Manual Entry / Scanner Input */}
          {scanMode === 'keyboard' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label>Barcode / SKU / Product Name</Label>
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleManualSearch();
                    }}
                    placeholder="Scan or type code..."
                    className="flex-1 font-mono text-lg tracking-wider"
                    autoFocus
                  />
                  {manualCode && (
                    <Button variant="ghost" size="icon" onClick={handleClear}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Point barcode scanner here or type product name/code
                </p>
              </div>

              <Button 
                onClick={handleManualSearch} 
                disabled={!manualCode.trim() || isSearching}
                className="w-full"
              >
                {isSearching ? (
                  <>Searching...</>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Search Product
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Camera Mode Placeholder */}
          {scanMode === 'camera' && (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <Camera className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Camera scanning coming soon
                </p>
              </CardContent>
            </Card>
          )}

          {/* Scanned Product Result */}
          {lastScanned && (
            <Card className="border-primary/50 bg-primary/5">
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <span className="font-semibold">{lastScanned.name}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{lastScanned.details}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge variant="outline" className="capitalize">
                        {lastScanned.type}
                      </Badge>
                      <Badge variant={lastScanned.stock > 0 ? "secondary" : "destructive"}>
                        <Package className="h-3 w-3 mr-1" />
                        {lastScanned.stock} in stock
                      </Badge>
                    </div>
                    {lastScanned.sku && (
                      <p className="text-xs text-muted-foreground font-mono mt-1">
                        SKU: {lastScanned.sku}
                      </p>
                    )}
                  </div>
                </div>

                <Button 
                  onClick={handleAddToCart} 
                  className="w-full mt-4"
                  disabled={lastScanned.stock === 0}
                >
                  {lastScanned.stock === 0 ? (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Out of Stock
                    </>
                  ) : (
                    <>
                      <Package className="h-4 w-4 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
