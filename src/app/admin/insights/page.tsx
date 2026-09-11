'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR } from '@/lib/utils';
import {
  TrendingUp,
  Sparkles,
  Utensils,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

export default function AdminInsightsPage() {
  const { user } = useAuth();
  const { orders } = useOrders();

  const totalRevenue = orders.reduce((sum, o) => {
    return o.status !== 'REJECTED' ? sum + o.totalAmount : sum;
  }, 0);

  const validOrders = orders.filter((o) => o.status !== 'REJECTED');
  const totalOrders = validOrders.length;
  const servedOrders = orders.filter((o) => ['SERVED', 'COMPLETED'].includes(o.status)).length;

  const itemFrequency: Record<string, { count: number; revenue: number }> = {};
  validOrders.forEach((o) => {
    o.items.forEach((it) => {
      if (!itemFrequency[it.name]) {
        itemFrequency[it.name] = { count: 0, revenue: 0 };
      }
      itemFrequency[it.name].count += it.quantity;
      itemFrequency[it.name].revenue += it.lineTotal;
    });
  });

  const topItems = Object.entries(itemFrequency)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
                Pantry Pilot Insights
              </h1>
              <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#FFD166] text-[#111111] border border-[#111111] rounded-md shadow-[0_1.5px_0_#111111]">
                Manager Pitch
              </span>
            </div>
            <p className="text-xs font-bold text-[#6B6B6B]">
              Live operational metrics & pantry sales proof
            </p>
          </div>
        </div>
      </div>

      {/* Pitch Executive Highlight Banner */}
      <div className="tactile-card p-6 sm:p-7 bg-[#111111] text-white space-y-2 border-2 border-[#111111] shadow-[0_6px_0_#FF3B30]">
        <div className="flex items-center gap-2 text-[#FFD166] text-xs font-black uppercase tracking-wider">
          <Sparkles className="w-4 h-4 fill-[#FFD166]" />
          <span>Pitch Proof Concept</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white leading-snug">
          &quot;Zero Kitchen Window Queues. 100% Desk Delivery.&quot;
        </h2>
        <p className="text-xs sm:text-sm text-stone-300 font-semibold leading-relaxed max-w-xl">
          Employees order in 15 seconds from their seat with direct UPI verification. Kitchen staff receive real-time audio sirens with seat delivery codes, cutting queueing time to 0.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Total Revenue
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#FF3B30]">
            {formatINR(totalRevenue)}
          </div>
          <span className="text-[11px] font-black text-[#22C55E] flex items-center gap-0.5 mt-1">
            <TrendingUp className="w-3 h-3 stroke-[3]" /> UPI Verified
          </span>
        </div>

        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Total Orders
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#111111]">
            {totalOrders}
          </div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">
            Across 4 Bays
          </span>
        </div>

        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Plates Served
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#22C55E]">
            {servedOrders}
          </div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">
            Desk Deliveries
          </span>
        </div>

        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Avg Speed
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#111111]">
            ~6.5m
          </div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">
            Order to Desk
          </span>
        </div>
      </div>

      {/* Top 5 Most Ordered Items */}
      <div className="tactile-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-black uppercase tracking-wider text-[#111111] flex items-center gap-2">
            <Utensils className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
            Top Selling Pantry Items
          </h3>
          <span className="text-xs font-bold text-[#6B6B6B]">By volume</span>
        </div>

        {topItems.length > 0 ? (
          <div className="space-y-3.5">
            {topItems.map((item, index) => {
              const percentage = Math.round((item.count / totalOrders) * 100) || 15;
              return (
                <div key={item.name} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-black text-[#111111]">
                      {index + 1}. {item.name}
                    </span>
                    <span className="font-black text-[#111111]">
                      {item.count} orders • {formatINR(item.revenue)}
                    </span>
                  </div>
                  <div className="w-full bg-[#FFF8F2] border border-[#111111] rounded-full h-3 overflow-hidden p-0.5">
                    <div
                      className="bg-[#FF3B30] h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(15, percentage))}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-xs font-bold text-[#6B6B6B]">
            Place pilot demo orders to populate top pantry items chart.
          </div>
        )}
      </div>

      {/* Compliance Note */}
      <div className="tactile-card p-4 bg-[#FFD166]/30 border-2 border-[#111111] flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-[#111111] shrink-0 mt-0.5" />
        <div>
          <span className="font-black text-xs text-[#111111] block">100% Audit Trail & Transparency</span>
          <span className="text-xs font-bold text-[#6B6B6B]">
            Every order retains employee timestamp, uploaded UPI reference screenshot, and status history for complete accounting accuracy.
          </span>
        </div>
      </div>
    </div>
  );
}
