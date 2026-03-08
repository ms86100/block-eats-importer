import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TimeSlotPicker } from './TimeSlotPicker';
import { DateRangePicker } from './DateRangePicker';
import { ServiceAddonPicker, SelectedAddon } from './ServiceAddonPicker';
import { RecurringBookingSelector, RecurringConfig } from './RecurringBookingSelector';
import { Listing } from '@/components/listing/ListingCard';
import { useCategoryBehavior } from '@/hooks/useCategoryBehavior';
import { RentalPeriodType } from '@/types/categories';
import { Clock, Calendar, MessageCircle, Loader2, MapPin } from 'lucide-react';
import { useCurrency } from '@/hooks/useCurrency';
import { useServiceSlots, slotsToPickerFormat, findSlot } from '@/hooks/useServiceSlots';
import { supabase } from '@/integrations/supabase/client';

interface BookingSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  listing: Listing;
  onConfirm: (bookingDetails: BookingDetails) => void;
  isLoading?: boolean;
}

export interface BookingDetails {
  listingId: string;
  type: 'booking' | 'rental' | 'enquiry';
  scheduledDate?: string;
  scheduledTimeStart?: string;
  scheduledTimeEnd?: string;
  rentalStartDate?: string;
  rentalEndDate?: string;
  notes?: string;
  totalAmount: number;
  depositAmount?: number;
  // Service booking extras
  slotId?: string;
  locationType?: string;
  buyerAddress?: string;
  selectedAddons?: SelectedAddon[];
  recurringConfig?: RecurringConfig;
}

