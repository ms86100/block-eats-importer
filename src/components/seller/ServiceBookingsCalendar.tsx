import { useState, useMemo } from 'react';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { useSellerServiceBookings } from '@/hooks/useServiceBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, UserCheck, Check, X, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface ServiceBookingsCalendarProps {
  sellerId: string;
}

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-emerald-100 text-emerald-700',
  scheduled: 'bg-cyan-100 text-cyan-700',
  on_the_way: 'bg-orange-100 text-orange-700',
  arrived: 'bg-teal-100 text-teal-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-green-100 text-green-700',
  rescheduled: 'bg-purple-100 text-purple-700',
  no_show: 'bg-red-100 text-red-700',
};

type BookingAction = { id: string; action: string } | null;

export function ServiceBookingsCalendar({ sellerId }: ServiceBookingsCalendarProps) {
  const { data: bookings = [], isLoading, refetch } = useSellerServiceBookings(sellerId);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [actionLoading, setActionLoading] = useState<BookingAction>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('service_staff')
        .select('id, name')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('name');
      setStaffList((data || []) as { id: string; name: string }[]);
    })();
  }, [sellerId]);

  const assignStaff = async (bookingId: string, staffId: string | null) => {
    await supabase
      .from('service_bookings')
      .update({ staff_id: staffId })
      .eq('id', bookingId);
    refetch();
    toast.success(staffId ? 'Staff assigned' : 'Staff unassigned');
  };

  const updateBookingStatus = async (bookingId: string, orderId: string, newStatus: string) => {
    setActionLoading({ id: bookingId, action: newStatus });
    try {
      await supabase
        .from('service_bookings')
        .update({ status: newStatus, ...(newStatus === 'cancelled' ? { cancelled_at: new Date().toISOString(), cancellation_reason: 'Rejected by seller' } : {}) })
        .eq('id', bookingId);

      const orderStatus = newStatus === 'confirmed' ? 'confirmed' : newStatus === 'cancelled' ? 'cancelled' : newStatus === 'no_show' ? 'no_show' : newStatus === 'completed' ? 'completed' : newStatus;
      await supabase
        .from('orders')
        .update({ status: orderStatus, ...(newStatus === 'cancelled' ? { rejection_reason: 'Rejected by seller' } : {}) })
        .eq('id', orderId);

      // Free slot on cancel/no_show
      if (newStatus === 'cancelled' || newStatus === 'no_show') {
        const booking = bookings.find(b => b.id === bookingId);
        if (booking?.slot_id) {
          const { data: slotData } = await supabase
            .from('service_slots')
            .select('booked_count')
            .eq('id', booking.slot_id)
            .single();
          if (slotData) {
            await supabase
              .from('service_slots')
              .update({ booked_count: Math.max(0, slotData.booked_count - 1) })
              .eq('id', booking.slot_id);
          }
        }
      }

      refetch();
      toast.success(`Booking ${newStatus === 'confirmed' ? 'confirmed' : newStatus === 'cancelled' ? 'rejected' : newStatus === 'no_show' ? 'marked no-show' : 'updated'}`);
    } catch (err: any) {
      toast.error('Failed to update booking');
    } finally {
      setActionLoading(null);
    }
  };

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(selectedDate, i - selectedDate.getDay()));
    }
    return dates;
  }, [selectedDate]);

  const filteredBookings = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return bookings.filter((b) => b.booking_date === dateStr);
  }, [bookings, selectedDate]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={18} className="text-primary" />
            Upcoming Bookings
          </CardTitle>
          <span className="text-xs text-muted-foreground">{bookings.length} total</span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Week day selector */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
            <ChevronLeft size={14} />
          </Button>
          <div className="flex gap-1 flex-1">
            {weekDates.map((date) => {
              const isToday = isSameDay(date, startOfToday());
              const isSelected = isSameDay(date, selectedDate);
              const hasBookings = bookings.some((b) => b.booking_date === format(date, 'yyyy-MM-dd'));
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => setSelectedDate(date)}
                  className={cn(
                    'flex-1 flex flex-col items-center py-1.5 rounded-lg text-xs transition-colors',
                    isSelected ? 'bg-primary text-primary-foreground' : isToday ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  )}
                >
                  <span className="font-medium">{format(date, 'EEE')}</span>
                  <span className="text-[10px]">{format(date, 'd')}</span>
                  {hasBookings && !isSelected && <div className="w-1 h-1 rounded-full bg-primary mt-0.5" />}
                </button>
              );
            })}
          </div>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
            <ChevronRight size={14} />
          </Button>
        </div>

        {/* Bookings for selected date */}
        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">
            {format(selectedDate, 'EEEE, MMM d')} • {filteredBookings.length} bookings
          </p>

          {filteredBookings.length === 0 ? (
            <div className="text-center py-6 text-sm text-muted-foreground">
              No bookings for this date
            </div>
          ) : (
            filteredBookings.map((booking) => {
              const isActionLoading = actionLoading?.id === booking.id;
              return (
                <div key={booking.id} className="p-3 rounded-lg border bg-card space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center text-center min-w-[50px]">
                      <Clock size={12} className="text-muted-foreground mb-0.5" />
                      <span className="text-xs font-semibold">{booking.start_time?.slice(0, 5)}</span>
                      <span className="text-[10px] text-muted-foreground">{booking.end_time?.slice(0, 5)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{booking.product_name || 'Service'}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <User size={10} />
                        {booking.buyer_name || 'Customer'}
                      </p>
                      {/* Staff assignment */}
                      {staffList.length > 0 && (
                        <div className="mt-1">
                          <Select
                            value={(booking as any).staff_id || 'none'}
                            onValueChange={(v) => assignStaff(booking.id, v === 'none' ? null : v)}
                          >
                            <SelectTrigger className="h-6 text-[10px] w-auto min-w-[100px]">
                              <UserCheck size={10} className="mr-1" />
                              <SelectValue placeholder="Assign staff" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Unassigned</SelectItem>
                              {staffList.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    <Badge variant="secondary" className={cn('text-[10px] shrink-0', STATUS_COLORS[booking.status] || '')}>
                      {booking.status}
                    </Badge>
                  </div>

                  {/* Action buttons based on status */}
                  {booking.status === 'requested' && (
                    <div className="flex gap-2 pt-1 border-t border-border">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'confirmed')}
                      >
                        <Check size={12} /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'cancelled')}
                      >
                        <X size={12} /> Reject
                      </Button>
                    </div>
                  )}

                  {['confirmed', 'scheduled'].includes(booking.status) && (
                    <div className="flex gap-2 pt-1 border-t border-border">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'in_progress')}
                      >
                        Start Service
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'no_show')}
                      >
                        <AlertTriangle size={12} /> No Show
                      </Button>
                    </div>
                  )}

                  {booking.status === 'in_progress' && (
                    <div className="pt-1 border-t border-border">
                      <Button
                        size="sm"
                        className="w-full h-7 text-xs gap-1"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'completed')}
                      >
                        <Check size={12} /> Mark Completed
                      </Button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
