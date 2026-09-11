import type { Metadata, Viewport } from 'next';
import React from 'react';
import { AdminGate } from '@/components/AdminGate';
import { AdminTopNav } from '@/components/AdminTopNav';
import { ActiveOrderAlarmModal } from '@/components/ActiveOrderAlarmModal';
import { AudioUnlockBanner } from '@/components/AudioUnlockBanner';

export const metadata: Metadata = {
  title: 'Newtown Express Kitchen — Control Room',
  description: 'Authoritative kitchen operations, real-time order queue, and pantry stock control',
  manifest: '/admin-manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'NE Kitchen',
  },
};

export const viewport: Viewport = {
  themeColor: '#0B0F19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGate>
      <div className="min-h-screen flex flex-col bg-[#0B0F19] text-[#F8FAFC]">
        <link rel="manifest" href="/admin-manifest.json" />
        <AdminTopNav />
        <AudioUnlockBanner />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4 sm:py-6">
          {children}
        </main>
        {/* Global alarm takeover mounted across all admin routes */}
        <ActiveOrderAlarmModal />
      </div>
    </AdminGate>
  );
}