export function BookingSheet({
  open,
  onOpenChange,
  listing,
  onConfirm,
  isLoading = false,
}: BookingSheetProps) {
  const { requiresTimeSlot, hasDateRange, enquiryOnly, hasDuration, config } = useCategoryBehavior(listing.category);
  const { formatPrice } = useCurrency();
  const isServiceLayout = config?.layoutType === 'service';

  // Fetch real service slots for service-type listings
  const { data: serviceSlots = [] } = useServiceSlots(
    isServiceLayout ? listing.id : undefined
  );
  const availableSlots = useMemo(
    () => (serviceSlots.length > 0 ? slotsToPickerFormat(serviceSlots) : undefined),
    [serviceSlots]
  );

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | undefined>();
  const [rentalStartDate, setRentalStartDate] = useState<Date | undefined>();
  const [rentalEndDate, setRentalEndDate] = useState<Date | undefined>();
  const [notes, setNotes] = useState('');
  const [buyerAddress, setBuyerAddress] = useState('');
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);
  const [recurringConfig, setRecurringConfig] = useState<RecurringConfig>({ enabled: false, frequency: 'weekly' });

  // Check if category supports addons/recurring
  const supportsAddons = (config as any)?.supports_addons ?? false;
  const supportsRecurring = (config as any)?.supports_recurring ?? false;
  // Determine location type from service listing (if available)
  const locationType = (listing as any).location_type || 'at_seller';
  const needsAddress = isServiceLayout && locationType === 'home_visit';

  const handleConfirm = () => {
    const addonTotal = selectedAddons.reduce((s, a) => s + a.price, 0);
    const details: BookingDetails = {
      listingId: listing.id,
      type: enquiryOnly ? 'enquiry' : hasDateRange ? 'rental' : 'booking',
      totalAmount: listing.price + addonTotal,
      notes: notes || undefined,
      selectedAddons: selectedAddons.length > 0 ? selectedAddons : undefined,
      recurringConfig: recurringConfig.enabled ? recurringConfig : undefined,
    };

    if (requiresTimeSlot || hasDuration || isServiceLayout) {
      if (!selectedDate || !selectedTime) return;

      details.scheduledDate = format(selectedDate, 'yyyy-MM-dd');
      details.scheduledTimeStart = selectedTime;

      // Find matching slot for service bookings
      if (isServiceLayout && serviceSlots.length > 0) {
        const slot = findSlot(serviceSlots, details.scheduledDate, selectedTime);
        if (slot) {
          details.slotId = slot.id;
          details.scheduledTimeEnd = slot.end_time;
        }
      }

      // Calculate end time based on duration if no slot
      if (!details.scheduledTimeEnd && listing.service_duration_minutes) {
        const [hours, mins] = selectedTime.split(':').map(Number);
        const endMins = hours * 60 + mins + listing.service_duration_minutes;
        const endHours = Math.floor(endMins / 60);
        const endMinutes = endMins % 60;
        details.scheduledTimeEnd = `${String(endHours).padStart(2, '0')}:${String(endMinutes).padStart(2, '0')}`;
      }

      if (needsAddress) {
        details.locationType = locationType;
        details.buyerAddress = buyerAddress || undefined;
      }
    }

    if (hasDateRange) {
      if (!rentalStartDate || !rentalEndDate) return;

      details.rentalStartDate = format(rentalStartDate, 'yyyy-MM-dd');
      details.rentalEndDate = format(rentalEndDate, 'yyyy-MM-dd');
      details.depositAmount = listing.deposit_amount;

      const days = Math.ceil((rentalEndDate.getTime() - rentalStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      details.totalAmount = days * listing.price;
    }

    onConfirm(details);
  };

  const isValid = () => {
    if (enquiryOnly) return true;
    if (requiresTimeSlot || hasDuration || isServiceLayout) {
      const basic = selectedDate && selectedTime;
      if (needsAddress) return basic && buyerAddress.trim().length > 0;
      return basic;
    }
    if (hasDateRange) return rentalStartDate && rentalEndDate;
    return false;
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
        <SheetHeader className="pb-4">
          <SheetTitle>
            {enquiryOnly ? 'Contact Seller' : isServiceLayout ? 'Book Service' : hasDateRange ? 'Reserve Rental' : 'Book Service'}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-6 overflow-y-auto pb-20">
          {/* Listing Summary */}
          <div className="flex gap-3 p-3 bg-muted rounded-lg">
            {listing.image_url && (
              <img
                src={listing.image_url}
                alt={listing.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            )}
            <div className="flex-1">
              <h4 className="font-medium">{listing.name}</h4>
              <p className="text-lg font-bold text-primary tabular-nums">{formatPrice(listing.price)}</p>
              {listing.service_duration_minutes && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock size={10} />
                  {listing.service_duration_minutes} min session
                </p>
              )}
            </div>
          </div>

          {/* Time Slot Picker for Services */}
          {(requiresTimeSlot || hasDuration || isServiceLayout) && !hasDateRange && (
            <TimeSlotPicker
              selectedDate={selectedDate}
              selectedTime={selectedTime}
              onDateSelect={setSelectedDate}
              onTimeSelect={setSelectedTime}
              serviceDuration={listing.service_duration_minutes}
              availableSlots={availableSlots}
            />
          )}

          {/* Date Range Picker for Rentals */}
          {hasDateRange && (
            <DateRangePicker
              startDate={rentalStartDate}
              endDate={rentalEndDate}
              onStartDateSelect={setRentalStartDate}
              onEndDateSelect={setRentalEndDate}
              pricePerPeriod={listing.price}
              rentalPeriodType={listing.rental_period_type as RentalPeriodType}
              depositAmount={listing.deposit_amount}
            />
          )}

          {/* Address input for home visit services */}
          {needsAddress && (
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <MapPin size={14} />
                Your Address (for home visit)
              </label>
              <Input
                placeholder="Enter your full address..."
                value={buyerAddress}
                onChange={(e) => setBuyerAddress(e.target.value)}
              />
            </div>
          )}

          {/* Service Add-ons */}
          {isServiceLayout && supportsAddons && (
            <ServiceAddonPicker
              productId={listing.id}
              selectedAddons={selectedAddons}
              onAddonsChange={setSelectedAddons}
            />
          )}

          {/* Recurring Booking */}
          {isServiceLayout && supportsRecurring && selectedDate && selectedTime && (
            <RecurringBookingSelector
              config={recurringConfig}
              onChange={setRecurringConfig}
            />
          )}

          {/* Notes/Message */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageCircle size={14} />
              {enquiryOnly ? 'Your Message' : 'Special Requests (Optional)'}
            </label>
            <Textarea
              placeholder={
                enquiryOnly
                  ? 'Hi, I\'m interested in this item. Is it still available?'
                  : 'Any specific requirements or requests...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* Confirm Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-background border-t">
          <Button
            className="w-full"
            size="lg"
            disabled={!isValid() || isLoading}
            onClick={handleConfirm}
          >
            {isLoading ? (
              <Loader2 className="animate-spin mr-2" size={18} />
            ) : null}
            {enquiryOnly
              ? 'Send Enquiry'
              : isServiceLayout
              ? 'Confirm Booking'
              : hasDateRange
              ? 'Confirm Rental'
              : 'Confirm Booking'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
