'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { INITIAL_SEAT_MAP } from '@/lib/seedData';
import { Order } from '@/types';
import { formatINR, getStatusDetails } from '@/lib/utils';
import {
  MapPin,
  ChevronLeft,
  Bike,
  X,
  Sparkles,
} from 'lucide-react';

export default function OfficeSeatMapPage() {
  const { user } = useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [selectedDeskOrder, setSelectedDeskOrder] = useState<{
    seatCode: string;
    order?: Order;
  } | null>(null);

  // Map active orders by seatCode
  const activeOrdersBySeat = orders.reduce<Record<string, Order>>((acc, order) => {
    if (['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].includes(order.status)) {
      acc[order.seatCode] = order;
    }
    return acc;
  }, {});

  const totalActiveDeliveries = Object.keys(activeOrdersBySeat).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2 bg-white rounded-2xl border-2 border-[#111111] text-[#111111] shadow-[0_3px_0_#111111] hover:bg-[#FFF8F2]"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
              Office Delivery Map
            </h1>
            <p className="text-xs font-bold text-[#6B6B6B]">
              Visual desk layout • {totalActiveDeliveries} active meal(s) to deliver
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-[#FF3B30] border border-[#111111] animate-pulse" />
            <span className="text-[#111111]">Active Meal</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-white border border-[#111111]" />
            <span className="text-[#6B6B6B]">Empty</span>
          </span>
        </div>
      </div>

      {/* Map Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(['A', 'B', 'C', 'D'] as const).map((zone) => {
          const zoneDesks = INITIAL_SEAT_MAP.filter((s) => s.zone === zone);
          const zoneActiveCount = zoneDesks.filter((s) => activeOrdersBySeat[s.seatCode]).length;

          return (
            <div
              key={zone}
              className="tactile-card p-5 space-y-4 bg-white"
            >
              <div className="flex items-center justify-between border-b-2 border-stone-100 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FFD166] text-[#111111] border-2 border-[#111111] shadow-[0_2px_0_#111111] flex items-center justify-center text-xs font-black">
                    {zone}
                  </div>
                  <h3 className="text-sm font-black text-[#111111]">
                    Bay {zone} (Desks 1–12)
                  </h3>
                </div>

                {zoneActiveCount > 0 ? (
                  <span className="text-xs font-black text-white bg-[#FF3B30] px-2.5 py-0.5 rounded-md border border-[#111111] shadow-[0_1.5px_0_#111111] animate-pulse">
                    {zoneActiveCount} Active
                  </span>
                ) : (
                  <span className="text-xs font-bold text-[#6B6B6B]">All clear</span>
                )}
              </div>

              {/* Desk Pods */}
              <div className="grid grid-cols-4 gap-2.5">
                {zoneDesks.map((seat) => {
                  const activeOrder = activeOrdersBySeat[seat.seatCode];
                  const hasOrder = Boolean(activeOrder);
                  const statusMeta = activeOrder ? getStatusDetails(activeOrder.status) : null;

                  return (
                    <button
                      key={seat.seatCode}
                      onClick={() => setSelectedDeskOrder({ seatCode: seat.seatCode, order: activeOrder })}
                      className={`relative p-3 rounded-2xl text-center border-2 transition-all flex flex-col items-center justify-center gap-1 active:translate-y-1 ${
                        hasOrder
                          ? 'border-[#111111] bg-[#FF3B30] text-white shadow-[0_4px_0_#111111] -translate-y-1 z-10 font-black animate-seat-glow'
                          : 'border-[#111111]/30 bg-[#FFF8F2] text-[#111111] hover:border-[#111111]'
                      }`}
                    >
                      <span className={`text-[10px] font-black ${hasOrder ? 'text-white/90' : 'text-[#6B6B6B]'}`}>
                        {seat.seatCode}
                      </span>

                      {hasOrder ? (
                        <div className="flex flex-col items-center">
                          <span className="text-base">{statusMeta?.emoji}</span>
                          <span className="text-[9px] font-black uppercase text-white mt-0.5 max-w-[55px] truncate">
                            {activeOrder?.employeeName.split(' ')[0]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs font-black text-[#111111]">Desk</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Desk Order Bottom Sheet */}
      {selectedDeskOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 border-4 border-[#111111] shadow-[0_8px_0_#111111] animate-in slide-in-from-bottom-4">
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#FF3B30] text-white border-2 border-[#111111] flex items-center justify-center">
                  <MapPin className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-[#111111]">
                    Desk {selectedDeskOrder.seatCode}
                  </h3>
                  <span className="text-xs font-bold text-[#6B6B6B]">
                    {selectedDeskOrder.order
                      ? `Ordered by ${selectedDeskOrder.order.employeeName}`
                      : 'No active delivery pending'}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDeskOrder(null)}
                className="p-1.5 text-stone-400 hover:text-[#111111] rounded-full hover:bg-stone-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {selectedDeskOrder.order ? (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
                  <span className="text-xs font-black text-[#111111]">Order Status</span>
                  <span className="text-xs font-black text-[#FF3B30] flex items-center gap-1">
                    {getStatusDetails(selectedDeskOrder.order.status).emoji}{' '}
                    {getStatusDetails(selectedDeskOrder.order.status).label}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B]">
                    Items for this Desk
                  </span>
                  {selectedDeskOrder.order.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#FFF8F2] rounded-xl text-xs font-black text-[#111111] border border-[#111111]/30 flex justify-between"
                    >
                      <span>{it.quantity}x {it.name}</span>
                      <span className="text-[#FF3B30]">{formatINR(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  {selectedDeskOrder.order.status === 'READY' && (
                    <button
                      onClick={async () => {
                        if (!selectedDeskOrder.order) return;
                        await updateOrderStatus(selectedDeskOrder.order.id, 'SERVED');
                        setSelectedDeskOrder(null);
                      }}
                      className="tactile-btn w-full flex items-center justify-center gap-2 py-3.5 text-xs bg-[#4D96FF]"
                    >
                      <Bike className="w-4 h-4 stroke-[2.5]" />
                      <span>Delivered & Complete</span>
                    </button>
                  )}

                  {(selectedDeskOrder.order.status === 'SERVED' || selectedDeskOrder.order.status === 'COMPLETED') && (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center text-xs font-black text-emerald-800">
                      Delivered & Complete
                    </div>
                  )}

                  <Link
                    href="/admin"
                    onClick={() => setSelectedDeskOrder(null)}
                    className="w-full block text-center py-2 text-xs font-black text-[#6B6B6B] hover:text-[#111111]"
                  >
                    Open Full Kitchen Queue
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#6B6B6B] text-xs font-bold">
                No active orders at this desk right now.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
