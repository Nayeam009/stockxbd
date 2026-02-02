/**
 * Order Filters Component
 * Search and tab filters for marketplace orders
 */

import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search } from "lucide-react";
import type { OrderAnalytics } from "../types";

interface OrderFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  analytics: OrderAnalytics;
  children: React.ReactNode;
}

export function OrderFilters({
  searchQuery,
  onSearchChange,
  activeTab,
  onTabChange,
  analytics,
  children
}: OrderFiltersProps) {
  return (
    <>
      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer name, or phone..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={onTabChange}>
        <TabsList className="w-full sm:w-auto overflow-x-auto">
          <TabsTrigger value="all">All ({analytics.total})</TabsTrigger>
          <TabsTrigger value="pending">Pending ({analytics.pending})</TabsTrigger>
          <TabsTrigger value="confirmed">Confirmed ({analytics.confirmed})</TabsTrigger>
          <TabsTrigger value="dispatched">Dispatched ({analytics.dispatched})</TabsTrigger>
          <TabsTrigger value="delivered">Delivered ({analytics.delivered})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {children}
        </TabsContent>
      </Tabs>
    </>
  );
}
