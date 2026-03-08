import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
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
  if (['cancelled', 'completed', 'no_show'].includes(status)) return null;

  const checkPolicy = async () => {
    if (!user) return;
    setIsChecking(true);
    try {
      const { data, error } = await supabase.rpc('can_cancel_booking', {
        _booking_id: bookingId,
        _actor_id: user.id,
      });
      if (error) throw error;
      setPolicyInfo(data as any);
    } catch {
      setPolicyInfo({ can_cancel: true, fee_percentage: 0, reason: 'Unable to check policy' });
    } finally {
      setIsChecking(false);
    }
  };

  const handleCancel = async () => {
    setIsCancelling(true);
    try {
      // Update booking
      await supabase
        .from('service_bookings')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancellation_reason: reason.trim().slice(0, 500) || 'Cancelled by buyer',
        })
        .eq('id', bookingId);

      // Update order
      await supabase
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('id', orderId);

      // Release slot atomically
      if (slotId) {
        await supabase.rpc('release_service_slot', { _slot_id: slotId });
      }

      queryClient.invalidateQueries({ queryKey: ['service-booking-order', orderId] });
      queryClient.invalidateQueries({ queryKey: ['service-slots'] });

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
      setIsOpen(open);
      if (open) checkPolicy();
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
                      <span className="block text-amber-600 font-medium">
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
          <AlertDialogCancel>Keep Booking</AlertDialogCancel>
          {policyInfo?.can_cancel && (
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isCancelling && <Loader2 className="animate-spin mr-1" size={14} />}
              Confirm Cancellation
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
