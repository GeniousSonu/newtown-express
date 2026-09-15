'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR, getStatusDetails, formatOrderDateTime } from '@/lib/utils';
import { AuthGate } from '@/components/AuthGate';
import { BackHeader } from '@/components/BackHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { DeliveryConfirmationBanner } from '@/components/DeliveryConfirmationBanner';
import {
  Clock,
  ShoppingBag,
  Heart,
  MapPin,
} from 'lucide-react';

export default function OrdersHistoryPage() {
  const { user } = useAuth();
  const { orders } = useOrders();

  const myOrders = orders.filter((o) => o.employeeId === user?.uid);
  const totalSpent = myOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const totalOrdersCount = myOrders.length;

  const itemCounts: Record<string, number> = {};
  myOrders.forEach((o) => {
    o.items.forEach((it) => {
      itemCounts[it.name] = (itemCounts[it.name] || 0) + it.quantity;
    });
  });

  let favoriteItem = 'None yet';
  let maxCount = 0;
  Object.entries(itemCounts).forEach(([name, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteItem = name;
    }
  });

  return (
    <AuthGate>
      <div className="space-y-6 pb-12">
        {/* Active Delivery Confirmation Prompt */}
        <DeliveryConfirmationBanner />

        {/* in-app back header with swipe back support */}
        <BackHeader
          fallbackHref="/"
          title="My Orders & Receipts"
          subtitle="Track your hot meal deliveries and personal pantry spend"
          rightAction={
            <Link
              href="/"
              className="tactile-btn flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs"
            >
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
              <span className="hidden sm:inline">Order Food</span>
              <span className="sm:hidden">Menu</span>
            </Link>
          }
        />

        {/* Personal Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="tactile-card p-4 text-center">
            <span className="text-[10px] uppercase font-black text-[#6B6B6B] block mb-1">
              Total Orders
            </span>
            <span className="text-2xl sm:text-3xl font-black text-[#111111]">
              {totalOrdersCount}
            </span>
          </div>

          <div className="tactile-card p-4 text-center">
            <span className="text-[10px] uppercase font-black text-[#6B6B6B] block mb-1">
              Total Spend
            </span>
            <span className="text-xl sm:text-2xl font-black text-[#FF3B30]">
              {formatINR(totalSpent)}
            </span>
          </div>

          <div className="tactile-card p-4 text-center truncate">
            <span className="text-[10px] uppercase font-black text-[#6B6B6B] block mb-1 flex items-center justify-center gap-1">
              <Heart className="w-3 h-3 text-[#FF3B30] fill-[#FF3B30]" />
              Favorite
            </span>
            <span className="text-xs sm:text-sm font-black text-[#111111] truncate block">
              {favoriteItem}
            </span>
          </div>
        </div>

        {/* Orders List */}
        <div className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-wider text-[#6B6B6B]">
            Order Receipts ({myOrders.length})
          </h2>

          {myOrders.map((order) => {
            const statusMeta = getStatusDetails(order.status);

            return (
              <Link
                key={order.id}
                href={`/orders/${order.id}`}
                className="block tactile-card p-4 sm:p-5 transition-all group hover:-translate-y-1"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <UserAvatar uid={order.employeeId} name={order.employeeName} size="sm" />
                    <div>
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono font-black text-[#111111]">
                          #{order.id.slice(-4)}
                        </span>
                        <span className="text-[10px] font-bold text-[#6B6B6B] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatOrderDateTime(order.createdAt)}
                        </span>
                      </div>

                    {/* Items snippet */}
                    <div className="text-sm font-black text-[#111111] line-clamp-1 mb-1 group-hover:text-[#FF3B30] transition-colors">
                      {order.items.map((it) => `${it.quantity}x ${it.name}`).join(', ')}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-[#6B6B6B] font-bold">
                      <span className="flex items-center gap-0.5 text-[#111111]">
                        <MapPin className="w-3.5 h-3.5 text-[#FF3B30]" />
                        {order.seatCode}
                      </span>
                      <span>•</span>
                      <span>{order.items.reduce((s, i) => s + i.quantity, 0)} item(s)</span>
                    </div>
                  </div>
                </div>

                <div className="text-right flex flex-col items-end gap-2">
                    <span className="text-base font-black text-[#111111]">
                      {formatINR(order.totalAmount)}
                    </span>

                    <span className="text-[10px] font-black px-2.5 py-1 rounded-xl border border-[#111111] bg-[#FFF8F2] flex items-center gap-1 shadow-[0_1.5px_0_#111111]">
                      <span>{statusMeta.emoji}</span>
                      <span>{statusMeta.label}</span>
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}

          {myOrders.length === 0 && (
            <div className="tactile-card p-16 text-center space-y-3">
              <div className="text-4xl">🧾</div>
              <h3 className="text-base font-black text-[#111111]">No Orders Yet</h3>
              <p className="text-xs text-[#6B6B6B] font-bold">
                You haven&apos;t placed any pantry orders yet.
              </p>
              <Link
                href="/"
                className="tactile-btn inline-flex items-center gap-1.5 px-5 py-2.5 text-xs"
              >
                Browse Menu
              </Link>
            </div>
          )}
        </div>
      </div>
    </AuthGate>
  );
}
