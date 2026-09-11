'use client';

import React from 'react';
import { useOrders } from '@/context/OrderContext';
import { formatINR } from '@/lib/utils';
import { BellRing, CheckCircle, MapPin } from 'lucide-react';
import Link from 'next/link';

export function LoudAlertModal() {
  const { activeAlertOrder, dismissAlert } = useOrders();

  if (!activeAlertOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-[32px] overflow-hidden border-4 border-[#111111] shadow-[0_8px_0_#111111] animate-kitchen-alarm">
        {/* Urgent Header */}
        <div className="p-6 text-white text-center bg-[#FF3B30] border-b-2 border-[#111111]">
          <div className="w-16 h-16 mx-auto mb-3 bg-white border-2 border-[#111111] shadow-[0_3px_0_#111111] rounded-2xl flex items-center justify-center animate-bounce">
            <BellRing className="w-9 h-9 text-[#FF3B30] stroke-[2.5]" />
          </div>
          <h2 className="text-3xl font-black tracking-tight text-white uppercase drop-shadow-xs">
            🚨 New Pantry Order!
          </h2>
          <p className="text-white/95 text-xs font-black mt-1">
            Order #{activeAlertOrder.id.slice(-4)} needs kitchen attention
          </p>
        </div>

        {/* Order Details Body */}
        <div className="bg-[#FFF8F2] p-6 space-y-4">
          <div className="flex items-center justify-between p-4 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111]">
            <div>
              <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider block">
                Destination Desk
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <MapPin className="w-5 h-5 text-[#FF3B30] stroke-[2.5]" />
                <span className="text-2xl font-black text-[#111111]">
                  {activeAlertOrder.seatCode}
                </span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-black text-[#6B6B6B] uppercase tracking-wider block">
                Ordered By
              </span>
              <span className="text-base font-black text-[#111111]">
                {activeAlertOrder.employeeName}
              </span>
            </div>
          </div>

          {/* Items Summary */}
          <div className="bg-white rounded-2xl p-4 border-2 border-[#111111]">
            <div className="flex justify-between text-xs font-black text-[#6B6B6B] mb-2 uppercase">
              <span>Items ({activeAlertOrder.items.length})</span>
              <span className="text-[#111111]">{formatINR(activeAlertOrder.totalAmount)}</span>
            </div>
            <ul className="divide-y divide-stone-100 text-sm">
              {activeAlertOrder.items.slice(0, 3).map((item, idx) => (
                <li key={idx} className="py-1.5 flex justify-between font-black text-[#111111]">
                  <span>{item.quantity}x {item.name}</span>
                  <span className="text-[#FF3B30]">{formatINR(item.lineTotal)}</span>
                </li>
              ))}
              {activeAlertOrder.items.length > 3 && (
                <li className="pt-1 text-xs text-[#6B6B6B] font-bold italic">
                  + {activeAlertOrder.items.length - 3} more item(s)...
                </li>
              )}
            </ul>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            <Link
              href="/admin"
              onClick={dismissAlert}
              className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-base"
            >
              <CheckCircle className="w-5 h-5 stroke-[2.5]" />
              <span>Acknowledge & Go to Kitchen</span>
            </Link>

            <button
              onClick={dismissAlert}
              type="button"
              className="w-full py-2.5 text-[#6B6B6B] hover:text-[#111111] text-xs font-black transition-colors text-center"
            >
              Mute Alarm (Keep in Queue)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
