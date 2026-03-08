import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/auth/useAuth';
import { useSystemSettings } from '@/hooks/useSystemSettings';
import { Phone, CheckCircle2, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PhoneOtpVerificationProps {
  onVerified?: () => void;
  defaultPhone?: string;
}

type Step = 'phone' | 'otp' | 'verified';

export function PhoneOtpVerification({ onVerified, defaultPhone }: PhoneOtpVerificationProps) {
  const { user } = useAuth();
  const { defaultCountryCode } = useSystemSettings();

  const [step, setStep] = useState<Step>('phone');
  const [phone, setPhone] = useState(defaultPhone || '');
  const [countryCode, setCountryCode] = useState(defaultCountryCode || '+91');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [error, setError] = useState('');

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const fullPhone = `${countryCode}${phone.replace(/^0+/, '')}`;

  const sendOtp = useCallback(async (isResend = false) => {
    if (!user) return;
    setError('');
    setLoading(true);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('otp-verify', {
        body: { phone_number: fullPhone },
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      });

      // Handle the query param by using the URL approach
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const action = isResend ? 'resend' : 'send';
      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/otp-verify?action=${action}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone_number: fullPhone }),
        }
      );

      const result = await resp.json();

      if (!resp.ok) {
        setError(result.error || 'Failed to send OTP');
        if (result.resend_after_seconds) setCooldown(result.resend_after_seconds);
        return;
      }

      setCooldown(result.resend_after_seconds || 30);
      setStep('otp');
      toast.success(isResend ? 'OTP resent!' : 'OTP sent!');
    } catch (e: any) {
      setError(e.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }, [fullPhone, user]);

  const verifyOtp = useCallback(async () => {
    if (!user) return;
    setError('');
    setLoading(true);

    try {
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;

      const resp = await fetch(
        `https://${projectId}.supabase.co/functions/v1/otp-verify?action=verify`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ phone_number: fullPhone, otp_code: otp }),
        }
      );

      const result = await resp.json();

      if (!resp.ok || !result.verified) {
        setError(result.error || 'Verification failed');
        setOtp('');
        return;
      }

      setStep('verified');
      toast.success('Phone number verified!');
      onVerified?.();
    } catch (e: any) {
      setError(e.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  }, [fullPhone, otp, user, onVerified]);

  if (step === 'verified') {
    return (
      <div className="flex flex-col items-center gap-3 py-6">
        <CheckCircle2 className="h-12 w-12 text-success" />
        <p className="text-lg font-semibold text-foreground">Phone Verified</p>
        <p className="text-sm text-muted-foreground">{fullPhone}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {step === 'phone' && (
        <>
          <div className="flex gap-2">
            <Input
              value={countryCode}
              onChange={(e) => setCountryCode(e.target.value)}
              className="w-20 rounded-xl"
              placeholder="+91"
            />
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
              className="flex-1 rounded-xl"
              placeholder="Phone number"
              type="tel"
              maxLength={15}
            />
          </div>
          <Button
            className="w-full rounded-xl h-11 font-semibold"
            onClick={() => sendOtp(false)}
            disabled={loading || phone.length < 6}
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Phone className="h-4 w-4 mr-2" />
            )}
            Send OTP
          </Button>
        </>
      )}

      {step === 'otp' && (
        <>
          <p className="text-sm text-muted-foreground text-center">
            Enter the code sent to <span className="font-medium text-foreground">{fullPhone}</span>
          </p>
          <div className="flex justify-center">
            <InputOTP maxLength={4} value={otp} onChange={setOtp}>
              <InputOTPGroup>
                <InputOTPSlot index={0} />
                <InputOTPSlot index={1} />
                <InputOTPSlot index={2} />
                <InputOTPSlot index={3} />
              </InputOTPGroup>
            </InputOTP>
          </div>
          <Button
            className="w-full rounded-xl h-11 font-semibold"
            onClick={verifyOtp}
            disabled={loading || otp.length < 4}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Verify
          </Button>
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => { setStep('phone'); setOtp(''); setError(''); }}
            >
              Change number
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => sendOtp(true)}
              disabled={cooldown > 0 || loading}
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1" />
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend OTP'}
            </Button>
          </div>
        </>
      )}

      {error && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/10 p-3 rounded-xl">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
