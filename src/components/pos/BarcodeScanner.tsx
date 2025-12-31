import { useState, useEffect, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ScanLine, Camera, X, Keyboard, Package, AlertCircle, CheckCircle2, Loader2, XCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Html5Qrcode } from "html5-qrcode";

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
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraStarting, setIsCameraStarting] = useState(false);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const scanTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "barcode-scanner-container";

  // Focus input when dialog opens
  useEffect(() => {
    if (open && scanMode === 'keyboard' && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, scanMode]);

  // Handle camera mode
  useEffect(() => {
    if (!open) {
      // Clean up camera when dialog closes
      stopCamera();
      return;
    }

    if (scanMode === 'camera' && open) {
      startCamera();
    } else {
      stopCamera();
    }

    return () => {
      stopCamera();
    };
  }, [scanMode, open]);

  const startCamera = async () => {
    setIsCameraStarting(true);
    setCameraError(null);

    try {
      // Wait for DOM element to be available
      await new Promise(resolve => setTimeout(resolve, 100));

      const container = document.getElementById(scannerContainerId);
      if (!container) {
        throw new Error("Scanner container not found");
      }

      // Create new scanner instance
      html5QrCodeRef.current = new Html5Qrcode(scannerContainerId);

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 150 },
        aspectRatio: 1.5,
      };

      await html5QrCodeRef.current.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // On successful scan
          handleSearch(decodedText);
          // Provide haptic feedback if available
          if (navigator.vibrate) {
            navigator.vibrate(100);
          }
        },
        () => {
          // Ignore QR code not found errors
        }
      );

      setCameraReady(true);
      setIsCameraStarting(false);
    } catch (err: any) {
      console.error("Camera error:", err);
      setCameraError(err.message || "Failed to start camera. Please ensure camera permissions are granted.");
      setIsCameraStarting(false);
      setCameraReady(false);
    }
  };

  const stopCamera = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (err) {
        console.error("Error stopping camera:", err);
      }
      html5QrCodeRef.current = null;
    }
    setCameraReady(false);
    setCameraError(null);
  };

  // Handle barcode scanner input (fast sequential keypresses)
  useEffect(() => {
    if (!open || scanMode !== 'keyboard') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only capture if dialog is open and our input is focused
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
          price: 0,
          stock: brand.refill_cylinder + brand.package_cylinder,
          sku: brand.name.toUpperCase().replace(/\s+/g, '-')
        };
        setLastScanned(product);
        setIsSearching(false);
        toast({ title: "Product found!", description: product.name });
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
        toast({ title: "Product found!", description: product.name });
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
        toast({ title: "Product found!", description: product.name });
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

  const handleModeChange = (mode: 'keyboard' | 'camera') => {
    setLastScanned(null);
    setManualCode("");
    setScanMode(mode);
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
            Scan product barcode using camera or enter code manually
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mode Toggle */}
          <div className="flex gap-2">
            <Button
              variant={scanMode === 'keyboard' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('keyboard')}
              className="flex-1"
            >
              <Keyboard className="h-4 w-4 mr-2" />
              Manual / Scanner
            </Button>
            <Button
              variant={scanMode === 'camera' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleModeChange('camera')}
              className="flex-1"
            >
              <Camera className="h-4 w-4 mr-2" />
              Camera Scan
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
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <ScanLine className="h-4 w-4 mr-2" />
                    Search Product
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Camera Mode */}
          {scanMode === 'camera' && (
            <div className="space-y-3">
              {/* Camera View */}
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <div 
                  id={scannerContainerId} 
                  className="w-full h-full"
                />
                
                {isCameraStarting && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/80">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Starting camera...</p>
                    </div>
                  </div>
                )}

                {cameraError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/90 p-4">
                    <div className="text-center text-white">
                      <XCircle className="h-10 w-10 mx-auto mb-3 text-red-400" />
                      <p className="text-sm mb-3">{cameraError}</p>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={startCamera}
                        className="bg-white/10 text-white border-white/20 hover:bg-white/20"
                      >
                        Retry
                      </Button>
                    </div>
                  </div>
                )}

                {cameraReady && !isSearching && (
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <Badge variant="secondary" className="bg-black/50 text-white border-0">
                      <Camera className="h-3 w-3 mr-1" />
                      Point camera at barcode
                    </Badge>
                  </div>
                )}

                {isSearching && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center text-white">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                      <p className="text-sm">Looking up product...</p>
                    </div>
                  </div>
                )}
              </div>

              <p className="text-xs text-center text-muted-foreground">
                Hold barcode steady within the frame for best results
              </p>
            </div>
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
