'use client';

import React from 'react';
import Link from 'next/link';
import { AuthGate } from '@/components/AuthGate';
import { ProfileForm } from '@/components/ProfileForm';
import { AccountInfoCard } from '@/components/AccountInfoCard';
import { ArrowLeft, UserCircle } from 'lucide-react';

export default function ProfileSettingsPage() {
  return (
    <AuthGate>
      <div className="max-w-lg mx-auto py-6 space-y-6">
        {/* Navigation Breadcrumb / Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="tactile-btn inline-flex items-center gap-2 px-3 py-1.5 text-xs bg-white"
          >
            <ArrowLeft className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-black uppercase text-[#6B6B6B]">
            Account Settings
          </span>
        </div>

        {/* Settings Card */}
        <div className="bg-white rounded-[32px] p-6 sm:p-8 border-3 border-[#111111] shadow-[0_6px_0_#111111] space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b-2 border-[#111111]/10">
            <div className="w-12 h-12 rounded-2xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center text-[#111111] shadow-[0_2px_0_#111111]">
              <UserCircle className="w-7 h-7 stroke-[2]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#111111] tracking-tight">
                Profile Settings
              </h1>
              <p className="text-xs font-bold text-[#6B6B6B]">
                Update your office details, profile picture, and desk code
              </p>
            </div>
          </div>

          <ProfileForm mode="settings" />
        </div>

        {/* Account & Role Claim Debug Section */}
        <AccountInfoCard />
      </div>
    </AuthGate>
  );
}
