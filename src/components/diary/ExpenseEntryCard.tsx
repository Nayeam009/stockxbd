import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Package, 
  Clock,
  ArrowDownRight,
  Eye,
  Truck,
  Users,
  FileText
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { format } from "date-fns";
import { ExpenseEntry } from "@/hooks/useBusinessDiaryData";

interface ExpenseEntryCardProps {
  entry: ExpenseEntry;
  onViewDetails?: (entry: ExpenseEntry) => void;
  onNavigateToSource?: (source: string) => void;
}

const sourceConfig: Record<string, { icon: React.ComponentType<any>; color: string }> = {
  'POB': { icon: Package, color: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 border-indigo-500/30' },
  'Staff Salary': { icon: Users, color: 'bg-green-500/20 text-green-700 dark:text-green-400 border-green-500/30' },
  'Vehicle Cost': { icon: Truck, color: 'bg-orange-500/20 text-orange-700 dark:text-orange-400 border-orange-500/30' },
  'Manual Entry': { icon: FileText, color: 'bg-gray-500/20 text-gray-700 dark:text-gray-400 border-gray-500/30' }
};

export const ExpenseEntryCard = ({ entry, onViewDetails, onNavigateToSource }: ExpenseEntryCardProps) => {
  const sourceConf = sourceConfig[entry.source] || sourceConfig['Manual Entry'];
  const SourceIcon = sourceConf.icon;

  return (
    <Card className="border border-border transition-all duration-200 hover:shadow-md">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Category & Description */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Row */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/30 text-xs">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Expense
              </Badge>
              <Badge 
                variant="outline" 
                className={sourceConf.color + " text-xs cursor-pointer hover:opacity-80"}
                onClick={() => onNavigateToSource?.(entry.source)}
              >
                <SourceIcon className="h-3 w-3 mr-1" />
                {entry.source}
              </Badge>
            </div>

            {/* Category with Icon */}
            <div className="flex items-center gap-2">
              <span 
                className="text-lg"
                style={{ color: entry.categoryColor }}
              >
                {entry.categoryIcon}
              </span>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm sm:text-base text-foreground">
                  {entry.category}
                </h4>
              </div>
            </div>

            {/* Description */}
            <p className="text-xs text-muted-foreground line-clamp-2">
              {entry.description}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {entry.supplierName && (
                <span className="flex items-center gap-1">
                  <Package className="h-3 w-3" />
                  {entry.supplierName}
                </span>
              )}
              {entry.vehicleName && (
                <span className="flex items-center gap-1">
                  <Truck className="h-3 w-3" />
                  {entry.vehicleName}
                </span>
              )}
              {entry.staffPayeeName && (
                <span className="flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  {entry.staffPayeeName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>
          </div>

          {/* Right: Amount */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {/* Amount */}
            <div className="text-right">
              <p className="text-lg sm:text-xl font-bold text-red-600 dark:text-red-400">
                -{BANGLADESHI_CURRENCY_SYMBOL}{entry.amount.toLocaleString()}
              </p>
            </div>

            {/* Staff Badge */}
            <Badge variant="secondary" className="text-xs">
              {entry.staffName}
            </Badge>

            {/* View Details Button */}
            {onViewDetails && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 px-2 text-xs"
                onClick={() => onViewDetails(entry)}
              >
                <Eye className="h-3 w-3 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
