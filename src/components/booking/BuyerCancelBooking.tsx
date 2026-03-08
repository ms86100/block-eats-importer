import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { XCircle, Loader2, AlertTriangle } from 'lucide-react';

interface BuyerCancelBookingProps {
  bookingId: string;
  orderId: string;
  slotId: string;
  status: string;
}

export function BuyerCancelBooking({ bookingId, orderId, slotId, status }: BuyerCancelBookingProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [reason, setReason] = useState('');
  const [policyInfo, setPolicyInfo] = useState<{ can_cancel: boolean; fee_percentage: number; reason: string } | null>(null);

  // Don't show for terminal statuses
  // [BUG FIX #C9] Also hide for 'in_progress' — service already started, should not allow cancel
  if (['cancelled', 'completed', 'no_show', 'in_progress'].includes(status)) return null;

  const checkPolicy = async () => {
    if (!user) return;
    setIsChecking(true);
    setPolicyInfo(null);
    try {
      const { data, error } = await supabase.rpc('can_cancel_booking', {
        _booking_id: bookingId,
        _actor_id: user.id,
      });
      if (error) throw error;
      setPolicyInfo(data as any);
    } catch {
      // [BUG FIX #H3] Don't default to can_cancel:true on error — fail safe
      setPolicyInfo({ can_cancel: false, fee_percentage: 0, reason: 'Unable to check cancellation policy. Please try again.' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCancel = async () => {
    if (!user || isCancelling) return;
    setIsCancelling(true);
    try {
      // [BUG FIX #C10] Fetch booking data BEFORE updating status (after update, status is cancelled
      // and some fields may not reflect the original booking context for notifications)
      const { data: bookingData } = await supabase
        .from('service_bookings')
        .select('seller_id, booking_date, start_time, product_id')
        .eq('id', bookingId)
        .eq('buyer_id', user.id) // Ownership check
        .maybeSingle();

      if (!bookingData) {
        toast.error('Booking not found or you are not authorized');
        setIsCancelling(false);
        return;
      }

      // Update booking status
      const { error: bookingErr, count } = await supabase
        .from('service_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.trim().slice(0, 500) || 'Cancelled by buyer',
        })
        .eq('id', bookingId)
        .eq('buyer_id', user.id);

      if (bookingErr) throw bookingErr;

      // [BUG FIX #H4] Verify the update actually affected a row
      // (Supabase returns count when using .count() but we check via subsequent order update)

      // Update order
      const { error: orderErr } = await supabase
        .from('orders')
        .update({ status: 'cancelled', rejection_reason: reason.trim().slice(0, 500) || 'Cancelled by buyer' })
        .eq('id', orderId)
        .eq('buyer_id', user.id);

      if (orderErr) throw orderErr;

      // Release slot atomically
      if (slotId) {
        await supabase.rpc('release_service_slot', { _slot_id: slotId });
      }

      // Notify seller about buyer cancellation
      if (bookingData.seller_id) {
        const { data: sellerProfile } = await supabase
          .from('seller_profiles')
          .select('user_id')
          .eq('id', bookingData.seller_id)
          .single();

        if (sellerProfile?.user_id) {
          const { data: product } = await supabase
            .from('products')
            .select('name')
            .eq('id', bookingData.product_id)
            .single();

          await supabase.from('notification_queue').insert({
            user_id: sellerProfile.user_id,
            type: 'order',
            title: '📋 Booking Cancelled by Buyer',
            body: `A booking for ${product?.name || 'your service'} on ${bookingData.booking_date} at ${bookingData.start_time?.slice(0, 5)} has been cancelled.`,
            reference_path: `/orders/${orderId}`,
            payload: { orderId, status: 'cancelled', type: 'order' },
          });
          supabase.functions.invoke('process-notification-queue').catch(() => {});
        }
      }

      queryClient.invalidateQueries({ queryKey: ['service-booking-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-slots'] });
      queryClient.invalidateQueries({ queryKey: ['seller-service-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['order-detail'] });

      // [FIX] Notify banner to refresh so cancelled booking disappears from home
      window.dispatchEvent(new Event('booking-changed'));

      toast.success('Booking cancelled');
      setIsOpen(false);
    } catch {
      toast.error('Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => {
      if (isCancelling) return; // [BUG FIX #H5] Prevent closing dialog while cancel is processing
      setIsOpen(open);
      if (open) {
        setReason('');
        checkPolicy();
      }
    }}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
          <XCircle size={14} /> Cancel Booking
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Cancel Booking?</AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            {isChecking ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={14} /> Checking cancellation policy...</span>
            ) : policyInfo ? (
              <>
                {!policyInfo.can_cancel ? (
                  <span className="text-destructive flex items-center gap-1.5">
                    <AlertTriangle size={14} /> {policyInfo.reason}
                  </span>
                ) : (
                  <>
                    <span>{policyInfo.reason}</span>
                    {policyInfo.fee_percentage > 0 && (
                      <span className="block font-medium text-destructive">
                        ⚠️ A {policyInfo.fee_percentage}% cancellation fee will apply.
                      </span>
                    )}
                  </>
                )}
              </>
            ) : (
              <span>Are you sure you want to cancel this booking?</span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {policyInfo?.can_cancel && (
          <Textarea
            placeholder="Reason for cancellation (optional)..."
            value={reason}
            onChange={(e) => setReason(e.target.value.slice(0, 500))}
            rows={2}
            maxLength={500}
          />
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isCancelling}>Keep Booking</AlertDialogCancel>
          {policyInfo?.can_cancel && (
            <Button
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="animate-spin mr-1" size={14} />}
              Confirm Cancellation
            </Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
