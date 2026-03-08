import { useState, useMemo, useEffect, useCallback } from 'react';
import { format, addDays, startOfToday, isSameDay, startOfWeek } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { ServiceSlot } from '@/hooks/useServiceSlots';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, ChevronLeft, ChevronRight, Lock, Unlock, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SlotCalendarManagerProps {
  productId?: string;
  sellerId: string;
}

interface ProductOption {
  id: string;
  name: string;
}

export function SlotCalendarManager({ productId: initialProductId, sellerId }: SlotCalendarManagerProps) {
  const [selectedProductId, setSelectedProductId] = useState(initialProductId || '');
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [selectedDate, setSelectedDate] = useState(startOfToday());
  const [blockingSlots, setBlockingSlots] = useState<Set<string>>(new Set());
  const [managementSlots, setManagementSlots] = useState<ServiceSlot[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  // Fetch service products for this seller
  useEffect(() => {
    if (!sellerId) return;
    (async () => {
      const { data } = await supabase
        .from('products')
        .select('id, name')
        .eq('seller_id', sellerId)
        .eq('is_available', true)
        .order('name');
      
      if (data && data.length > 0) {
        const { data: serviceListings } = await supabase
          .from('service_listings')
          .select('product_id')
          .in('product_id', data.map(p => p.id));
        
        const serviceProductIds = new Set((serviceListings || []).map(sl => sl.product_id));
        const serviceProducts = data.filter(p => serviceProductIds.has(p.id));
        setProducts(serviceProducts);
        if (serviceProducts.length > 0 && !selectedProductId) {
          setSelectedProductId(serviceProducts[0].id);
        }
      }
    })();
  }, [sellerId]);

  const fetchSlots = useCallback(async () => {
    if (!selectedProductId) return;
    setIsLoadingSlots(true);
    const today = startOfToday();
    const endDate = addDays(today, 30);
    const { data } = await supabase
      .from('service_slots')
      .select('*')
      .eq('product_id', selectedProductId)
      .gte('slot_date', format(today, 'yyyy-MM-dd'))
      .lte('slot_date', format(endDate, 'yyyy-MM-dd'))
      .order('slot_date')
      .order('start_time');
    setManagementSlots((data || []) as ServiceSlot[]);
    setIsLoadingSlots(false);
  }, [selectedProductId]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  const weekStart = startOfWeek(selectedDate);
  const weekDates = useMemo(() => 
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  const slotsForDate = useMemo(() => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    return managementSlots.filter(s => s.slot_date === dateStr);
  }, [managementSlots, selectedDate]);

  const toggleBlock = async (slot: ServiceSlot) => {
    setBlockingSlots(prev => new Set(prev).add(slot.id));
    const newBlocked = !slot.is_blocked;
    const { error } = await supabase
      .from('service_slots')
      .update({ is_blocked: newBlocked })
      .eq('id', slot.id);

    if (error) {
      toast.error('Failed to update slot');
    } else {
      setManagementSlots(prev =>
        prev.map(s => s.id === slot.id ? { ...s, is_blocked: newBlocked } : s)
      );
      toast.success(newBlocked ? 'Slot blocked' : 'Slot unblocked');
    }
    setBlockingSlots(prev => { const n = new Set(prev); n.delete(slot.id); return n; });
  };

  const blockAllForDate = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const unblockedSlots = slotsForDate.filter(s => !s.is_blocked && s.booked_count === 0);
    if (unblockedSlots.length === 0) { toast.info('No available slots to block'); return; }
    const { error } = await supabase
      .from('service_slots')
      .update({ is_blocked: true })
      .eq('product_id', selectedProductId)
      .eq('slot_date', dateStr)
      .eq('booked_count', 0);
    if (error) {
      toast.error('Failed to block slots');
      return;
    }
    setManagementSlots(prev =>
      prev.map(s => s.slot_date === dateStr && s.booked_count === 0 ? { ...s, is_blocked: true } : s)
    );
    toast.success(`Blocked ${unblockedSlots.length} slots for ${format(selectedDate, 'MMM d')}`);
  };

  const unblockAllForDate = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const { error } = await supabase
      .from('service_slots')
      .update({ is_blocked: false })
      .eq('product_id', selectedProductId)
      .eq('slot_date', dateStr);
    if (error) {
      toast.error('Failed to unblock slots');
      return;
    }
    setManagementSlots(prev =>
      prev.map(s => s.slot_date === dateStr ? { ...s, is_blocked: false } : s)
    );
    toast.success(`Unblocked all slots for ${format(selectedDate, 'MMM d')}`);
  };

  const getDateBadge = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dateSlots = managementSlots.filter(s => s.slot_date === dateStr);
    const blocked = dateSlots.filter(s => s.is_blocked).length;
    const booked = dateSlots.filter(s => s.booked_count > 0).length;
    const available = dateSlots.filter(s => !s.is_blocked && s.booked_count < s.max_capacity).length;
    return { total: dateSlots.length, blocked, booked, available };
  };

  if (products.length === 0 && !initialProductId) {
    return (
      <Card>
        <CardContent className="p-4 text-center text-sm text-muted-foreground">
          No service products found. Add a service product first.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Calendar size={16} className="text-primary" />
            Slot Calendar
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => addDays(d, -7))}>
              <ChevronLeft size={14} />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setSelectedDate(d => addDays(d, 7))}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product selector */}
        {products.length > 1 && (
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger className="h-9 text-xs">
              <SelectValue placeholder="Select service..." />
            </SelectTrigger>
            <SelectContent>
              {products.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Week view */}
        <div className="grid grid-cols-7 gap-1">
          {weekDates.map((date) => {
            const badge = getDateBadge(date);
            const isSelected = isSameDay(date, selectedDate);
            const isToday = isSameDay(date, startOfToday());
            return (
              <button
                key={date.toISOString()}
                onClick={() => setSelectedDate(date)}
                className={cn(
                  'flex flex-col items-center p-1.5 rounded-lg text-center transition-colors',
                  isSelected ? 'bg-primary text-primary-foreground' : 'hover:bg-muted',
                  isToday && !isSelected && 'ring-1 ring-primary'
                )}
              >
                <span className="text-[9px] font-medium">{format(date, 'EEE')}</span>
                <span className="text-sm font-bold">{format(date, 'd')}</span>
                {badge.total > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {badge.available > 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    {badge.booked > 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                    {badge.blocked > 0 && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-3 text-[10px] text-muted-foreground">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" />Available</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-500" />Booked</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500" />Blocked</span>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={blockAllForDate}>
            <Lock size={12} /> Block All
          </Button>
          <Button size="sm" variant="outline" className="flex-1 text-xs gap-1" onClick={unblockAllForDate}>
            <Unlock size={12} /> Unblock All
          </Button>
        </div>

        {/* Slots for selected date */}
        <div className="space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground">{format(selectedDate, 'EEEE, MMM d')} — {slotsForDate.length} slots</p>
          {isLoadingSlots ? (
            <div className="flex items-center justify-center py-3 gap-2 text-xs text-muted-foreground">
              <Loader2 className="animate-spin" size={14} /> Loading slots...
            </div>
          ) : slotsForDate.length === 0 ? (
            <p className="text-xs text-muted-foreground py-3 text-center">No slots for this date</p>
          ) : (
            slotsForDate.map((slot) => (
              <div
                key={slot.id}
                className={cn(
                  'flex items-center justify-between p-2 rounded-lg border text-xs',
                  slot.is_blocked && 'bg-destructive/5 border-destructive/20',
                  !slot.is_blocked && slot.booked_count >= slot.max_capacity && 'bg-blue-50 border-blue-200',
                  !slot.is_blocked && slot.booked_count < slot.max_capacity && 'bg-emerald-50 border-emerald-200'
                )}
              >
                <div>
                  <span className="font-medium">{slot.start_time.slice(0, 5)} - {slot.end_time.slice(0, 5)}</span>
                  <span className="text-muted-foreground ml-2">
                    {slot.booked_count}/{slot.max_capacity} booked
                  </span>
                </div>
                <Button
                  size="sm"
                  variant={slot.is_blocked ? 'default' : 'outline'}
                  className="h-6 text-[10px] gap-1"
                  onClick={() => toggleBlock(slot)}
                  disabled={blockingSlots.has(slot.id) || (slot.booked_count > 0 && !slot.is_blocked)}
                >
                  {blockingSlots.has(slot.id) ? (
                    <Loader2 className="animate-spin" size={10} />
                  ) : slot.is_blocked ? (
                    <><Unlock size={10} /> Unblock</>
                  ) : (
                    <><Lock size={10} /> Block</>
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
