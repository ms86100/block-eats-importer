import { TrendingUp } from 'lucide-react';
import { ProductListingCard, ProductWithSeller } from '@/components/product/ProductListingCard';
import { useTrendingProducts } from '@/hooks/queries/useTrendingProducts';
import type { MarketplaceConfig } from '@/hooks/useMarketplaceConfig';
import type { BadgeConfigRow } from '@/hooks/useBadgeConfig';
import type { CategoryConfig } from '@/types/categories';

interface TrendingInSocietyProps {
  onProductTap?: (p: ProductWithSeller) => void;
  onNavigate?: (path: string) => void;
  categoryConfigs?: CategoryConfig[];
  marketplaceConfig?: MarketplaceConfig;
  badgeConfigs?: BadgeConfigRow[];
  socialProofMap?: Map<string, number>;
}

export function TrendingInSociety({
  onProductTap,
  onNavigate,
  categoryConfigs,
  marketplaceConfig,
  badgeConfigs,
  socialProofMap,
}: TrendingInSocietyProps) {
  const { data: trending = [] } = useTrendingProducts(10);

  if (trending.length < 3) return null;

  return (
    <div className="mt-5">
      <div className="flex items-center gap-1.5 px-4 mb-3">
        <TrendingUp size={14} className="text-primary" />
        <h3 className="font-extrabold text-[15px] text-foreground tracking-tight">
          Trending in your society
        </h3>
      </div>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 pb-1 snap-x snap-mandatory">
        {trending.map((product) => (
          <div key={product.id} className="w-[155px] shrink-0 snap-start">
            <ProductListingCard
              product={product}
              onTap={onProductTap}
              onNavigate={onNavigate}
              categoryConfigs={categoryConfigs}
              marketplaceConfig={marketplaceConfig}
              badgeConfigs={badgeConfigs}
              socialProofCount={socialProofMap?.get(product.id)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
