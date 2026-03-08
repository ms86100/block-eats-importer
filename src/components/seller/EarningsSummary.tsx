import { Link } from 'react-router-dom';
import { TrendingUp, ChevronRight, Users, Repeat } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';

interface EarningsSummaryProps {
  todayEarnings: number;
  weekEarnings: number;
  totalEarnings: number;
  repeatBuyerPct?: number;
  uniqueCustomers?: number;
}

export function EarningsSummary({ todayEarnings, weekEarnings, totalEarnings, repeatBuyerPct, uniqueCustomers }: EarningsSummaryProps) {
  const { formatPrice } = useCurrency();
  return (
    <Link to="/seller/earnings">
      <div className="bg-gradient-to-r from-success/10 to-success/5 rounded-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-success" size={20} />
            <h3 className="font-semibold">Earnings Summary</h3>
          </div>
          <ChevronRight className="text-muted-foreground" size={18} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">Today</p>
            <p className="text-lg font-bold text-success tabular-nums">{formatPrice(todayEarnings)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">This Week</p>
            <p className="text-lg font-bold text-success tabular-nums">{formatPrice(weekEarnings)}</p>
          </div>
          <div className="bg-background/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">All Time</p>
            <p className="text-lg font-bold text-success tabular-nums">{formatPrice(totalEarnings)}</p>
          </div>
        </div>
        {/* Trust metrics row */}
        {(repeatBuyerPct != null || uniqueCustomers != null) && (
          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-success/10">
            {uniqueCustomers != null && (
              <div className="flex items-center gap-1.5">
                <Users size={13} className="text-primary" />
                <span className="text-xs font-semibold text-foreground">{uniqueCustomers}</span>
                <span className="text-[10px] text-muted-foreground">customers</span>
              </div>
            )}
            {repeatBuyerPct != null && repeatBuyerPct > 0 && (
              <div className="flex items-center gap-1.5">
                <Repeat size={13} className="text-accent" />
                <span className="text-xs font-semibold text-foreground">{repeatBuyerPct}%</span>
                <span className="text-[10px] text-muted-foreground">repeat</span>
              </div>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
