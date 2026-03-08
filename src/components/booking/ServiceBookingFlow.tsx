import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { format, isBefore, startOfToday } from 'date-fns';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { TimeSlotPicker } from './TimeSlotPicker';
import { ServiceAddonPicker, SelectedAddon } from './ServiceAddonPicker';
import { RecurringBookingSelector, RecurringConfig } from './RecurringBookingSelector';
import { useAuth } from '@/contexts/AuthContext';
import { useCategoryBehavior } from '@/hooks/useCategoryBehavior';
import { useServiceSlots, slotsToPickerFormat, findSlot } from '@/hooks/useServiceSlots';
import { supabase } from '@/integrations/supabase/client';
import { useCurrency } from '@/hooks/useCurrency';
import { toast } from 'sonner';
import { Clock, MapPin, MessageCircle, Loader2 } from 'lucide-react';
import type { ServiceCategory } from '@/types/categories';

interface ServiceBookingFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName: string;
  sellerId: string;
  sellerName: string;
  price: number;
  category: string;
  imageUrl?: string | null;
  durationMinutes?: number;
}

const MAX_NOTES_LENGTH = 500;
const MAX_ADDRESS_LENGTH = 300;

export function ServiceBookingFlow({
  open, onOpenChange, productId, productName, sellerId, sellerName,
  price, category, imageUrl, durationMinutes,
}: ServiceBookingFlowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const queryClient = useQueryClient();
  const { config } = useCategoryBehavior(category as ServiceCategory);

  const { data: serviceSlots = [], refetch: refetchSlots } = useServiceSlots(open ? productId : undefined);
  const availableSlots = useMemo(
    () => (serviceSlots.length > 0 ? slotsToPickerFormat(serviceSlots) : undefined),
    [serviceSlots]
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({ enabled: false, frequency: 'weekly' });
  const [isLoading, setIsLoading] = useState(false);

  const supportsAddons = (config as any)?.supports_addons ?? false;
  const supportsRecurring = (config as any)?.supports_recurring ?? false;

  const needsAddress = false; // simplified — can be enhanced from service_listings

  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const totalAmount = price + addonTotal;

  // Validate date is not in the past
  const isDateValid = selectedDate && !isBefore(selectedDate, startOfToday());
  const isValid = isDateValid && selectedTime;

  const handleConfirm = async () => {
    if (!user) {
      toast.error('Please sign in first');
      navigate('/auth');
      return;
    }
    if (!selectedDate || !selectedTime || !isDateValid) {
      toast.error('Please select a valid date and time');
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Find matching slot from fresh data
      const slot = findSlot(serviceSlots, dateStr, selectedTime);
      if (!slot) {
        toast.error('Selected slot is no longer available. Refreshing...');
        refetchSlots();
        setIsLoading(false);
        return;
      }

      // Create order first
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          buyer_id: user.id,
          seller_id: sellerId,
          total_amount: totalAmount,
          order_type: 'booking',
          status: 'requested',
          payment_type: 'cod',
          payment_status: 'pending',
          notes: notes.trim().slice(0, MAX_NOTES_LENGTH) || null,
        })
        .select('id')
        .single();

      if (orderErr || !order) throw orderErr || new Error('Failed to create order');

      // Create order item
      await supabase.from('order_items').insert({
        order_id: order.id,
        product_id: productId,
        product_name: productName,
        quantity: 1,
        unit_price: price,
      });

      // Use atomic DB function to book slot + create booking
      const { data: bookResult, error: bookErr } = await supabase
        .rpc('book_service_slot', {
          _slot_id: slot.id,
          _buyer_id: user.id,
          _seller_id: sellerId,
          _product_id: productId,
          _order_id: order.id,
          _booking_date: dateStr,
          _start_time: slot.start_time,
          _end_time: slot.end_time,
          _location_type: 'at_seller',
          _buyer_address: buyerAddress.trim().slice(0, MAX_ADDRESS_LENGTH) || null,
        });

      if (bookErr) throw bookErr;

      const result = bookResult as any;
      if (!result?.success) {
        // Rollback: delete the order since booking failed
        await supabase.from('orders').delete().eq('id', order.id);
        toast.error(result?.error || 'Failed to book slot');
        refetchSlots();
        setIsLoading(false);
        return;
      }

      const bookingId = result.booking_id;

      // Persist selected addons
      if (selectedAddons.length > 0 && bookingId) {
        await supabase.from('service_booking_addons').insert(
          selectedAddons.map(a => ({
            booking_id: bookingId,
            addon_id: a.id,
            price_at_booking: a.price,
          }))
        );
      }

      // Persist recurring config
      if (recurringConfig.enabled && bookingId) {
        await supabase.from('service_recurring_configs').insert({
          booking_id: bookingId,
          buyer_id: user.id,
          seller_id: sellerId,
          product_id: productId,
          frequency: recurringConfig.frequency,
          preferred_time: slot.start_time,
          start_date: dateStr,
        });
      }

      // Trigger notification processing
      supabase.functions.invoke('process-notification-queue').catch(() => {});

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['service-slots', productId] });
      queryClient.invalidateQueries({ queryKey: ['seller-service-bookings'] });

      toast.success('Booking request sent!');
      onOpenChange(false);
      navigate(`/orders/${order.id}`);
    } catch (err: any) {
      console.error('Service booking error:', err);
      toast.error('Failed to create booking. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>Book Service</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-20">
          {/* Summary */}
          <div className="flex gap-3 p-3 bg-muted rounded-lg">
            {imageUrl && (
              <img src={imageUrl} alt={productName} className="w-16 h-16 rounded-lg object-cover" />
            )}
            <div className="flex-1">
              <h4 className="font-medium">{productName}</h4>
              <p className="text-xs text-muted-foreground">{sellerName}</p>
              <p className="text-lg font-bold text-primary tabular-nums">{formatPrice(price)}</p>
              {durationMinutes && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />{durationMinutes} min session
                </p>
              )}
            </div>
          </div>

          {/* Time Slot Picker */}
          <TimeSlotPicker
            selectedDate={selectedDate}
            selectedTime={selectedTime}
            onDateSelect={setSelectedDate}
            onTimeSelect={setSelectedTime}
            serviceDuration={durationMinutes}
            availableSlots={availableSlots}
          />

          {/* Address for home visit */}
          {needsAddress && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin size={14} />Your Address (for home visit)
              </label>
              <Input
                placeholder="Enter your full address..."
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value.slice(0, MAX_ADDRESS_LENGTH))}
                maxLength={MAX_ADDRESS_LENGTH}
              />
            </div>
          )}

          {/* Add-ons */}
          {supportsAddons && (
            <ServiceAddonPicker
              productId={productId}
              selectedAddons={selectedAddons}
              onAddonsChange={setSelectedAddons}
            />
          )}

          {/* Recurring */}
          {supportsRecurring && selectedDate && selectedTime && (
            <RecurringBookingSelector
              config={recurringConfig}
              onChange={setRecurringConfig}
            />
          )}

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageCircle size={14} />Special Requests (Optional)
            </label>
            <Textarea
              placeholder="Any specific requirements or requests..."
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, MAX_NOTES_LENGTH))}
              rows={3}
              maxLength={MAX_NOTES_LENGTH}
            />
            <p className="text-[10px] text-muted-foreground text-right">{notes.length}/{MAX_NOTES_LENGTH}</p>
          </div>
        </div>

        {/* Confirm */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t">
          <Button className="w-full" size="lg" disabled={!isValid || isLoading} onClick={handleConfirm}>
            {isLoading && <Loader2 className="animate-spin mr-2" size={18} />}
            Confirm Booking{addonTotal > 0 ? ` · ${formatPrice(totalAmount)}` : ` · ${formatPrice(price)}`}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
