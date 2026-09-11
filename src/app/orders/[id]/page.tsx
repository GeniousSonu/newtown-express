'use client';

import React from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useOrders } from '@/context/OrderContext';
import { formatINR, getStatusDetails } from '@/lib/utils';
import { OrderStatus } from '@/types';
import { AuthGate } from '@/components/AuthGate';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';

const STATUS_STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'PAYMENT_VERIFYING', label: 'Verifying', emoji: '💳' },
  { status: 'ACCEPTED', label: 'Accepted', emoji: '👍' },
  { status: 'COOKING', label: 'Cooking', emoji: '🍳' },
  { status: 'READY', label: 'Ready', emoji: '🍽️' },
  { status: 'SERVED', label: 'Served', emoji: '🛵' },
  { status: 'COMPLETED', label: 'Done', emoji: '✨' },
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { getOrderById } = useOrders();

  const order = getOrderById(orderId);

  if (!order) {
    return (
      <AuthGate>
        <div className="max-w-md mx-auto my-12 tactile-card p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto bg-[#FFD166] border-2 border-[#111111] rounded-2xl flex items-center justify-center text-3xl shadow-[0_3px_0_#111111]">
            🔎
          </div>
          <h2 className="text-xl font-black text-[#111111]">
            Order Not Found
          </h2>
          <p className="text-xs text-[#6B6B6B] font-bold">
            We couldn&apos;t locate order #{orderId}.
          </p>
          <Link
            href="/"
            className="tactile-btn inline-flex items-center gap-2 px-5 py-2.5 text-xs"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Menu</span>
          </Link>
        </div>
      </AuthGate>
    );
  }

  const currentStatusMeta = getStatusDetails(order.status);
  const isRejected = order.status === 'REJECTED';
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);

  return (
    <AuthGate>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        {/* Navigation Back */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-black text-[#111111] hover:text-[#FF3B30] transition-colors"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            <span>Back to Menu</span>
          </Link>
          <span className="text-xs font-black px-2.5 py-1 bg-white border-2 border-[#111111] rounded-xl shadow-[0_2px_0_#111111] font-mono">
            #{order.id.slice(-6)}
          </span>
        </div>

        {/* Live Order Hero Status Card */}
        <div className="tactile-card p-6 sm:p-7 text-center space-y-4 bg-white">
          <div className="w-20 h-20 mx-auto rounded-[24px] bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_4px_0_#111111] flex items-center justify-center text-4xl">
            {currentStatusMeta.emoji}
          </div>

          <div>
            <span className="text-[10px] uppercase font-black tracking-widest text-[#FF3B30] block mb-1">
              Live Kitchen Tracker
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              {currentStatusMeta.label}
            </h1>
            <p className="text-xs sm:text-sm text-[#6B6B6B] font-bold max-w-sm mx-auto mt-1">
              {isRejected
                ? order.rejectionReason || 'The kitchen was unable to fulfill this order.'
                : order.status === 'PAYMENT_VERIFYING'
                ? 'Pantry staff is verifying your UPI payment proof.'
                : order.status === 'ACCEPTED'
                ? 'Order accepted! Ingredients are lined up for preparation.'
                : order.status === 'COOKING'
                ? 'Your meal is sizzling on the stove / grill right now!'
                : order.status === 'READY'
                ? 'Food is plated and on its way to your desk.'
                : order.status === 'SERVED'
                ? 'Served at your desk! Enjoy your food.'
                : 'Order closed. Thanks for using Newtown Express!'}
            </p>
          </div>

          {/* Stepper */}
          {!isRejected && (
            <div className="pt-4 px-2">
              <div className="flex items-center justify-between relative">
                <div className="absolute left-6 right-6 top-4 h-1.5 bg-stone-200 -z-0 rounded-full" />
                <div
                  className="absolute left-6 top-4 h-1.5 bg-[#FF3B30] transition-all duration-500 -z-0 rounded-full"
                  style={{
                    width: `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
                  }}
                />

                {STATUS_STEPS.map((step, idx) => {
                  const isPast = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step.status} className="flex flex-col items-center z-10">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black border-2 border-[#111111] transition-all ${
                          isCurrent
                            ? 'bg-[#FF3B30] text-white shadow-[0_3px_0_#111111] scale-110'
                            : isPast
                            ? 'bg-[#22C55E] text-white shadow-[0_2px_0_#111111]'
                            : 'bg-white text-stone-400'
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <span>{step.emoji}</span>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-black mt-2 hidden sm:block ${
                          isCurrent ? 'text-[#FF3B30]' : isPast ? 'text-[#111111]' : 'text-stone-400'
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rejection Alert */}
          {isRejected && (
            <div className="p-4 bg-red-100 text-red-900 rounded-2xl border-2 border-red-400 text-xs font-bold text-left space-y-1">
              <div className="flex items-center gap-1.5 font-black text-red-900">
                <AlertCircle className="w-4 h-4 stroke-[2.5]" />
                <span>Order Declined</span>
              </div>
              <p>Reason: {order.rejectionReason || 'Item unavailable / Invalid proof'}</p>
            </div>
          )}
        </div>

        {/* Desk Delivery Info */}
        <div className="tactile-card p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FF3B30] border-2 border-[#111111] flex items-center justify-center text-white shadow-[0_2px_0_#111111]">
              <MapPin className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider block">
                Destination Desk
              </span>
              <span className="text-lg font-black text-[#111111]">
                {order.seatCode}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider block">
              Ordered At
            </span>
            <span className="text-xs font-black text-[#111111]">
              {new Date(order.createdAt).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </div>

        {/* Order Items Receipt */}
        <div className="tactile-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black uppercase tracking-wider text-[#6B6B6B]">
              Food Receipt
            </h3>
            <span className="text-xs font-black text-[#111111]">
              {order.items.reduce((s, i) => s + i.quantity, 0)} item(s)
            </span>
          </div>

          <div className="divide-y-2 divide-stone-100">
            {order.items.map((item, idx) => (
              <div key={idx} className="py-3 flex items-start justify-between">
                <div>
                  <div className="text-sm font-black text-[#111111]">
                    {item.quantity}x {item.name}
                  </div>
                  {item.selectedAddons.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.selectedAddons.map((addon, aIdx) => (
                        <span
                          key={aIdx}
                          className="text-[10px] font-black text-[#111111] bg-[#FFF8F2] border border-[#111111] px-1.5 py-0.2 rounded"
                        >
                          +{addon.optionName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <span className="text-sm font-black text-[#111111]">
                  {formatINR(item.lineTotal)}
                </span>
              </div>
            ))}
          </div>

          <div className="pt-3 border-t-2 border-stone-200 flex items-center justify-between">
            <span className="text-xs font-bold text-[#6B6B6B]">Paid via UPI</span>
            <span className="text-xl font-black text-[#FF3B30]">
              {formatINR(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 py-3.5 px-4 bg-white hover:bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_3px_0_#111111] rounded-2xl text-center text-xs font-black text-[#111111] active:translate-y-0.5 active:shadow-none transition-all"
          >
            Order More Food
          </Link>
          <Link
            href="/orders"
            className="tactile-btn-dark flex-1 py-3.5 px-4 rounded-2xl text-center text-xs font-black"
          >
            My Order Receipts
          </Link>
        </div>
      </div>
    </AuthGate>
  );
}
