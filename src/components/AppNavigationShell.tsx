'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Header } from '@/components/Header';
import { BottomNav } from '@/components/BottomNav';
import { ProfileGuard } from '@/components/ProfileGuard';

export function AppNavigationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');

  return (
    <div
      data-theme={isAdminRoute ? 'admin' : 'buyer'}
      className={`min-h-screen flex flex-col transition-colors duration-200 ${
        isAdminRoute
          ? 'bg-[#0B0F19] text-[#F8FAFC]'
          : 'bg-[#FFF8F2] text-[#111111] pb-20 sm:pb-8'
      }`}
    >
      <ProfileGuard>
        {!isAdminRoute && <Header />}

        {isAdminRoute ? (
          <div className="flex-1 w-full">{children}</div>
        ) : (
          <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-4 sm:py-6">
            {children}
          </main>
        )}

        {!isAdminRoute && <BottomNav />}
      </ProfileGuard>
    </div>
  );
}
