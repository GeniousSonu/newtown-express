'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AuthGate } from '@/components/AuthGate';
import { ProfileForm } from '@/components/ProfileForm';
import { useAuth } from '@/context/AuthContext';
import { ShieldCheck } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <AuthGate>
      <div className="min-h-[85vh] py-6 sm:py-10 px-3 sm:px-4 flex flex-col items-center justify-center">
        <div className="w-full max-w-lg bg-white rounded-[32px] p-6 sm:p-8 border-3 border-[#111111] shadow-[0_8px_0_#111111] space-y-6">
          {/* Header Banner */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFD166] border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center text-3xl">
              👋
            </div>
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Welcome to Newtown Express!
              </h1>
              <p className="text-xs sm:text-sm text-[#6B6B6B] font-bold max-w-sm mx-auto">
                Set up your profile once. Newtown pantry delivers hot meals and snacks directly to your office desk.
              </p>
            </div>

            {/* Email Verification Pill */}
            {user?.email && (
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#FFF8F2] border border-[#111111] rounded-full text-xs font-black text-[#111111]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" />
                <span>{user.email}</span>
              </div>
            )}
          </div>

          {/* Profile Form */}
          <ProfileForm
            mode="onboarding"
            onComplete={() => {
              if (user?.role === 'admin') {
                router.push('/admin');
              } else {
                router.push('/');
              }
            }}
          />
        </div>
      </div>
    </AuthGate>
  );
}
