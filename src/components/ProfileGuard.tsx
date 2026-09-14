'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isOnboarding = pathname === '/onboarding';
  const isStaff = user?.role === 'admin' || user?.role === 'kitchenManager';
  // Explicit rule: Onboarding desk picker is strictly for employees without a seatCode
  const isEmployeeNeedingOnboarding = Boolean(user && user.role === 'employee' && !user.seatCode);

  useEffect(() => {
    if (loading || !user) return;

    // 1. Admin and Kitchen Manager must NEVER see onboarding under any circumstance
    if (isStaff && isOnboarding) {
      if (user.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/kitchen');
      }
      return;
    }

    // 2. Only employees without a seatCode are routed to onboarding
    if (isEmployeeNeedingOnboarding && !isOnboarding) {
      router.replace('/onboarding');
      return;
    }
  }, [loading, user, isStaff, isEmployeeNeedingOnboarding, isOnboarding, router]);

  // If employee needs to pick a desk, block other routes while redirecting
  if (!loading && isEmployeeNeedingOnboarding && !isOnboarding) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-center px-4">
        <div className="w-12 h-12 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-black text-[#111111]">
          Setting up your Newtown profile...
        </p>
        <p className="text-xs font-bold text-[#6B6B6B]">
          Redirecting to desk selection...
        </p>
      </div>
    );
  }

  // If staff is on onboarding page, show loading spinner while redirecting away
  if (!loading && isStaff && isOnboarding) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-center px-4">
        <div className="w-12 h-12 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-black text-[#111111]">
          Redirecting to dashboard...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
