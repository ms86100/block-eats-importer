import { Badge } from '@/components/ui/badge';
import { Sprout, Store, Award, Crown } from 'lucide-react';

interface Props {
  completedOrders: number;
  rating: number;
  isRegistered?: boolean;
}

const TIERS = [
  { min: 0, max: 4, key: 'hobby', label: 'Hobby Seller', icon: Sprout, color: 'bg-muted text-muted-foreground' },
  { min: 5, max: 24, key: 'home', label: 'Home Business', icon: Store, color: 'bg-primary/10 text-primary' },
  { min: 25, max: 99, key: 'registered', label: 'Verified Business', icon: Award, color: 'bg-success/10 text-success' },
  { min: 100, max: Infinity, key: 'top', label: 'Top Seller', icon: Crown, color: 'bg-amber-100 text-amber-700' },
] as const;

type Tier = typeof TIERS[number];

export function SellerGrowthTier({ completedOrders, rating, isRegistered }: Props) {
  let tier: Tier = TIERS[0];
  for (const t of TIERS) {
    if (completedOrders >= t.min && completedOrders <= t.max) {
      tier = t;
      break;
    }
  }

  // Top seller requires 4.5+ rating
  if (tier.key === 'top' && rating < 4.5) {
    tier = TIERS[2];
  }

  const Icon = tier.icon;
  const nextTier = TIERS[TIERS.indexOf(tier) + 1];
  const ordersToNext = nextTier ? nextTier.min - completedOrders : 0;

  return (
    <div className="space-y-1">
      <Badge className={`${tier.color} border-0 text-[10px] gap-1`}>
        <Icon size={10} />
        {tier.label}
      </Badge>
      {nextTier && ordersToNext > 0 && (
        <p className="text-[9px] text-muted-foreground">
          {ordersToNext} more order{ordersToNext > 1 ? 's' : ''} to reach {nextTier.label}
        </p>
      )}
    </div>
  );
}
