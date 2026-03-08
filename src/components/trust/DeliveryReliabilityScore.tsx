import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Truck, Clock, CheckCircle } from 'lucide-react';

interface Props {
  sellerId: string;
  compact?: boolean;
}

interface DeliveryScore {
  total_deliveries: number;
  on_time_pct: number;
  avg_delay_minutes: number;
  completion_rate: number;
}

export function DeliveryReliabilityScore({ sellerId, compact = false }: Props) {
  const [score, setScore] = useState<DeliveryScore | null>(null);

  useEffect(() => {
    supabase.rpc('get_seller_delivery_score', { _seller_id: sellerId }).then(({ data }) => {
      if (data && data.length > 0) setScore(data[0] as any);
    });
  }, [sellerId]);

  if (!score || score.total_deliveries === 0) return null;

  if (compact) {
    return (
      <Badge variant="secondary" className="text-[10px] bg-success/10 text-success border-0 gap-1">
        <Truck size={10} />
        On time {score.on_time_pct}%
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/50 border">
      <div className="flex items-center gap-1.5">
        <Truck size={14} className="text-primary" />
        <span className="text-xs font-semibold">Delivery Score</span>
      </div>
      <div className="flex items-center gap-3 ml-auto">
        <div className="text-center">
          <p className="text-sm font-bold text-primary">{score.on_time_pct}%</p>
          <p className="text-[9px] text-muted-foreground">On time</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{score.completion_rate}%</p>
          <p className="text-[9px] text-muted-foreground">Completed</p>
        </div>
        <div className="text-center">
          <p className="text-sm font-bold">{Math.round(score.avg_delay_minutes)}m</p>
          <p className="text-[9px] text-muted-foreground">Avg time</p>
        </div>
      </div>
    </div>
  );
}
