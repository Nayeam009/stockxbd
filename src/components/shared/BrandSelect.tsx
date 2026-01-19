import { useState, useMemo } from "react";
import { Check, ChevronsUpDown, Plus, Star, Globe } from "lucide-react";
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
  LPG_BRANDS,
  STOVE_BRANDS,
  REGULATOR_BRANDS,
  getLpgBrandColor,
  getRegulatorTierStyle,
  getCountryFlag,
  type LpgBrandInfo,
  type StoveBrandInfo,
  type RegulatorBrandInfo,
} from "@/lib/brandConstants";

export type BrandType = "lpg" | "stove" | "regulator";

interface BrandSelectProps {
  type: BrandType;
  value: string;
  onChange: (value: string, brandInfo?: LpgBrandInfo | StoveBrandInfo | RegulatorBrandInfo) => void;
  placeholder?: string;
  allowCustom?: boolean;
  filterByMouthSize?: "22mm" | "20mm";
  className?: string;
  disabled?: boolean;
}

export const BrandSelect = ({
  type,
  value,
  onChange,
  placeholder,
  allowCustom = true,
  filterByMouthSize,
  className,
  disabled = false,
}: BrandSelectProps) => {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const brands = useMemo(() => {
    switch (type) {
      case "lpg":
        return filterByMouthSize
          ? LPG_BRANDS.filter((b) => b.mouthSize === filterByMouthSize)
          : LPG_BRANDS;
      case "stove":
        return STOVE_BRANDS;
      case "regulator":
        return REGULATOR_BRANDS;
      default:
        return [];
    }
  }, [type, filterByMouthSize]);

  const getBrandLabel = (brandName: string) => {
    return brandName;
  };

  const renderBrandItem = (brand: LpgBrandInfo | StoveBrandInfo | RegulatorBrandInfo) => {
    if (type === "lpg" && "mouthSize" in brand) {
      return (
        <div className="flex items-center gap-2 w-full">
          <div
            className="h-3 w-3 rounded-full shrink-0"
            style={{ backgroundColor: (brand as LpgBrandInfo).color }}
          />
          <span className="flex-1 truncate">{brand.name}</span>
          <Badge variant="outline" className="text-[10px] h-5 shrink-0">
            {(brand as LpgBrandInfo).mouthSize}
          </Badge>
        </div>
      );
    }

    if (type === "stove" && "country" in brand) {
      return (
        <div className="flex items-center gap-2 w-full">
          <span className="text-base shrink-0">{getCountryFlag((brand as StoveBrandInfo).country)}</span>
          <span className="flex-1 truncate">{brand.name}</span>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {(brand as StoveBrandInfo).countryName}
          </span>
        </div>
      );
    }

    if (type === "regulator" && "tier" in brand) {
      const tierStyle = getRegulatorTierStyle((brand as RegulatorBrandInfo).tier);
      return (
        <div className="flex items-center gap-2 w-full">
          {(brand as RegulatorBrandInfo).tier === "premium" && (
            <Star className="h-3 w-3 text-amber-500 shrink-0" />
          )}
          <span className="flex-1 truncate">{brand.name}</span>
          <Badge
            variant="outline"
            className={cn("text-[10px] h-5 shrink-0", tierStyle.bg, tierStyle.text)}
          >
            {(brand as RegulatorBrandInfo).tier}
          </Badge>
        </div>
      );
    }

    return <span>{brand.name}</span>;
  };

  const handleSelect = (brandName: string) => {
    const brand = brands.find(
      (b) => b.name.toLowerCase() === brandName.toLowerCase()
    );
    onChange(brandName, brand);
    setOpen(false);
    setShowCustomInput(false);
  };

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      onChange(customValue.trim());
      setCustomValue("");
      setShowCustomInput(false);
      setOpen(false);
    }
  };

  const getPlaceholder = () => {
    if (placeholder) return placeholder;
    switch (type) {
      case "lpg":
        return "Select LPG brand...";
      case "stove":
        return "Select stove brand...";
      case "regulator":
        return "Select regulator brand...";
      default:
        return "Select brand...";
    }
  };

  const selectedBrand = brands.find(
    (b) => b.name.toLowerCase() === value.toLowerCase()
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between h-10 sm:h-11 text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">
            {value ? (
              <span className="flex items-center gap-2">
                {type === "lpg" && selectedBrand && "color" in selectedBrand && (
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: (selectedBrand as LpgBrandInfo).color }}
                  />
                )}
                {type === "stove" && selectedBrand && "country" in selectedBrand && (
                  <span>{getCountryFlag((selectedBrand as StoveBrandInfo).country)}</span>
                )}
                {type === "regulator" && selectedBrand && "tier" in selectedBrand && (selectedBrand as RegulatorBrandInfo).tier === "premium" && (
                  <Star className="h-3 w-3 text-amber-500" />
                )}
                <span className="truncate">{value}</span>
              </span>
            ) : (
              getPlaceholder()
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[300px] p-0 z-50" align="start">
        <Command>
          <CommandInput placeholder={`Search ${type} brands...`} className="h-10" />
          <CommandList className="max-h-[300px]">
            <CommandEmpty>
              {allowCustom ? (
                <div className="p-2 text-center">
                  <p className="text-sm text-muted-foreground mb-2">No brand found</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={() => setShowCustomInput(true)}
                  >
                    <Plus className="h-3 w-3" />
                    Add custom brand
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4 text-center">
                  No brand found
                </p>
              )}
            </CommandEmpty>
            <CommandGroup heading="Popular Brands">
              {brands.map((brand) => (
                <CommandItem
                  key={brand.name}
                  value={brand.name}
                  onSelect={() => handleSelect(brand.name)}
                  className="cursor-pointer min-h-[44px] py-2"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 shrink-0",
                      value.toLowerCase() === brand.name.toLowerCase()
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {renderBrandItem(brand)}
                </CommandItem>
              ))}
            </CommandGroup>
            {allowCustom && !showCustomInput && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={() => setShowCustomInput(true)}
                    className="cursor-pointer min-h-[44px]"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add custom brand
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
          {showCustomInput && (
            <div className="p-3 border-t bg-muted/30">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter brand name..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCustomSubmit();
                    if (e.key === "Escape") setShowCustomInput(false);
                  }}
                  className="h-9"
                  autoFocus
                />
                <Button size="sm" onClick={handleCustomSubmit} className="h-9 px-3">
                  Add
                </Button>
              </div>
            </div>
          )}
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export default BrandSelect;
