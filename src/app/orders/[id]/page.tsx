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
} from 'lucide-react';
import { BackHeader } from '@/components/BackHeader';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { orderCancellationSchema, OrderCancellationFormData } from '@/lib/validations/schemas';

const STATUS_STEPS: { status: OrderStatus; label: string; emoji: string }[] = [
  { status: 'PAYMENT_VERIFYING', label: 'Verifying', emoji: '💳' },
  { status: 'QUEUED', label: 'Queued', emoji: '⏳' },
  { status: 'ACCEPTED', label: 'Accepted', emoji: '👍' },
  { status: 'COOKING', label: 'Cooking', emoji: '🍳' },
  { status: 'READY', label: 'Ready', emoji: '🍽️' },
  { status: 'SERVED', label: 'Served', emoji: '✨' },
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
  const { cancelOrder, getOrderById, confirmDelivery, reportMissingDelivery } = useOrders();

  const hasInitialData = Boolean(getOrderById(orderId));
  const [order, setOrder] = useState<Order | null>(() => {
    return getOrderById(orderId) || null;
  });
  const [loading, setLoading] = useState(() => !hasInitialData);
  const [notFound, setNotFound] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isConfirmingDelivery, setIsConfirmingDelivery] = useState(false);
  const [isReportingMissing, setIsReportingMissing] = useState(false);

  const {
    register: registerCancel,
    handleSubmit: handleCancelSubmit,
    reset: resetCancelForm,
    formState: { errors: cancelErrors },
  } = useForm<OrderCancellationFormData>({
    resolver: zodResolver(orderCancellationSchema),
    defaultValues: { reason: '' },
  });

  // Real-time Firestore document listener with strict IDOR protection & anti-enumeration error handling
  useEffect(() => {
    if (!orderId || !user || !db) {
      queueMicrotask(() => setLoading(false));
      return;
    }

    if (!hasInitialData) {
      queueMicrotask(() => {
        setLoading(true);
        setNotFound(false);
      });
    }

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

        const raw = docSnap.data();
        if (!raw) {
          setNotFound(true);
          setOrder(null);
          setLoading(false);
          return;
        }

        // Defense-in-depth ownership verification
        if (raw.employeeId !== user.uid && user.role !== 'admin') {
          // IDOR Defense: Render identical generic Not Found (prevent enumeration)
          setNotFound(true);
          setOrder(null);
          setLoading(false);
          return;
        }

        const normalizedOrder: Order = {
          ...raw,
          id: docSnap.id,
          createdAt: toValidMillis(raw?.createdAt),
          statusUpdatedAt: toValidMillis(raw?.statusUpdatedAt),
          queuedAt: raw?.queuedAt ? toValidMillis(raw?.queuedAt) : null,
          ringingSince: raw?.ringingSince ? toValidMillis(raw?.ringingSince) : null,
        } as Order;

        setOrder(normalizedOrder);
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
  }, [orderId, user, hasInitialData]);

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
  const isDelivered = order.status === 'SERVED' || order.status === 'COMPLETED';
  const currentStepIndex = isDelivered
    ? STATUS_STEPS.length - 1
    : STATUS_STEPS.findIndex((s) => s.status === order.status);

  const onConfirmCancel = async (data: OrderCancellationFormData) => {
    if (!order) return;
    setIsCancelling(true);
    try {
      await cancelOrder(order.id, data.reason.trim() || 'Cancelled by employee');
      setShowCancelModal(false);
      resetCancelForm();
      toast.success('Order cancelled successfully.');
    } catch (err: unknown) {
      toast.error((err as Error).message || 'Failed to cancel order.');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleConfirmDelivered = async () => {
    if (!order) return;
    setIsConfirmingDelivery(true);
    try {
      await confirmDelivery(order.id);
      toast.success('Food delivery confirmed! Calories added to your profile ✨');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to confirm delivery');
    } finally {
      setIsConfirmingDelivery(false);
    }
  };

  const handleReportMissing = async () => {
    if (!order) return;
    setIsReportingMissing(true);
    try {
      await reportMissingDelivery(order.id);
      toast.warning('Delivery issue reported! Kitchen staff has been alerted.');
    } catch (err: unknown) {
      toast.error((err as Error)?.message || 'Failed to report delivery issue');
    } finally {
      setIsReportingMissing(false);
    }
  };

  return (
    <AuthGate>
      <div className="max-w-xl mx-auto space-y-6 pb-12">
        {/* Navigation Back Header with swipe support */}
        <BackHeader
          fallbackHref="/orders"
          title="Order Tracking"
          subtitle="Live pantry kitchen status"
          rightAction={
            <span className="text-xs font-black px-2.5 py-1 bg-white border-2 border-[#111111] rounded-xl shadow-[0_2px_0_#111111] font-mono">
              #{order.id.slice(-6)}
            </span>
          }
        />

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
                : isDelivered
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
                  const isPast = isDelivered ? true : idx < currentStepIndex;
                  const isCurrent = isDelivered ? false : idx === currentStepIndex;

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
                    className="absolute left-6 top-4 h-1.5 bg-[#15803D] transition-all duration-500 -z-0 rounded-full"
                    style={{
                      width: isDelivered
                        ? '100%'
                        : `${Math.max(0, (currentStepIndex / (STATUS_STEPS.length - 1)) * 100)}%`,
                    }}
                  />

                  {STATUS_STEPS.map((step, idx) => {
                    const isPast = isDelivered ? true : idx < currentStepIndex;
                    const isCurrent = isDelivered ? false : idx === currentStepIndex;

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

        {/* Delivery Confirmation Prompt for Served Order (Not yet confirmed) */}
        {isDelivered && !order.deliveryConfirmed && (
          <div className="tactile-card p-5 sm:p-6 bg-[#FFF8F2] border-3 border-[#111111] shadow-[0_6px_0_#111111] space-y-4 animate-in fade-in">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#22C55E] text-white flex items-center justify-center text-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] shrink-0">
                🍽️
              </div>
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#15803D] bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                  Food Delivered
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#111111]">
                  Has your food arrived at Desk {order.seatCode}?
                </h3>
                <p className="text-xs font-bold text-[#475569]">
                  Please confirm receipt to add calories to your profile and Today&apos;s Calorie Bar.
                </p>
              </div>
            </div>

            {order.deliveryReportedMissing && (
              <div className="p-3 bg-amber-100 text-amber-900 border-2 border-amber-400 rounded-xl text-xs font-bold">
                ⚠️ You reported this food hasn&apos;t arrived yet. The kitchen staff has been alerted and is checking your desk!
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 pt-1">
              <button
                type="button"
                disabled={isConfirmingDelivery}
                onClick={handleConfirmDelivered}
                className="tactile-btn flex-1 flex items-center justify-center gap-2 py-3.5 px-5 bg-[#22C55E] text-white text-sm font-black disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>{isConfirmingDelivery ? 'Confirming Delivery...' : 'Yes, Food Received! ✅'}</span>
              </button>

              {!order.deliveryReportedMissing && (
                <button
                  type="button"
                  disabled={isReportingMissing}
                  onClick={handleReportMissing}
                  className="min-h-[44px] px-4 py-2.5 bg-white text-[#B91C1C] border-2 border-red-200 hover:border-red-400 rounded-xl text-xs font-black transition-all"
                >
                  {isReportingMissing ? 'Reporting...' : "Food hasn't arrived"}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Confirmed Served Banner */}
        {isDelivered && order.deliveryConfirmed && (
          <div className="tactile-card p-5 bg-emerald-50 border-2 border-emerald-500 rounded-2xl flex items-center gap-4 animate-in fade-in shadow-[0_3px_0_#15803D]">
            <div className="w-11 h-11 rounded-2xl bg-[#22C55E] text-white flex items-center justify-center text-xl border-2 border-[#111111] shadow-[0_2px_0_#111111] shrink-0">
              ✨
            </div>
            <div>
              <h4 className="text-sm sm:text-base font-black text-emerald-900">
                Food Delivered & Received!
              </h4>
              <p className="text-xs font-bold text-emerald-700">
                {order.totalCalories
                  ? `+${order.totalCalories} kcal added to your profile & Today's Calorie Bar.`
                  : 'Calories recorded to your profile and Today\'s Calorie Bar.'}
              </p>
            </div>
          </div>
        )}

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
            <span className="text-xs font-black text-[#111111] block">
              {formatOrderTime(order.createdAt)}
            </span>
            <span className="text-[10px] font-bold text-[#6B6B6B] block">
              {formatOrderDate(order.createdAt)}
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
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent size="md" className="p-5 sm:p-6 space-y-4">
          <form onSubmit={handleCancelSubmit(onConfirmCancel)} className="space-y-4">
            <div className="flex items-center gap-2.5 pr-8">
              <div className="w-10 h-10 rounded-2xl bg-red-100 border-2 border-[#111111] flex items-center justify-center text-[#B91C1C] shrink-0">
                <XCircle className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <DialogTitle className="text-base sm:text-lg font-black text-[#111111]">
                  Cancel Your Order?
                </DialogTitle>
              </div>
            </div>

            <DialogDescription className="text-xs text-[#475569] font-bold">
              The kitchen has not started cooking your meal yet. Cancelling will notify the kitchen staff immediately.
            </DialogDescription>

            <div className="space-y-1.5">
              <label className="text-xs font-black text-[#111111] uppercase tracking-wider block">
                Reason for cancellation (optional)
              </label>
              <input
                type="text"
                {...registerCancel('reason')}
                placeholder="e.g. Ordered by mistake / changed mind"
                className="w-full min-h-[44px] p-3 bg-stone-50 border-2 border-[#111111] rounded-xl text-[16px] sm:text-xs font-bold focus:outline-none"
              />
              {cancelErrors.reason && (
                <p className="text-xs text-red-600 font-bold mt-1">
                  {cancelErrors.reason.message}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCancelModal(false)}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black text-[#475569] hover:bg-stone-100 rounded-xl border border-stone-200"
              >
                Keep Order
              </button>
              <button
                type="submit"
                disabled={isCancelling}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl shadow-xs"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </AuthGate>
  );
}
