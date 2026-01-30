import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface EditableStockCellProps {
  value: number;
  field: string;
  label: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'gray' | 'red' | 'amber';
  onUpdate: (value: number) => void;
}

const colorMap = {
  emerald: {
    bg: 'bg-emerald-50 dark:bg-emerald-950/30',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'text-emerald-500'
  },
  blue: {
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500'
  },
  gray: {
    bg: 'bg-gray-50 dark:bg-gray-900/30',
    text: 'text-gray-600 dark:text-gray-400',
    border: 'border-gray-200 dark:border-gray-700',
    icon: 'text-gray-500'
  },
  red: {
    bg: 'bg-red-50 dark:bg-red-950/30',
    text: 'text-red-600 dark:text-red-400',
    border: 'border-red-200 dark:border-red-800',
    icon: 'text-red-500'
  },
  amber: {
    bg: 'bg-amber-50 dark:bg-amber-950/30',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'text-amber-500'
  }
};

export const EditableStockCell = ({ 
  value, 
  field,
  label, 
  icon: Icon, 
  color, 
  onUpdate 
}: EditableStockCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const colors = colorMap[color];

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    setIsEditing(false);
    if (localValue !== value && localValue >= 0) {
      onUpdate(localValue);
    } else {
      setLocalValue(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleBlur();
    } else if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => setIsEditing(true)}
      className={cn(
        "flex flex-col items-center justify-center p-2 rounded-lg border transition-all",
        colors.bg,
        colors.border,
        !isEditing && "hover:shadow-sm cursor-pointer active:scale-95",
        "min-h-[56px] touch-manipulation"
      )}
    >
      <div className="flex items-center gap-1 mb-0.5">
        <Icon className={cn("h-3 w-3", colors.icon)} />
        <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
      </div>
      {isEditing ? (
        <Input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          value={localValue}
          onChange={(e) => setLocalValue(Math.max(0, parseInt(e.target.value) || 0))}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className={cn(
            "h-7 w-16 text-center text-lg font-bold p-0 border-0 bg-transparent focus-visible:ring-1",
            colors.text
          )}
        />
      ) : (
        <span className={cn("text-lg font-bold tabular-nums", colors.text)}>
          {value}
        </span>
      )}
    </button>
  );
};
