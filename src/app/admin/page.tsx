'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR, getStatusDetails } from '@/lib/utils';
import { Order, OrderStatus } from '@/types';
import { startLoudAlertLoop, stopLoudAlertLoop } from '@/lib/sound';
import {
  ChefHat,
  MapPin,
  Clock,
  CheckCircle2,
  Eye,
  Flame,
  Utensils,
  Bike,
  Sparkles,
  Volume2,
  VolumeX,
  X,
  ShieldAlert,
} from 'lucide-react';

export default function AdminKitchenPage() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [activeTab, setActiveTab] = useState<'active' | 'completed'>('active');
  const [zoomedProofUrl, setZoomedProofUrl] = useState<string | null>(null);
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('Payment screenshot unverified / invalid');
  const [testingAlarm, setTestingAlarm] = useState(false);

  // Gated strictly to role === 'admin'
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto my-12 tactile-card p-8 text-center space-y-4">
        <div className="w-16 h-16 mx-auto bg-[#FFD166] border-2 border-[#111111] rounded-2xl flex items-center justify-center text-[#111111] shadow-[0_3px_0_#111111]">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-[#111111] tracking-tight">
          Pantry Staff Only
        </h2>
        <p className="text-sm text-[#6B6B6B] font-bold">
          The kitchen order queue is restricted to authorized Newtown pantry staff.
        </p>
        <Link
          href="/"
          className="tactile-btn inline-flex items-center gap-2 px-6 py-3 text-xs"
        >
          Return to Employee Menu
        </Link>
      </div>
    );
  }

  const activeOrders = orders.filter((o) =>
    ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].includes(o.status)
  );

  const completedOrders = orders.filter((o) =>
    ['COMPLETED', 'REJECTED'].includes(o.status)
  );

  const displayOrders = activeTab === 'active' ? activeOrders : completedOrders;

  const handleTestAlarm = () => {
    if (testingAlarm) {
      stopLoudAlertLoop();
      setTestingAlarm(false);
    } else {
      startLoudAlertLoop();
      setTestingAlarm(true);
      setTimeout(() => {
        stopLoudAlertLoop();
        setTestingAlarm(false);
      }, 5000);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingOrder) return;
    await updateOrderStatus(rejectingOrder.id, 'REJECTED', rejectionReason);
    setRejectingOrder(null);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Kitchen Header */}
      <div className="tactile-card p-6 bg-[#111111] text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-2 border-[#111111] shadow-[0_6px_0_#FF3B30]">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#FF3B30] border-2 border-white flex items-center justify-center text-white shadow-xs">
            <ChefHat className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black tracking-tight text-white">Kitchen Orders Queue</h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#22C55E] text-white rounded-md">
                Live
              </span>
            </div>
            <p className="text-xs text-stone-300 font-bold mt-0.5">
              Admin Mode • {activeOrders.length} order(s) pending in kitchen
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleTestAlarm}
            className={`tactile-btn flex items-center gap-1.5 px-4 py-2 text-xs ${
              testingAlarm ? 'bg-red-700 animate-pulse' : 'bg-[#FF3B30]'
            }`}
          >
            {testingAlarm ? (
              <>
                <VolumeX className="w-4 h-4" />
                <span>Stop Siren</span>
              </>
            ) : (
              <>
                <Volume2 className="w-4 h-4" />
                <span>Test Alarm</span>
              </>
            )}
          </button>

          <Link
            href="/admin/map"
            className="tactile-btn-dark px-4 py-2 text-xs flex items-center gap-1.5 bg-stone-800"
          >
            <MapPin className="w-3.5 h-3.5 text-[#FFD166]" />
            <span>Desk Map</span>
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] max-w-sm">
        <button
          onClick={() => setActiveTab('active')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'active'
              ? 'bg-[#FF3B30] text-white shadow-xs -translate-y-0.5'
              : 'text-[#111111] hover:bg-stone-50'
          }`}
        >
          Active Kitchen ({activeOrders.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
            activeTab === 'completed'
              ? 'bg-[#111111] text-white shadow-xs -translate-y-0.5'
              : 'text-[#111111] hover:bg-stone-50'
          }`}
        >
          History ({completedOrders.length})
        </button>
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {displayOrders.map((order) => {
          const statusMeta = getStatusDetails(order.status);

          return (
            <div
              key={order.id}
              className={`tactile-card p-5 sm:p-6 transition-all ${
                order.status === 'PAYMENT_VERIFYING'
                  ? 'border-2 border-[#111111] shadow-[0_6px_0_#FFD166]'
                  : ''
              }`}
            >
              {/* Order Card Header */}
              <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b-2 border-stone-100">
                <div className="flex items-center gap-3">
                  {/* Desk Badge */}
                  <div className="px-3.5 py-2 bg-[#FFD166] rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111] flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-[#111111] stroke-[2.5]" />
                    <span className="text-lg font-black text-[#111111]">
                      {order.seatCode}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-[#111111]">
                        {order.employeeName}
                      </span>
                      <span className="text-xs font-mono font-black text-[#6B6B6B]">
                        #{order.id.slice(-4)}
                      </span>
                    </div>
                    <span className="text-[11px] font-bold text-[#6B6B6B] flex items-center gap-1 mt-0.5">
                      <Clock className="w-3 h-3" />
                      {new Date(order.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>

                {/* Status Badge */}
                <span className="px-3 py-1 bg-white border-2 border-[#111111] rounded-xl text-xs font-black shadow-[0_2px_0_#111111] flex items-center gap-1.5">
                  <span>{statusMeta.emoji}</span>
                  <span>{statusMeta.label}</span>
                </span>
              </div>

              {/* Order Items & Payment Proof */}
              <div className="py-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Items List */}
                <div className="sm:col-span-2 space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block">
                    Preparation Checklist
                  </span>
                  <div className="space-y-1.5">
                    {order.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-[#FFF8F2] rounded-xl border border-[#111111]/30 flex items-start justify-between text-xs"
                      >
                        <div>
                          <span className="font-black text-[#111111]">
                            {item.quantity}x {item.name}
                          </span>
                          {item.selectedAddons.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {item.selectedAddons.map((a, aIdx) => (
                                <span
                                  key={aIdx}
                                  className="text-[10px] font-bold text-[#FF3B30] bg-white border border-[#FF3B30] px-1.5 py-0.2 rounded"
                                >
                                  +{a.optionName}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="font-black text-[#111111]">
                          {formatINR(item.lineTotal)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs font-bold text-[#6B6B6B]">Total Amount</span>
                    <span className="text-base font-black text-[#111111]">
                      {formatINR(order.totalAmount)}
                    </span>
                  </div>
                </div>

                {/* Payment Screenshot Thumbnail */}
                <div className="p-3 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] flex flex-col justify-between">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
                    Payment Proof
                  </span>

                  {order.paymentProofUrl ? (
                    <button
                      type="button"
                      onClick={() => setZoomedProofUrl(order.paymentProofUrl || null)}
                      className="group relative w-full h-24 rounded-xl overflow-hidden border-2 border-[#111111] bg-white cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={order.paymentProofUrl}
                        alt="Payment Proof"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-black transition-opacity">
                        <Eye className="w-4 h-4 mr-1 stroke-[2.5]" /> Tap to Zoom
                      </div>
                    </button>
                  ) : (
                    <div className="h-24 flex items-center justify-center text-xs text-stone-400 font-bold bg-white rounded-xl border-2 border-dashed border-stone-300">
                      No screenshot
                    </div>
                  )}

                  <span className="text-[10px] text-[#6B6B6B] font-bold text-center mt-1">
                    Verify UPI Ref ID
                  </span>
                </div>
              </div>

              {/* Action Buttons: Status Lifecycle State Machine */}
              <div className="pt-3 border-t-2 border-stone-100 flex flex-wrap items-center justify-end gap-2.5">
                {order.status === 'PAYMENT_VERIFYING' && (
                  <>
                    <button
                      onClick={() => setRejectingOrder(order)}
                      className="px-4 py-2.5 bg-red-100 hover:bg-red-200 text-red-900 text-xs font-black rounded-xl border-2 border-red-400 transition-colors"
                    >
                      Reject Proof
                    </button>

                    <button
                      onClick={() => updateOrderStatus(order.id, 'ACCEPTED')}
                      className="tactile-btn px-5 py-2.5 text-xs flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                      <span>Accept & Verify Payment</span>
                    </button>
                  </>
                )}

                {order.status === 'ACCEPTED' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'COOKING')}
                    className="tactile-btn px-5 py-2.5 text-xs flex items-center gap-1.5 bg-[#FF3B30]"
                  >
                    <Flame className="w-4 h-4 stroke-[2.5]" />
                    <span>Start Cooking</span>
                  </button>
                )}

                {order.status === 'COOKING' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'READY')}
                    className="tactile-btn px-5 py-2.5 text-xs flex items-center gap-1.5 bg-[#22C55E]"
                  >
                    <Utensils className="w-4 h-4 stroke-[2.5]" />
                    <span>Mark Food Ready</span>
                  </button>
                )}

                {order.status === 'READY' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'SERVED')}
                    className="tactile-btn px-5 py-2.5 text-xs flex items-center gap-1.5 bg-[#4D96FF]"
                  >
                    <Bike className="w-4 h-4 stroke-[2.5]" />
                    <span>Mark Delivered to Desk {order.seatCode}</span>
                  </button>
                )}

                {order.status === 'SERVED' && (
                  <button
                    onClick={() => updateOrderStatus(order.id, 'COMPLETED')}
                    className="tactile-btn-dark px-5 py-2.5 text-xs flex items-center gap-1.5"
                  >
                    <Sparkles className="w-4 h-4 text-[#FFD166] stroke-[2.5]" />
                    <span>Plate Collected (Close Order)</span>
                  </button>
                )}

                {order.status === 'COMPLETED' && (
                  <span className="text-xs font-black text-[#22C55E] py-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                    Delivered & Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}

        {displayOrders.length === 0 && (
          <div className="tactile-card p-16 text-center space-y-3">
            <div className="text-5xl">🍳</div>
            <h3 className="text-lg font-black text-[#111111]">
              {activeTab === 'active' ? 'Kitchen Queue is Clear!' : 'No Past Orders Recorded'}
            </h3>
            <p className="text-xs text-[#6B6B6B] font-bold">
              {activeTab === 'active'
                ? 'Incoming orders will trigger the loud siren instantly.'
                : 'Delivered orders will appear here.'}
            </p>
          </div>
        )}
      </div>

      {/* Proof Zoom Modal */}
      {zoomedProofUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in">
          <div className="relative max-w-lg w-full bg-white rounded-[28px] p-5 border-4 border-[#111111] shadow-[0_8px_0_#111111]">
            <button
              onClick={() => setZoomedProofUrl(null)}
              className="absolute top-4 right-4 w-9 h-9 bg-[#FFF8F2] hover:bg-stone-200 border-2 border-[#111111] rounded-full flex items-center justify-center z-10"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h4 className="text-sm font-black text-[#111111] mb-3">
              Payment Screenshot Verification
            </h4>
            <div className="max-h-[70vh] overflow-auto rounded-2xl border-2 border-[#111111]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={zoomedProofUrl}
                alt="Payment Screenshot Zoom"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="max-w-md w-full bg-white rounded-[28px] p-6 border-4 border-[#111111] shadow-[0_8px_0_#111111] space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-[#111111]">
                Reject Order #{rejectingOrder.id.slice(-4)}
              </h3>
              <button
                onClick={() => setRejectingOrder(null)}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-[#6B6B6B] font-bold">
              Specify rejection reason:
            </p>

            <div className="space-y-2">
              {[
                'Payment screenshot unverified / invalid',
                'Ingredients out of stock for this dish',
                'Pantry closed / kitchen overwhelmed',
              ].map((reason) => (
                <button
                  key={reason}
                  onClick={() => setRejectionReason(reason)}
                  className={`w-full p-2.5 text-left rounded-xl text-xs font-black border-2 transition-all ${
                    rejectionReason === reason
                      ? 'border-[#111111] bg-[#FFD166] text-[#111111] shadow-[0_2px_0_#111111]'
                      : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {reason}
                </button>
              ))}
              <input
                type="text"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Or custom reason..."
                className="w-full p-2.5 bg-[#FFF8F2] border-2 border-[#111111] rounded-xl text-xs font-bold text-[#111111] focus:outline-none"
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
                className="tactile-btn flex-1 py-3 text-xs bg-red-600"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
