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
  rescheduled_from: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  // joined
  buyer_name?: string;
  product_name?: string;
}

export function useSellerServiceBookings(sellerId: string | null) {
  return useQuery({
    queryKey: ['seller-service-bookings', sellerId],
    queryFn: async (): Promise<ServiceBooking[]> => {
      if (!sellerId) return [];

      const { data, error } = await supabase
        .from('service_bookings')
        .select('*')
        .eq('seller_id', sellerId)
        .not('status', 'in', '("cancelled")')
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;
      return (data || []) as ServiceBooking[];
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
      } as ServiceBooking | null;
    },
    enabled: !!orderId,
  });
}
