import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, addDays, startOfToday } from 'date-fns';

export interface ServiceSlot {
  id: string;
  product_id: string;
  seller_id: string;
  slot_date: string;
  start_time: string;
  end_time: string;
  max_capacity: number;
  booked_count: number;
  is_blocked: boolean;
}

export function useServiceSlots(productId: string | undefined, daysAhead = 14) {
  const today = startOfToday();
  const endDate = addDays(today, daysAhead);

  return useQuery({
    queryKey: ['service-slots', productId, daysAhead],
    queryFn: async (): Promise<ServiceSlot[]> => {
      if (!productId) return [];

      const { data, error } = await supabase
        .from('service_slots')
        .select('*')
        .eq('product_id', productId)
        .eq('is_blocked', false)
        .gte('slot_date', format(today, 'yyyy-MM-dd'))
        .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
        .order('slot_date')
        .order('start_time');

      if (error) throw error;

      // Filter to available slots (booked_count < max_capacity)
      return (data || []).filter(
        (slot: any) => slot.booked_count < slot.max_capacity
      ) as ServiceSlot[];
    },
    enabled: !!productId,
    staleTime: 30 * 1000, // 30s - slots change frequently
  });
}

/** Transform service slots into the format TimeSlotPicker expects */
export function slotsToPickerFormat(slots: ServiceSlot[]): { date: string; slots: string[] }[] {
  const grouped: Record<string, string[]> = {};
  for (const slot of slots) {
    if (!grouped[slot.slot_date]) grouped[slot.slot_date] = [];
    grouped[slot.slot_date].push(slot.start_time);
  }
  return Object.entries(grouped).map(([date, times]) => ({ date, slots: times }));
}

/** Find the slot record matching a date + time */
export function findSlot(slots: ServiceSlot[], date: string, time: string): ServiceSlot | undefined {
  return slots.find(s => s.slot_date === date && s.start_time === time);
}
