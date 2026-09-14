'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { CheckCircle2, ArrowRight, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

export function DeliveryConfirmationBanner() {
  const { user } = useAuth();
  const { orders, updateOrderStatus, reportMissingDelivery } = useOrders();
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  if (!user) return null;

  // Find user's active orders in SERVED status
  const servedOrders = orders.filter(
    (o) => o.employeeId === user.uid && o.status === 'SERVED'
  );

  if (servedOrders.length === 0) return null;

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    try {
      await updateOrderStatus(orderId, 'COMPLETED');
      toast.success('Food delivery confirmed! Order completed ✨');
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to confirm delivery');
    } finally {
      setConfirmingId(null);
    }
  };

  const handleReport = async (orderId: string) => {
    setReportingId(orderId);
    try {
      await reportMissingDelivery(orderId);
      toast.warning('Delivery issue reported! Kitchen staff alerted.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Failed to report delivery issue');
    } finally {
      setReportingId(null);
    }
  };

  return (
    <div className="space-y-2 mb-4 animate-in fade-in">
      {servedOrders.map((order) => {
        const isConfirming = confirmingId === order.id;
        const isReporting = reportingId === order.id;

        return (
          <div
            key={order.id}
            className="p-4 bg-[#FFF8F2] border-3 border-[#111111] rounded-2xl shadow-[0_4px_0_#111111] space-y-3"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#22C55E] border-2 border-[#111111] text-white flex items-center justify-center text-xl shrink-0 shadow-[0_2px_0_#111111]">
                  🍽️
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-md">
                      Food Delivered!
                    </span>
                    <span className="text-xs font-mono font-black text-[#111111]">
                      #{order.id.slice(-4)}
                    </span>
                  </div>
                  <h4 className="text-sm font-black text-[#111111] mt-0.5">
                    Has your food arrived at Desk {order.seatCode}?
                  </h4>
                  <p className="text-[11px] font-bold text-[#6B6B6B]">
                    {order.items.map((i) => `${i.quantity}x ${i.name}`).join(', ')}
                  </p>
                </div>
              </div>

              <Link
                href={`/orders/${order.id}`}
                className="text-xs font-black text-[#FF3B30] hover:underline flex items-center gap-0.5 shrink-0 pt-0.5"
              >
                <span>Details</span>
                <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
              </Link>
            </div>

            {order.deliveryReportedMissing && (
              <div className="flex items-center gap-1.5 p-2 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-xs font-bold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                <span>Issue reported: Kitchen staff has been alerted to check Desk {order.seatCode}.</span>
              </div>
            )}

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                disabled={isConfirming}
                onClick={() => handleConfirm(order.id)}
                className="tactile-btn flex-1 flex items-center justify-center gap-1.5 py-2.5 px-4 bg-[#22C55E] text-white text-xs font-black disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                <span>{isConfirming ? 'Confirming...' : 'Yes, Food Received! ✅'}</span>
              </button>

              {!order.deliveryReportedMissing && (
                <button
                  type="button"
                  disabled={isReporting}
                  onClick={() => handleReport(order.id)}
                  className="min-h-[38px] px-3 py-2 bg-white text-[#B91C1C] border-2 border-red-200 hover:border-red-400 rounded-xl text-xs font-black transition-all"
                >
                  {isReporting ? 'Reporting...' : "Haven't received"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
