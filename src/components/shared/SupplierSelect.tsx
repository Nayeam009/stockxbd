import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Building2, Factory, Truck, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  LPG_SUPPLIERS,
  STOVE_SUPPLIERS,
  REGULATOR_SUPPLIERS,
  getSuppliersByCategory,
  validateCustomSupplier,
  type SupplierInfo,
} from "@/lib/brandConstants";

export type SupplierType = "lpg" | "stove" | "regulator";

interface SupplierSelectProps {
  type: SupplierType;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowCustom?: boolean;
  className?: string;
  disabled?: boolean;
}

export const SupplierSelect = ({
  type,
  value,
  onChange,
  placeholder,
  allowCustom = true,
  className,
  disabled = false,
}: SupplierSelectProps) => {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const suppliers = useMemo(() => {
    switch (type) {
      case "lpg": return LPG_SUPPLIERS;
      case "stove": return STOVE_SUPPLIERS;
      case "regulator": return REGULATOR_SUPPLIERS;
      default: return [];
    }
  }, [type]);

  const groupedSuppliers = useMemo(() => {
    return getSuppliersByCategory(type);
  }, [type]);

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "manufacturer": return <Factory className="h-3 w-3" />;
      case "distributor": return <Truck className="h-3 w-3" />;
      case "importer": return <Package className="h-3 w-3" />;
      default: return <Building2 className="h-3 w-3" />;
    }
  };

  const getCategoryLabel = (category: string) => {
    switch (category) {
      case "manufacturer": return "Manufacturers";
      case "distributor": return "Distributors";
      case "importer": return "Importers";
      default: return category;
    }
  };

  const getCategoryBadgeStyle = (category: string) => {
    switch (category) {
      case "manufacturer":
        return "bg-primary/10 text-primary border-primary/20";
      case "distributor":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "importer":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleSelect = (supplierName: string) => {
    onChange(supplierName);
    setOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    const validation = validateCustomSupplier(customValue);
    if (validation.valid) {
      onChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (type) {
      case "lpg": return "Select LPG supplier...";
      case "stove": return "Select stove supplier...";
      case "regulator": return "Select regulator supplier...";
      default: return "Select supplier...";
    }
  };

  const selectedSupplier = suppliers.find(
    (s) => s.name.toLowerCase() === value.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-12 text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate flex items-center gap-2">
            {value ? (
              <>
                <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate">{value}</span>
                {selectedSupplier && (
                  <Badge 
                    variant="outline" 
                    className={cn(
                      "text-[10px] h-5 shrink-0 ml-1",
                      getCategoryBadgeStyle(selectedSupplier.category)
                    )}
                  >
                    {selectedSupplier.category}
                  </Badge>
                )}
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 shrink-0" />
                {getPlaceholder()}
              </>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[350px] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder={`Search ${type} suppliers...`} className="h-11" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {allowCustom ? (
                <div className="p-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No supplier found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Add custom supplier
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No supplier found
                </p>
              )}
            </CommandEmpty>
            
            {Object.entries(groupedSuppliers).map(([category, categorySuppliers]) => (
              <CommandGroup 
                key={category} 
                heading={
                  <span className="flex items-center gap-1.5">
                    {getCategoryIcon(category)}
                    {getCategoryLabel(category)}
                  </span>
                }
              >
                {categorySuppliers.map((supplier) => (
                  <CommandItem
                    key={supplier.name}
                    value={supplier.name}
                    onSelect={() => handleSelect(supplier.name)}
                    className="cursor-pointer min-h-[44px] py-2"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value.toLowerCase() === supplier.name.toLowerCase()
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <span className="flex-1 truncate">{supplier.name}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
            
            {allowCustom && !showCustomInput && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setShowCustomInput(true)}
                    className="cursor-pointer min-h-[44px]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add custom supplier
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
          {showCustomInput && (
            <div className="p-3 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter supplier name..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomSubmit();
                    if (e.key === "Escape") setShowCustomInput(false);
                  }}
                  className="h-10"
                  autoFocus
                />
                <Button size="sm" onClick={handleCustomSubmit} className="h-10 px-4">
                  Add
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Press Enter to add, Escape to cancel
              </p>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default SupplierSelect;
