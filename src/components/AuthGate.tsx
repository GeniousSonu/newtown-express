'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Image from 'next/image';
import { Mail, KeyRound, ArrowRight, ShieldCheck, RefreshCw, AlertCircle } from 'lucide-react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, sendOtp, verifyOtp } = useAuth();

  const [step, setStep] = useState<'email' | 'otp'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
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
      const res = await sendOtp(cleanEmail);
      if (res && (res as unknown as { devOtp?: string }).devOtp) {
        const code = (res as unknown as { devOtp: string }).devOtp;
        setOtp(code);
        setSuccessMessage(`Sandbox Notice: Code ${code} generated! (Also printed in terminal)`);
      } else {
        setSuccessMessage(`A 6-digit code has been sent to ${cleanEmail}`);
      }
      setStep('otp');
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Failed to send OTP email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (otp.trim().length !== 6) {
      setErrorMessage('Please enter the full 6-digit OTP code.');
      return;
    }

    setIsSubmitting(true);
    try {
      await verifyOtp(email, otp.trim());
      // Logged in! children will render.
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || 'Invalid or expired code.');
      setIsSubmitting(false);
    }
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
            {step === 'email' ? 'Welcome to Newtown' : 'Check Your Inbox'}
          </h1>
          <p className="text-xs sm:text-sm font-bold text-[#6B6B6B] max-w-xs mx-auto">
            {step === 'email'
              ? 'Enter your email address to receive your 6-digit one-time login code.'
              : `We sent a 6-digit code to ${email}`}
          </p>
        </div>

        {/* Step 1: Email Input */}
        {step === 'email' ? (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111] block">
                Your Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#111111] stroke-[2.5]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@gmail.com or name@ibarts.in"
                  autoFocus
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#6B6B6B] placeholder:font-medium shadow-[0_2px_0_#111111] focus:outline-none focus:shadow-[0_4px_0_#111111] focus:border-[#FF3B30]"
                />
              </div>
              <span className="text-[11px] font-bold text-[#6B6B6B] block">
                ✨ Passwordless login: Quick 6-digit code sent to your inbox
              </span>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-100 text-red-900 rounded-2xl text-xs font-black border-2 border-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{errorMessage}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || !email}
              className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Sending One-Time Code...' : 'Send Login OTP'}</span>
              <ArrowRight className="w-5 h-5 stroke-[2.5]" />
            </button>
          </form>
        ) : (
          /* Step 2: 6-Digit OTP Input */
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#111111] block">
                Enter 6-Digit OTP
              </label>
              <div className="relative">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#111111] stroke-[2.5]" />
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="• • • • • •"
                  autoFocus
                  required
                  className="w-full pl-12 pr-4 py-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] text-xl font-black text-center tracking-[8px] text-[#111111] placeholder:text-[#6B6B6B] shadow-[0_2px_0_#111111] focus:outline-none focus:shadow-[0_4px_0_#111111] font-mono"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="p-3.5 bg-red-100 text-red-900 rounded-2xl text-xs font-black border-2 border-red-400 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-100 text-emerald-900 rounded-2xl text-xs font-bold border border-emerald-400">
                {successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting || otp.length !== 6}
              className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
            >
              <span>{isSubmitting ? 'Verifying Code...' : 'Verify & Enter Pantry'}</span>
              <ShieldCheck className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="flex items-center justify-between pt-2 text-xs font-bold text-[#6B6B6B]">
              <button
                type="button"
                onClick={() => {
                  setStep('email');
                  setOtp('');
                  setErrorMessage(null);
                }}
                className="hover:text-[#111111] underline"
              >
                Change Email
              </button>

              <button
                type="button"
                onClick={handleSendOtp}
                disabled={isSubmitting}
                className="hover:text-[#FF3B30] flex items-center gap-1 font-black"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Resend Code</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
