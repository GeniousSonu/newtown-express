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
  ChevronLeft,
  ChevronRight,
  Eye,
  X,
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
} from 'lucide-react';

const QUEUED_ESCALATION_MS = 3 * 60 * 1000; // 3 minutes

export function ActiveOrderAlarmModal() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [currentTime, setCurrentTime] = useState(Date.now());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Payment screenshot unverified');
  const [customReason, setCustomReason] = useState('');
  const [zoomedProofUrl, setZoomedProofUrl] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);

  // 10-second re-evaluation interval for queued escalation
  useEffect(() => {
    if (user?.role !== 'admin') return;
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(interval);
  }, [user]);

  // Compute actively ringing orders:
  // 1. PLACED, PAYMENT_VERIFYING, PAYMENT_VERIFIED
  // 2. QUEUED and (now - queuedAt) > 3 minutes
  const ringingOrders = useMemo(() => {
    if (user?.role !== 'admin') return [];

    return orders
      .filter((o) => {
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
  }, [orders, currentTime, user]);

  // Handle continuous audio, vibration and screen wake lock
  useEffect(() => {
    if (user?.role !== 'admin') return;

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
  }, [ringingOrders.length, user]);

  // Keep currentIndex bounded
  useEffect(() => {
    if (currentIndex >= ringingOrders.length && ringingOrders.length > 0) {
      setCurrentIndex(ringingOrders.length - 1);
    }
  }, [ringingOrders.length, currentIndex]);

  if (user?.role !== 'admin' || ringingOrders.length === 0) {
    return null;
  }

  const activeOrder: Order = ringingOrders[currentIndex] || ringingOrders[0];
  const isEscalatedQueued = activeOrder.status === 'QUEUED';

  const handleAccept = async () => {
    setActionInProgress(true);
    try {
      await updateOrderStatus(activeOrder.id, 'ACCEPTED');
    } catch (err) {
      console.error('Failed to accept order:', err);
      alert('Failed to accept order. Please check connection.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleQueueForASec = async () => {
    setActionInProgress(true);
    try {
      await updateOrderStatus(activeOrder.id, 'QUEUED');
    } catch (err) {
      console.error('Failed to queue order:', err);
      alert('Failed to queue order.');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleConfirmReject = async () => {
    setActionInProgress(true);
    try {
      const finalReason = customReason.trim() || rejectionReason;
      await updateOrderStatus(activeOrder.id, 'REJECTED', finalReason);
      setRejectingOrderId(null);
      setCustomReason('');
    } catch (err) {
      console.error('Failed to reject order:', err);
      alert('Failed to reject order.');
    } finally {
      setActionInProgress(false);
    }
  };

  const timeWaitingMs = currentTime - activeOrder.createdAt;
  const minutesWaiting = Math.floor(timeWaitingMs / 60000);
  const secondsWaiting = Math.floor((timeWaitingMs % 60000) / 1000);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md animate-in fade-in select-none">
      {/* Alarm Fullscreen Takeover Container */}
      <div className="relative w-full max-w-xl bg-white rounded-[32px] border-4 border-[#111111] shadow-[0_12px_0_#FF3B30] overflow-hidden flex flex-col max-h-[92vh]">
        
        {/* Pulsing Alarm Header */}
        <div className={`p-4 sm:p-5 text-white flex items-center justify-between transition-colors ${
          isEscalatedQueued ? 'bg-[#FF9F1C] animate-pulse' : 'bg-[#FF3B30] animate-pulse'
        }`}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-white text-[#111111] border-2 border-[#111111] flex items-center justify-center shadow-xs">
              <Bell className="w-6 h-6 stroke-[2.5] text-[#FF3B30] animate-bounce" />
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

          {/* Navigation Controls (If multiple orders ringing) */}
          {ringingOrders.length > 1 && (
            <div className="flex items-center gap-1 bg-black/30 backdrop-blur-xs px-2.5 py-1.5 rounded-xl border border-white/40 text-xs font-black">
              <button
                onClick={() => setCurrentIndex((prev) => (prev > 0 ? prev - 1 : ringingOrders.length - 1))}
                className="p-1 hover:bg-white/20 rounded"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span>
                {currentIndex + 1} / {ringingOrders.length}
              </span>
              <button
                onClick={() => setCurrentIndex((prev) => (prev < ringingOrders.length - 1 ? prev + 1 : 0))}
                className="p-1 hover:bg-white/20 rounded"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Order Content Scrollable Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
          {/* Desk & Customer Info Banner */}
          <div className="flex items-center justify-between p-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 bg-[#FFD166] rounded-xl border-2 border-[#111111] flex items-center gap-1.5 shadow-[0_2px_0_#111111]">
                <MapPin className="w-4 h-4 text-[#111111] stroke-[2.5]" />
                <span className="text-base font-black text-[#111111]">
                  {activeOrder.seatCode}
                </span>
              </div>
              <div>
                <span className="text-sm font-black text-[#111111] block">
                  {activeOrder.employeeName}
                </span>
                <span className="text-[11px] font-mono font-bold text-[#6B6B6B]">
                  Order #{activeOrder.id.slice(-4)}
                </span>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-black uppercase text-[#6B6B6B] block">Waiting For</span>
              <span className="text-xs font-black text-[#FF3B30] flex items-center gap-1 justify-end">
                <Clock className="w-3.5 h-3.5" />
                {minutesWaiting}m {secondsWaiting}s
              </span>
            </div>
          </div>

          {/* Items Checklist */}
          <div className="space-y-2">
            <span className="text-[11px] font-black uppercase tracking-wider text-[#6B6B6B] block">
              Items to Prepare
            </span>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {activeOrder.items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-white rounded-xl border-2 border-[#111111] flex items-start justify-between text-xs"
                >
                  <div>
                    <span className="font-black text-[#111111] text-sm">
                      {item.quantity}x {item.name}
                    </span>
                    {item.selectedAddons && item.selectedAddons.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {item.selectedAddons.map((a, aIdx) => (
                          <span
                            key={aIdx}
                            className="text-[10px] font-bold text-[#FF3B30] bg-[#FFF8F2] border border-[#FF3B30] px-1.5 py-0.5 rounded"
                          >
                            +{a.optionName}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="font-black text-sm text-[#111111]">
                    {formatINR(item.lineTotal)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-1 px-1">
              <span className="text-xs font-bold text-[#6B6B6B]">Total Order Value</span>
              <span className="text-lg font-black text-[#111111]">
                {formatINR(activeOrder.totalAmount)}
              </span>
            </div>
          </div>

          {/* Payment Proof Preview & Heuristic Audit Flags */}
          {activeOrder.paymentProofUrl && (
            <div className="p-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] space-y-2.5">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-12 h-12 rounded-xl overflow-hidden border-2 border-[#111111] bg-white shrink-0 shadow-xs">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activeOrder.paymentProofUrl}
                      alt="Proof"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#111111] block">
                      UPI Screenshot Attached
                    </span>
                    <span className="text-[10px] font-bold text-[#6B6B6B]">
                      Review proof before accepting order
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setZoomedProofUrl(activeOrder.paymentProofUrl || null)}
                  className="tactile-btn px-3 py-1.5 text-xs font-black bg-white text-[#111111] flex items-center gap-1 shadow-xs"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Zoom</span>
                </button>
              </div>

              {/* Automated Heuristic Audit Badges */}
              {activeOrder.paymentAudit && (
                <div className="pt-2 border-t border-[#111111]/15 space-y-1.5">
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
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Amount Matched (₹{activeOrder.paymentAudit.detectedAmount || activeOrder.totalAmount})
                      </span>
                    )}
                    {activeOrder.paymentAudit.amountMatches === false && (
                      <span className="px-2 py-0.5 rounded-lg bg-red-100 text-red-800 border border-red-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        Amount Mismatch Detected
                      </span>
                    )}

                    {/* Ref Note Check */}
                    {activeOrder.paymentAudit.refNoteMatched && (
                      <span className="px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 border border-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Order Ref Note Matched
                      </span>
                    )}

                    {/* Staleness Check */}
                    {activeOrder.paymentAudit.isStale && (
                      <span className="px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-400 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-700" />
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
                <span className="text-xs font-black text-red-900 flex items-center gap-1">
                  <AlertOctagon className="w-4 h-4 text-red-600" />
                  Select Rejection Reason
                </span>
                <button
                  onClick={() => setRejectingOrderId(null)}
                  className="text-xs font-bold text-stone-500 hover:text-stone-800"
                >
                  Cancel
                </button>
              </div>

              <div className="space-y-1.5">
                {[
                  'Payment screenshot unverified / invalid',
                  'Item out of stock',
                  'Kitchen overwhelmed / closing',
                ].map((reason) => (
                  <button
                    key={reason}
                    type="button"
                    onClick={() => setRejectionReason(reason)}
                    className={`w-full p-2 text-left rounded-xl text-xs font-black border transition-all ${
                      rejectionReason === reason
                        ? 'border-[#111111] bg-[#FFD166] text-[#111111]'
                        : 'border-stone-300 bg-white text-stone-700'
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
                  className="w-full p-2 bg-white border border-[#111111] rounded-xl text-xs font-bold focus:outline-none"
                />
              </div>

              <button
                onClick={handleConfirmReject}
                disabled={actionInProgress}
                className="tactile-btn w-full py-2.5 text-xs bg-red-600 text-white font-black"
              >
                {actionInProgress ? 'Rejecting...' : 'Confirm Reject'}
              </button>
            </div>
          )}
        </div>

        {/* 3 Direct Primary Actions */}
        {rejectingOrderId !== activeOrder.id && (
          <div className="p-4 sm:p-5 bg-[#FFF8F2] border-t-2 border-[#111111] grid grid-cols-3 gap-2.5">
            {/* Reject Button */}
            <button
              onClick={() => setRejectingOrderId(activeOrder.id)}
              disabled={actionInProgress}
              className="py-3 px-2 bg-red-100 hover:bg-red-200 text-red-900 text-xs font-black rounded-2xl border-2 border-red-500 transition-all active:translate-y-0.5 flex flex-col sm:flex-row items-center justify-center gap-1.5"
            >
              <XCircle className="w-4 h-4 stroke-[2.5]" />
              <span>Reject</span>
            </button>

            {/* Queue For A Sec Button */}
            <button
              onClick={handleQueueForASec}
              disabled={actionInProgress}
              className="tactile-btn py-3 px-2 text-xs font-black bg-[#FFD166] text-[#111111] flex flex-col sm:flex-row items-center justify-center gap-1.5"
              title="Hold for a moment; re-rings if left > 3 mins"
            >
              <Hourglass className="w-4 h-4 stroke-[2.5]" />
              <span>Queue for a sec</span>
            </button>

            {/* Accept Button */}
            <button
              onClick={handleAccept}
              disabled={actionInProgress}
              className="tactile-btn py-3 px-2 text-xs font-black bg-[#22C55E] text-white flex flex-col sm:flex-row items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>Accept Order</span>
            </button>
          </div>
        )}
      </div>

      {/* Screenshot Zoom Overlay */}
      {zoomedProofUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/90">
          <div className="relative max-w-lg w-full bg-white rounded-[28px] p-4 border-4 border-[#111111]">
            <button
              onClick={() => setZoomedProofUrl(null)}
              className="absolute top-3 right-3 w-8 h-8 rounded-full bg-stone-100 border border-[#111111] flex items-center justify-center z-10"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="max-h-[75vh] overflow-auto rounded-xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedProofUrl}
                alt="Payment Zoom"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
