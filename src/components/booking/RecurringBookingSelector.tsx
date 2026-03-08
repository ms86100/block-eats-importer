import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';

export interface RecurringConfig {
  enabled: boolean;
  frequency: 'weekly' | 'biweekly' | 'monthly';
}

interface RecurringBookingSelectorProps {
  config: RecurringConfig;
  onChange: (config: RecurringConfig) => void;
}

export function RecurringBookingSelector({ config, onChange }: RecurringBookingSelectorProps) {
  return (
    <div className="space-y-3 p-3 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RefreshCw size={14} className="text-primary" />
          <span className="text-sm font-medium">Repeat this booking</span>
        </div>
        <Switch
          checked={config.enabled}
          onCheckedChange={(checked) => onChange({ ...config, enabled: checked })}
        />
      </div>
      {config.enabled && (
        <div className="space-y-1">
          <Label className="text-xs">Frequency</Label>
          <Select
            value={config.frequency}
            onValueChange={(v) => onChange({ ...config, frequency: v as RecurringConfig['frequency'] })}
          >
            <SelectTrigger className="h-9 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weekly">Every week</SelectItem>
              <SelectItem value="biweekly">Every 2 weeks</SelectItem>
              <SelectItem value="monthly">Every month</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground">
            Appointments will be auto-booked at the same time. You can cancel anytime.
          </p>
        </div>
      )}
    </div>
  );
}
