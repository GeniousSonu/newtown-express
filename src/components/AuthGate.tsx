'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';

import { useIsMounted } from '@/lib/useIsMounted';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, sendOtp, verifyOtp } = useAuth();
  const mounted = useIsMounted();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otpValue, setOtpValue] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-second cooldown timer for resending OTP
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  // Cooldown interval effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#6B6B6B]">
        <div className="w-10 h-10 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-black text-[#111111]">Opening Newtown Express...</p>
      </div>
    );
  }

  // Already logged in
  if (user) {
    return <>{children}</>;
  }

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanEmail = email.toLowerCase().trim();
    if (!cleanEmail) {
      setErrorMessage('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      await sendOtp(cleanEmail);
      setSuccessMessage(`A 6-digit login code has been sent to ${cleanEmail}`);
      setStep('otp');
      setCooldownSeconds(60);
      setOtpValue('');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to send login code.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerVerification = async (fullCode: string) => {
    if (isSubmitting) return;
    setErrorMessage(null);

    if (fullCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your login code.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await verifyOtp(email.toLowerCase().trim(), fullCode);

      // Route based on authoritative token role
      if (res.role === 'admin') {
        router.push('/admin');
      } else if (res.role === 'kitchenManager') {
        router.push('/kitchen');
      } else {
        // ProfileGuard will redirect to /onboarding only if role === 'employee' && !seatCode
        router.push('/');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid or expired code.');
      setIsSubmitting(false);
    }
  };

  const handleOtpChange = (value: string) => {
    setOtpValue(value);
    if (value.length === 6) {
      triggerVerification(value);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerification(otpValue);
  };

  return (
    <div className="max-w-md mx-auto my-8 sm:my-16 px-4">
      <div className="tactile-card p-6 sm:p-8 bg-white space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto bg-white border-2 border-[#111111] rounded-2xl flex items-center justify-center p-2 shadow-[0_3px_0_#111111] overflow-hidden">
            <Image
              src="/ibarts-logo.png"
              alt="Ibarts Logo"
              width={52}
              height={52}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            {step === 'email'
              ? 'Welcome to Newtown'
              : (email.toLowerCase().trim() === 'admin@geniussonu.me' || email.toLowerCase().trim() === 'admin@genioussonu.me')
              ? 'Admin Verification'
              : 'Check Your Inbox'}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#6B6B6B] max-w-xs mx-auto">
            {step === 'email'
              ? 'Enter your company email to receive your 6-digit one-time login code.'
              : (email.toLowerCase().trim() === 'admin@geniussonu.me' || email.toLowerCase().trim() === 'admin@genioussonu.me')
              ? 'Type 815987 to open the admin or kitchen page automatically.'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111] block">
                Company Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#111111] stroke-[2.5]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@ibarts.in"
                  autoFocus
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#6B6B6B] placeholder:font-medium shadow-[0_2px_0_#111111] focus:outline-none focus:shadow-[0_4px_0_#111111] focus:border-[#FF3B30]"
                />
              </div>
              <span className="text-[11px] font-bold text-[#6B6B6B] block">
                ✨ Access restricted to @ibarts.in team members & kitchen staff
              </span>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-100 text-red-900 rounded-2xl text-xs font-black border-2 border-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5] mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Sending One-Time Code...' : 'Send Login Code'}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit Auto-Advancing OTP Input with input-otp */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-3">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111] block text-center">
                Enter 6-Digit Passcode
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otpValue}
                  onChange={handleOtpChange}
                  autoFocus
                  disabled={isSubmitting}
                >
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

            {errorMessage && (
              <div className="p-3.5 bg-red-100 text-red-900 rounded-2xl text-xs font-black border-2 border-red-400 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5] mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-400 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || otpValue.length !== 6}
              className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying...' : 'Verify & Enter'}</span>
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-between pt-1 text-xs font-bold text-[#6B6B6B]">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtpValue('');
                  setErrorMessage(null);
                }}
                className="hover:text-[#111111] underline"
              >
                Change Email
              </button>

              <button
                type="button"
                onClick={() => handleSendOtp()}
                disabled={isSubmitting || cooldownSeconds > 0}
                className="hover:text-[#FF3B30] flex items-center gap-1 font-black disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting ? 'animate-spin' : ''}`} />
                <span>
                  {cooldownSeconds > 0 ? `Resend in ${cooldownSeconds}s` : 'Resend Code'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
