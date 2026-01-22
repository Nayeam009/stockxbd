import { useState, useMemo } from "react";
import { Check, MapPin, Building2, Map } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { getAllLocations, LocationItem, POPULAR_LOCATIONS } from "@/lib/bangladeshConstants";

interface LocationSearchComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function LocationSearchCombobox({
  value,
  onValueChange,
  placeholder = "Search location...",
  className,
}: LocationSearchComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Get all locations once
  const allLocations = useMemo(() => getAllLocations(), []);

  // Filter and group locations based on search
  const filteredLocations = useMemo(() => {
    if (!searchQuery) {
      // Show popular locations when no search
      return {
        popular: POPULAR_LOCATIONS,
        divisions: [],
        districts: [],
        thanas: [],
      };
    }

    const query = searchQuery.toLowerCase();
    const filtered = allLocations.filter(
      (loc) =>
        loc.name.toLowerCase().includes(query) ||
        loc.displayName.toLowerCase().includes(query)
    );

    // Group by type and limit to 5 per category
    const divisions = filtered
      .filter((loc) => loc.type === "division")
      .slice(0, 5);
    const districts = filtered
      .filter((loc) => loc.type === "district")
      .slice(0, 5);
    const thanas = filtered
      .filter((loc) => loc.type === "thana")
      .slice(0, 8);

    return {
      popular: [],
      divisions,
      districts,
      thanas,
    };
  }, [searchQuery, allLocations]);

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "division":
        return <Map className="h-3.5 w-3.5" />;
      case "district":
        return <Building2 className="h-3.5 w-3.5" />;
      case "thana":
        return <MapPin className="h-3.5 w-3.5" />;
      default:
        return <MapPin className="h-3.5 w-3.5" />;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "division":
        return "bg-primary/10 text-primary border-primary/20";
      case "district":
        return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "thana":
        return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const handleSelect = (locationName: string) => {
    onValueChange(locationName);
    setOpen(false);
    setSearchQuery("");
  };

  const hasResults =
    filteredLocations.popular.length > 0 ||
    filteredLocations.divisions.length > 0 ||
    filteredLocations.districts.length > 0 ||
    filteredLocations.thanas.length > 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-start text-left font-normal h-11",
            !value && "text-muted-foreground",
            className
          )}
        >
          <MapPin className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] sm:w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Type to search locations..."
            value={searchQuery}
            onValueChange={setSearchQuery}
            className="h-11"
          />
          <CommandList className="max-h-[300px]">
            {!hasResults && (
              <CommandEmpty>No locations found.</CommandEmpty>
            )}

            {/* Popular Locations */}
            {filteredLocations.popular.length > 0 && (
              <CommandGroup heading="Popular Locations">
                {filteredLocations.popular.map((location) => (
                  <CommandItem
                    key={location}
                    value={location}
                    onSelect={() => handleSelect(location)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <MapPin className="h-4 w-4 text-primary" />
                    <span>{location}</span>
                    {value === location && (
                      <Check className="ml-auto h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Divisions */}
            {filteredLocations.divisions.length > 0 && (
              <CommandGroup heading="Divisions">
                {filteredLocations.divisions.map((location) => (
                  <CommandItem
                    key={`div-${location.name}`}
                    value={location.name}
                    onSelect={() => handleSelect(location.name)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getTypeIcon(location.type)}
                    <span className="flex-1">{location.displayName}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(location.type))}
                    >
                      Division
                    </Badge>
                    {value === location.name && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Districts */}
            {filteredLocations.districts.length > 0 && (
              <CommandGroup heading="Districts">
                {filteredLocations.districts.map((location) => (
                  <CommandItem
                    key={`dist-${location.name}-${location.division}`}
                    value={location.displayName}
                    onSelect={() => handleSelect(location.name)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getTypeIcon(location.type)}
                    <span className="flex-1">{location.displayName}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(location.type))}
                    >
                      District
                    </Badge>
                    {value === location.name && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Thanas */}
            {filteredLocations.thanas.length > 0 && (
              <CommandGroup heading="Thanas / Upazilas">
                {filteredLocations.thanas.map((location) => (
                  <CommandItem
                    key={`thana-${location.name}-${location.district}`}
                    value={`${location.name} ${location.district}`}
                    onSelect={() => handleSelect(location.name)}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    {getTypeIcon(location.type)}
                    <span className="flex-1">{location.displayName}</span>
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5 py-0", getTypeBadgeColor(location.type))}
                    >
                      Thana
                    </Badge>
                    {value === location.name && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
