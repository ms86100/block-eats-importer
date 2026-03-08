import { Shield, Zap, Clock, Scale } from 'lucide-react';

interface Props {
  amount: number;
}

export function RefundTierBadge({ amount }: Props) {
  if (amount < 200) {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-success">
        <Zap size={10} />
        <span>Instant refund eligible</span>
      </div>
    );
  }

  if (amount <= 1000) {
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
