import { useState, useMemo } from 'react';
import { format, differenceInHours } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { useServiceSlots, slotsToPickerFormat, findSlot } from '@/hooks/useServiceSlots';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CalendarClock, XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface ServiceBookingActionsProps {
  orderId: string;
  productId: string;
  bookingId: string;
  bookingDate: string;
  startTime: string;
  cancellationNoticeHours?: number;
  reschedulingNoticeHours?: number;
  onUpdated: () => void;
}

export function ServiceBookingActions({
  orderId,
  productId,
  bookingId,
  bookingDate,
  startTime,
  cancellationNoticeHours = 24,
  reschedulingNoticeHours = 12,
  onUpdated,
}: ServiceBookingActionsProps) {
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();

  const { data: serviceSlots = [] } = useServiceSlots(isRescheduleOpen ? productId : undefined);
  const availableSlots = useMemo(
    () => (serviceSlots.length > 0 ? slotsToPickerFormat(serviceSlots) : undefined),
    [serviceSlots]
  );

  // Calculate hours until appointment
  const appointmentDateTime = new Date(`${bookingDate}T${startTime}`);
  const hoursUntil = differenceInHours(appointmentDateTime, new Date());
  const canReschedule = hoursUntil >= reschedulingNoticeHours;
  const canCancel = hoursUntil >= cancellationNoticeHours;

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime) return;
    setIsSubmitting(true);

    try {
      const newDateStr = format(selectedDate, 'yyyy-MM-dd');
      const slot = findSlot(serviceSlots, newDateStr, selectedTime);
      if (!slot) {
        toast.error('Selected slot is no longer available');
        return;
      }

      // Atomically book the new slot
      const { data: slotUpdate } = await supabase
        .from('service_slots')
        .update({ booked_count: slot.booked_count + 1 })
        .eq('id', slot.id)
        .lt('booked_count', slot.max_capacity)
        .select('id')
        .single();

      if (!slotUpdate) {
        toast.error('Slot is full. Please choose another.');
        return;
      }

      // Free the old slot
      const { data: oldBooking } = await supabase
        .from('service_bookings')
        .select('slot_id')
        .eq('id', bookingId)
        .single();

      if (oldBooking?.slot_id) {
        // Free the old slot
        const { data: oldSlotData } = await supabase
          .from('service_slots')
          .select('booked_count')
          .eq('id', oldBooking.slot_id)
          .single();

        if (oldSlotData) {
          await supabase
            .from('service_slots')
            .update({ booked_count: Math.max(0, oldSlotData.booked_count - 1) })
            .eq('id', oldBooking.slot_id);
        }
      }

      // Update the booking
      await supabase
        .from('service_bookings')
        .update({
          slot_id: slot.id,
          booking_date: newDateStr,
          start_time: selectedTime,
          end_time: slot.end_time,
          status: 'rescheduled',
          rescheduled_from: bookingId,
        })
        .eq('id', bookingId);

      // Update order status
      await supabase
        .from('orders')
        .update({ status: 'rescheduled' })
        .eq('id', orderId);

      toast.success('Appointment rescheduled');
      setIsRescheduleOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Failed to reschedule: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      // Free the slot
      const { data: booking } = await supabase
        .from('service_bookings')
        .select('slot_id')
        .eq('id', bookingId)
        .single();

      if (booking?.slot_id) {
        // Decrement booked count
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

      // Update booking status
      await supabase
        .from('service_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: cancelReason || 'Cancelled by buyer',
        })
        .eq('id', bookingId);

      // Update order status
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          rejection_reason: cancelReason || 'Cancelled by buyer',
        })
        .eq('id', orderId);

      toast.success('Appointment cancelled');
      setIsCancelOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Failed to cancel: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsRescheduleOpen(true)}
          disabled={!canReschedule}
          className="flex-1 gap-1.5"
        >
          <CalendarClock size={14} />
          Reschedule
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsCancelOpen(true)}
          disabled={!canCancel}
          className="flex-1 gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/10"
        >
          <XCircle size={14} />
          Cancel
        </Button>
      </div>

      {!canReschedule && (
        <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
          <AlertTriangle size={10} />
          Rescheduling requires {reschedulingNoticeHours}h notice
        </p>
      )}

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <TimeSlotPicker
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateSelect={setSelectedDate}
              onTimeSelect={setSelectedTime}
              availableSlots={availableSlots}
            />
            <Button
              className="w-full"
              onClick={handleReschedule}
              disabled={!selectedDate || !selectedTime || isSubmitting}
            >
              {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
              Confirm Reschedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Are you sure you want to cancel your appointment on{' '}
              <strong>{format(new Date(bookingDate + 'T00:00'), 'MMM d, yyyy')}</strong> at{' '}
              <strong>{startTime?.slice(0, 5)}</strong>?
            </p>
            <Textarea
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsCancelOpen(false)}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                {isSubmitting && <Loader2 className="animate-spin mr-2" size={16} />}
                Cancel Appointment
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
