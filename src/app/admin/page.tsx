'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR, getStatusDetails } from '@/lib/utils';
import { Order, OrderStatus } from '@/types';
import { testAlarmChime } from '@/lib/sound';
import { AdminGate } from '@/components/AdminGate';
import { AdminKitchenToggle } from '@/components/AdminKitchenToggle';
import { ActiveOrderAlarmModal } from '@/components/ActiveOrderAlarmModal';
import {
  ChefHat,
  MapPin,
  Clock,
  CheckCircle2,
  Eye,
  Flame,
  Utensils,
  Bike,
  Volume2,
  X,
  Hourglass,
  XCircle,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  ShieldAlert,
  Bell,
} from 'lucide-react';

export default function AdminKitchenPage() {
  return (
    <AdminGate>
      <AdminKitchenContent />
    </AdminGate>
  );
}

function AdminKitchenContent() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [activeTab, setActiveTab] = useState<'board' | 'history'>('board');
  const [mobileColTab, setMobileColTab] = useState<'new' | 'queued' | 'cooking' | 'ready'>('new');
  const [zoomedProofUrl, setZoomedProofUrl] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Payment screenshot unverified');
  const [customReason, setCustomReason] = useState('');
  const [testingChime, setTestingChime] = useState(false);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // 10-second timer to keep time-waiting labels accurate
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 10000);
    return () => clearInterval(timer);
  }, []);

  const handleTestAlarm = () => {
    setTestingChime(true);
    testAlarmChime();
    setTimeout(() => setTestingChime(false), 1200);
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    const finalReason = customReason.trim() || rejectionReason;
    await updateOrderStatus(rejectingOrder.id, 'REJECTED', finalReason);
    setRejectingOrder(null);
    setCustomReason('');
  };

  // Kanban pipeline columns
  const newOrders = orders.filter((o) =>
    ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'].includes(o.status)
  );

  const queuedOrders = orders.filter((o) => o.status === 'QUEUED');

  const inProgressOrders = orders.filter((o) =>
    ['ACCEPTED', 'COOKING'].includes(o.status)
  );

  const readyOrders = orders.filter((o) => o.status === 'READY');

  const completedOrders = orders.filter((o) =>
    ['SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'].includes(o.status)
  );

  const totalActive = newOrders.length + queuedOrders.length + inProgressOrders.length + readyOrders.length;

  return (
    <div className="space-y-4 sm:space-y-6 pb-12">

      {/* Top Header Card with Master Kitchen Switch (Light theme with deep teal accent) */}
      <div className="tactile-card p-4 sm:p-6 bg-white text-[#0F172A] border-2 border-[#134E4A] shadow-[0_4px_0_#0F766E] space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-teal-50 border-2 border-[#134E4A] flex items-center justify-center text-[#0F766E] shadow-xs shrink-0">
              <ChefHat className="w-5 h-5 sm:w-6 sm:h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-black tracking-tight text-[#0F172A]">Kitchen Operations</h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#15803D] text-white rounded-md">
                  Live
                </span>
              </div>
              <p className="text-xs text-[#475569] font-bold mt-0.5">
                {totalActive} active order(s) across the kitchen pipeline
              </p>
            </div>
          </div>

          {/* Action Controls & Master Switch */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            {/* Master Open/Closed Toggle */}
            <AdminKitchenToggle />

            {/* Test Alarm Sound */}
            <button
              onClick={handleTestAlarm}
              disabled={testingChime}
              className={`min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs font-black rounded-xl border-2 transition-all ${
                testingChime ? 'bg-amber-100 text-amber-900 border-amber-500' : 'bg-white hover:bg-stone-50 text-[#0F172A] border-[#134E4A]/30 shadow-xs'
              }`}
              title="Plays a single alert chime to check speaker volume"
            >
              <Volume2 className="w-4 h-4 text-[#0F766E]" />
              <span className="hidden sm:inline">{testingChime ? 'Playing...' : 'Test Sound'}</span>
            </button>

            {/* Desk Map Link */}
            <Link
              href="/admin/map"
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 py-2 text-xs font-black bg-white hover:bg-stone-50 text-[#0F172A] border-2 border-[#134E4A]/30 rounded-xl shadow-xs"
            >
              <MapPin className="w-4 h-4 text-[#0F766E]" />
              <span className="hidden sm:inline">Desk Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs (Kanban Board vs Completed History) */}
      <div className="flex p-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] max-w-sm">
        <button
          onClick={() => setActiveTab('board')}
          className={`min-h-[44px] flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'board'
              ? 'bg-[#0F766E] text-white shadow-xs -translate-y-0.5'
              : 'text-[#0F172A] hover:bg-stone-50'
          }`}
        >
          Queue Board ({totalActive})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`min-h-[44px] flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-[#0F172A] text-white shadow-xs -translate-y-0.5'
              : 'text-[#0F172A] hover:bg-stone-50'
          }`}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {/* TAB 1: KANBAN QUEUE BOARD */}
      {activeTab === 'board' && (
        <div className="space-y-3">
          {/* Mobile Segmented Switcher (Visible only on < 768px, budgeted <= 44px height) */}
          <div className="md:hidden sticky top-[94px] z-30 bg-[#F4FBF7]/95 backdrop-blur-xs p-1 rounded-2xl border-2 border-[#134E4A] flex items-center gap-1 shadow-xs">
            <button
              onClick={() => setMobileColTab('new')}
              className={`min-h-[44px] flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                mobileColTab === 'new'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-teal-50'
              }`}
            >
              <Bell className="w-3.5 h-3.5 text-red-600 shrink-0" />
              <span className="hidden min-[400px]:inline">New</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                mobileColTab === 'new' ? 'bg-teal-900 text-white' : 'bg-red-100 text-red-800'
              }`}>
                {newOrders.length}
              </span>
            </button>

            <button
              onClick={() => setMobileColTab('queued')}
              className={`min-h-[44px] flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                mobileColTab === 'queued'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-teal-50'
              }`}
            >
              <Hourglass className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span className="hidden min-[400px]:inline">Queued</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                mobileColTab === 'queued' ? 'bg-teal-900 text-white' : 'bg-amber-100 text-amber-900'
              }`}>
                {queuedOrders.length}
              </span>
            </button>

            <button
              onClick={() => setMobileColTab('cooking')}
              className={`min-h-[44px] flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                mobileColTab === 'cooking'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-teal-50'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-600 shrink-0" />
              <span className="hidden min-[400px]:inline">Cooking</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                mobileColTab === 'cooking' ? 'bg-teal-900 text-white' : 'bg-orange-100 text-orange-900'
              }`}>
                {inProgressOrders.length}
              </span>
            </button>

            <button
              onClick={() => setMobileColTab('ready')}
              className={`min-h-[44px] flex-1 flex items-center justify-center gap-1 py-1.5 px-2 rounded-xl text-xs font-black transition-all ${
                mobileColTab === 'ready'
                  ? 'bg-[#0F766E] text-white shadow-xs'
                  : 'text-[#0F172A] hover:bg-teal-50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden min-[400px]:inline">Ready</span>
              <span className={`px-1.5 py-0.2 rounded-md text-[10px] font-mono font-black ${
                mobileColTab === 'ready' ? 'bg-teal-900 text-white' : 'bg-emerald-100 text-emerald-900'
              }`}>
                {readyOrders.length}
              </span>
            </button>
          </div>

          {/* Kanban Columns: Single full-width column on mobile (<768px), 4-col grid on tablet/desktop (>=768px) */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            {/* Column 1: New / Ringing */}
            <div className={mobileColTab === 'new' ? 'block' : 'hidden md:block'}>
              <KanbanColumn
                title="New / Ringing"
                count={newOrders.length}
                badgeColor="bg-rose-100 text-rose-900 border-rose-400"
                orders={newOrders}
                currentTime={currentTime}
                onAccept={(o) => updateOrderStatus(o.id, 'ACCEPTED')}
                onQueue={(o) => updateOrderStatus(o.id, 'QUEUED')}
                onReject={(o) => setRejectingOrder(o)}
                onZoomProof={(url) => setZoomedProofUrl(url)}
              />
            </div>

            {/* Column 2: Queued (Hold) */}
            <div className={mobileColTab === 'queued' ? 'block' : 'hidden md:block'}>
              <KanbanColumn
                title="Queued (Hold)"
                count={queuedOrders.length}
                badgeColor="bg-amber-100 text-amber-900 border-amber-400"
                orders={queuedOrders}
                currentTime={currentTime}
                onAccept={(o) => updateOrderStatus(o.id, 'ACCEPTED')}
                onReject={(o) => setRejectingOrder(o)}
                onZoomProof={(url) => setZoomedProofUrl(url)}
              />
            </div>

            {/* Column 3: In Progress (Cooking) */}
            <div className={mobileColTab === 'cooking' ? 'block' : 'hidden md:block'}>
              <KanbanColumn
                title="In Progress (Cooking)"
                count={inProgressOrders.length}
                badgeColor="bg-orange-100 text-orange-900 border-orange-400"
                orders={inProgressOrders}
                currentTime={currentTime}
                onStartCooking={(o) => updateOrderStatus(o.id, 'COOKING')}
                onMarkReady={(o) => updateOrderStatus(o.id, 'READY')}
                onZoomProof={(url) => setZoomedProofUrl(url)}
              />
            </div>

            {/* Column 4: Ready for Delivery */}
            <div className={mobileColTab === 'ready' ? 'block' : 'hidden md:block'}>
              <KanbanColumn
                title="Ready for Delivery"
                count={readyOrders.length}
                badgeColor="bg-emerald-100 text-emerald-900 border-emerald-400"
                orders={readyOrders}
                currentTime={currentTime}
                onDelivered={(o) => updateOrderStatus(o.id, 'SERVED')}
                onZoomProof={(url) => setZoomedProofUrl(url)}
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: COMPLETED & REJECTED HISTORY */}
      {activeTab === 'history' && (
        <div className="space-y-3">
          {completedOrders.map((order) => {
            const statusMeta = getStatusDetails(order.status);
            return (
              <div
                key={order.id}
                className="tactile-card p-4 bg-white border-2 border-[#111111] flex flex-wrap items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="px-3 py-1.5 bg-[#FFD166] rounded-xl border border-[#111111] font-black text-sm">
                    {order.seatCode}
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#111111] block">
                      {order.employeeName} • #{order.id.slice(-4)}
                    </span>
                    <span className="text-[11px] text-[#6B6B6B] font-bold">
                      {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs font-black text-[#111111]">
                    {formatINR(order.totalAmount)}
                  </span>
                  <span className="px-2.5 py-1 bg-[#FFF8F2] border border-[#111111] rounded-lg text-xs font-black flex items-center gap-1">
                    <span>{statusMeta.emoji}</span>
                    <span>{statusMeta.label}</span>
                  </span>
                </div>
              </div>
            );
          })}

          {completedOrders.length === 0 && (
            <div className="tactile-card p-12 text-center text-xs font-bold text-stone-500">
              No completed orders yet.
            </div>
          )}
        </div>
      )}

      {/* Proof Zoom Modal */}
      {zoomedProofUrl && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/80 backdrop-blur-xs">
          <div className="relative w-[calc(100%-1.5rem)] max-w-lg bg-white rounded-[28px] p-4 sm:p-5 border-2 border-[#134E4A] shadow-xl">
            <button
              onClick={() => setZoomedProofUrl(null)}
              className="absolute top-3 right-3 min-w-[44px] min-h-[44px] bg-stone-100 hover:bg-stone-200 border-2 border-[#134E4A]/30 rounded-full flex items-center justify-center z-10 text-[#0F172A]"
              aria-label="Close proof preview"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h4 className="text-sm font-black text-[#0F172A] mb-3 pr-12">
              UPI Payment Screenshot Zoom
            </h4>
            <div className="max-h-[70dvh] overflow-auto rounded-2xl border-2 border-[#134E4A]/30 bg-stone-50">
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

      {/* Rejection Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-3 bg-black/70 backdrop-blur-xs">
          <div className="w-[calc(100%-1.5rem)] max-w-md bg-white rounded-[28px] p-5 sm:p-6 border-2 border-[#134E4A] shadow-xl space-y-4 max-h-[90dvh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-base sm:text-lg font-black text-[#0F172A]">
                Reject Order #{rejectingOrder.id.slice(-4)}
              </h3>
              <button
                onClick={() => setRejectingOrder(null)}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center text-[#475569] hover:text-[#0F172A]"
                aria-label="Close rejection dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {[
                'Payment screenshot unverified / invalid',
                'Ingredients out of stock',
                'Kitchen closing / overwhelmed',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full min-h-[44px] p-3 text-left rounded-xl text-xs font-black border-2 transition-all ${
                    rejectionReason === reason
                      ? 'border-[#0F766E] bg-teal-50 text-[#0F766E]'
                      : 'border-stone-200 bg-white text-[#475569] hover:bg-stone-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Or custom reason..."
                className="w-full min-h-[44px] p-3 bg-stone-50 border-2 border-[#134E4A]/30 rounded-xl text-[16px] sm:text-xs font-bold text-[#0F172A] focus:border-[#0F766E] outline-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black text-[#475569] hover:bg-stone-100 rounded-xl border border-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="flex-1 min-h-[44px] py-2.5 text-xs font-black bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl shadow-xs"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------- KANBAN COLUMN COMPONENT ----------------
interface KanbanColumnProps {
  title: string;
  count: number;
  badgeColor: string;
  orders: Order[];
  currentTime: number;
  onAccept?: (order: Order) => void;
  onQueue?: (order: Order) => void;
  onReject?: (order: Order) => void;
  onStartCooking?: (order: Order) => void;
  onMarkReady?: (order: Order) => void;
  onDelivered?: (order: Order) => void;
  onZoomProof?: (url: string) => void;
}

function KanbanColumn({
  title,
  count,
  badgeColor,
  orders,
  currentTime,
  onAccept,
  onQueue,
  onReject,
  onStartCooking,
  onMarkReady,
  onDelivered,
  onZoomProof,
}: KanbanColumnProps) {
  return (
    <div className="bg-[#F4FBF7] rounded-3xl border-2 border-[#134E4A]/30 p-3.5 space-y-3 min-h-[500px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#134E4A]/20">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#0F172A]">
          {title}
        </h3>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border ${badgeColor}`}>
          {count}
        </span>
      </div>

      {/* Cards List */}
      <div className="space-y-3 flex-1 overflow-y-auto">
        {orders.map((order) => {
          const timeWaitingMs = currentTime - (order.createdAt || 0);
          const minutes = Math.floor(timeWaitingMs / 60000);
          const seconds = Math.floor((timeWaitingMs % 60000) / 1000);

          return (
            <div
              key={order.id}
              className="bg-white rounded-2xl border-2 border-[#134E4A]/30 p-3.5 shadow-[0_2px_0_#134E4A] space-y-3"
            >
              {/* Header: Desk & Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FEF3C7] rounded-xl border border-[#D97706] text-xs font-black text-[#78350F]">
                  <MapPin className="w-3.5 h-3.5 text-[#D97706]" />
                  <span>{order.seatCode}</span>
                </div>
                <span className="text-[11px] font-black text-[#DC2626] flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  {minutes}m {seconds}s
                </span>
              </div>

              {/* Customer & ID */}
              <div>
                <span className="text-xs font-black text-[#0F172A] block">
                  {order.employeeName}
                </span>
                <span className="text-[10px] font-mono font-bold text-[#475569]">
                  #{order.id.slice(-4)}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1 py-1.5 border-t border-b border-stone-100 text-xs">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-start text-[11px]">
                    <span className="font-bold text-[#0F172A]">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-mono font-bold text-[#475569]">
                      {formatINR(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Proof Link */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#0F172A]">
                  Total: {formatINR(order.totalAmount)}
                </span>
                {order.paymentProofUrl && onZoomProof && (
                  <button
                    type="button"
                    onClick={() => onZoomProof(order.paymentProofUrl!)}
                    className="min-h-[44px] px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-[#0F766E] rounded-xl border border-[#0F766E]/30 text-xs font-black flex items-center gap-1.5 transition-colors"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={order.paymentProofUrl}
                      alt="Proof"
                      className="w-5 h-5 rounded object-cover border border-[#0F766E]/40"
                    />
                    <span>Proof</span>
                  </button>
                )}
              </div>

              {/* Payment Heuristic Audit Indicators */}
              {order.paymentAudit && (
                <div className="space-y-1">
                  {order.paymentAudit.isDuplicate && (
                    <div className="px-2 py-1 bg-red-100 border border-red-500 rounded-lg text-[10px] font-black text-red-900 flex items-center gap-1 animate-pulse">
                      <ShieldAlert className="w-3 h-3 text-red-600 shrink-0" />
                      <span>
                        Duplicate Receipt (#{order.paymentAudit.duplicateOrderId?.slice(-4) || 'prior'})
                      </span>
                    </div>
                  )}

                  <div className="flex flex-wrap gap-1 text-[10px] font-bold">
                    {order.paymentAudit.amountMatches === true && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                        ₹{order.paymentAudit.detectedAmount || order.totalAmount} OK
                      </span>
                    )}
                    {order.paymentAudit.amountMatches === false && (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-[#B91C1C] border border-red-300 flex items-center gap-0.5">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Amt Mismatch
                      </span>
                    )}
                    {order.paymentAudit.refNoteMatched && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-300">
                        Ref OK
                      </span>
                    )}
                    {order.paymentAudit.isStale && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300">
                        Stale ({order.paymentAudit.fileAgeMinutes}m)
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* Card Actions */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {/* Accept Button */}
                {onAccept && (
                  <button
                    onClick={() => onAccept(order)}
                    className="min-h-[44px] flex-1 py-2 text-xs bg-[#15803D] hover:bg-[#166534] text-white rounded-xl flex items-center justify-center gap-1 font-black shadow-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Accept</span>
                  </button>
                )}

                {/* Queue For A Sec Button */}
                {onQueue && (
                  <button
                    onClick={() => onQueue(order)}
                    className="min-h-[44px] py-2 px-3 text-xs bg-[#FEF3C7] hover:bg-[#FDE68A] text-[#78350F] border border-[#D97706] rounded-xl flex items-center justify-center gap-1 font-black shadow-xs"
                    title="Queue for a moment"
                  >
                    <Hourglass className="w-4 h-4" />
                    <span>Queue</span>
                  </button>
                )}

                {/* Reject Button */}
                {onReject && (
                  <button
                    onClick={() => onReject(order)}
                    className="min-h-[44px] min-w-[44px] py-2 px-3 text-xs bg-red-100 hover:bg-red-200 text-[#B91C1C] border border-[#DC2626] rounded-xl font-black flex items-center justify-center shadow-xs"
                    title="Reject Proof"
                    aria-label="Reject order"
                  >
                    <XCircle className="w-4 h-4" />
                  </button>
                )}

                {/* Start Cooking */}
                {onStartCooking && order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => onStartCooking(order)}
                    className="min-h-[44px] flex-1 py-2 text-xs bg-[#C2410C] hover:bg-[#9A3412] text-white rounded-xl flex items-center justify-center gap-1 font-black shadow-xs"
                  >
                    <Flame className="w-4 h-4" />
                    <span>Start Cooking</span>
                  </button>
                )}

                {/* Food Ready */}
                {onMarkReady && order.status === 'COOKING' && (
                  <button
                    onClick={() => onMarkReady(order)}
                    className="min-h-[44px] flex-1 py-2 text-xs bg-[#15803D] hover:bg-[#166534] text-white rounded-xl flex items-center justify-center gap-1 font-black shadow-xs"
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Food Ready</span>
                  </button>
                )}

                {/* Delivered & Complete */}
                {onDelivered && (
                  <button
                    onClick={() => onDelivered(order)}
                    className="min-h-[44px] flex-1 py-2 text-xs bg-[#0284C7] hover:bg-[#0369A1] text-white rounded-xl flex items-center justify-center gap-1 font-black shadow-xs"
                  >
                    <Bike className="w-4 h-4" />
                    <span>Delivered ({order.seatCode})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="h-32 flex items-center justify-center text-xs font-bold text-[#475569] border-2 border-dashed border-[#134E4A]/20 rounded-2xl">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}
