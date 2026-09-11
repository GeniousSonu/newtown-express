'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Utensils, ReceiptText, ChefHat, Map, BarChart3 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';

export function BottomNav() {
  const pathname = usePathname();
  const { user } = useAuth();
  const { orders } = useOrders();

  const isAdmin = user?.role === 'admin';
  const pendingKitchenOrders = orders.filter((o) =>
    ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING'].includes(o.status)
  ).length;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#FFF8F2]/95 backdrop-blur-md border-t-2 border-[#111111] sm:hidden">
      <div className="flex items-center justify-around h-16 max-w-md mx-auto px-2">
        {/* Menu */}
        <Link
          href="/"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-black transition-all ${
            pathname === '/' ? 'text-[#FF3B30] -translate-y-0.5' : 'text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <Utensils className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span>Menu</span>
        </Link>

        {/* My Orders */}
        <Link
          href="/orders"
          className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-black transition-all ${
            pathname === '/orders' ? 'text-[#FF3B30] -translate-y-0.5' : 'text-[#6B6B6B] hover:text-[#111111]'
          }`}
        >
          <ReceiptText className="w-5 h-5 mb-0.5 stroke-[2.5]" />
          <span>Orders</span>
        </Link>

        {/* Admin Tabs */}
        {isAdmin && (
          <>
            <Link
              href="/admin"
              className={`relative flex flex-col items-center justify-center flex-1 py-1 text-xs font-black transition-all ${
                pathname === '/admin' ? 'text-[#FF3B30] -translate-y-0.5' : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              <div className="relative">
                <ChefHat className="w-5 h-5 mb-0.5 stroke-[2.5]" />
                {pendingKitchenOrders > 0 && (
                  <span className="absolute -top-1.5 -right-2 bg-[#FF3B30] text-white text-[10px] font-black w-4 h-4 rounded-full border border-[#111111] flex items-center justify-center animate-pulse">
                    {pendingKitchenOrders}
                  </span>
                )}
              </div>
              <span>Kitchen</span>
            </Link>

            <Link
              href="/admin/map"
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-black transition-all ${
                pathname === '/admin/map' ? 'text-[#FF3B30] -translate-y-0.5' : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              <Map className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span>Map</span>
            </Link>

            <Link
              href="/admin/insights"
              className={`flex flex-col items-center justify-center flex-1 py-1 text-xs font-black transition-all ${
                pathname === '/admin/insights' ? 'text-[#FF3B30] -translate-y-0.5' : 'text-[#6B6B6B] hover:text-[#111111]'
              }`}
            >
              <BarChart3 className="w-5 h-5 mb-0.5 stroke-[2.5]" />
              <span>Insights</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
