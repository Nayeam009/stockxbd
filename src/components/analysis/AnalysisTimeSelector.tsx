import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export type TimeRange = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

interface AnalysisTimeSelectorProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
  customRange?: { from: Date; to: Date } | null;
  onCustomRangeChange?: (range: { from: Date; to: Date } | null) => void;
}

export const AnalysisTimeSelector = ({
  timeRange,
  onTimeRangeChange,
  customRange,
  onCustomRangeChange
}: AnalysisTimeSelectorProps) => {
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [tempFrom, setTempFrom] = useState<Date | undefined>(customRange?.from);
  const [tempTo, setTempTo] = useState<Date | undefined>(customRange?.to);

  const handleApplyCustomRange = () => {
    if (tempFrom && tempTo && onCustomRangeChange) {
      onCustomRangeChange({ from: tempFrom, to: tempTo });
      onTimeRangeChange('custom');
      setDatePickerOpen(false);
    }
  };

  const ranges: { key: TimeRange; label: string }[] = [
    { key: 'daily', label: 'Today' },
    { key: 'weekly', label: 'Week' },
    { key: 'monthly', label: 'Month' },
    { key: 'yearly', label: 'Year' },
  ];

  return (
    <div className="flex items-center justify-center gap-2 flex-wrap">
      <div className="inline-flex items-center gap-1 p-1.5 bg-muted/60 rounded-xl border border-border/50">
        {ranges.map((range) => (
          <Button
            key={range.key}
            variant="ghost"
            size="sm"
            onClick={() => onTimeRangeChange(range.key)}
            className={cn(
              "h-10 px-4 sm:px-5 text-xs sm:text-sm capitalize rounded-lg transition-all duration-200 touch-manipulation",
              timeRange === range.key
                ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                : "hover:bg-background/80"
            )}
          >
            {range.label}
          </Button>
        ))}
        
        <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-10 px-3 text-xs sm:text-sm rounded-lg transition-all duration-200 touch-manipulation gap-1.5",
                timeRange === 'custom'
                  ? "bg-primary text-primary-foreground shadow-md hover:bg-primary/90"
                  : "hover:bg-background/80"
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Custom</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-4" align="end">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm font-medium">Select Date Range</p>
                <div className="grid gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">From</label>
                    <Calendar
                      mode="single"
                      selected={tempFrom}
                      onSelect={setTempFrom}
                      disabled={(date) => date > new Date()}
                      className={cn("p-3 pointer-events-auto rounded-md border")}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">To</label>
                    <Calendar
                      mode="single"
                      selected={tempTo}
                      onSelect={setTempTo}
                      disabled={(date) => date > new Date() || (tempFrom && date < tempFrom)}
                      className={cn("p-3 pointer-events-auto rounded-md border")}
                    />
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleApplyCustomRange} 
                className="w-full"
                disabled={!tempFrom || !tempTo}
              >
                Apply Range
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      {timeRange === 'custom' && customRange && (
        <span className="text-xs text-muted-foreground">
          {format(customRange.from, 'MMM d')} - {format(customRange.to, 'MMM d, yyyy')}
        </span>
      )}
    </div>
  );
};

export default AnalysisTimeSelector;
