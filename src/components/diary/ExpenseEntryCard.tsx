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
  FileText,
  ExternalLink
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { format } from "date-fns";
import { ExpenseEntry } from "@/hooks/useBusinessDiaryData";

interface ExpenseEntryCardProps {
  entry: ExpenseEntry;
  onViewDetails?: (entry: ExpenseEntry) => void;
  onNavigateToSource?: (source: string) => void;
}

const sourceConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; hoverColor: string }> = {
  'POB': { 
    icon: Package, 
    color: 'text-indigo-700 dark:text-indigo-300',
    bgColor: 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-800',
    hoverColor: 'hover:bg-indigo-200 dark:hover:bg-indigo-800/60'
  },
  'Staff Salary': { 
    icon: Users, 
    color: 'text-teal-700 dark:text-teal-300',
    bgColor: 'bg-teal-100 dark:bg-teal-900/40 border-teal-200 dark:border-teal-800',
    hoverColor: 'hover:bg-teal-200 dark:hover:bg-teal-800/60'
  },
  'Vehicle Cost': { 
    icon: Truck, 
    color: 'text-amber-700 dark:text-amber-300',
    bgColor: 'bg-amber-100 dark:bg-amber-900/40 border-amber-200 dark:border-amber-800',
    hoverColor: 'hover:bg-amber-200 dark:hover:bg-amber-800/60'
  },
  'Manual Entry': { 
    icon: FileText, 
    color: 'text-slate-700 dark:text-slate-300',
    bgColor: 'bg-slate-100 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800',
    hoverColor: 'hover:bg-slate-200 dark:hover:bg-slate-800/60'
  }
};

export const ExpenseEntryCard = ({ entry, onViewDetails, onNavigateToSource }: ExpenseEntryCardProps) => {
  const sourceConf = sourceConfig[entry.source] || sourceConfig['Manual Entry'];
  const SourceIcon = sourceConf.icon;

  return (
    <Card className="border overflow-hidden transition-all duration-300 hover:shadow-lg bg-card hover:bg-gradient-to-r hover:from-rose-50/30 dark:hover:from-rose-950/20 hover:to-card border-border/60 group">
      {/* Top Color Bar */}
      <div className="h-0.5 bg-rose-400/60" />
      
      <CardContent className="p-3.5 sm:p-4">
        <div className="flex items-start justify-between gap-3">
          {/* Left: Category & Description */}
          <div className="flex-1 min-w-0 space-y-2.5">
            {/* Header Row with Badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-xs font-medium">
                <ArrowDownRight className="h-3 w-3 mr-1" />
                Expense
              </Badge>
              <Badge 
                variant="outline" 
                className={`${sourceConf.bgColor} ${sourceConf.color} ${sourceConf.hoverColor} text-xs cursor-pointer transition-colors border font-medium`}
                onClick={() => onNavigateToSource?.(entry.source)}
              >
                <SourceIcon className="h-3 w-3 mr-1" />
                {entry.source}
                <ExternalLink className="h-2.5 w-2.5 ml-1 opacity-60" />
              </Badge>
            </div>

            {/* Category with Icon */}
            <div className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-lg bg-muted/80 flex items-center justify-center shrink-0">
                <span className="text-xl" style={{ color: entry.categoryColor }}>
                  {entry.categoryIcon}
                </span>
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm sm:text-base text-foreground leading-tight line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {entry.category}
                </h4>
                {entry.description && (
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                    {entry.description}
                  </p>
                )}
              </div>
            </div>

            {/* Metadata Tags */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              {entry.supplierName && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Package className="h-3 w-3" />
                  <span className="font-medium">{entry.supplierName}</span>
                </span>
              )}
              {entry.vehicleName && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Truck className="h-3 w-3" />
                  <span className="font-medium">{entry.vehicleName}</span>
                </span>
              )}
              {entry.staffPayeeName && (
                <span className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                  <Users className="h-3 w-3" />
                  <span className="font-medium">{entry.staffPayeeName}</span>
                </span>
              )}
              <span className="flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                {format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>

          </div>

          {/* Right: Amount & Staff */}
          <div className="flex flex-col items-end gap-2.5 shrink-0">
            {/* Amount with Emphasis */}
            <div className="text-right">
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-rose-600 dark:text-rose-400 tabular-nums">
                -{BANGLADESHI_CURRENCY_SYMBOL}{entry.amount.toLocaleString()}
              </p>
            </div>

            {/* Staff Badge */}
            <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-0 font-medium">
              {entry.staffName}
            </Badge>

            {/* View Details Button */}
            {onViewDetails && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 px-3 text-xs hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                onClick={() => onViewDetails(entry)}
              >
                <Eye className="h-3.5 w-3.5 mr-1" />
                View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
