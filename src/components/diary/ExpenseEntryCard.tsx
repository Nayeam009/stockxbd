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
  ExternalLink,
  Crown,
  UserCog,
  User,
  Calendar,
  HelpCircle
} from "lucide-react";
import { BANGLADESHI_CURRENCY_SYMBOL } from "@/lib/bangladeshConstants";
import { format } from "date-fns";
import { ExpenseEntry } from "@/hooks/queries/useBusinessDiaryQueries";

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
  'Staff Salary Module': { 
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
  'Vehicle Module': { 
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

const staffRoleConfig: Record<string, { icon: React.ComponentType<any>; color: string; bgColor: string; label: string }> = {
  owner: { icon: Crown, color: 'text-purple-700 dark:text-purple-300', bgColor: 'bg-purple-100 dark:bg-purple-900/40', label: 'Owner' },
  manager: { icon: UserCog, color: 'text-blue-700 dark:text-blue-300', bgColor: 'bg-blue-100 dark:bg-blue-900/40', label: 'Manager' },
  driver: { icon: Truck, color: 'text-amber-700 dark:text-amber-300', bgColor: 'bg-amber-100 dark:bg-amber-900/40', label: 'Driver' },
  staff: { icon: Users, color: 'text-slate-700 dark:text-slate-300', bgColor: 'bg-slate-100 dark:bg-slate-900/40', label: 'Staff' },
  unknown: { icon: User, color: 'text-gray-700 dark:text-gray-300', bgColor: 'bg-gray-100 dark:bg-gray-900/40', label: 'Staff' }
};

export const ExpenseEntryCard = ({ entry, onViewDetails, onNavigateToSource }: ExpenseEntryCardProps) => {
  const sourceConf = sourceConfig[entry.source] || sourceConfig['Manual Entry'];
  const SourceIcon = sourceConf.icon;
  const roleConf = staffRoleConfig[entry.staffRole] || staffRoleConfig.unknown;
  const RoleIcon = roleConf.icon;

  return (
    <Card className="border overflow-hidden transition-all duration-300 hover:shadow-lg bg-card hover:bg-gradient-to-r hover:from-rose-50/30 dark:hover:from-rose-950/20 hover:to-card border-border/60 group">
      <div className="h-1 bg-rose-400/80" />
      <CardContent className="p-3 sm:p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          {/* Left: Category & Description */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header Badges */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <Badge variant="outline" className="bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-700 text-[10px] font-medium h-5">
                <ArrowDownRight className="h-2.5 w-2.5 mr-0.5" />Expense
              </Badge>
              <Badge variant="outline" 
                className={`${sourceConf.bgColor} ${sourceConf.color} ${sourceConf.hoverColor} text-[10px] cursor-pointer transition-colors border font-medium h-5`}
                onClick={() => onNavigateToSource?.(entry.source)}>
                <SourceIcon className="h-2.5 w-2.5 mr-0.5" />
                {entry.source.replace(' Module', '')}
                <ExternalLink className="h-2 w-2 ml-0.5 opacity-60" />
              </Badge>
            </div>

            {/* Category with Icon */}
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-md bg-muted/80 flex items-center justify-center shrink-0">
                <span className="text-lg" style={{ color: entry.categoryColor }}>{entry.categoryIcon}</span>
              </div>
              <div className="min-w-0">
                <h4 className="font-semibold text-sm text-foreground leading-tight line-clamp-1 group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors">
                  {entry.category}
                </h4>
                {entry.description && (
                  <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{entry.description}</p>
                )}
              </div>
            </div>

            {/* Why Spent */}
            <Badge variant="secondary" className="text-[10px] bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-0 font-medium h-5">
              <HelpCircle className="h-2.5 w-2.5 mr-0.5" />Why: {entry.whySpent}
            </Badge>

            {/* Metadata */}
            <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap">
              {entry.supplierName && (
                <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                  <Package className="h-2.5 w-2.5" />{entry.supplierName}
                </span>
              )}
              {entry.vehicleName && (
                <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                  <Truck className="h-2.5 w-2.5" />{entry.vehicleName}
                </span>
              )}
              {entry.staffPayeeName && (
                <span className="flex items-center gap-1 bg-muted/50 px-1.5 py-0.5 rounded">
                  <Users className="h-2.5 w-2.5" />{entry.staffPayeeName}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-2.5 w-2.5" />{format(new Date(entry.date), 'MMM dd')}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-2.5 w-2.5" />{format(new Date(entry.timestamp), 'hh:mm a')}
              </span>
            </div>
          </div>

          {/* Right: Amount & Staff */}
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <Badge variant="outline" className={`${roleConf.bgColor} ${roleConf.color} border-0 text-[10px] font-medium px-1.5 py-0.5 h-5`}>
              <RoleIcon className="h-2.5 w-2.5 mr-0.5" />{roleConf.label}
            </Badge>

            <p className="text-base sm:text-lg font-bold text-rose-600 dark:text-rose-400 tabular-nums">
              -{BANGLADESHI_CURRENCY_SYMBOL}{entry.amount.toLocaleString()}
            </p>

            {onViewDetails && (
              <Button variant="ghost" size="sm" 
                className="h-7 px-2 text-[10px] hover:bg-rose-100 dark:hover:bg-rose-900/30 hover:text-rose-600 dark:hover:text-rose-400"
                onClick={() => onViewDetails(entry)}>
                <Eye className="h-3 w-3 mr-0.5" />View
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
