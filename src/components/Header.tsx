'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, MapPin, ChefHat, Sparkles, LogOut } from 'lucide-react';
import { formatINR } from '@/lib/utils';

export function Header() {
  const { user, isMock, switchMockRole, signOut } = useAuth();
  const { itemCount, totalAmount } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8F2]/95 backdrop-blur-md border-b-2 border-[#111111]">
      {/* Mock Demo Role Banner (STRICTLY GATED TO MOCK MODE ONLY) */}
      {isMock && (
        <div className="bg-[#FFD166] text-[#111111] text-xs py-1.5 px-4 font-black flex items-center justify-between border-b-2 border-[#111111]">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 fill-[#111111]" />
            <span className="uppercase tracking-wider">Pilot Sandbox Mode</span>
          </div>
          <div className="flex items-center gap-1 bg-[#111111]/10 p-0.5 rounded-xl">
            <button
              onClick={() => switchMockRole('employee')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                user?.role === 'employee'
                  ? 'bg-[#111111] text-white shadow-xs'
                  : 'text-[#111111] hover:bg-white/50'
              }`}
            >
              👤 Employee
            </button>
            <button
              onClick={() => switchMockRole('admin')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                user?.role === 'admin'
                  ? 'bg-[#FF3B30] text-white shadow-xs'
                  : 'text-[#111111] hover:bg-white/50'
              }`}
            >
              👨‍🍳 Kitchen Admin
            </button>
          </div>
        </div>
      )}

      {/* Main Brand Bar */}
      <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-3">
        {/* Brand Logo & Name */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-white border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center p-1.5 group-hover:rotate-6 transition-transform overflow-hidden">
            <Image
              src="/ibarts-logo.png"
              alt="Ibarts Logo"
              width={38}
              height={38}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-[#111111]">
                Newtown Express
              </span>
              <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#FFD166] text-[#111111] border border-[#111111] rounded-md shadow-[0_1.5px_0_#111111]">
                by Ibarts
              </span>
            </div>
            <p className="text-[11px] font-bold text-[#6B6B6B] leading-none mt-0.5">
              Fresh & hot straight to your desk
            </p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Seat Picker Badge */}
          {user && (
            <Link
              href="/onboarding"
              className="flex items-center gap-1.5 px-3 py-2 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] text-xs font-extrabold text-[#111111] hover:bg-[#FFF8F2] active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all"
              title="Change your seat"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
              <span>{user.seatCode || 'Pick Seat'}</span>
            </Link>
          )}

          {/* Admin Kitchen Quick Link (if role is admin) */}
          {user?.role === 'admin' && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#111111] text-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] text-xs font-black hover:bg-[#FF3B30] active:translate-y-0.5 active:shadow-[0_1px_0_#111111] transition-all"
            >
              <ChefHat className="w-4 h-4 text-[#FFD166]" />
              <span className="hidden sm:inline">Kitchen</span>
            </Link>
          )}

          {/* Tactile Cart Button */}
          <Link
            href="/cart"
            className="tactile-btn flex items-center gap-2 px-4 py-2 text-xs"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
            {itemCount > 0 ? (
              <span className="flex items-center gap-1.5">
                <span className="bg-white text-[#111111] px-1.5 py-0.2 rounded-md font-black text-[11px]">
                  {itemCount}
                </span>
                <span className="font-black">{formatINR(totalAmount)}</span>
              </span>
            ) : (
              <span>Cart</span>
            )}
          </Link>

          {/* Sign Out */}
          {user && (
            <button
              onClick={() => signOut()}
              title={`Signed in as ${user.email}`}
              className="p-2 text-[#6B6B6B] hover:text-[#111111] rounded-xl hover:bg-stone-200/60 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
