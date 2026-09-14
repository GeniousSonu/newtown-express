'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Papa from 'papaparse';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { formatINR } from '@/lib/utils';
import {
  TrendingUp,
  Sparkles,
  Utensils,
  ChevronLeft,
  ShieldCheck,
  Download,
  X,
  FileSpreadsheet,
  Check,
} from 'lucide-react';

type DatePreset = 'this_week' | 'this_month' | 'all_time' | 'custom';

export default function AdminInsightsPage() {
  const { user } = useAuth();
  const { orders } = useOrders();

  const [showExportModal, setShowExportModal] = useState(false);
  const [datePreset, setDatePreset] = useState<DatePreset>('this_week');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [includeRejected, setIncludeRejected] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

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

  // Compute orders filtered for CSV export
  const filteredExportOrders = useMemo(() => {
    const now = new Date();
    return orders.filter((order) => {
      if (!includeRejected && order.status === 'REJECTED') return false;

      const orderDate = new Date(order.createdAt);

      if (datePreset === 'this_week') {
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(now.getDate() - 7);
        return orderDate >= oneWeekAgo;
      }

      if (datePreset === 'this_month') {
        const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return orderDate >= firstOfMonth;
      }

      if (datePreset === 'custom') {
        if (customStartDate) {
          const start = new Date(customStartDate);
          start.setHours(0, 0, 0, 0);
          if (orderDate < start) return false;
        }
        if (customEndDate) {
          const end = new Date(customEndDate);
          end.setHours(23, 59, 59, 999);
          if (orderDate > end) return false;
        }
        return true;
      }

      return true; // all_time
    });
  }, [orders, datePreset, customStartDate, customEndDate, includeRejected]);

  const handleDownloadCsv = () => {
    if (filteredExportOrders.length === 0) return;

    const rows = filteredExportOrders.map((order) => {
      const dateObj = new Date(order.createdAt);
      const dateStr = dateObj.toLocaleDateString('en-IN', {
        timeZone: 'Asia/Kolkata',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
      const timeStr = dateObj.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      const itemsStr = order.items
        .map((it) => {
          const addons = it.selectedAddons?.length
            ? ` (${it.selectedAddons.map((a) => a.optionName).join(', ')})`
            : '';
          return `${it.quantity}x ${it.name}${addons}`;
        })
        .join('; ');

      return {
        'Order ID': order.id,
        Date: dateStr,
        Time: timeStr,
        'Employee Name': order.employeeName || 'Anonymous',
        'Seat / Desk Code': order.seatCode || 'N/A',
        'Items & Customizations': itemsStr,
        'Total Amount (INR)': order.totalAmount,
        'Total Calories (kcal)': order.totalCalories,
        'Order Status': order.status,
        'Audit Snippet / Reference': order.paymentAudit?.extractedSnippet || '',
      };
    });

    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `newtown-express-orders-${datePreset}-${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setExportSuccess(true);
    setTimeout(() => {
      setExportSuccess(false);
      setShowExportModal(false);
    }, 1500);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/admin"
            className="p-2.5 bg-white rounded-2xl border-2 border-[#111111] text-[#111111] shadow-[0_3px_0_#111111] hover:bg-[#FFF8F2] active:translate-y-0.5 active:shadow-none transition-all"
            aria-label="Back to Admin Queue"
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

        {/* CSV Export Action Button (Admin Only) */}
        {user?.role === 'admin' && (
          <button
            type="button"
            onClick={() => setShowExportModal(true)}
            className="tactile-btn min-h-[44px] px-4 py-2 text-xs flex items-center justify-center gap-2 self-start sm:self-auto bg-[#10B981] hover:bg-[#059669] text-white"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export CSV</span>
          </button>
        )}
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
          Employees order in 15 seconds from their seat with direct UPI verification. Kitchen staff
          receive real-time audio sirens with seat delivery codes, cutting queueing time to 0.
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
          <div className="text-2xl sm:text-3xl font-black text-[#111111]">{totalOrders}</div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">Across 4 Bays</span>
        </div>

        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Plates Served
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#22C55E]">{servedOrders}</div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">Desk Deliveries</span>
        </div>

        <div className="tactile-card p-4 sm:p-5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] block mb-1">
            Avg Speed
          </span>
          <div className="text-2xl sm:text-3xl font-black text-[#111111]">~6.5m</div>
          <span className="text-[11px] font-bold text-[#6B6B6B] block mt-1">Order to Desk</span>
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
          <span className="font-black text-xs text-[#111111] block">
            100% Audit Trail & Transparency
          </span>
          <span className="text-xs font-bold text-[#6B6B6B]">
            Every order retains employee timestamp, uploaded UPI reference screenshot, and status
            history for complete accounting accuracy.
          </span>
        </div>
      </div>

      {/* CSV Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl border-2 border-[#111111] shadow-[0_8px_0_#111111] overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b-2 border-[#111111] bg-[#FFF8F2] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#10B981] border-2 border-[#111111] text-white flex items-center justify-center shadow-[0_2px_0_#111111]">
                  <Download className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#111111]">Export Orders to CSV</h3>
                  <p className="text-[11px] font-bold text-[#6B6B6B]">
                    Client-side accounting & sales report
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="w-8 h-8 rounded-full border-2 border-[#111111] bg-white flex items-center justify-center hover:bg-stone-100"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Date Preset Selector */}
              <div>
                <label className="text-xs font-black text-[#111111] uppercase tracking-wider block mb-2">
                  Date Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'this_week', label: 'This Week (7d)' },
                    { id: 'this_month', label: 'This Month' },
                    { id: 'all_time', label: 'All Time' },
                    { id: 'custom', label: 'Custom Range' },
                  ].map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setDatePreset(p.id as DatePreset)}
                      className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-black border-2 transition-all ${
                        datePreset === p.id
                          ? 'bg-[#FF3B30] text-white border-[#111111] shadow-[0_2px_0_#111111]'
                          : 'bg-white text-[#111111] border-stone-200 hover:border-[#111111]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Date Inputs */}
              {datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200 animate-in fade-in">
                  <div>
                    <label className="text-[10px] font-black text-stone-600 uppercase block mb-1">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border-2 border-[#111111] text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-stone-600 uppercase block mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded-lg border-2 border-[#111111] text-xs font-bold"
                    />
                  </div>
                </div>
              )}

              {/* Include Rejected Checkbox */}
              <label className="flex items-center gap-2.5 text-xs font-black text-[#111111] cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={includeRejected}
                  onChange={(e) => setIncludeRejected(e.target.checked)}
                  className="w-4 h-4 rounded border-2 border-[#111111] accent-[#FF3B30]"
                />
                <span>Include rejected orders in export</span>
              </label>

              {/* Matching Orders Preview Banner */}
              <div className="p-3 bg-[#FFF8F2] rounded-xl border border-[#111111]/20 flex items-center justify-between text-xs font-black">
                <span className="text-[#6B6B6B]">Matching Orders:</span>
                <span className="text-[#111111]">
                  {filteredExportOrders.length} order(s) •{' '}
                  {formatINR(filteredExportOrders.reduce((s, o) => s + o.totalAmount, 0))}
                </span>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-5 border-t-2 border-[#111111] bg-stone-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black border-2 border-[#111111] bg-white hover:bg-stone-100"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleDownloadCsv}
                disabled={filteredExportOrders.length === 0}
                className="tactile-btn min-h-[44px] px-5 py-2 text-xs flex items-center gap-2 disabled:opacity-50 disabled:pointer-events-none bg-[#10B981] hover:bg-[#059669] text-white"
              >
                {exportSuccess ? (
                  <>
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>Downloaded!</span>
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 stroke-[2.5]" />
                    <span>Download CSV ({filteredExportOrders.length})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
