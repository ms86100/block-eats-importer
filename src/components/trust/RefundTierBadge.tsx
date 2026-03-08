import { Shield, Zap, Clock, Scale } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  amount: number;
}

interface RefundTier {
  tier: string;
  label: string;
  description: string;
}

export function RefundTierBadge({ amount }: Props) {
  const [tier, setTier] = useState<RefundTier | null>(null);

  useEffect(() => {
    supabase.rpc('get_refund_tier', { _amount: amount }).then(({ data, error }) => {
      if (error) {
        console.warn('[RefundTierBadge] RPC error, using fallback:', error.message);
        // Fallback to local logic
        if (amount < 200) setTier({ tier: 'instant', label: 'Instant Refund', description: 'Processed immediately' });
        else if (amount <= 1000) setTier({ tier: '24h', label: '24h Review', description: 'Reviewed within 24 hours' });
        else setTier({ tier: 'mediation', label: 'Dispute Mediation', description: 'Handled by community committee' });
        return;
      }
      if (data) setTier(data as unknown as RefundTier);
    });
  }, [amount]);

  if (!tier) return null;

  if (tier.tier === 'instant') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-success">
        <Zap size={10} />
        <span>Instant refund eligible</span>
      </div>
    );
  }

  if (tier.tier === '24h') {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-primary">
        <Clock size={10} />
        <span>24h refund review</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
      <Scale size={10} />
      <span>Dispute mediation for refunds</span>
    </div>
  );
}
