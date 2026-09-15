'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { AuthGate } from '@/components/AuthGate';
import { useIsMounted } from '@/lib/useIsMounted';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, loading, isAdmin, isKitchenManager } = useAuth();
  const mounted = useIsMounted();

  useEffect(() => {
    if (!loading && isKitchenManager) {
      router.replace('/kitchen');
    }
  }, [loading, isKitchenManager, router]);

  // SSR hydration mismatch avoid korte client mount howa obdi loading dekhai
  if (!mounted || loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#6B6B6B]">
        <div className="w-10 h-10 border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-black text-[#111111]">Verifying Admin Credentials...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthGate>{children}</AuthGate>;
  }

  if (isKitchenManager) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#6B6B6B]">
        <div className="w-10 h-10 border-4 border-[#0F766E] border-t-transparent rounded-full animate-spin mb-3"></div>
        <p className="text-sm font-black text-[#0F172A]">Redirecting to Kitchen Dashboard...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto my-12 tactile-card p-8 text-center space-y-4 bg-white">
        <div className="w-16 h-16 mx-auto bg-[#FFD166] border-2 border-[#111111] rounded-2xl flex items-center justify-center text-[#111111] shadow-[0_3px_0_#111111]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#111111] tracking-tight">
          Admin Only
        </h2>
        <p className="text-sm text-[#6B6B6B] font-bold">
          This management section is restricted to full administrators. Your account ({user.email}) has employee access.
        </p>
        <Link
          href="/"
          className="tactile-btn inline-flex items-center justify-center gap-2 px-6 py-3 text-xs w-full"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Menu</span>
        </Link>
      </div>
    );
  }

  return <>{children}</>;
}
