'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import {
  Mail,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  AlertCircle,
  KeyRound,
  Sparkles,
} from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 60-second cooldown timer for resending OTP
  const [cooldownSeconds, setCooldownSeconds] = useState(0);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Cooldown interval effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const interval = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldownSeconds]);

  if (loading) {
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
      setDigits(['', '', '', '', '', '']);

      // Focus first digit box after step change
      setTimeout(() => {
        inputRefs.current[0]?.focus();
      }, 100);
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
      } else {
        router.push('/onboarding');
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid or expired code.');
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const numericVal = val.replace(/\D/g, '');
    if (!numericVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    // Handle paste of full 6 digits
    if (numericVal.length >= 6) {
      const pastedDigits = numericVal.slice(0, 6).split('');
      setDigits(pastedDigits);
      inputRefs.current[5]?.focus();
      triggerVerification(numericVal.slice(0, 6));
      return;
    }

    const singleDigit = numericVal.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = singleDigit;
    setDigits(newDigits);

    // Auto-advance to next box
    if (singleDigit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-verify when all 6 digits are typed
    if (!newDigits.includes('') && newDigits.join('').length === 6) {
      triggerVerification(newDigits.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '');
    if (pastedData.length >= 6) {
      const pastedDigits = pastedData.slice(0, 6).split('');
      setDigits(pastedDigits);
      inputRefs.current[5]?.focus();
      triggerVerification(pastedData.slice(0, 6));
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    triggerVerification(digits.join(''));
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
              : email.toLowerCase().trim() === 'admin@geniussonu.me'
              ? 'Admin Verification'
              : 'Check Your Inbox'}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#6B6B6B] max-w-xs mx-auto">
            {step === 'email'
              ? 'Enter your company email to receive your 6-digit one-time login code.'
              : email.toLowerCase().trim() === 'admin@geniussonu.me'
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
          /* Step 2: 6-Digit Auto-Advancing OTP Input */
          <form onSubmit={handleVerifyOtp} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111] block text-center">
                Enter 6-Digit Passcode
              </label>
              <div className="flex justify-between gap-2">
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      inputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={idx === 0 ? 6 : 1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    autoFocus={idx === 0}
                    className="w-12 h-14 sm:w-14 sm:h-16 text-center text-xl sm:text-2xl font-mono font-black bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl shadow-[0_3px_0_#111111] focus:outline-none focus:border-[#FF3B30] focus:shadow-[0_4px_0_#111111] transition-all"
                  />
                ))}
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
              disabled={isSubmitting || digits.join('').length !== 6}
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
                  setDigits(['', '', '', '', '', '']);
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
