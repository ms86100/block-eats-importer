import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Save, MessageSquare } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

const OTP_KEYS = [
  'otp_length',
  'otp_expiry_minutes',
  'otp_max_attempts',
  'otp_resend_cooldown_seconds',
  'otp_message_template',
  'n8n_otp_webhook_url',
  'n8n_otp_enabled',
];

export function OtpSettings() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('system_settings')
        .select('key, value')
        .in('key', OTP_KEYS);
      const map: Record<string, string> = {};
      for (const row of data || []) {
        if (row.key && row.value) map[row.key] = row.value;
      }
      setSettings(map);
      setLoading(false);
    })();
  }, []);

  const update = (key: string, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const [key, value] of Object.entries(settings)) {
        if (OTP_KEYS.includes(key)) {
          await supabase
            .from('system_settings')
            .update({ value })
            .eq('key', key);
        }
      }
      toast.success('OTP settings saved');
    } catch (e) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const isEnabled = settings.n8n_otp_enabled === 'true';

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-bold">OTP Verification Settings</CardTitle>
        </div>
        <CardDescription>Configure phone OTP verification via n8n webhooks</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Enable toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="otp-enabled" className="font-medium">Enable n8n OTP delivery</Label>
          <Switch
            id="otp-enabled"
            checked={isEnabled}
            onCheckedChange={(c) => update('n8n_otp_enabled', c ? 'true' : 'false')}
          />
        </div>

        {/* Webhook URL */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">n8n Webhook URL</Label>
          <Input
            value={settings.n8n_otp_webhook_url || ''}
            onChange={(e) => update('n8n_otp_webhook_url', e.target.value)}
            placeholder="https://your-n8n.example.com/webhook/otp"
            className="rounded-xl"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">OTP Length</Label>
            <Input
              type="number"
              min={4}
              max={8}
              value={settings.otp_length || '4'}
              onChange={(e) => update('otp_length', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Expiry (minutes)</Label>
            <Input
              type="number"
              min={1}
              max={30}
              value={settings.otp_expiry_minutes || '5'}
              onChange={(e) => update('otp_expiry_minutes', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Max Attempts</Label>
            <Input
              type="number"
              min={1}
              max={10}
              value={settings.otp_max_attempts || '5'}
              onChange={(e) => update('otp_max_attempts', e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">Resend Cooldown (sec)</Label>
            <Input
              type="number"
              min={10}
              max={120}
              value={settings.otp_resend_cooldown_seconds || '30'}
              onChange={(e) => update('otp_resend_cooldown_seconds', e.target.value)}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Message Template */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Message Template</Label>
          <Textarea
            value={settings.otp_message_template || ''}
            onChange={(e) => update('otp_message_template', e.target.value)}
            className="rounded-xl min-h-[80px] text-sm"
            placeholder="Your verification code is {OTP}..."
          />
          <p className="text-xs text-muted-foreground">
            Placeholders: <code>{'{OTP}'}</code>, <code>{'{expiry_minutes}'}</code>
          </p>
        </div>

        <Button onClick={save} disabled={saving} className="w-full rounded-xl h-10 font-semibold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Save Settings
        </Button>
      </CardContent>
    </Card>
  );
}
