import { Crown, ShoppingCart } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import type { SignupCategory } from "@/lib/authConstants";

interface SignupCategorySelectorProps {
  value: SignupCategory;
  onChange: (category: SignupCategory) => void;
  disabled?: boolean;
}

const categories = [
  {
    id: 'customer' as const,
    label: 'Customer',
    description: 'Order LPG online',
    icon: ShoppingCart,
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30',
    borderColor: 'border-emerald-500',
  },
  {
    id: 'owner' as const,
    label: 'Shop Owner',
    description: 'Full business control',
    icon: Crown,
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    borderColor: 'border-amber-500',
  }
];

export const SignupCategorySelector = ({
  value,
  onChange,
  disabled
}: SignupCategorySelectorProps) => {
  return (
    <div className="mb-6">
      <Label className="mb-3 block">I want to...</Label>
      <div className="grid grid-cols-2 gap-3">
        {categories.map((category) => {
          const Icon = category.icon;
          const isSelected = value === category.id;
          return (
            <button
              key={category.id}
              type="button"
              onClick={() => onChange(category.id)}
              disabled={disabled}
              className={cn(
                "p-4 rounded-xl border-2 transition-all text-center touch-target",
                isSelected
                  ? `${category.borderColor} ${category.bgColor}`
                  : 'border-border hover:border-muted-foreground/50'
              )}
            >
              <Icon className={cn("h-8 w-8 mx-auto mb-2", category.color)} />
              <span className="font-semibold text-sm block">{category.label}</span>
              <span className="text-xs text-muted-foreground block leading-tight mt-1">
                {category.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
