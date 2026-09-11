'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { AdminKitchenToggle } from '@/components/AdminKitchenToggle';
import { AdminAccentColorPicker } from '@/components/AdminAccentColorPicker';
import { testAlarmChime } from '@/lib/sound';
import {
  ChefHat,
  Layers,
  Boxes,
  Map,
  BarChart3,
  Volume2,
  ArrowLeft,
  LogOut,
  Sparkles,
} from 'lucide-react';

export function AdminTopNav() {
  const pathname = usePathname();
  const { user, signOut } = useAuth();
  const { orders } = useOrders();
  const [testingAudio, setTestingAudio] = React.useState(false);

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
    <header className="sticky top-0 z-40 bg-[#0F172A]/95 backdrop-blur-md border-b border-slate-800 shadow-xl">
      {/* Top Persistent Control Bar */}
      <div className="max-w-7xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Mode */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center p-1.5 shadow-inner">
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
            <div className="flex items-center gap-2">
              <span className="text-base sm:text-lg font-black tracking-tight text-white">
                Newtown Kitchen
              </span>
              <span className="text-[9px] uppercase font-mono font-black px-1.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/40 rounded-md">
                Control Room
              </span>
            </div>
            <p className="text-[11px] font-bold text-slate-400 leading-none mt-0.5">
              Authoritative Kitchen Operations
            </p>
          </div>
        </div>

        {/* Center/Right Controls */}
        <div className="flex items-center flex-wrap gap-2 sm:gap-3">
          {/* Pinned Kitchen Open/Closed Switch */}
          <AdminKitchenToggle />

          {/* Test Sound Alarm */}
          <button
            onClick={handleTestAudio}
            disabled={testingAudio}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
              testingAudio
                ? 'bg-amber-500 text-slate-950 border-amber-400 scale-95'
                : 'bg-[#1E293B] hover:bg-[#334155] text-slate-200 border-slate-700'
            }`}
            title="Test Loud Order Chime"
          >
            <Volume2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Test Sound</span>
          </button>

          {/* Theme Color Picker */}
          <AdminAccentColorPicker />

          {/* Switch to Buyer App */}
          <Link
            href="/"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-slate-700 rounded-xl text-xs font-bold text-slate-300 hover:text-white transition-all"
            title="Switch to customer ordering app"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Buyer App</span>
          </Link>

          {/* Sign Out */}
          {user && (
            <button
              onClick={() => signOut()}
              title={`Sign out (${user.email})`}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Top Segmented Tabs */}
      <div className="border-t border-slate-800/80 bg-[#0B0F19]">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar py-1.5">
          {navTabs.map((tab) => {
            const isActive = pathname === tab.href;
            const Icon = tab.icon;

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all ${
                  isActive
                    ? 'bg-white text-slate-950 shadow-md scale-100'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className={`w-4 h-4 stroke-[2.5] ${isActive ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
                {typeof tab.count === 'number' && tab.count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                      tab.alert
                        ? 'bg-rose-500 text-white animate-pulse'
                        : isActive
                        ? 'bg-slate-200 text-slate-900'
                        : 'bg-slate-800 text-slate-300'
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
