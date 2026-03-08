import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { TimeSlotPicker } from '@/components/booking/TimeSlotPicker';
import { useServiceSlots, slotsToPickerFormat, findSlot } from '@/hooks/useServiceSlots';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';

interface ServiceBookingActionsProps {
  orderId: string;
  productId: string;
  bookingId: string;
  bookingDate: string;
  startTime: string;
  onUpdated: () => void;
}

export function ServiceBookingActions({
  orderId,
  productId,
  bookingId,
  bookingDate,
  startTime,
  onUpdated,
}: ServiceBookingActionsProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();

  const { data: serviceSlots = [], refetch: refetchSlots } = useServiceSlots(isRescheduleOpen ? productId : undefined);
  const availableSlots = useMemo(
    () => (serviceSlots.length > 0 ? slotsToPickerFormat(serviceSlots) : undefined),
    [serviceSlots]
  );

  const handleReschedule = async () => {
    if (!selectedDate || !selectedTime || !user) return;
    setIsSubmitting(true);

    try {
      const newDateStr = format(selectedDate, 'yyyy-MM-dd');
      const slot = findSlot(serviceSlots, newDateStr, selectedTime);
      if (!slot) {
        toast.error('Selected slot is no longer available');
        refetchSlots();
        setIsSubmitting(false);
        return;
      }

      // Use atomic reschedule RPC
      const { data, error } = await supabase.rpc('reschedule_service_booking', {
        _booking_id: bookingId,
        _new_slot_id: slot.id,
        _new_date: newDateStr,
        _new_start_time: slot.start_time,
        _new_end_time: slot.end_time,
        _actor_id: user.id,
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast.error(result?.error || 'Failed to reschedule');
        refetchSlots();
        setIsSubmitting(false);
        return;
      }

      // Notify seller about reschedule
      supabase.functions.invoke('process-notification-queue').catch(() => {});

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ['service-booking-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-slots'] });
      queryClient.invalidateQueries({ queryKey: ['seller-service-bookings'] });

      toast.success('Appointment rescheduled');
      setIsRescheduleOpen(false);
      onUpdated();
    } catch (err: any) {
      toast.error('Failed to reschedule: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsRescheduleOpen(true)}
        className="gap-1.5"
      >
        <CalendarClock size={14} />
        Reschedule
      </Button>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Current: <strong>{bookingDate && format(new Date(bookingDate + 'T00:00'), 'MMM d, yyyy')}</strong> at <strong>{startTime?.slice(0, 5)}</strong>
            </p>
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
    </>
  );
}
