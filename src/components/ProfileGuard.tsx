'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export function ProfileGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  const isOnboarding = pathname === '/onboarding';
  const isProfileIncomplete = Boolean(user && !user.profileComplete);

  useEffect(() => {
    if (!loading && isProfileIncomplete && !isOnboarding) {
      router.replace('/onboarding');
    }
  }, [loading, isProfileIncomplete, isOnboarding, router]);

  // If user is logged in but hasn't completed onboarding, block all other routes
  if (!loading && isProfileIncomplete && !isOnboarding) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center space-y-3 text-center px-4">
        <div className="w-12 h-12 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin"></div>
        <p className="text-base font-black text-[#111111]">
          Setting up your Newtown profile...
        </p>
        <p className="text-xs font-bold text-[#6B6B6B]">
          Redirecting to mandatory onboarding...
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
