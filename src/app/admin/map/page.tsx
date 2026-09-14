'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { SeatMap } from '@/components/SeatMap';
import { getSeatShortCode } from '@/lib/seatLayout';
import { SeatOccupancy } from '@/types';
import { formatINR, getStatusDetails } from '@/lib/utils';
import {
  MapPin,
  ChevronLeft,
  Bike,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

export default function OfficeSeatMapPage() {
  useAuth();
  const { orders, updateOrderStatus } = useOrders();

  const [selectedDesk, setSelectedDesk] = useState<{
    seatId: string;
    occupancy: SeatOccupancy | null;
  } | null>(null);

  // Find active order for the selected seat's occupant
  const selectedOrder = selectedDesk?.occupancy?.occupiedBy
    ? orders.find(
        (o) =>
          o.employeeId === selectedDesk.occupancy!.occupiedBy &&
          ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].includes(o.status)
      )
    : undefined;

  // Also check by seatCode match for orders using old seat format
  const selectedOrderBySeat = !selectedOrder && selectedDesk
    ? orders.find(
        (o) =>
          o.seatCode === selectedDesk.seatId &&
          ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].includes(o.status)
      )
    : undefined;

  const activeOrder = selectedOrder || selectedOrderBySeat;

  // Count total active deliveries
  const totalActiveDeliveries = orders.filter((o) =>
    ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'].includes(o.status)
  ).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-white rounded-2xl border-2 border-[#134E4A]/30 text-[#0F172A] shadow-xs hover:bg-stone-50"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-[#0F172A] tracking-tight">
              Office Delivery Map
            </h1>
            <p className="text-xs font-bold text-[#475569]">
              Live floor plan • {totalActiveDeliveries} active delivery{totalActiveDeliveries !== 1 ? 'ies' : 'y'}
            </p>
          </div>
        </div>

        {/* Legend */}
        <div className="hidden sm:flex items-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md bg-stone-100 border border-[#111111]/40" />
            <span className="text-[#475569]">Occupied</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span>🔥</span>
            <span className="text-[#475569]">Cooking</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span>🍽️</span>
            <span className="text-[#475569]">Ready</span>
          </span>
        </div>
      </div>

      {/* Real-time seat map */}
      <SeatMap
        mode="view"
        onSeatTapped={(seatId, occupancy) => {
          setSelectedDesk({ seatId, occupancy });
        }}
      />

      {/* Selected Desk Order Bottom Sheet */}
      <Dialog open={Boolean(selectedDesk)} onOpenChange={(open) => !open && setSelectedDesk(null)}>
        {selectedDesk && (
          <DialogContent variant="sheet" size="md" className="p-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-stone-100 pr-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-[#0F766E] text-white border-2 border-[#134E4A] flex items-center justify-center">
                  <MapPin className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-black text-[#0F172A]">
                    {getSeatShortCode(selectedDesk.seatId)}
                  </DialogTitle>
                  <DialogDescription className="text-xs font-bold text-[#475569] mt-0.5">
                    {selectedDesk.occupancy?.occupiedByName
                      ? `Occupied by ${selectedDesk.occupancy.occupiedByName}`
                      : activeOrder
                      ? `Ordered by ${activeOrder.employeeName}`
                      : 'Empty seat — no active delivery'}
                  </DialogDescription>
                </div>
              </div>
            </div>

            {activeOrder ? (
              <div className="py-4 space-y-4">
                <div className="flex items-center justify-between p-3 bg-[#F4FBF7] rounded-2xl border-2 border-[#134E4A]/20">
                  <span className="text-xs font-black text-[#0F172A]">Order Status</span>
                  <span className="text-xs font-black text-[#0F766E] flex items-center gap-1">
                    {getStatusDetails(activeOrder.status).emoji}{' '}
                    {getStatusDetails(activeOrder.status).label}
                  </span>
                </div>

                <div className="space-y-1.5">
                  <span className="text-[10px] font-black uppercase tracking-wider text-[#475569]">
                    Items for this Desk
                  </span>
                  {activeOrder.items.map((it, idx) => (
                    <div
                      key={idx}
                      className="p-2 bg-[#F4FBF7] rounded-xl text-xs font-black text-[#0F172A] border border-[#134E4A]/15 flex justify-between"
                    >
                      <span>{it.quantity}x {it.name}</span>
                      <span className="text-[#0F766E]">{formatINR(it.lineTotal)}</span>
                    </div>
                  ))}
                </div>

                <div className="pt-2 space-y-2">
                  {activeOrder.status === 'READY' && (
                    <button
                      onClick={async () => {
                        if (!activeOrder) return;
                        await updateOrderStatus(activeOrder.id, 'SERVED');
                        setSelectedDesk(null);
                      }}
                      className="w-full min-h-[44px] flex items-center justify-center gap-2 py-3.5 text-xs font-black bg-[#0F766E] text-white rounded-2xl border-2 border-[#134E4A] shadow-[0_3px_0_#134E4A] active:translate-y-0.5 active:shadow-[0_1px_0_#134E4A] transition-all"
                    >
                      <Bike className="w-4 h-4 stroke-[2.5]" />
                      <span>Delivered & Complete</span>
                    </button>
                  )}

                  {(activeOrder.status === 'SERVED' || activeOrder.status === 'COMPLETED') && (
                    <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-xl text-center text-xs font-black text-emerald-800">
                      Delivered & Complete
                    </div>
                  )}

                  <Link
                    href="/admin"
                    onClick={() => setSelectedDesk(null)}
                    className="w-full block text-center py-2 text-xs font-black text-[#475569] hover:text-[#0F172A]"
                  >
                    Open Full Kitchen Queue
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-[#475569] text-xs font-bold">
                {selectedDesk.occupancy?.occupiedByName
                  ? `${selectedDesk.occupancy.occupiedByName} is seated here but has no active order.`
                  : 'No one is assigned to this seat right now.'}
              </div>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
