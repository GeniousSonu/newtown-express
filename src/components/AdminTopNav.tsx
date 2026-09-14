'use client';

import React from 'react';
import Link from 'next/link';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { AdminKitchenToggle } from '@/components/AdminKitchenToggle';
import { AdminAccentColorPicker } from '@/components/AdminAccentColorPicker';
import { testAlarmChime } from '@/lib/sound';
import {
  Layers,
  Boxes,
  Map,
  BarChart3,
  Volume2,
  ArrowLeft,
  LogOut,
} from 'lucide-react';

export function AdminTopNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { orders } = useOrders();
  const [testingAudio, setTestingAudio] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  // Active queue count
  const ringingOrdersCount = orders.filter((o) =>
    ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(o.status)
  ).length;

  const cookingOrdersCount = orders.filter((o) =>
    ['ACCEPTED', 'COOKING'].includes(o.status)
  ).length;

  const activeDeliveriesCount = orders.filter((o) =>
    ['READY'].includes(o.status)
  ).length;

  const handleTestAudio = () => {
    setTestingAudio(true);
    testAlarmChime();
    setTimeout(() => setTestingAudio(false), 1200);
  };

  const navTabs = [
    {
      label: 'Queue',
      href: '/admin',
      icon: Layers,
      count: ringingOrdersCount + cookingOrdersCount,
      alert: ringingOrdersCount > 0,
    },
    {
      label: 'Stock',
      href: '/admin/stock',
      icon: Boxes,
    },
    {
      label: 'Map',
      href: '/admin/map',
      icon: Map,
      count: activeDeliveriesCount,
    },
    {
      label: 'Insights',
      href: '/admin/insights',
      icon: BarChart3,
    },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b-2 border-[#134E4A]/20 shadow-xs">
      {/* Top Persistent Control Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex flex-wrap items-center justify-between gap-2.5">
        {/* Brand & Mode */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-white border-2 border-[#134E4A] flex items-center justify-center p-1 shadow-xs">
            <Image
              src="/ibarts-logo.png"
              alt="Ibarts Logo"
              width={32}
              height={32}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm sm:text-base font-black tracking-tight text-[#0F172A]">
                Newtown Kitchen
              </span>
              <span className="text-[9px] uppercase font-mono font-black px-1.5 py-0.5 bg-teal-50 text-[#0F766E] border border-teal-300 rounded-md">
                Control Room
              </span>
            </div>
            <p className="text-[11px] font-bold text-[#475569] leading-none mt-0.5 hidden sm:block">
              Authoritative Kitchen Operations
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Pinned Kitchen Open/Closed Switch */}
          <AdminKitchenToggle />

          {/* Test Sound Alarm Button (Min 44x44px touch target) */}
          <button
            onClick={handleTestAudio}
            disabled={testingAudio}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 text-xs font-black transition-all ${
              testingAudio
                ? 'bg-amber-100 text-amber-900 border-amber-500 scale-95'
                : 'bg-white hover:bg-stone-50 text-[#0F172A] border-[#134E4A]/30 shadow-xs'
            }`}
            title="Test Loud Order Chime"
          >
            <Volume2 className="w-4 h-4 text-[#0F766E]" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          {/* Theme Color Picker */}
          <AdminAccentColorPicker />

          {/* Switch to Buyer App (Min 44x44px) */}
          <Link
            href="/"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-stone-50 border-2 border-[#134E4A]/30 rounded-xl text-xs font-black text-[#0F172A] transition-all shadow-xs"
            title="Switch to customer ordering app"
          >
            <ArrowLeft className="w-4 h-4 text-[#0F766E]" />
            <span className="hidden md:inline">Buyer App</span>
          </Link>

          {/* Sign Out Button (Min 44x44px) */}
          {user && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title={`Sign out (${user.email})`}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-[#475569] hover:text-[#0F172A] hover:bg-teal-50 rounded-xl border-2 border-transparent hover:border-[#134E4A]/20 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

          {/* Logout Confirmation Dialog */}
          <ConfirmDialog
            open={showLogoutConfirm}
            title="Log out of Newtown Kitchen?"
            message="You'll need to enter your email again to sign back in."
            confirmLabel="Log Out"
            cancelLabel="Cancel"
            variant="danger"
            onConfirm={() => {
              setShowLogoutConfirm(false);
              signOut();
            }}
            onCancel={() => setShowLogoutConfirm(false)}
          />
        </div>
      </div>

      {/* Top Segmented Navigation Tabs */}
      <div className="border-t border-[#134E4A]/15 bg-[#F4FBF7]">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1">
          {navTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`min-h-[44px] flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-[#0F766E] text-white shadow-xs'
                    : 'text-[#475569] hover:text-[#0F172A] hover:bg-teal-100/60'
                }`}
              >
                <Icon className={`w-4 h-4 stroke-[2.5] ${isActive ? 'text-white' : 'text-[#0F766E]'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-black ${
                      tab.alert
                        ? 'bg-rose-600 text-white animate-pulse'
                        : isActive
                        ? 'bg-teal-900 text-teal-100'
                        : 'bg-teal-100 text-[#0F766E]'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}
