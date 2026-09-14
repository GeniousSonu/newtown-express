'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ProfileGuard } from '@/components/ProfileGuard';

export function AppNavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isStaffRoute = pathname?.startsWith('/admin') || pathname?.startsWith('/kitchen');

  return (
    <div
      data-theme={isStaffRoute ? 'admin' : 'buyer'}
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isStaffRoute
          ? 'bg-[#F4FBF7] text-[#0F172A]'
          : 'bg-[#FFF8F2] text-[#111111] pb-[calc(5rem+env(safe-area-inset-bottom))] sm:pb-8'
      }`}
    >
      <ProfileGuard>
        {!isStaffRoute && <Header />}

        {isStaffRoute ? (
          <div className="flex-1 w-full">{children}</div>
        ) : (
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6">
            {children}
          </main>
        )}

        {!isStaffRoute && <BottomNav />}
      </ProfileGuard>
    </div>
  );
}
