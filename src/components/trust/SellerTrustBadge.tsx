import { Shield, ShieldCheck, Award, Crown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type TrustTier = 'new' | 'tried' | 'trusted' | 'favorite';

interface SellerTrustBadgeProps {
  completedOrders: number;
  rating: number;
  size?: 'sm' | 'md';
  className?: string;
}

export function getSellerTrustTier(completedOrders: number, rating: number): TrustTier {
  if (completedOrders >= 100 && rating >= 4.5) return 'favorite';
  if (completedOrders >= 50) return 'trusted';
  if (completedOrders >= 5) return 'tried';
  return 'new';
}

const TIER_CONFIG: Record<TrustTier, { label: string; icon: typeof Shield; color: string; bg: string }> = {
  new: {
    label: 'New Seller',
    icon: Shield,
    color: 'text-muted-foreground',
    bg: 'bg-muted',
  },
  tried: {
    label: 'Community Tried',
    icon: ShieldCheck,
    color: 'text-blue-600 dark:text-blue-400',
    bg: 'bg-blue-50 dark:bg-blue-950/30',
  },
  trusted: {
    label: 'Community Trusted',
    icon: Award,
    color: 'text-primary',
    bg: 'bg-primary/10',
  },
  favorite: {
    label: 'Community Favorite',
    icon: Crown,
    color: 'text-amber-600 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/30',
  },
};

export function SellerTrustBadge({ completedOrders, rating, size = 'sm', className }: SellerTrustBadgeProps) {
  const tier = getSellerTrustTier(completedOrders, rating);
  const config = TIER_CONFIG[tier];
  const Icon = config.icon;

  if (size === 'sm') {
    return (
      <Badge
        variant="secondary"
        className={cn(
          'text-[9px] px-1.5 py-0 h-4 border-0 font-semibold gap-0.5',
          config.bg, config.color,
          className
        )}
      >
        <Icon size={9} className="shrink-0" />
        {config.label}
      </Badge>
    );
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold', config.bg, config.color, className)}>
      <Icon size={14} />
      <span>{config.label}</span>
    </div>
  );
}
