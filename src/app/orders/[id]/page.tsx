'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { formatINR, getStatusDetails, formatOrderTime, formatOrderDate, toValidMillis } from '@/lib/utils';
import { Order, OrderStatus } from '@/types';
import { AuthGate } from '@/components/AuthGate';
import {
  MapPin,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  XCircle,
  X,
} from 'lucide-react';

const STATUS_STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'PAYMENT_VERIFYING', label: 'Verifying', emoji: '💳' },
  { status: 'QUEUED', label: 'Queued', emoji: '⏳' },
  { status: 'ACCEPTED', label: 'Accepted', emoji: '👍' },
  { status: 'COOKING', label: 'Cooking', emoji: '🍳' },
  { status: 'READY', label: 'Ready', emoji: '🍽️' },
  { status: 'SERVED', label: 'Served', emoji: '🛵' },
  { status: 'COMPLETED', label: 'Done', emoji: '✨' },
];

const CANCELLABLE_STATUSES: OrderStatus[] = [
  'PLACED',
  'PAYMENT_VERIFYING',
  'PAYMENT_VERIFIED',
  'QUEUED',
];

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const { user } = useAuth();
  const { cancelOrder } = useOrders();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  // Real-time Firestore document listener with strict IDOR protection & anti-enumeration error handling
  useEffect(() => {
    if (!orderId || !user || !db) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    queueMicrotask(() => {
      setLoading(true);
      setNotFound(false);
    });

    const orderDocRef = doc(db, 'orders', orderId);
    const unsubscribe = onSnapshot(
      orderDocRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          // IDOR Defense: Order does not exist
          setNotFound(true);
          setOrder(null);
          setLoading(false);
          return;
        }

        const data = docSnap.data() as Order;

        // Defense-in-depth ownership verification
        if (data.employeeId !== user.uid && user.role !== 'admin') {
          // IDOR Defense: Render identical generic Not Found (prevent enumeration)
          setNotFound(true);
          setOrder(null);
          setLoading(false);
          return;
        }

        setOrder({ ...data, id: docSnap.id });
        setNotFound(false);
        setLoading(false);
      },
      (error) => {
        // IDOR Defense: Catch permission-denied errors and treat identically as generic Not Found
        console.warn('[ORDER-DETAIL] Firestore permission or network error:', error?.code);
        setNotFound(true);
        setOrder(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId, user]);

  if (loading) {
    return (
      <AuthGate>
        <div className="max-w-md mx-auto my-16 tactile-card p-8 text-center space-y-4">
          <div className="w-12 h-12 mx-auto border-4 border-[#FF3B30] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-sm font-black text-[#111111]">Loading order details...</p>
        </div>
      </AuthGate>
    );
  }

  // Generic Not Found screen: Identical response whether the order does not exist or belongs to someone else
  if (notFound || !order) {
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
            We couldn&apos;t locate this order. It may not exist, has expired, or is inaccessible.
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
  const isCancelled = order.status === 'CANCELLED';
  const isCancellable = CANCELLABLE_STATUSES.includes(order.status);
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.status === order.status);

  const handleConfirmCancel = async () => {
    setIsCancelling(true);
    try {
      await cancelOrder(order.id, cancelReason.trim() || 'Cancelled by employee');
      setShowCancelModal(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

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
                : isCancelled
                ? order.rejectionReason || 'Order cancelled before kitchen acceptance.'
                : order.status === 'PAYMENT_VERIFYING'
                ? 'Pantry staff is verifying your UPI payment proof.'
                : order.status === 'QUEUED'
                ? 'Queued — the kitchen has seen your order and will start cooking shortly.'
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

          {/* Stepper: Responsive (Vertical on mobile < 640px, Horizontal on >= 640px) */}
          {!isRejected && !isCancelled && (
            <div className="pt-2 sm:pt-4">
              {/* Mobile Vertical Milestone Timeline (< 640px) */}
              <div className="sm:hidden space-y-2 text-left p-3 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
                {STATUS_STEPS.map((step, idx) => {
                  const isPast = idx < currentStepIndex;
                  const isCurrent = idx === currentStepIndex;

                  return (
                    <div key={step.status} className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black border-2 border-[#111111] shrink-0 transition-all ${
                          isCurrent
                            ? 'bg-[#FF3B30] text-white shadow-[0_2px_0_#111111] scale-105'
                            : isPast
                            ? 'bg-[#15803D] text-white'
                            : 'bg-white text-stone-400 border-stone-300'
                        }`}
                      >
                        {isPast ? (
                          <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                        ) : (
                          <span>{step.emoji}</span>
                        )}
                      </div>

                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <span
                          className={`text-xs font-black truncate ${
                            isCurrent
                              ? 'text-[#FF3B30]'
                              : isPast
                              ? 'text-[#0F172A]'
                              : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </span>

                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded-md bg-red-100 text-red-800 text-[10px] font-black animate-pulse shrink-0">
                            Active
                          </span>
                        )}
                        {isPast && (
                          <span className="text-[10px] font-black text-[#15803D] shrink-0">
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tablet & Desktop Horizontal Stepper (>= 640px) */}
              <div className="hidden sm:block px-2">
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
                              ? 'bg-[#15803D] text-white shadow-[0_2px_0_#111111]'
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
                          className={`text-[10px] font-black mt-2 ${
                            isCurrent ? 'text-[#FF3B30]' : isPast ? 'text-[#0F172A]' : 'text-stone-400'
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
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

          {/* Cancellation Notice */}
          {isCancelled && (
            <div className="p-4 bg-stone-100 text-stone-800 rounded-2xl border-2 border-stone-400 text-xs font-bold text-left space-y-1">
              <div className="flex items-center gap-1.5 font-black text-stone-900">
                <XCircle className="w-4 h-4 text-stone-600 stroke-[2.5]" />
                <span>Order Cancelled</span>
              </div>
              <p>Reason: {order.rejectionReason || 'Cancelled by employee'}</p>
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

        {/* Employee Self-Cancel Button (Only while order is cancellable) */}
        {isCancellable && (
          <button
            onClick={() => setShowCancelModal(true)}
            className="w-full min-h-[44px] py-3 px-4 bg-white hover:bg-red-50 text-[#B91C1C] border-2 border-red-300 hover:border-[#DC2626] rounded-2xl text-xs font-black transition-all flex items-center justify-center gap-1.5 shadow-xs"
          >
            <XCircle className="w-4 h-4 stroke-[2.5]" />
            <span>Cancel Order</span>
          </button>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Link
            href="/"
            className="flex-1 min-h-[44px] flex items-center justify-center py-3 px-4 bg-white hover:bg-[#FFF8F2] border-2 border-[#111111] shadow-[0_3px_0_#111111] rounded-2xl text-center text-xs font-black text-[#111111] active:translate-y-0.5 active:shadow-none transition-all"
          >
            Order More Food
          </Link>
          <Link
            href="/orders"
            className="tactile-btn-dark flex-1 min-h-[44px] flex items-center justify-center py-3 px-4 rounded-2xl text-center text-xs font-black"
          >
            My Order Receipts
          </Link>
        </div>
      </div>

      {/* Cancellation Confirmation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-[28px] p-5 sm:p-6 border-2 border-[#111111] shadow-[0_8px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-red-100 border-2 border-[#111111] flex items-center justify-center text-[#B91C1C]">
                  <XCircle className="w-5 h-5 stroke-[2.5]" />
                </div>
                <h3 className="text-base sm:text-lg font-black text-[#111111]">
                  Cancel Your Order?
                </h3>
              </div>
              <button
                onClick={() => setShowCancelModal(false)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#475569] hover:text-[#0F172A]"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#475569] font-bold">
              The kitchen has not started cooking your meal yet. Cancelling will notify the kitchen staff immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#111111] uppercase tracking-wider block">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Ordered by mistake / changed mind"
                className="w-full min-h-[44px] p-3 bg-stone-50 border-2 border-[#111111] rounded-xl text-[16px] sm:text-xs font-bold focus:outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowCancelModal(false)}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black text-[#475569] hover:bg-stone-100 rounded-xl border border-stone-200"
              >
                Keep Order
              </button>
              <button
                onClick={handleConfirmCancel}
                disabled={isCancelling}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl shadow-xs"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AuthGate>
  );
}
