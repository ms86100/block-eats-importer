import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarCheck, Clock, UserX, XCircle, CheckCircle2, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import { SERVICE_STATUS_LABELS } from '@/types/service';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface BookingRow {
  id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  status: string;
  location_type: string;
  created_at: string;
  buyer: { name: string } | null;
  product: { name: string } | null;
  seller: { business_name: string } | null;
}

function useAdminServiceBookings(statusFilter: string) {
  return useQuery({
    queryKey: ['admin-service-bookings', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('service_bookings')
        .select('id, booking_date, start_time, end_time, status, location_type, created_at, buyer:profiles!service_bookings_buyer_id_fkey(name), product:products!service_bookings_product_id_fkey(name), seller:seller_profiles!service_bookings_seller_id_fkey(business_name)')
        .order('booking_date', { ascending: false })
        .order('start_time', { ascending: false })
        .limit(100);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as BookingRow[];
    },
  });
}

function useServiceBookingStats() {
  return useQuery({
    queryKey: ['admin-service-booking-stats'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_bookings')
        .select('status');
      if (error) throw error;
      const rows = data || [];
      return {
        total: rows.length,
        pending: rows.filter(r => r.status === 'requested').length,
        confirmed: rows.filter(r => r.status === 'confirmed' || r.status === 'scheduled').length,
        completed: rows.filter(r => r.status === 'completed').length,
        noShow: rows.filter(r => r.status === 'no_show').length,
        cancelled: rows.filter(r => r.status === 'cancelled').length,
      };
    },
  });
}

function StatMini({ icon: Icon, value: v, label, color, delay = 0 }: { icon: any; value: number; label: string; color: string; delay?: number }) {
  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, delay }}>
      <Card className="border-0 shadow-[var(--shadow-card)] rounded-2xl">
        <CardContent className="p-3 flex items-center gap-2.5">
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', color)}>
            <Icon size={15} className="text-white" />
          </div>
          <div>
            <p className="text-lg font-extrabold tabular-nums leading-tight">{v}</p>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">{label}</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AdminServiceBookingsTab() {
  const [statusFilter, setStatusFilter] = useState('all');
  const { data: bookings, isLoading } = useAdminServiceBookings(statusFilter);
  const { data: stats } = useServiceBookingStats();

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-[68px] rounded-2xl" />)}
        </div>
        {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-2xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <StatMini icon={CalendarCheck} value={stats?.total ?? 0} label="Total" color="bg-blue-500" delay={0} />
        <StatMini icon={Clock} value={stats?.pending ?? 0} label="Pending" color="bg-amber-500" delay={0.05} />
        <StatMini icon={CheckCircle2} value={stats?.completed ?? 0} label="Done" color="bg-emerald-500" delay={0.1} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <StatMini icon={AlertCircle} value={stats?.confirmed ?? 0} label="Confirmed" color="bg-cyan-500" delay={0.15} />
        <StatMini icon={UserX} value={stats?.noShow ?? 0} label="No-show" color="bg-rose-500" delay={0.2} />
        <StatMini icon={XCircle} value={stats?.cancelled ?? 0} label="Cancelled" color="bg-muted-foreground" delay={0.25} />
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">Service Bookings</h3>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 h-8 text-xs rounded-xl border-border/60">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="requested">Requested</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="no_show">No Show</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Booking list */}
      {bookings && bookings.length > 0 ? (
        <div className="space-y-2.5">
          {bookings.map((b) => {
            const statusInfo = SERVICE_STATUS_LABELS[b.status] || { label: b.status, color: 'bg-muted text-muted-foreground' };
            return (
              <motion.div key={b.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="border-0 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-md)] transition-all duration-300 rounded-2xl">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate">{(b.product as any)?.name || 'Service'}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Buyer: <span className="font-medium text-foreground">{(b.buyer as any)?.name || '—'}</span>
                          {' • '}Seller: <span className="font-medium text-foreground">{(b.seller as any)?.business_name || '—'}</span>
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-semibold">
                            {format(new Date(b.booking_date), 'MMM d, yyyy')}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {b.start_time?.slice(0, 5)} – {b.end_time?.slice(0, 5)}
                          </span>
                          <Badge variant="outline" className="text-[10px] capitalize rounded-md h-5">
                            {b.location_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                      </div>
                      <span className={cn('text-[10px] px-2.5 py-1 rounded-full font-semibold whitespace-nowrap', statusInfo.color)}>
                        {statusInfo.label}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-muted/80 flex items-center justify-center mb-3">
            <CalendarCheck size={22} className="text-muted-foreground/60" />
          </div>
          <p className="text-sm text-muted-foreground font-medium">No service bookings found</p>
        </div>
      )}
    </div>
  );
}
