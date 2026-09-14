'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { Order } from '@/types';
import { formatINR } from '@/lib/utils';
import {
  startLoudAlertLoop,
  stopLoudAlertLoop,
  requestScreenWakeLock,
  releaseScreenWakeLock,
} from '@/lib/sound';
import {
  Bell,
  MapPin,
  Clock,
  CheckCircle2,
  Hourglass,
  XCircle,
  Eye,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';
import { PaymentProofModal } from '@/components/PaymentProofModal';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';

const QUEUED_ESCALATION_MS = 3 * 60 * 1000; // 3 minutes

export function ActiveOrderAlarmModal() {
  const { user } = useAuth();
  const { orders, updateOrderStatus, dismissStaleAlert } = useOrders();

  const isStaff = user?.role === 'admin' || user?.role === 'kitchenManager';

  const [currentTime, setCurrentTime] = useState(() => Date.now());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Payment screenshot unverified');
  const [customReason, setCustomReason] = useState('');
  const [zoomedProofUrl, setZoomedProofUrl] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [isDismissingStale, setIsDismissingStale] = useState(false);
  const [showDismissConfirm, setShowDismissConfirm] = useState(false);

  // 10-second re-evaluation interval for queued escalation
  useEffect(() => {
    if (!isStaff) return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [isStaff]);

  // Compute actively ringing orders:
  // 1. PLACED, PAYMENT_VERIFYING, PAYMENT_VERIFIED
  // 2. QUEUED and (now - queuedAt) > 3 minutes
  const ringingOrders = useMemo(() => {
    if (!isStaff) return [];

    return orders
      .filter((o) => {
        if (o.dismissedAsStale) return false;
        if (['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(o.status)) {
          return true;
        }
        if (o.status === 'QUEUED') {
          const queuedTime = o.queuedAt || o.createdAt;
          return currentTime - queuedTime > QUEUED_ESCALATION_MS;
        }
        return false;
      })
      .sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0)); // Oldest first
  }, [orders, currentTime, isStaff]);

  // Handle continuous audio, vibration and screen wake lock
  useEffect(() => {
    if (!isStaff) return;

    if (ringingOrders.length > 0) {
      startLoudAlertLoop();
      requestScreenWakeLock();
    } else {
      stopLoudAlertLoop();
      releaseScreenWakeLock();
    }

    return () => {
      stopLoudAlertLoop();
      releaseScreenWakeLock();
    };
  }, [ringingOrders.length, isStaff]);

  if (!isStaff || ringingOrders.length === 0) {
    return null;
  }

  // Active focused order: resolve to selected order if still active, otherwise auto-promote to oldest
  const activeOrder: Order =
    ringingOrders.find((o) => o.id === selectedOrderId) || ringingOrders[0];
  const isEscalatedQueued = activeOrder?.status === 'QUEUED';

  const handleAccept = async () => {
    if (!activeOrder) return;
    const targetId = activeOrder.id;
    setActionInProgress(true);
    try {
      await updateOrderStatus(targetId, 'ACCEPTED');
    } catch (err: unknown) {
      const errorObj = err as { code?: string; message?: string };
      if (errorObj?.code === 'ALREADY_HANDLED') {
        toast.info(`Order #${targetId.slice(-4)} was already accepted by another staff member.`);
      } else {
        console.error('Failed to accept order:', err);
        toast.error(errorObj?.message || 'Failed to accept order. Please check connection.');
      }
    } finally {
      setActionInProgress(false);
    }
  };

  const handleQueueForASec = async () => {
    if (!activeOrder) return;
    const targetId = activeOrder.id;
    setActionInProgress(true);
    try {
      await updateOrderStatus(targetId, 'QUEUED');
      toast.info(`Order #${targetId.slice(-4)} queued.`);
    } catch (err: unknown) {
      console.error('Failed to queue order:', err);
      toast.error((err as Error)?.message || 'Failed to queue order.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmReject = async () => {
    if (!activeOrder) return;
    const targetId = activeOrder.id;
    setActionInProgress(true);
    try {
      const finalReason = customReason.trim() || rejectionReason;
      await updateOrderStatus(targetId, 'REJECTED', finalReason);
      setRejectingOrderId(null);
      setCustomReason('');
      toast.error(`Order #${targetId.slice(-4)} rejected.`);
    } catch (err) {
      console.error('Failed to reject order:', err);
      toast.error('Failed to reject order.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleDismissStale = () => {
    if (!activeOrder) return;
    const isTerminal = ['SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(activeOrder.status);
    if (!isTerminal) {
      toast.error(`Emergency dismissal is only for stuck terminal orders. This order is currently "${activeOrder.status}".`);
      return;
    }
    setShowDismissConfirm(true);
  };

  const handleExecuteDismissStale = async () => {
    if (!activeOrder) return;
    setShowDismissConfirm(false);
    setIsDismissingStale(true);
    try {
      await dismissStaleAlert(activeOrder.id);
      toast.success('Stale alarm dismissed.');
    } catch (err: unknown) {
      toast.error(`Error dismissing alarm: ${(err as Error).message}`);
    } finally {
      setIsDismissingStale(false);
    }
  };

  const timeWaitingMs = currentTime - (activeOrder?.createdAt || 0);
  const minutesWaiting = Math.floor(timeWaitingMs / 60000);
  const secondsWaiting = Math.floor((timeWaitingMs % 60000) / 1000);

  return (
    <Dialog open={Boolean(isStaff && ringingOrders.length > 0)} onOpenChange={() => {}}>
      <DialogContent
        size="lg"
        dismissable={false}
        showCloseButton={false}
        className="p-0 sm:rounded-[32px] border-0 sm:border-3 border-[#111111] shadow-[0_12px_0_#111111] overflow-hidden flex flex-col h-[100dvh] sm:h-auto sm:max-h-[92dvh] select-none"
      >
        <DialogTitle className="sr-only">Active Incoming Order Alert</DialogTitle>
        <DialogDescription className="sr-only">Review, accept, hold, or reject active kitchen orders</DialogDescription>
        
        {/* Pulsing Alarm Header (Capped at 1.2s cycle for photosensitive safety) */}
        <div className={`p-4 sm:p-5 pt-safe text-white flex items-center justify-between transition-colors ${
          isEscalatedQueued ? 'bg-[#C2410C] animate-alarm-flash' : 'bg-[#B91C1C] animate-alarm-flash'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#0F172A] border-2 border-[#134E4A] flex items-center justify-center shadow-xs">
              <Bell className="w-6 h-6 stroke-[2.5] text-[#B91C1C]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-tight text-white uppercase">
                  {isEscalatedQueued ? '⚠️ Queued Order Escalation' : '🚨 New Incoming Order!'}
                </h2>
              </div>
              <p className="text-xs text-white/90 font-bold">
                {ringingOrders.length} order{ringingOrders.length > 1 ? 's' : ''} waiting for action
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dismiss Stale Alarm button if terminal order is stuck */}
            {['SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(activeOrder.status) && (
              <button
                type="button"
                onClick={handleDismissStale}
                disabled={isDismissingStale}
                className="min-h-[36px] px-2.5 py-1 bg-amber-400 hover:bg-amber-300 text-[#0F172A] rounded-xl text-xs font-black border border-amber-500 shadow-xs transition-colors"
                title="Emergency override: dismiss alarm for stuck finished order"
              >
                {isDismissingStale ? 'Dismissing...' : 'Dismiss Stale'}
              </button>
            )}

            {/* Position Indicator */}
            {ringingOrders.length > 1 && (
              <div className="bg-black/30 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/40 text-xs font-black">
                <span>
                  #{ringingOrders.findIndex((o) => o.id === activeOrder.id) + 1} of {ringingOrders.length}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Horizontally Scrollable Waiting Orders Queue Strip */}
        {ringingOrders.length > 1 && (
          <div className="bg-[#0F172A] px-3.5 py-2.5 border-b-2 border-stone-800 shrink-0">
            <div className="flex items-center justify-between text-white text-[11px] font-black mb-1.5">
              <span className="flex items-center gap-1.5 text-amber-400">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                <span>WAITING QUEUE ({ringingOrders.length} ORDERS)</span>
              </span>
              <span className="text-stone-400 text-[10px]">Tap card to view & action</span>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto py-0.5 scrollbar-thin scrollbar-thumb-white/20">
              {ringingOrders.map((o, idx) => {
                const isSelected = o.id === activeOrder.id;
                const waitMs = currentTime - (o.createdAt || 0);
                const waitMins = Math.floor(waitMs / 60000);
                const waitSecs = Math.floor((waitMs % 60000) / 1000);

                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setSelectedOrderId(o.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-left border-2 transition-all shrink-0 select-none ${
                      isSelected
                        ? 'bg-white text-[#0F172A] border-amber-400 shadow-[0_2px_0_#F59E0B] font-black ring-2 ring-amber-400/40'
                        : 'bg-stone-800 text-stone-200 border-stone-700 hover:bg-stone-700'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-black shrink-0 ${
                      isSelected ? 'bg-[#FF3B30] text-white' : 'bg-stone-700 text-stone-300'
                    }`}>
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs font-black truncate ${isSelected ? 'text-[#0F172A]' : 'text-white'}`}>
                          Desk {o.seatCode}
                        </span>
                        <span className={`text-[10px] font-bold ${isSelected ? 'text-stone-500' : 'text-stone-400'}`}>
                          ({o.items.length})
                        </span>
                      </div>
                      <div className="text-[10px] font-mono font-bold text-amber-500">
                        {waitMins}m {waitSecs}s
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Order Content Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Desk & Customer Info Banner */}
          <div className="flex items-center justify-between p-3.5 bg-[#F4FBF7] rounded-2xl border-2 border-[#134E4A]/30">
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-[#FEF3C7] rounded-xl border border-[#D97706] flex items-center gap-1.5 shadow-xs">
                <MapPin className="w-4 h-4 text-[#D97706] stroke-[2.5]" />
                <span className="text-base font-black text-[#78350F]">
                  {activeOrder.seatCode}
                </span>
              </div>
              <div>
                <span className="text-sm font-black text-[#0F172A] block">
                  {activeOrder.employeeName}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#475569]">
                  Order #{activeOrder.id.slice(-4)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-[#475569] block">Waiting For</span>
              <span className="text-xs font-black text-[#DC2626] flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5" />
                {minutesWaiting}m {secondsWaiting}s
              </span>
            </div>
          </div>

          {/* Items Checklist */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#475569] block">
              Items to Prepare
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {activeOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border-2 border-[#134E4A]/20 flex items-start justify-between text-xs shadow-xs"
                >
                  <div>
                    <span className="font-black text-[#0F172A] text-sm">
                      {item.quantity}x {item.name}
                    </span>
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedAddons.map((a, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-[10px] font-bold text-[#C2410C] bg-orange-50 border border-[#C2410C]/30 px-1.5 py-0.5 rounded"
                          >
                            +{a.optionName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-black text-sm text-[#0F172A]">
                    {formatINR(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
              <span className="text-xs font-bold text-[#475569]">Total Order Value</span>
              <span className="text-lg font-black text-[#0F172A]">
                {formatINR(activeOrder.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Proof Preview & Heuristic Audit Flags */}
          {activeOrder.paymentProofUrl && (
            <div className="p-3.5 bg-[#F4FBF7] rounded-2xl border-2 border-[#134E4A]/30 space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#134E4A]/30 bg-white shrink-0 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeOrder.paymentProofUrl}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#0F172A] block">
                      UPI Screenshot Attached
                    </span>
                    <span className="text-[10px] font-bold text-[#475569]">
                      Review proof before accepting order
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setZoomedProofUrl(activeOrder.paymentProofUrl || null)}
                  className="min-h-[44px] px-3 py-1.5 text-xs font-black bg-white hover:bg-teal-50 text-[#0F766E] border-2 border-[#0F766E]/40 rounded-xl flex items-center gap-1.5 shadow-xs"
                >
                  <Eye className="w-4 h-4" />
                  <span>Zoom</span>
                </button>
              </div>

              {/* Automated Heuristic Audit Badges */}
              {activeOrder.paymentAudit && (
                <div className="pt-2 border-t border-[#134E4A]/15 space-y-1.5">
                  {/* Critical Duplicate Flag */}
                  {activeOrder.paymentAudit.isDuplicate && (
                    <div className="p-2 bg-red-100 border-2 border-red-600 rounded-xl flex items-center gap-2 text-xs font-black text-red-900 animate-pulse">
                      <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                      <span>
                        🚨 DUPLICATE RECEIPT: Already used in order #
                        {activeOrder.paymentAudit.duplicateOrderId?.slice(-4) || 'prior'}!
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1.5 text-[11px] font-bold">
                    {/* Amount Check */}
                    {activeOrder.paymentAudit.amountMatches === true && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Amount Matched (₹{activeOrder.paymentAudit.detectedAmount || activeOrder.totalAmount})
                      </span>
                    )}
                    {activeOrder.paymentAudit.amountMatches === false && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-50 text-[#B91C1C] border border-red-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-[#B91C1C]" />
                        Amount Mismatch Detected
                      </span>
                    )}

                    {/* Ref Note Check */}
                    {activeOrder.paymentAudit.refNoteMatched && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                        Order Ref Note Matched
                      </span>
                    )}

                    {/* Staleness Check */}
                    {activeOrder.paymentAudit.isStale && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-50 text-amber-900 border border-amber-300 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-800" />
                        Old Screenshot ({activeOrder.paymentAudit.fileAgeMinutes}m old)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Inline Rejection Reason Panel (if rejecting) */}
          {rejectingOrderId === activeOrder.id && (
            <div className="p-4 bg-red-50 rounded-2xl border-2 border-red-400 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#B91C1C] flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-[#B91C1C]" />
                  Select Rejection Reason
                </span>
                <button
                  onClick={() => setRejectingOrderId(null)}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center text-xs font-bold text-[#475569] hover:text-[#0F172A]"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-2">
                {[
                  'Payment screenshot unverified / invalid',
                  'Item out of stock',
                  'Kitchen overwhelmed / closing',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`w-full min-h-[44px] p-2.5 text-left rounded-xl text-xs font-black border-2 transition-all ${
                      rejectionReason === reason
                        ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                        : 'border-stone-300 bg-white text-[#475569] hover:bg-stone-50'
                    }`}
                  >
                    {reason}
                  </button>
                ))}

                <input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Or enter custom reason..."
                  className="w-full min-h-[44px] p-2.5 bg-white border-2 border-[#134E4A]/30 rounded-xl text-[16px] sm:text-xs font-bold text-[#0F172A] focus:border-[#0F766E] outline-none"
                />
              </div>

              <button
                onClick={handleConfirmReject}
                disabled={actionInProgress}
                className="w-full min-h-[48px] py-3 text-xs bg-[#B91C1C] hover:bg-[#991B1B] text-white font-black rounded-xl shadow-xs"
              >
                {actionInProgress ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          )}
        </div>

        {/* 3 Direct Primary Actions (Pinned at bottom, minimum 48px height) */}
        {rejectingOrderId !== activeOrder.id && (
          <div className="p-3 sm:p-5 bg-white border-t-2 border-[#134E4A]/20 grid grid-cols-3 gap-2 sm:gap-3 pb-safe">
            {/* Reject Button */}
            <button
              onClick={() => setRejectingOrderId(activeOrder.id)}
              disabled={actionInProgress}
              className="min-h-[48px] py-2.5 px-2 bg-red-100 hover:bg-red-200 text-[#B91C1C] text-xs font-black rounded-2xl border-2 border-[#DC2626] transition-all active:translate-y-0.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-xs"
            >
              <XCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Reject</span>
            </button>

            {/* Queue For A Sec Button */}
            <button
              onClick={handleQueueForASec}
              disabled={actionInProgress}
              className="min-h-[48px] py-2.5 px-2 text-xs font-black bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#78350F] rounded-2xl border-2 border-[#D97706] transition-all active:translate-y-0.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-xs"
              title="Hold for a moment; re-rings if left > 3 mins"
            >
              <Hourglass className="w-4 h-4 stroke-[2.5]" />
              <span>Queue for a sec</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={actionInProgress}
              className="min-h-[48px] py-2.5 px-2 text-xs font-black bg-[#15803D] hover:bg-[#166534] text-white rounded-2xl border-2 border-[#15803D] transition-all active:translate-y-0.5 flex flex-col sm:flex-row items-center justify-center gap-1.5 shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Accept Order</span>
            </button>
          </div>
        )}
      </DialogContent>

      {/* Payment Proof Modal */}
      <PaymentProofModal
        imageUrl={zoomedProofUrl}
        onClose={() => setZoomedProofUrl(null)}
        title={`Payment Proof - Order #${activeOrder.id.slice(-4)} (${activeOrder.employeeName})`}
      />

      {/* Confirm Dismissal Modal */}
      <ConfirmDialog
        open={showDismissConfirm}
        title="Dismiss Stuck Alarm"
        message={`Emergency Override: Dismiss stuck alarm for order #${activeOrder?.id ? activeOrder.id.slice(-4) : ''}?`}
        confirmLabel="Dismiss Alarm"
        cancelLabel="Keep Ringing"
        variant="danger"
        onConfirm={handleExecuteDismissStale}
        onCancel={() => setShowDismissConfirm(false)}
      />
    </Dialog>
  );
}

