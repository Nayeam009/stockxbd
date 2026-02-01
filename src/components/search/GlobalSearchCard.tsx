import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search } from "lucide-react";

interface SearchResult {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  meta?: string;
  icon: React.ElementType;
  action?: () => void;
}

interface GlobalSearchCardProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchCategory: string;
  onCategoryChange: (category: string) => void;
  results: SearchResult[];
  onResultClick?: (result: SearchResult) => void;
}

const getResultBadgeColor = (type: string) => {
  const colors: Record<string, string> = {
    navigation: 'bg-primary/10 text-primary border-primary/20',
    action: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    customer: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    sale: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    stock: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    driver: 'bg-cyan-500/10 text-cyan-600 border-cyan-500/20',
    staff: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    vehicle: 'bg-pink-500/10 text-pink-600 border-pink-500/20',
  };
  return colors[type] || 'bg-muted text-muted-foreground border-muted/20';
};

export const GlobalSearchCard = ({
  searchQuery,
  onSearchChange,
  searchCategory,
  onCategoryChange,
  results,
  onResultClick
}: GlobalSearchCardProps) => {
  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="pb-3 px-4 pt-4">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Search className="h-4 w-4 text-primary" />
          </div>
          Global Search
        </CardTitle>
        <CardDescription className="text-xs">
          Search across all modules, customers, sales, and more
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 pb-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers, sales, stock..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-10 h-11 text-base"
            />
          </div>
          <Select value={searchCategory} onValueChange={onCategoryChange}>
            <SelectTrigger className="w-full sm:w-[140px] h-11">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="navigation">Pages</SelectItem>
              <SelectItem value="customers">Customers</SelectItem>
              <SelectItem value="sales">Sales</SelectItem>
              <SelectItem value="stock">Stock</SelectItem>
              <SelectItem value="drivers">Drivers</SelectItem>
              <SelectItem value="staff">Staff</SelectItem>
              <SelectItem value="vehicles">Vehicles</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Search Results */}
        {searchQuery && results.length > 0 && (
          <ScrollArea className="h-[250px] rounded-lg">
            <div className="space-y-2">
              {results.slice(0, 15).map((result) => (
                <button
                  key={`${result.type}-${result.id}`}
                  onClick={() => {
                    result.action?.();
                    onResultClick?.(result);
                  }}
                  className="w-full flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors text-left group"
                >
                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0 group-hover:bg-primary/10 transition-colors">
                    <result.icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                  </div>
                  <Badge 
                    variant="outline" 
                    className={`text-[10px] shrink-0 ${getResultBadgeColor(result.type)}`}
                  >
                    {result.meta || result.type}
                  </Badge>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}

        {searchQuery && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            <Search className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No results found</p>
            <p className="text-xs">Try a different search term</p>
          </div>
        )}

        {!searchQuery && (
          <div className="text-center py-6 text-muted-foreground">
            <p className="text-xs">Start typing to search...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GlobalSearchCard;
