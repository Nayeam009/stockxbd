import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { POSProductCard, ProductCardData } from "./POSProductCard";
import { Search, ScanLine, Flame, Package, Gauge, Grid3X3 } from "lucide-react";
import { cn } from "@/lib/utils";

interface POSProductGridProps {
  products: ProductCardData[];
  onQuickAdd: (product: ProductCardData) => void;
  onScanClick: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

type FilterType = 'all' | 'lpg' | 'stove' | 'regulator';

const filterButtons: { type: FilterType; label: string; icon: typeof Grid3X3 }[] = [
  { type: 'all', label: 'All', icon: Grid3X3 },
  { type: 'lpg', label: 'LPG', icon: Flame },
  { type: 'stove', label: 'Stove', icon: Package },
  { type: 'regulator', label: 'Regulator', icon: Gauge },
];

export const POSProductGrid = ({
  products,
  onQuickAdd,
  onScanClick,
  searchQuery,
  onSearchChange,
}: POSProductGridProps) => {
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');

  const filteredProducts = useMemo(() => {
    let filtered = products;

    // Filter by type
    if (activeFilter !== 'all') {
      filtered = filtered.filter(p => p.type === activeFilter);
    }

    // Filter by search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.subtitle.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [products, activeFilter, searchQuery]);

  return (
    <div className="flex flex-col h-full bg-card rounded-xl border shadow-sm overflow-hidden">
      {/* Search Bar */}
      <div className="p-3 sm:p-4 border-b space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-11"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onScanClick}
            className="h-11 w-11 shrink-0"
          >
            <ScanLine className="h-5 w-5" />
          </Button>
        </div>

        {/* Category Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {filterButtons.map(({ type, label, icon: Icon }) => (
            <Button
              key={type}
              variant={activeFilter === type ? "default" : "outline"}
              size="sm"
              onClick={() => setActiveFilter(type)}
              className={cn(
                "h-9 px-3 shrink-0",
                activeFilter === type && "shadow-md"
              )}
            >
              <Icon className="h-4 w-4 mr-1.5" />
              {label}
            </Button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      <ScrollArea className="flex-1 p-3 sm:p-4">
        {filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">No products found</p>
            <p className="text-sm text-muted-foreground/70">
              {searchQuery ? "Try a different search term" : "Add products to your inventory"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-3">
            {filteredProducts.map((product) => (
              <POSProductCard
                key={product.id}
                product={product}
                onQuickAdd={onQuickAdd}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
