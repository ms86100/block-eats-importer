import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
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

export function ServiceBookingFlow({
  open, onOpenChange, productId, productName, sellerId, sellerName,
  price, category, imageUrl, durationMinutes,
}: ServiceBookingFlowProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { formatPrice } = useCurrency();
  const { config } = useCategoryBehavior(category as ServiceCategory);

  const { data: serviceSlots = [] } = useServiceSlots(open ? productId : undefined);
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
  const isServiceLayout = config?.layoutType === 'service';

  // Check if location_type needs address (would need service_listings data)
  const needsAddress = false; // simplified — can be enhanced

  const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
  const totalAmount = price + addonTotal;

  const isValid = selectedDate && selectedTime;

  const handleConfirm = async () => {
    if (!user || !selectedDate || !selectedTime) {
      if (!user) { toast.error('Please sign in first'); navigate('/auth'); }
      return;
    }

    setIsLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Find matching slot
      const slot = serviceSlots.length > 0
        ? findSlot(serviceSlots, dateStr, selectedTime)
        : null;

      if (!slot) {
        toast.error('Selected slot is no longer available');
        setIsLoading(false);
        return;
      }

      // Atomically book the slot
      const { data: slotUpdate } = await supabase
        .from('service_slots')
        .update({ booked_count: slot.booked_count + 1 })
        .eq('id', slot.id)
        .lt('booked_count', slot.max_capacity)
        .eq('is_blocked', false)
        .select('id')
        .single();

      if (!slotUpdate) {
        toast.error('Slot is fully booked. Please choose another time.');
        setIsLoading(false);
        return;
      }

      // Create order
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
          notes: notes || null,
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

      // Create service booking
      const { data: booking } = await supabase.from('service_bookings').insert({
        order_id: order.id,
        slot_id: slot.id,
        buyer_id: user.id,
        seller_id: sellerId,
        product_id: productId,
        booking_date: dateStr,
        start_time: slot.start_time,
        end_time: slot.end_time,
        status: 'requested',
        location_type: 'at_seller',
        buyer_address: buyerAddress || null,
      }).select('id').single();

      // Persist selected addons
      if (selectedAddons.length > 0 && booking) {
        await supabase.from('service_booking_addons').insert(
          selectedAddons.map(a => ({
            booking_id: booking.id,
            addon_id: a.id,
            price_at_booking: a.price,
          }))
        );
      }

      // Persist recurring config
      if (recurringConfig.enabled && booking) {
        await supabase.from('service_recurring_configs').insert({
          booking_id: booking.id,
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
                onChange={(e) => setBuyerAddress(e.target.value)}
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
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
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
