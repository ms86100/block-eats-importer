import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Clock, Calendar, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface DaySchedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
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
      is_active: i >= 1 && i <= 6, // Mon-Sat default
    }))
  );
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    loadSchedules();
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Delete existing then insert (simple upsert approach)
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
      // Auto-generate slots
      await generateSlots();
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
              <div className="flex items-center gap-2 flex-1">
                <Input
                  type="time"
                  value={day.start_time}
                  onChange={(e) => updateDay(index, 'start_time', e.target.value)}
                  className="h-8 text-xs w-24"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="time"
                  value={day.end_time}
                  onChange={(e) => updateDay(index, 'end_time', e.target.value)}
                  className="h-8 text-xs w-24"
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
      </CardContent>
    </Card>
  );
}
