import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface ServiceBooking {
  id: string;
  order_id: string;
  slot_id: string;
  buyer_id: string;
  seller_id: string;
  product_id: string;
  booking_date: string;
  start_time: string;
  end_time: string;
  location_type: string;
  buyer_address: string | null;
  status: string;
  staff_id: string | null;
  rescheduled_from: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  buyer_name?: string;
  product_name?: string;
  staff_name?: string;
}

export function useSellerServiceBookings(sellerId: string | null) {
  return useQuery({
    queryKey: ['seller-service-bookings', sellerId],
    queryFn: async (): Promise<ServiceBooking[]> => {
      if (!sellerId) return [];

      // BUG FIX: Include 'rescheduled' status in results (was being filtered by excluding cancelled only,
      // but rescheduled bookings should show). Also show cancelled for historical context.
      // [BUG FIX] Add .limit(500) to prevent hitting 1000-row default cap silently
      const { data, error } = await supabase
        .from('service_bookings')
        .select('*, buyer:profiles!service_bookings_buyer_id_fkey(name), product:products!service_bookings_product_id_fkey(name), staff:service_staff(name)')
        .eq('seller_id', sellerId)
        .not('status', 'in', '("cancelled","no_show")')
        .gte('booking_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true })
        .limit(500);

      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        buyer_name: row.buyer?.name || null,
        product_name: row.product?.name || null,
        staff_name: row.staff?.name || null,
      })) as ServiceBooking[];
    },
    enabled: !!sellerId,
  });
}

export function useServiceBookingForOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['service-booking-order', orderId],
    queryFn: async (): Promise<ServiceBooking | null> => {
      if (!orderId) return null;

      const { data, error } = await supabase
        .from('service_bookings')
        .select('*, staff:service_staff(name)')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        staff_name: (data as any).staff?.name || null,
      } as ServiceBooking;
    },
    enabled: !!orderId,
  });
}

export function useBookingAddons(bookingId: string | undefined) {
  return useQuery({
    queryKey: ['booking-addons', bookingId],
    queryFn: async () => {
      if (!bookingId) return [];
      const { data, error } = await supabase
        .from('service_booking_addons')
        .select('*, addon:service_addons(name, description)')
        .eq('booking_id', bookingId);
      if (error) throw error;
      return (data || []).map((row: any) => ({
        id: row.id,
        name: row.addon?.name || 'Add-on',
        description: row.addon?.description || null,
        price: row.price_at_booking,
      }));
    },
    enabled: !!bookingId,
  });
}

export function useBuyerRecurringConfigs(buyerId: string | undefined) {
  return useQuery({
    queryKey: ['buyer-recurring-configs', buyerId],
    queryFn: async () => {
      if (!buyerId) return [];
      const { data, error } = await supabase
        .from('service_recurring_configs')
        .select('*, product:products(name)')
        .eq('buyer_id', buyerId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []).map((row: any) => ({
        ...row,
        product_name: row.product?.name || 'Service',
      }));
    },
    enabled: !!buyerId,
  });
}
