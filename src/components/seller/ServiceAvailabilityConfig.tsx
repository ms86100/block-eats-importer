import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, Calendar, RefreshCw, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

interface SlotSummary {
  totalSlots: number;
  dateRange: { from: string; to: string } | null;
  slotsByDate: Record<string, number>;
}

interface ServiceAvailabilityConfigProps {
  sellerId: string;
  productId?: string;
}

export function ServiceAvailabilityConfig({ sellerId, productId }: ServiceAvailabilityConfigProps) {
  const [schedules, setSchedules] = useState<DaySchedule[]>(
    DAYS.map((_, i) => ({
      day_of_week: i,
      start_time: '09:00',
      end_time: '18:00',
      is_active: i >= 1 && i <= 6,
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [slotSummary, setSlotSummary] = useState<SlotSummary | null>(null);

  useEffect(() => {
    loadSchedules();
    loadSlotSummary();
  }, [sellerId, productId]);

  const loadSchedules = async () => {
    setIsLoading(true);
    let query = supabase
      .from('service_availability_schedules')
      .select('*')
      .eq('seller_id', sellerId);

    if (productId) {
      query = query.eq('product_id', productId);
    } else {
      query = query.is('product_id', null);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error loading schedules:', error);
      setIsLoading(false);
      return;
    }

    if (data && data.length > 0) {
      setSchedules((prev) =>
        prev.map((day) => {
          const saved = data.find((d: any) => d.day_of_week === day.day_of_week);
          return saved
            ? {
                day_of_week: saved.day_of_week,
                start_time: saved.start_time?.slice(0, 5) || '09:00',
                end_time: saved.end_time?.slice(0, 5) || '18:00',
                is_active: saved.is_active,
              }
            : day;
        })
      );
    }
    setIsLoading(false);
  };

  const loadSlotSummary = async () => {
    let query = supabase
      .from('service_slots')
      .select('slot_date, start_time, end_time, is_blocked')
      .eq('seller_id', sellerId)
      .eq('is_blocked', false)
      .gte('slot_date', new Date().toISOString().split('T')[0])
      .order('slot_date');

    if (productId) {
      query = query.eq('product_id', productId);
    }

    const { data } = await query;
    if (!data || data.length === 0) {
      setSlotSummary(null);
      return;
    }

    const slotsByDate: Record<string, number> = {};
    for (const slot of data) {
      slotsByDate[slot.slot_date] = (slotsByDate[slot.slot_date] || 0) + 1;
    }

    const dates = Object.keys(slotsByDate).sort();
    setSlotSummary({
      totalSlots: data.length,
      dateRange: dates.length > 0 ? { from: dates[0], to: dates[dates.length - 1] } : null,
      slotsByDate,
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      let deleteQuery = supabase
        .from('service_availability_schedules')
        .delete()
        .eq('seller_id', sellerId);

      if (productId) {
        deleteQuery = deleteQuery.eq('product_id', productId);
      } else {
        deleteQuery = deleteQuery.is('product_id', null);
      }

      await deleteQuery;

      const rows = schedules.map((s) => ({
        seller_id: sellerId,
        product_id: productId || null,
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
        is_active: s.is_active,
      }));

      const { error } = await supabase
        .from('service_availability_schedules')
        .insert(rows);

      if (error) throw error;

      toast.success('Availability schedule saved');
      await generateSlots();
      // Refresh slot summary after generation
      await loadSlotSummary();
    } catch (err: any) {
      toast.error('Failed to save: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlots = async () => {
    setIsGenerating(true);
    try {
      const { error } = await supabase.functions.invoke('generate-service-slots', {
        body: { seller_id: sellerId, product_id: productId },
      });
      if (error) throw error;
      toast.success('Time slots generated for next 14 days');
      await loadSlotSummary();
    } catch (err: any) {
      toast.error('Slot generation failed: ' + err.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const updateDay = (index: number, field: keyof DaySchedule, value: any) => {
    setSchedules((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center">
          <Loader2 className="animate-spin text-muted-foreground" size={24} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Calendar size={18} className="text-primary" />
          Service Availability
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {schedules.map((day, index) => (
          <div
            key={day.day_of_week}
            className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
              day.is_active ? 'bg-card border-border' : 'bg-muted/50 border-transparent'
            }`}
          >
            <Switch
              checked={day.is_active}
              onCheckedChange={(v) => updateDay(index, 'is_active', v)}
            />
            <span className="text-sm font-medium w-10">{DAYS[index]}</span>
            {day.is_active && (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <Input
                  type="time"
                  value={day.start_time}
                  onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                  className="h-8 text-xs w-[110px] min-w-[110px]"
                />
                <span className="text-xs text-muted-foreground shrink-0">to</span>
                <Input
                  type="time"
                  value={day.end_time}
                  onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                  className="h-8 text-xs w-[110px] min-w-[110px]"
                />
              </div>
            )}
          </div>
        ))}

        <div className="flex gap-2 pt-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1">
            {isSaving && <Loader2 className="animate-spin mr-2" size={16} />}
            Save & Generate Slots
          </Button>
          <Button
            variant="outline"
            onClick={generateSlots}
            disabled={isGenerating}
            size="icon"
            title="Regenerate slots"
          >
            <RefreshCw size={16} className={isGenerating ? 'animate-spin' : ''} />
          </Button>
        </div>

        {/* Generated Slots Summary */}
        {slotSummary && slotSummary.totalSlots > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-primary/5 border border-primary/10 space-y-2">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={14} className="text-primary shrink-0" />
              <span className="text-xs font-semibold text-foreground">
                {slotSummary.totalSlots} slots generated
              </span>
              {slotSummary.dateRange && (
                <Badge variant="secondary" className="text-[10px] ml-auto">
                  {format(parseISO(slotSummary.dateRange.from), 'dd MMM')} – {format(parseISO(slotSummary.dateRange.to), 'dd MMM')}
                </Badge>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(slotSummary.slotsByDate).slice(0, 14).map(([date, count]) => (
                <div key={date} className="flex flex-col items-center px-2 py-1 rounded-lg bg-background border border-border/50 min-w-[48px]">
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {format(parseISO(date), 'EEE')}
                  </span>
                  <span className="text-[10px] font-bold text-foreground">
                    {format(parseISO(date), 'dd')}
                  </span>
                  <span className="text-[9px] text-primary font-semibold">
                    {count} slot{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
