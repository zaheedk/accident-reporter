import { useState } from 'react';
import { Phone, Loader2, ArrowRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

interface PhoneAuthProps {
  onError: (msg: string) => void;
}

export default function PhoneAuth({ onError }: PhoneAuthProps) {
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const sendOtp = async () => {
    if (!phone) {
      onError('Please enter a phone number');
      return;
    }
    setSubmitting(true);
    onError('');
    try {
      const { data, error } = await supabase.functions.invoke('phone-otp', {
        body: { action: 'send', phone },
      });
      if (error) throw new Error(error.message || 'Failed to send OTP');
      if (data?.error) throw new Error(data.error);
      setOtpSent(true);
    } catch (err: any) {
      onError(err.message || 'Failed to send verification code');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyOtp = async () => {
    if (!otp || otp.length < 6) {
      onError('Please enter the 6-digit code');
      return;
    }
    setSubmitting(true);
    onError('');
    try {
      const { data, error } = await supabase.functions.invoke('phone-otp', {
        body: { action: 'verify', phone, otp },
      });
      if (error) throw new Error(error.message || 'Verification failed');
      if (data?.error) throw new Error(data.error);

      if (data?.actionLink) {
        // Extract token hash from action link and verify OTP
        const url = new URL(data.actionLink);
        const tokenHash = url.searchParams.get('token') || url.hash?.replace('#', '') || '';
        
        // Use verifyOtp to complete the magic link sign-in
        const { error: verifyError } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: 'magiclink',
        });
        
        if (verifyError) {
          // Fallback: try the action link redirect approach
          window.location.href = data.actionLink;
        }
      }
    } catch (err: any) {
      onError(err.message || 'Verification failed');
    } finally {
      setSubmitting(false);
    }
  };

  if (!otpSent) {
    return (
      <div className="space-y-4">
        <div>
          <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
            Mobile Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" strokeWidth={1.5} />
            <input
              type="tel"
              className="form-input pl-10"
              placeholder="+64 21 123 4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-muted-foreground mt-1.5">Include country code (e.g. +64 for NZ)</p>
        </div>
        <button
          onClick={sendOtp}
          disabled={submitting}
          className="btn-primary w-full h-12 text-[15px] rounded-xl"
          style={{ boxShadow: '0 4px 20px hsla(22, 90%, 52%, 0.4)' }}
        >
          {submitting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>
              Send Verification Code
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
          Verification Code
        </label>
        <p className="text-sm text-muted-foreground mb-3">
          Enter the 6-digit code sent to <span className="font-semibold text-foreground">{phone}</span>
        </p>
        <div className="flex justify-center">
          <InputOTP maxLength={6} value={otp} onChange={setOtp}>
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
      </div>
      <button
        onClick={verifyOtp}
        disabled={submitting || otp.length < 6}
        className="btn-primary w-full h-12 text-[15px] rounded-xl"
        style={{ boxShadow: '0 4px 20px hsla(22, 90%, 52%, 0.4)' }}
      >
        {submitting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          'Verify & Sign In'
        )}
      </button>
      <button
        onClick={() => { setOtpSent(false); setOtp(''); }}
        className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Change number
      </button>
    </div>
  );
}
