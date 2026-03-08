import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useStatusLabels } from '@/hooks/useStatusLabels';
import { ArrowLeft, TrendingUp, DollarSign, CreditCard, CheckCircle, Clock as ClockIcon } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth, isAfter, parseISO } from 'date-fns';
import { useCurrency } from '@/hooks/useCurrency';
import { Badge } from '@/components/ui/badge';

interface Settlement {
  id: string;
  order_id: string;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  settlement_status: string;
  created_at: string;
}

export default function SellerEarningsPage() {
  const { user, currentSellerId, sellerProfiles } = useAuth();
  const { formatPrice } = useCurrency();
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    allTime: 0,
    pendingPayout: 0,
  });

  const activeSellerId = currentSellerId || (sellerProfiles.length > 0 ? sellerProfiles[0].id : null);

  useEffect(() => {
    if (user && activeSellerId) {
      fetchEarnings(activeSellerId);
    } else {
      setIsLoading(false);
    }
  }, [user, activeSellerId]);

  const fetchEarnings = async (sellerId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('payment_settlements')
        .select('*')
        .eq('seller_id', sellerId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const list = (data as Settlement[]) || [];
      setSettlements(list);

      const today = startOfDay(new Date());
      const weekStart = startOfWeek(new Date());
      const monthStart = startOfMonth(new Date());

      const settled = list.filter(s => s.settlement_status === 'settled' || s.settlement_status === 'pending');
      const todaySettled = settled.filter(s => isAfter(parseISO(s.created_at), today));
      const weekSettled = settled.filter(s => isAfter(parseISO(s.created_at), weekStart));
      const monthSettled = settled.filter(s => isAfter(parseISO(s.created_at), monthStart));
      const pending = list.filter(s => s.settlement_status === 'pending');

      setStats({
        today: todaySettled.reduce((sum, s) => sum + Number(s.net_amount), 0),
        thisWeek: weekSettled.reduce((sum, s) => sum + Number(s.net_amount), 0),
        thisMonth: monthSettled.reduce((sum, s) => sum + Number(s.net_amount), 0),
        allTime: settled.reduce((sum, s) => sum + Number(s.net_amount), 0),
        pendingPayout: pending.reduce((sum, s) => sum + Number(s.net_amount), 0),
      });
    } catch (error) {
      console.error('Error fetching earnings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <AppLayout showHeader={false}>
        <div className="p-4">
          <Skeleton className="h-8 w-32 mb-4" />
          <Skeleton className="h-32 w-full rounded-xl mb-4" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </AppLayout>
    );
  }

  const statusConfig: Record<string, { label: string; color: string }> = {
    pending: { label: 'Pending', color: 'bg-warning/10 text-warning' },
    settled: { label: 'Settled', color: 'bg-success/10 text-success' },
    failed: { label: 'Failed', color: 'bg-destructive/10 text-destructive' },
  };

  return (
    <AppLayout showHeader={false}>
      <div className="p-4 safe-top">
        <Link to="/seller" className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-muted shrink-0 mb-4">
          <ArrowLeft size={18} className="text-foreground" />
        </Link>

        <h1 className="text-xl font-bold mb-4">Earnings & Payouts</h1>

        {/* Earnings Overview */}
        <div className="bg-gradient-to-r from-success/10 to-success/5 rounded-2xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="text-success" size={20} />
            <h3 className="font-semibold">Earnings Overview</h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">Today</p>
              <p className="text-xl font-bold text-success tabular-nums">{formatPrice(stats.today)}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">This Week</p>
              <p className="text-xl font-bold text-success tabular-nums">{formatPrice(stats.thisWeek)}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">This Month</p>
              <p className="text-xl font-bold text-success tabular-nums">{formatPrice(stats.thisMonth)}</p>
            </div>
            <div className="bg-background/50 rounded-lg p-3 text-center">
              <p className="text-xs text-muted-foreground">All Time</p>
              <p className="text-xl font-bold text-success tabular-nums">{formatPrice(stats.allTime)}</p>
            </div>
          </div>
        </div>

        {/* Pending Payout */}
        {stats.pendingPayout > 0 && (
          <Card className="mb-6 border-warning/30 bg-warning/5">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center">
                <DollarSign className="text-warning" size={24} />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Pending Settlement</p>
                <p className="text-sm text-muted-foreground">Awaiting payout</p>
              </div>
              <p className="text-xl font-bold text-warning tabular-nums">{formatPrice(stats.pendingPayout)}</p>
            </CardContent>
          </Card>
        )}

        {/* Settlement History */}
        <div>
          <h3 className="font-semibold mb-3">Settlement History</h3>

          {settlements.length > 0 ? (
            <div className="space-y-3">
              {settlements.map((settlement) => {
                const status = statusConfig[settlement.settlement_status] || statusConfig.pending;

                return (
                  <Card key={settlement.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            {settlement.settlement_status === 'settled' ? (
                              <CheckCircle size={18} className="text-success" />
                            ) : (
                              <ClockIcon size={18} className="text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-sm">
                              Order #{settlement.order_id.slice(0, 8)}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {format(new Date(settlement.created_at), 'MMM d, h:mm a')}
                            </p>
                            {settlement.platform_fee > 0 && (
                              <p className="text-[10px] text-muted-foreground mt-0.5">
                                Fee: {formatPrice(settlement.platform_fee)}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold tabular-nums">{formatPrice(settlement.net_amount)}</p>
                          <Badge variant="secondary" className={`text-[9px] mt-1 ${status.color} border-0`}>
                            {status.label}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 bg-muted rounded-xl">
              <DollarSign className="mx-auto text-muted-foreground mb-2" size={32} />
              <p className="text-sm text-muted-foreground">No settlements yet</p>
              <p className="text-xs text-muted-foreground mt-1">Settlements are created when orders are delivered</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
