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
    <div className="space-y-6 pb-12">
      {/* Active Order Fullscreen Takeover Alarm Modal */}
      <ActiveOrderAlarmModal />

      {/* Top Header Card with Master Kitchen Switch */}
      <div className="tactile-card p-5 sm:p-6 bg-[#111111] text-white border-2 border-[#111111] shadow-[0_6px_0_#FF3B30] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#FF3B30] border-2 border-white flex items-center justify-center text-white shadow-xs">
              <ChefHat className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-black tracking-tight text-white">Kitchen Operations</h1>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#22C55E] text-white rounded-md">
                  Live
                </span>
              </div>
              <p className="text-xs text-stone-300 font-bold mt-0.5">
                {totalActive} active order(s) across the kitchen pipeline
              </p>
            </div>
          </div>

          {/* Action Controls & Master Switch */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Master Open/Closed Toggle */}
            <AdminKitchenToggle />

            {/* Test Alarm Sound */}
            <button
              onClick={handleTestAlarm}
              disabled={testingChime}
              className={`tactile-btn flex items-center gap-1.5 px-3.5 py-2 text-xs font-black ${
                testingChime ? 'bg-[#FFD166] text-[#111111]' : 'bg-[#111111] text-white border-white'
              }`}
              title="Plays a single alert chime to check speaker volume"
            >
              <Volume2 className="w-4 h-4" />
              <span>{testingChime ? 'Playing...' : 'Test Alarm'}</span>
            </button>

            {/* Desk Map Link */}
            <Link
              href="/admin/map"
              className="tactile-btn-dark px-3.5 py-2 text-xs flex items-center gap-1.5 bg-stone-800"
            >
              <MapPin className="w-3.5 h-3.5 text-[#FFD166]" />
              <span className="hidden sm:inline">Desk Map</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Tabs (Kanban Board vs Completed History) */}
      <div className="flex p-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] max-w-sm">
        <button
          onClick={() => setActiveTab('board')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'board'
              ? 'bg-[#FF3B30] text-white shadow-xs -translate-y-0.5'
              : 'text-[#111111] hover:bg-stone-50'
          }`}
        >
          Queue Board ({totalActive})
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'history'
              ? 'bg-[#111111] text-white shadow-xs -translate-y-0.5'
              : 'text-[#111111] hover:bg-stone-50'
          }`}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {/* TAB 1: KANBAN QUEUE BOARD */}
      {activeTab === 'board' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {/* Column 1: New / Ringing */}
          <KanbanColumn
            title="New / Ringing"
            count={newOrders.length}
            badgeColor="bg-[#FF3B30] text-white animate-pulse"
            orders={newOrders}
            currentTime={currentTime}
            onAccept={(o) => updateOrderStatus(o.id, 'ACCEPTED')}
            onQueue={(o) => updateOrderStatus(o.id, 'QUEUED')}
            onReject={(o) => setRejectingOrder(o)}
            onZoomProof={(url) => setZoomedProofUrl(url)}
          />

          {/* Column 2: Queued (Hold) */}
          <KanbanColumn
            title="Queued (Hold)"
            count={queuedOrders.length}
            badgeColor="bg-[#FFD166] text-[#111111]"
            orders={queuedOrders}
            currentTime={currentTime}
            onAccept={(o) => updateOrderStatus(o.id, 'ACCEPTED')}
            onReject={(o) => setRejectingOrder(o)}
            onZoomProof={(url) => setZoomedProofUrl(url)}
          />

          {/* Column 3: In Progress (Accepted / Cooking) */}
          <KanbanColumn
            title="Cooking"
            count={inProgressOrders.length}
            badgeColor="bg-[#FF9F1C] text-white"
            orders={inProgressOrders}
            currentTime={currentTime}
            onStartCooking={(o) => updateOrderStatus(o.id, 'COOKING')}
            onMarkReady={(o) => updateOrderStatus(o.id, 'READY')}
            onZoomProof={(url) => setZoomedProofUrl(url)}
          />

          {/* Column 4: Ready for Delivery */}
          <KanbanColumn
            title="Ready for Delivery"
            count={readyOrders.length}
            badgeColor="bg-[#22C55E] text-white"
            orders={readyOrders}
            currentTime={currentTime}
            onDelivered={(o) => updateOrderStatus(o.id, 'SERVED')}
            onZoomProof={(url) => setZoomedProofUrl(url)}
          />
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80">
          <div className="relative max-w-lg w-full bg-white rounded-[28px] p-5 border-4 border-[#111111]">
            <button
              onClick={() => setZoomedProofUrl(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-stone-100 hover:bg-stone-200 border-2 border-[#111111] rounded-full flex items-center justify-center z-10"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h4 className="text-sm font-black text-[#111111] mb-3">
              UPI Payment Screenshot Zoom
            </h4>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border-2 border-[#111111]">
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
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70">
          <div className="max-w-md w-full bg-white rounded-[28px] p-6 border-4 border-[#111111] shadow-[0_8px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">
                Reject Order #{rejectingOrder.id.slice(-4)}
              </h3>
              <button onClick={() => setRejectingOrder(null)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-1.5">
              {[
                'Payment screenshot unverified / invalid',
                'Ingredients out of stock',
                'Kitchen closing / overwhelmed',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-2.5 text-left rounded-xl text-xs font-black border transition-all ${
                    rejectionReason === reason
                      ? 'border-[#111111] bg-[#FFD166] text-[#111111]'
                      : 'border-stone-200 bg-white text-stone-700'
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
                className="w-full p-2.5 bg-[#FFF8F2] border-2 border-[#111111] rounded-xl text-xs font-bold"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setRejectingOrder(null)}
                className="flex-1 py-3 text-xs font-black text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReject}
                className="tactile-btn flex-1 py-3 text-xs bg-red-600 text-white"
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
    <div className="bg-[#FFF8F2] rounded-3xl border-2 border-[#111111] p-3.5 space-y-3 min-h-[500px] flex flex-col">
      {/* Column Header */}
      <div className="flex items-center justify-between pb-2 border-b-2 border-[#111111]/20">
        <h3 className="text-xs font-black uppercase tracking-wider text-[#111111]">
          {title}
        </h3>
        <span className={`px-2 py-0.5 rounded-full text-[11px] font-black border border-[#111111] ${badgeColor}`}>
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
              className="bg-white rounded-2xl border-2 border-[#111111] p-3.5 shadow-[0_3px_0_#111111] space-y-3"
            >
              {/* Header: Desk & Time */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FFD166] rounded-xl border border-[#111111] text-xs font-black">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{order.seatCode}</span>
                </div>
                <span className="text-[10px] font-black text-[#FF3B30] flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {minutes}m {seconds}s
                </span>
              </div>

              {/* Customer & ID */}
              <div>
                <span className="text-xs font-black text-[#111111] block">
                  {order.employeeName}
                </span>
                <span className="text-[10px] font-mono text-[#6B6B6B]">
                  #{order.id.slice(-4)}
                </span>
              </div>

              {/* Items List */}
              <div className="space-y-1 py-1 border-t border-b border-stone-100 text-xs">
                {order.items.map((it, i) => (
                  <div key={i} className="flex justify-between items-start text-[11px]">
                    <span className="font-bold text-[#111111]">
                      {it.quantity}x {it.name}
                    </span>
                    <span className="font-mono font-bold text-[#6B6B6B]">
                      {formatINR(it.lineTotal)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Total & Proof Link */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-black text-[#111111]">
                  Total: {formatINR(order.totalAmount)}
                </span>
                {order.paymentProofUrl && onZoomProof && (
                  <button
                    onClick={() => onZoomProof(order.paymentProofUrl!)}
                    className="text-[10px] font-black text-[#4D96FF] hover:underline flex items-center gap-1"
                  >
                    <Eye className="w-3 h-3" />
                    <span>Proof</span>
                  </button>
                )}
              </div>

              {/* Card Actions */}
              <div className="pt-1 flex flex-wrap gap-1.5">
                {/* Accept Button */}
                {onAccept && (
                  <button
                    onClick={() => onAccept(order)}
                    className="tactile-btn flex-1 py-2 text-[11px] bg-[#22C55E] text-white flex items-center justify-center gap-1 font-black"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>
                )}

                {/* Queue For A Sec Button */}
                {onQueue && (
                  <button
                    onClick={() => onQueue(order)}
                    className="tactile-btn py-2 px-2.5 text-[11px] bg-[#FFD166] text-[#111111] flex items-center justify-center gap-1 font-black"
                    title="Queue for a moment"
                  >
                    <Hourglass className="w-3.5 h-3.5" />
                    <span>Queue</span>
                  </button>
                )}

                {/* Reject Button */}
                {onReject && (
                  <button
                    onClick={() => onReject(order)}
                    className="py-2 px-2 text-[11px] bg-red-100 hover:bg-red-200 text-red-900 border border-red-400 rounded-xl font-black"
                    title="Reject Proof"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Start Cooking */}
                {onStartCooking && order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => onStartCooking(order)}
                    className="tactile-btn flex-1 py-2 text-[11px] bg-[#FF3B30] text-white flex items-center justify-center gap-1 font-black"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Start Cooking</span>
                  </button>
                )}

                {/* Food Ready */}
                {onMarkReady && order.status === 'COOKING' && (
                  <button
                    onClick={() => onMarkReady(order)}
                    className="tactile-btn flex-1 py-2 text-[11px] bg-[#22C55E] text-white flex items-center justify-center gap-1 font-black"
                  >
                    <Utensils className="w-3.5 h-3.5" />
                    <span>Food Ready</span>
                  </button>
                )}

                {/* Delivered & Complete */}
                {onDelivered && (
                  <button
                    onClick={() => onDelivered(order)}
                    className="tactile-btn flex-1 py-2 text-[11px] bg-[#4D96FF] text-white flex items-center justify-center gap-1 font-black"
                  >
                    <Bike className="w-3.5 h-3.5" />
                    <span>Delivered ({order.seatCode})</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {orders.length === 0 && (
          <div className="h-32 flex items-center justify-center text-xs font-bold text-stone-400 border-2 border-dashed border-stone-300 rounded-2xl">
            No orders
          </div>
        )}
      </div>
    </div>
  );
}
