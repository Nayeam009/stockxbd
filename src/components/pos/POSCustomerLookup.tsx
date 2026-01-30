import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Phone,
  MapPin,
  User,
  UserCircle,
  Sparkles,
  AlertTriangle,
  Loader2,
  Users,
  Search
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatBDPhone } from "@/lib/phoneValidation";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { toast } from "@/hooks/use-toast";
import type { Customer } from "@/hooks/usePOSData";

// Role display config
const ROLE_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  owner: { label: 'Owner', color: 'text-emerald-700', bgColor: 'bg-emerald-100 border-emerald-300' },
  manager: { label: 'Manager', color: 'text-blue-700', bgColor: 'bg-blue-100 border-blue-300' },
};

interface CustomerState {
  status: 'idle' | 'searching' | 'found' | 'new';
  customer: Customer | null;
  phoneQuery: string;
  newCustomerName: string;
  newCustomerAddress: string;
}

interface POSCustomerLookupProps {
  customers: Customer[];
  discount: number;
  onDiscountChange: (value: number) => void;
  userRole: 'owner' | 'manager';
  userName: string;
  onCustomerChange: (state: CustomerState) => void;
  customerState: CustomerState;
}

export const POSCustomerLookup = ({
  customers,
  discount,
  onDiscountChange,
  userRole,
  userName,
  onCustomerChange,
  customerState
}: POSCustomerLookupProps) => {
  const [showCustomerListDialog, setShowCustomerListDialog] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");

  const { status, customer, phoneQuery, newCustomerName, newCustomerAddress } = customerState;

  // Normalize phone for lookup
  const normalizePhoneForLookup = useCallback((phone: string): string[] => {
    const cleaned = phone.replace(/[\s\-().]/g, '');
    const normalized = formatBDPhone(cleaned);

    const formats: string[] = [];
    if (normalized.startsWith('01') && normalized.length === 11) {
      formats.push(normalized);
      formats.push(`+880${normalized.slice(1)}`);
      formats.push(`880${normalized.slice(1)}`);
    }
    return formats.length > 0 ? formats : [cleaned];
  }, []);

  // Phone lookup effect
  useEffect(() => {
    if (phoneQuery.length >= 11) {
      onCustomerChange({ ...customerState, status: 'searching' });
      
      const timer = setTimeout(async () => {
        try {
          const phoneFormats = normalizePhoneForLookup(phoneQuery);
          const { data, error } = await supabase
            .from('customers')
            .select('*')
            .or(phoneFormats.map(p => `phone.eq.${p}`).join(','))
            .order('created_at', { ascending: false })
            .limit(1);

          if (error) {
            onCustomerChange({ ...customerState, status: 'new', customer: null });
            return;
          }

          const foundCustomer = data && data.length > 0 ? data[0] : null;

          if (foundCustomer) {
            onCustomerChange({
              ...customerState,
              status: 'found',
              customer: foundCustomer as Customer,
              newCustomerName: foundCustomer.name,
              newCustomerAddress: foundCustomer.address || ''
            });
          } else {
            onCustomerChange({
              ...customerState,
              status: 'new',
              customer: null,
              newCustomerName: '',
              newCustomerAddress: ''
            });
          }
        } catch {
          onCustomerChange({ ...customerState, status: 'new', customer: null });
        }
      }, 300);
      
      return () => clearTimeout(timer);
    } else if (phoneQuery.length > 0) {
      onCustomerChange({ ...customerState, status: 'idle', customer: null });
    } else {
      onCustomerChange({
        ...customerState,
        status: 'idle',
        customer: null,
        newCustomerName: '',
        newCustomerAddress: ''
      });
    }
  }, [phoneQuery]);

  const handlePhoneChange = (value: string) => {
    const cleaned = value.replace(/\D/g, '').slice(0, 11);
    onCustomerChange({ ...customerState, phoneQuery: cleaned });
  };

  const handleSelectFromList = (selectedCustomer: Customer) => {
    onCustomerChange({
      status: 'found',
      customer: selectedCustomer,
      phoneQuery: selectedCustomer.phone || '',
      newCustomerName: selectedCustomer.name,
      newCustomerAddress: selectedCustomer.address || ''
    });
    setShowCustomerListDialog(false);
    toast({ title: "Customer selected", description: selectedCustomer.name });
  };

  const filteredCustomers = customerSearch
    ? customers.filter(c =>
        c.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
        c.phone?.includes(customerSearch)
      )
    : customers;

  return (
    <>
      <Card className="border-border/50">
        <CardContent className="p-3 space-y-3">
          {/* Status Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {status === 'found' && customer && (
              <Badge className="bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400">
                <UserCircle className="h-3 w-3 mr-1" />
                Old Customer
              </Badge>
            )}
            {status === 'new' && (
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                <Sparkles className="h-3 w-3 mr-1" />
                New Customer
              </Badge>
            )}
            {customer && (customer.total_due || 0) > 0 && (
              <Badge variant="destructive" className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400">
                <AlertTriangle className="h-3 w-3 mr-1" />
                Due: {BANGLADESHI_CURRENCY_SYMBOL}{(customer.total_due || 0).toLocaleString()}
              </Badge>
            )}
            {customer && (customer.cylinders_due || 0) > 0 && (
              <Badge variant="outline" className="text-amber-600 border-amber-300 dark:border-amber-700">
                {customer.cylinders_due} Cylinder{customer.cylinders_due > 1 ? 's' : ''} Due
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-7 ml-auto text-xs"
              onClick={() => setShowCustomerListDialog(true)}
            >
              <Users className="h-3.5 w-3.5 mr-1" />
              Browse
            </Button>
          </div>

          {/* Customer Details Form */}
          <div className="grid grid-cols-1 gap-3">
            {/* Phone Field */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Phone Number
                <span className="text-primary ml-1">(auto-lookup)</span>
              </Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="tel"
                  value={phoneQuery}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-11 pl-10 text-base font-medium"
                  maxLength={11}
                  autoComplete="tel"
                />
                {status === 'searching' && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
                {status === 'found' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-sky-500 flex items-center justify-center">
                    <UserCircle className="h-3.5 w-3.5 text-white" />
                  </div>
                )}
                {status === 'new' && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Sparkles className="h-3 w-3 text-white" />
                  </div>
                )}
              </div>
            </div>

            {/* Name & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Name {status === 'new' && <span className="text-destructive">*</span>}
                </Label>
                {status === 'found' && customer ? (
                  <div className="h-11 px-3 flex items-center gap-2 rounded-md border bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sm font-medium text-foreground">
                    <UserCircle className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="truncate">{customer.name}</span>
                  </div>
                ) : (
                  <Input
                    value={newCustomerName}
                    onChange={(e) => onCustomerChange({ ...customerState, newCustomerName: e.target.value })}
                    placeholder="Customer name"
                    className="h-11"
                    autoComplete="name"
                  />
                )}
              </div>

              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">Location</Label>
                {status === 'found' && customer ? (
                  <div className="h-11 px-3 flex items-center gap-2 rounded-md border bg-sky-50 dark:bg-sky-950/30 border-sky-200 dark:border-sky-800 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 text-sky-500 shrink-0" />
                    <span className="truncate">{customer.address || 'No address'}</span>
                  </div>
                ) : (
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={newCustomerAddress}
                      onChange={(e) => onCustomerChange({ ...customerState, newCustomerAddress: e.target.value })}
                      placeholder="Address/Location"
                      className="h-11 pl-10"
                      autoComplete="street-address"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Settlement & Seller Row */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Settlement</Label>
              <Input
                type="number"
                value={discount || ''}
                onChange={(e) => onDiscountChange(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="h-10"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Seller</Label>
              <div className={`h-10 px-3 flex items-center gap-2 rounded-md border ${ROLE_CONFIG[userRole]?.bgColor || 'bg-muted border-border'}`}>
                <User className={`h-3.5 w-3.5 ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`} />
                <span className={`text-sm font-medium ${ROLE_CONFIG[userRole]?.color || 'text-foreground'}`}>
                  {ROLE_CONFIG[userRole]?.label || 'User'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customer List Dialog */}
      <Dialog open={showCustomerListDialog} onOpenChange={setShowCustomerListDialog}>
        <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Browse Customers
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search by name or phone..."
                className="h-11 pl-9"
              />
            </div>

            <ScrollArea className="flex-1 h-[300px] pr-2">
              <div className="space-y-2">
                {filteredCustomers.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No customers found</p>
                  </div>
                ) : (
                  filteredCustomers.map(cust => (
                    <button
                      key={cust.id}
                      onClick={() => handleSelectFromList(cust)}
                      className="w-full p-3 rounded-lg border bg-card hover:bg-muted/50 text-left transition-all"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-primary">
                            {cust.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{cust.name}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {cust.phone || 'No phone'} • {cust.address || 'No address'}
                          </p>
                        </div>
                        {(cust.total_due || 0) > 0 && (
                          <Badge variant="destructive" className="text-[10px]">
                            Due: ৳{cust.total_due?.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export type { CustomerState };
