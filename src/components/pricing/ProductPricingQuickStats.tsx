import { DollarSign, Package, TrendingUp, Wrench, Flame } from 'lucide-react';
import { PremiumStatCard } from '@/components/shared/PremiumStatCard';

interface ProductPricingQuickStatsProps {
  stats: {
    totalProducts: number;
    lpgCount: number;
    stoveCount: number;
    regulatorCount: number;
    avgMargin: number;
  };
}

export const ProductPricingQuickStats = ({ stats }: ProductPricingQuickStatsProps) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
      <PremiumStatCard
        title="Total Products"
        value={stats.totalProducts}
        icon={<DollarSign className="h-4 w-4" />}
        colorScheme="primary"
      />
      <PremiumStatCard
        title="LPG Prices"
        value={stats.lpgCount}
        icon={<Flame className="h-4 w-4" />}
        colorScheme="primary"
      />
      <PremiumStatCard
        title="Avg Margin"
        value={`৳${stats.avgMargin}`}
        icon={<TrendingUp className="h-4 w-4" />}
        colorScheme="emerald"
      />
      <PremiumStatCard
        title="Accessories"
        value={stats.stoveCount + stats.regulatorCount}
        icon={<Wrench className="h-4 w-4" />}
        colorScheme="purple"
      />
    </div>
  );
};
