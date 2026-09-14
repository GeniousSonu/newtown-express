'use client';

import React, { useState } from 'react';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { ShoppingBag, MapPin, ChefHat, LogOut, AlertCircle, X } from 'lucide-react';
import { formatINR } from '@/lib/utils';
import { getSeatShortCode } from '@/lib/seatLayout';
import { AdminKitchenToggle } from '@/components/AdminKitchenToggle';
import { UserAvatar } from '@/components/UserAvatar';

export function Header() {
  const { user, signOut, canOrderForSelf, sessionAlertMessage, clearSessionAlert } = useAuth();
  const { itemCount, totalAmount } = useCart();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[#FFF8F2]/95 backdrop-blur-md border-b-2 border-[#111111] overflow-hidden">
      {/* Session Alert Banner */}
      {sessionAlertMessage && (
        <div className="bg-red-500 text-white px-3 sm:px-4 py-2 text-xs font-black flex items-center justify-between gap-2 animate-fadeIn">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 shrink-0 stroke-[2.5]" />
            <span className="truncate">{sessionAlertMessage}</span>
          </div>
          <button
            onClick={clearSessionAlert}
            className="p-1 hover:bg-red-600 rounded-lg transition-colors shrink-0"
            aria-label="Dismiss message"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Brand Bar */}
      <div className="max-w-4xl mx-auto px-3 sm:px-4 py-2.5 sm:py-3.5 flex items-center justify-between gap-2">
        {/* Brand Logo & Name (Autohides non-essential text on mobile) */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0 min-w-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-2xl bg-white border-2 border-[#111111] shadow-[0_2px_0_#111111] sm:shadow-[0_3px_0_#111111] flex items-center justify-center p-1 group-hover:rotate-6 transition-transform overflow-hidden shrink-0">
            <Image
              src="/ibarts-logo.png"
              alt="Ibarts Logo"
              width={38}
              height={38}
              className="w-full h-full object-contain"
              priority
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-base sm:text-xl font-black tracking-tight text-[#111111] whitespace-nowrap">
                Newtown<span className="hidden xs:inline"> Express</span>
              </span>
              <span className="hidden md:inline-block text-[10px] uppercase font-black px-1.5 py-0.5 bg-[#FFD166] text-[#111111] border border-[#111111] rounded-md shadow-[0_1px_0_#111111] whitespace-nowrap">
                by Ibarts
              </span>
            </div>
            <p className="hidden md:block text-[11px] font-bold text-[#6B6B6B] leading-none mt-0.5 truncate">
              Fresh & hot straight to your desk
            </p>
          </div>
        </Link>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* Seat Picker Badge: Compact on mobile, only for accounts that can order */}
          {user && canOrderForSelf && (
            <Link
              href="/settings/profile"
              className="flex items-center gap-1 px-2.5 py-1.5 sm:px-3 sm:py-2 bg-white rounded-xl sm:rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] text-[11px] sm:text-xs font-black text-[#111111] hover:bg-[#FFF8F2] active:translate-y-0.5 transition-all shrink-0"
              title="Change your desk"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5] shrink-0" />
              <span className="truncate max-w-[68px] sm:max-w-none">
                {user.seatCode ? getSeatShortCode(user.seatCode) : 'Desk'}
              </span>
            </Link>
          )}

          {/* User Avatar */}
          {user && (
            <Link
              href="/settings/profile"
              className="hover:scale-105 active:translate-y-0.5 transition-all shrink-0"
              title={`Edit Profile (${user.displayName || user.email})`}
            >
              <UserAvatar
                uid={user.uid}
                name={user.displayName || user.email}
                size="sm"
              />
            </Link>
          )}

          {/* Admin Quick Link (Toggle hidden on phone to prevent overflow) */}
          {user?.role === 'admin' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden md:block">
                <AdminKitchenToggle />
              </div>
              <Link
                href="/admin"
                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#111111] text-white rounded-xl sm:rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] text-[11px] sm:text-xs font-black hover:bg-[#0F766E] active:translate-y-0.5 transition-all shrink-0"
              >
                <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD166]" />
                <span className="hidden sm:inline">Admin</span>
              </Link>
            </div>
          )}

          {/* Kitchen Manager Quick Link */}
          {user?.role === 'kitchenManager' && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden md:block">
                <AdminKitchenToggle />
              </div>
              <Link
                href="/kitchen"
                className="flex items-center gap-1 px-2.5 sm:px-3.5 py-1.5 sm:py-2 bg-[#0F766E] text-white rounded-xl sm:rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] text-[11px] sm:text-xs font-black hover:bg-[#134E4A] active:translate-y-0.5 transition-all shrink-0"
              >
                <ChefHat className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#FFD166]" />
                <span className="hidden sm:inline">Kitchen</span>
              </Link>
            </div>
          )}

          {/* Tactile Cart Button: SHOWN ON TABLET/DESKTOP ONLY (sm:flex), HIDDEN ON MOBILE (sm:hidden) */}
          {canOrderForSelf && (
            <Link
              href="/cart"
              className="hidden sm:flex tactile-btn items-center gap-2 px-3.5 sm:px-4 py-2 text-xs shrink-0"
              aria-label="View Cart"
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
          )}

          {/* Sign Out Button: Clean, tactile, shrink-safe on phone screens */}
          {user && (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              title={`Sign out (${user.email})`}
              aria-label="Sign out"
              className="min-w-[36px] min-h-[36px] p-2 text-[#6B6B6B] hover:text-[#111111] rounded-xl hover:bg-stone-200/60 active:translate-y-0.5 transition-all flex items-center justify-center shrink-0"
            >
              <LogOut className="w-4 h-4 stroke-[2.5]" />
            </button>
          )}

          {/* Logout Confirmation Dialog */}
          <ConfirmDialog
            open={showLogoutConfirm}
            title="Log out of Newtown Express?"
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
    </header>
  );
}
