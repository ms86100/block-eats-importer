import { useState, useMemo, useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { format, addDays, startOfToday, isSameDay } from 'date-fns';
import { useSellerServiceBookings } from '@/hooks/useServiceBookings';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Clock, User, ChevronLeft, ChevronRight, UserCheck, Check, X, AlertTriangle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useEffect } from 'react';

interface ServiceBookingsCalendarProps {
  sellerId: string;
  supportsStaffAssignment?: boolean;
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

export function ServiceBookingsCalendar({ sellerId, supportsStaffAssignment = false }: ServiceBookingsCalendarProps) {
  const { data: bookings = [], isLoading, refetch } = useSellerServiceBookings(sellerId);
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([]);
  const [actionLoading, setActionLoading] = useState<BookingAction>(null);

  useEffect(() => {
    // [BUG FIX #M1] Add cleanup flag for unmount
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('service_staff')
        .select('id, name')
        .eq('seller_id', sellerId)
        .eq('is_active', true)
        .order('name');
      if (!cancelled) setStaffList((data || []) as { id: string; name: string }[]);
    })();
    return () => { cancelled = true; };
  }, [sellerId]);

  // [BUG FIX #H6] Add seller_id filter to staff assignment
  const assignStaff = useCallback(async (bookingId: string, staffId: string | null) => {
    const { error } = await supabase
      .from('service_bookings')
      .update({ staff_id: staffId })
      .eq('id', bookingId)
      .eq('seller_id', sellerId); // Ownership check
    if (error) {
      toast.error('Failed to assign staff');
      return;
    }
    refetch();
    toast.success(staffId ? 'Staff assigned' : 'Staff unassigned');
  }, [sellerId, refetch]);

  // [BUG FIX] Use ref instead of state for guard to avoid stale closure
  const actionLoadingRef = useRef<BookingAction>(null);

  const updateBookingStatus = useCallback(async (bookingId: string, orderId: string, newStatus: string) => {
    if (actionLoadingRef.current) {
      toast.info('Please wait for the current action to complete');
      return;
    }

    actionLoadingRef.current = { id: bookingId, action: newStatus };
    setActionLoading({ id: bookingId, action: newStatus });
    try {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) {
        toast.error('Booking not found');
        return;
      }

      // Prevent invalid transitions
      const validTransitions: Record<string, string[]> = {
        requested: ['confirmed', 'cancelled'],
        confirmed: ['in_progress', 'no_show', 'cancelled'],
        scheduled: ['in_progress', 'no_show', 'cancelled'],
        rescheduled: ['confirmed', 'in_progress', 'no_show', 'cancelled'],
        in_progress: ['completed'],
      };
      const allowed = validTransitions[booking.status] || [];
      if (!allowed.includes(newStatus)) {
        toast.error(`Cannot transition from "${booking.status}" to "${newStatus}"`);
        return;
      }

      // Update booking — ownership check via seller_id
      const { error: bookingErr } = await supabase
        .from('service_bookings')
        .update({
          status: newStatus,
          ...(newStatus === 'cancelled' ? { cancelled_at: new Date().toISOString(), cancellation_reason: 'Rejected by seller' } : {}),
        })
        .eq('id', bookingId)
        .eq('seller_id', sellerId);

      if (bookingErr) throw bookingErr;

      // Map booking status to order status
      const orderStatusMap: Record<string, string> = {
        confirmed: 'confirmed',
        cancelled: 'cancelled',
        no_show: 'no_show',
        completed: 'completed',
        in_progress: 'in_progress',
      };
      const orderStatus = orderStatusMap[newStatus] || newStatus;

      // [BUG FIX #H8] Add seller_id filter to order update too
      await supabase
        .from('orders')
        .update({
          status: orderStatus,
          ...(newStatus === 'cancelled' ? { rejection_reason: 'Rejected by seller' } : {}),
        })
        .eq('id', orderId)
        .eq('seller_id', sellerId);

      // Atomically free slot on cancel/no_show
      if ((newStatus === 'cancelled' || newStatus === 'no_show') && booking.slot_id) {
        await supabase.rpc('release_service_slot', { _slot_id: booking.slot_id });
      }

      // Notify buyer about status change
      const notifTitles: Record<string, string> = {
        confirmed: '✅ Booking Confirmed',
        cancelled: '❌ Booking Rejected',
        no_show: '⚠️ Marked as No-Show',
        in_progress: '🔧 Service Started',
        completed: '🎉 Service Completed',
      };
      const notifBodies: Record<string, string> = {
        confirmed: `Your ${booking.product_name || 'appointment'} on ${booking.booking_date} has been confirmed!`,
        cancelled: `Your ${booking.product_name || 'appointment'} on ${booking.booking_date} was not accepted by the seller.`,
        no_show: `You were marked as a no-show for ${booking.product_name || 'your appointment'}.`,
        in_progress: `Your ${booking.product_name || 'service'} has started!`,
        completed: `Your ${booking.product_name || 'service'} is complete. We hope you enjoyed it!`,
      };

      if (notifTitles[newStatus] && booking.buyer_id) {
        await supabase.from('notification_queue').insert({
          user_id: booking.buyer_id,
          type: 'order',
          title: notifTitles[newStatus],
          body: notifBodies[newStatus] || 'Your booking has been updated.',
          reference_path: `/orders/${booking.order_id}`,
          payload: { orderId: booking.order_id, status: newStatus, type: 'order' },
        });
        supabase.functions.invoke('process-notification-queue').catch(() => {});
      }

      refetch();
      queryClient.invalidateQueries({ queryKey: ['service-slots'] });
      queryClient.invalidateQueries({ queryKey: ['service-booking-order'] });

      const labels: Record<string, string> = {
        confirmed: 'Booking confirmed',
        cancelled: 'Booking rejected',
        no_show: 'Marked as no-show',
        in_progress: 'Service started',
        completed: 'Service completed',
      };
      toast.success(labels[newStatus] || 'Booking updated');
    } catch (err: any) {
      console.error('Update booking error:', err);
      toast.error('Failed to update booking');
    } finally {
      actionLoadingRef.current = null;
      setActionLoading(null);
    }
  }, [bookings, sellerId, refetch, queryClient]);

  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      dates.push(addDays(selectedDate, i - selectedDate.getDay()));
    }
    return dates;
  }, [selectedDate]);

  const filteredBookings = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return bookings
      .filter((b) => b.booking_date === dateStr)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''));
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
                      {/* Only show staff assignment when category supports it and for non-terminal statuses */}
                      {supportsStaffAssignment && staffList.length > 0 && !['cancelled', 'completed', 'no_show'].includes(booking.status) && (
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
                        {isActionLoading && actionLoading?.action === 'confirmed' ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'cancelled')}
                      >
                        {isActionLoading && actionLoading?.action === 'cancelled' ? <Loader2 className="animate-spin" size={12} /> : <X size={12} />} Reject
                      </Button>
                    </div>
                  )}

                  {booking.status === 'rescheduled' && (
                    <div className="flex gap-2 pt-1 border-t border-border">
                      <Button
                        size="sm"
                        className="flex-1 h-7 text-xs gap-1"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'confirmed')}
                      >
                        {isActionLoading && actionLoading?.action === 'confirmed' ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 h-7 text-xs gap-1 border-destructive/30 text-destructive hover:bg-destructive/10"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'cancelled')}
                      >
                        {isActionLoading && actionLoading?.action === 'cancelled' ? <Loader2 className="animate-spin" size={12} /> : <X size={12} />} Reject
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
                        {isActionLoading && actionLoading?.action === 'in_progress' ? <Loader2 className="animate-spin" size={12} /> : null}
                        Start Service
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs gap-1 text-destructive hover:bg-destructive/10"
                        disabled={isActionLoading}
                        onClick={() => updateBookingStatus(booking.id, booking.order_id, 'no_show')}
                      >
                        {isActionLoading && actionLoading?.action === 'no_show' ? <Loader2 className="animate-spin" size={12} /> : <AlertTriangle size={12} />} No Show
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
                        {isActionLoading && actionLoading?.action === 'completed' ? <Loader2 className="animate-spin" size={12} /> : <Check size={12} />} Mark Completed
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
