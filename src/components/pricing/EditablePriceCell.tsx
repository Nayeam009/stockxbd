import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EditablePriceCellProps {
  productId: string;
  field: string;
  value: number;
  label: string;
  icon: LucideIcon;
  colorClass: string;
  isModified: boolean;
  onValueChange: (productId: string, field: string, value: number) => void;
  customerType?: 'retail' | 'wholesale' | null;
}

export const EditablePriceCell = ({
  productId,
  field,
  value,
  label,
  icon: Icon,
  colorClass,
  isModified,
  onValueChange
}: EditablePriceCellProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const companyCommitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  useEffect(() => {
    return () => {
      if (companyCommitTimerRef.current) {
        clearTimeout(companyCommitTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleBlur = () => {
    if (localValue !== value) {
      onValueChange(productId, field, localValue);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (localValue !== value) {
        onValueChange(productId, field, localValue);
      }
      setIsEditing(false);
    }
    if (e.key === 'Escape') {
      setLocalValue(value);
      setIsEditing(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 font-medium">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </span>
      <div
        onClick={() => setIsEditing(true)}
        className={cn(
          "px-3 py-2.5 rounded-lg cursor-pointer transition-all text-center min-h-[44px] flex items-center justify-center",
          colorClass,
          isModified && "ring-2 ring-primary ring-offset-1 ring-offset-background"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && setIsEditing(true)}
        aria-label={`Edit ${label} price`}
      >
        {isEditing ? (
          <Input
            ref={inputRef}
            type="number"
            value={localValue}
            onChange={(e) => {
              const nextValue = Number(e.target.value);
              setLocalValue(nextValue);

              // Live update for Company price so LPG can auto-fill Wholesale/Retail immediately.
              if (field === 'company_price') {
                if (companyCommitTimerRef.current) {
                  clearTimeout(companyCommitTimerRef.current);
                }
                companyCommitTimerRef.current = setTimeout(() => {
                  onValueChange(productId, field, nextValue);
                }, 150);
              }
            }}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            className="h-7 text-center font-semibold border-0 bg-transparent p-0 text-base focus-visible:ring-0"
            min={0}
          />
        ) : (
          <div className="flex flex-col items-center">
            <span className="font-semibold text-sm sm:text-base tabular-nums">
              ৳{value.toLocaleString()}
            </span>
            {/* Removed extra helper text for cleaner cards */}
          </div>
        )}
      </div>
    </div>
  );
};
