'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  CUBICLES,
  PODS,
  getSeatsForZone,
  getSeatShortCode,
  type CubicleZone,
  type PodZone,
  type SeatDefinition,
} from '@/lib/seatLayout';
import type { SeatOccupancy, Order } from '@/types';
import { UserAvatar } from '@/components/UserAvatar';
import { Loader2, X } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────

interface SeatMapProps {
  mode: 'pick' | 'view';
  selectedSeatId?: string | null;
  onSeatClaimed?: (seatId: string) => void;
  /** Admin mode: fires when an occupied seat is tapped (to show order detail sheet) */
  onSeatTapped?: (seatId: string, occupancy: SeatOccupancy | null) => void;
}

type ClaimState = 'idle' | 'claiming' | 'error';

// ─── Component ───────────────────────────────────────────

export function SeatMap({
  mode,
  selectedSeatId,
  onSeatClaimed,
  onSeatTapped,
}: SeatMapProps) {
  const { user } = useAuth();

  // Live occupancy data from Firestore
  const [occupancy, setOccupancy] = useState<Record<string, SeatOccupancy>>({});
  const [loadingOccupancy, setLoadingOccupancy] = useState(Boolean(db));

  // In-flight orders for "eating now" badges (view mode only)
  const [eatingEmployees, setEatingEmployees] = useState<
    Record<string, { status: string; employeeId: string }>
  >({});

  // Mobile zone tab switcher ('all' | 'cubicle-1' .. 'cubicle-7' | 'pods')
  const [activeMobileTab, setActiveMobileTab] = useState<string>('all');

  // Claim state
  const [claimState, setClaimState] = useState<ClaimState>('idle');
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimingSeatId, setClaimingSeatId] = useState<string | null>(null);

  // Popover state for occupied seats
  const [popoverSeatId, setPopoverSeatId] = useState<string | null>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // ─── Real-time listeners ─────────────────────────────────

  // 1. Seat occupancy listener
  useEffect(() => {
    if (!db) {
      return;
    }

    const unsub = onSnapshot(
      collection(db, 'seats'),
      (snap) => {
        const data: Record<string, SeatOccupancy> = {};
        snap.forEach((doc) => {
          const d = doc.data();
          if (d.occupiedBy) {
            data[doc.id] = {
              seatId: doc.id,
              occupiedBy: d.occupiedBy,
              occupiedByName: d.occupiedByName || null,
              occupiedByPhotoURL: d.occupiedByPhotoURL || null,
              claimedAt: d.claimedAt?.toMillis?.() || d.claimedAt || null,
            };
          }
        });
        setOccupancy(data);
        setLoadingOccupancy(false);
      },
      (err) => {
        console.warn('[SEAT-MAP] Occupancy listener error:', err);
        setLoadingOccupancy(false);
      }
    );

    return () => unsub();
  }, []);

  // 2. In-flight orders listener (view mode only — for "eating now" badges)
  useEffect(() => {
    if (mode !== 'view' || !db) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['ACCEPTED', 'COOKING', 'READY', 'SERVED'])
    );

    const unsub = onSnapshot(
      ordersQuery,
      (snap) => {
        const eating: Record<string, { status: string; employeeId: string }> = {};
        snap.forEach((doc) => {
          const d = doc.data() as Order;
          eating[d.employeeId] = {
            status: d.status,
            employeeId: d.employeeId,
          };
        });
        setEatingEmployees(eating);
      },
      (err) => {
        console.warn('[SEAT-MAP] Orders listener error:', err);
      }
    );

    return () => unsub();
  }, [mode]);

  // ─── Close popover on outside click ──────────────────────
  useEffect(() => {
    if (!popoverSeatId) return;
    const handler = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPopoverSeatId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [popoverSeatId]);

  // ─── Claim handler ──────────────────────────────────────

  const handleClaimSeat = useCallback(
    async (seatId: string) => {
      if (claimState === 'claiming') return;
      if (!auth?.currentUser) return;

      setClaimState('claiming');
      setClaimingSeatId(seatId);
      setClaimError(null);

      try {
        const idToken = await auth.currentUser.getIdToken();
        const res = await fetch('/api/seats/claim', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({ seatId }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          if (res.status === 409 || data.error === 'SEAT_TAKEN') {
            setClaimError('Just taken — try another!');
            setClaimState('error');
            setTimeout(() => {
              setClaimError(null);
              setClaimState('idle');
            }, 2500);
            return;
          }
          throw new Error(data.error || data.message || `Claim failed (${res.status})`);
        }

        setClaimState('idle');
        setClaimingSeatId(null);
        onSeatClaimed?.(seatId);
      } catch (err: unknown) {
        console.error('[SEAT-MAP] Claim error:', err);
        setClaimError((err as Error).message || 'Failed to claim seat.');
        setClaimState('error');
        setTimeout(() => {
          setClaimError(null);
          setClaimState('idle');
        }, 3000);
      }
    },
    [claimState, onSeatClaimed]
  );

  // ─── Seat click handler ────────────────────────────────

  const handleSeatClick = useCallback(
    (seatId: string) => {
      const occ = occupancy[seatId] || null;
      const isOccupied = !!occ;
      const isMyself = occ?.occupiedBy === user?.uid;

      if (mode === 'view') {
        onSeatTapped?.(seatId, occ);
        return;
      }

      // Pick mode
      if (isOccupied && !isMyself) {
        // Show popover with name
        setPopoverSeatId(popoverSeatId === seatId ? null : seatId);
        return;
      }

      if (isMyself) {
        // Already my seat — no action needed
        return;
      }

      // Empty seat → claim it
      handleClaimSeat(seatId);
    },
    [mode, occupancy, user?.uid, popoverSeatId, handleClaimSeat, onSeatTapped]
  );

  // ─── Helper: get eating badge for a seat ───────────────

  const getEatingBadge = (
    seatId: string
  ): { emoji: string; label: string; status: 'COOKING' | 'READY' | 'SERVED' } | null => {
    const occ = occupancy[seatId];
    if (!occ?.occupiedBy) return null;
    const eating = eatingEmployees[occ.occupiedBy];
    if (!eating) return null;

    switch (eating.status) {
      case 'ACCEPTED':
      case 'COOKING':
        return { emoji: '🔥', label: 'Cooking', status: 'COOKING' };
      case 'READY':
        return { emoji: '🍽️', label: 'Ready', status: 'READY' };
      case 'SERVED':
        return { emoji: '✅', label: 'Served', status: 'SERVED' };
      default:
        return null;
    }
  };

  // ─── Loading state ─────────────────────────────────────

  if (loadingOccupancy) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-sm font-bold text-[#6B6B6B]">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading seat map…</span>
      </div>
    );
  }

  // ─── Render a single seat ──────────────────────────────

  const renderSeat = (seat: SeatDefinition) => {
    const occ = occupancy[seat.seatId];
    const isOccupied = !!occ;
    const isMyself = occ?.occupiedBy === user?.uid;
    const isSelected = selectedSeatId === seat.seatId;
    const isClaiming = claimingSeatId === seat.seatId && claimState === 'claiming';
    const isClaimError = claimingSeatId === seat.seatId && claimState === 'error';
    const eatingBadge = mode === 'view' ? getEatingBadge(seat.seatId) : null;
    const shortCode = getSeatShortCode(seat.seatId);

    let seatClasses =
      'relative min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl border-2 text-[10px] font-black transition-all cursor-pointer select-none ';

    if (isClaimError) {
      seatClasses += 'border-red-500 bg-red-50 text-red-700 animate-shake ';
    } else if (isClaiming) {
      seatClasses += 'border-amber-400 bg-amber-50 text-amber-800 opacity-70 ';
    } else if (isMyself || isSelected) {
      seatClasses +=
        'border-[#FF3B30] bg-[#FF3B30]/10 text-[#FF3B30] shadow-[0_2px_0_#FF3B30] -translate-y-0.5 ring-2 ring-[#FF3B30]/40 ';
    } else if (isOccupied) {
      seatClasses += 'border-[#111111]/30 bg-stone-100 text-[#475569] hover:border-[#111111] ';
    } else {
      seatClasses +=
        'border-stone-200 bg-white text-[#111111] hover:border-[#111111] hover:shadow-[0_2px_0_#111111] hover:-translate-y-0.5 active:translate-y-0 ';
    }

    // Live status pulsing rings
    if (eatingBadge?.status === 'COOKING') {
      seatClasses += 'ring-2 ring-[#F59E0B] ring-offset-2 animate-pulse shadow-[0_0_10px_rgba(245,158,11,0.5)] ';
    } else if (eatingBadge?.status === 'READY') {
      seatClasses += 'ring-2 ring-[#10B981] ring-offset-2 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)] ';
    }

    return (
      <div key={seat.seatId} className="relative">
        <button
          type="button"
          onClick={() => handleSeatClick(seat.seatId)}
          className={seatClasses}
          title={isOccupied ? occ?.occupiedByName || 'Occupied' : seat.label}
          disabled={isClaiming}
          aria-label={`Desk ${shortCode}: ${isOccupied ? occ?.occupiedByName || 'Occupied' : 'Available'}`}
        >
          {isClaiming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isOccupied ? (
            <>
              <UserAvatar
                uid={occ?.occupiedBy || 'unknown'}
                name={occ?.occupiedByName || shortCode}
                size="xs"
                className="w-5 h-5 text-[8px] border"
              />
              <span className="text-[8px] leading-tight mt-0.5 max-w-[38px] truncate font-bold">
                {isMyself ? 'You' : occ?.occupiedByName?.split(' ')[0] || shortCode}
              </span>
            </>
          ) : (
            <span className="text-[10px] font-black text-[#111111]">{shortCode}</span>
          )}

          {/* Eating / Live status badge */}
          {eatingBadge && (
            <span
              className={`absolute -top-1.5 -right-1.5 text-[9px] rounded-full border border-[#111111] w-4.5 h-4.5 flex items-center justify-center shadow-xs ${
                eatingBadge.status === 'COOKING'
                  ? 'bg-[#F59E0B] text-white'
                  : eatingBadge.status === 'READY'
                  ? 'bg-[#10B981] text-white'
                  : 'bg-stone-200 text-stone-800'
              }`}
              title={eatingBadge.label}
            >
              {eatingBadge.emoji}
            </span>
          )}
        </button>

        {/* Popover for occupied seats */}
        {popoverSeatId === seat.seatId && isOccupied && !isMyself && (
          <div
            ref={popoverRef}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white rounded-xl border-2 border-[#111111] shadow-[0_4px_0_#111111] px-3 py-2 min-w-[130px] text-center animate-in fade-in slide-in-from-bottom-1"
          >
            <div className="flex items-center gap-1.5 justify-center mb-1">
              <UserAvatar
                uid={occ?.occupiedBy || 'unknown'}
                name={occ?.occupiedByName || 'Colleague'}
                size="xs"
              />
              <p className="text-xs font-black text-[#111111] truncate">
                {occ?.occupiedByName || 'Colleague'}
              </p>
            </div>
            <p className="text-[10px] text-stone-500 font-bold">{shortCode}</p>
            <button
              onClick={() => setPopoverSeatId(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center hover:bg-stone-200"
              aria-label="Close"
            >
              <X className="w-3 h-3 text-stone-500" />
            </button>
          </div>
        )}
      </div>
    );
  };

  // ─── Render a cubicle zone ─────────────────────────────

  const renderCubicle = (cubicle: CubicleZone) => {
    const seats = getSeatsForZone(cubicle.zoneId);
    const row1 = seats.filter((s) => s.row === 1);
    const row2 = seats.filter((s) => s.row === 2);
    const occupiedCount = seats.filter((s) => occupancy[s.seatId]).length;

    return (
      <div
        key={cubicle.zoneId}
        className="bg-white rounded-2xl border-2 border-[#111111]/15 p-3 space-y-1 shadow-xs hover:border-[#111111]/40 transition-colors"
      >
        {/* Cubicle header */}
        <div className="flex items-center justify-between pb-1.5">
          <span className="text-[11px] font-black uppercase tracking-wider text-[#111111]">
            {cubicle.label}
          </span>
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
            {occupiedCount}/14 occupied
          </span>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-7 gap-1">{row1.map(renderSeat)}</div>

        {/* Glass divider */}
        <div className="flex items-center gap-1.5 py-1">
          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent rounded-full" />
          <span className="text-[8px] font-black text-teal-600 uppercase tracking-widest shrink-0 px-1">
            glass divider
          </span>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-teal-400/50 to-transparent rounded-full" />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-7 gap-1">{row2.map(renderSeat)}</div>
      </div>
    );
  };

  // ─── Render a pod zone ─────────────────────────────────

  const renderPod = (pod: PodZone) => {
    const seats = getSeatsForZone(pod.zoneId);
    const occupiedCount = seats.filter((s) => occupancy[s.seatId]).length;

    return (
      <div
        key={pod.zoneId}
        className="bg-white rounded-2xl border-2 border-teal-200/80 p-2.5 space-y-1.5 shadow-xs"
      >
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-900 truncate">
            {pod.label}
          </span>
          <span className="text-[9px] font-bold text-teal-700">
            {occupiedCount}/{pod.seats}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-1.5">{seats.map(renderSeat)}</div>
      </div>
    );
  };

  // ─── Main layout ───────────────────────────────────────

  const topRow = CUBICLES.slice(0, 3); // Cubicles 1–3
  const bottomRow = CUBICLES.slice(3, 6); // Cubicles 4–6
  const lastCubicle = CUBICLES[6]; // Cubicle 7

  return (
    <div className="space-y-4">
      {/* Map legend */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111]">
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-black">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-2 border-stone-200 bg-white" />
            <span className="text-[#6B6B6B]">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-2 border-[#111111]/30 bg-stone-100" />
            <span className="text-[#6B6B6B]">Occupied</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-2 border-[#FF3B30] bg-[#FF3B30]/20 ring-1 ring-[#FF3B30]/40" />
            <span className="text-[#FF3B30]">Your Desk</span>
          </span>
        </div>

        {mode === 'view' && (
          <div className="flex items-center gap-3 text-[11px] font-black border-t sm:border-t-0 pt-1 sm:pt-0">
            <span className="flex items-center gap-1 text-amber-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B] animate-pulse" />
              <span>Cooking 🔥</span>
            </span>
            <span className="flex items-center gap-1 text-emerald-600">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981] animate-pulse" />
              <span>Ready 🍽️</span>
            </span>
          </div>
        )}
      </div>

      {/* Error toast */}
      {claimError && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-2xl text-xs font-black text-red-800 text-center animate-in fade-in shadow-[0_2px_0_#EF4444]">
          {claimError}
        </div>
      )}

      {/* Mobile Zone Selector Tabs (< 1024px) */}
      <div className="lg:hidden">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x touch-pan-x">
          <button
            type="button"
            onClick={() => setActiveMobileTab('all')}
            className={`min-h-[44px] px-4 py-2 rounded-xl text-xs font-black whitespace-nowrap border-2 transition-all shrink-0 ${
              activeMobileTab === 'all'
                ? 'bg-[#111111] text-white border-[#111111] shadow-[0_2px_0_#FF3B30]'
                : 'bg-white text-[#111111] border-[#111111]/30 hover:border-[#111111]'
            }`}
          >
            All Zones Overview
          </button>
          {CUBICLES.map((c) => (
            <button
              key={c.zoneId}
              type="button"
              onClick={() => setActiveMobileTab(c.zoneId)}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap border-2 transition-all shrink-0 ${
                activeMobileTab === c.zoneId
                  ? 'bg-[#FF3B30] text-white border-[#111111] shadow-[0_2px_0_#111111]'
                  : 'bg-white text-[#111111] border-[#111111]/30 hover:border-[#111111]'
              }`}
            >
              {c.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setActiveMobileTab('pods')}
            className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-black whitespace-nowrap border-2 transition-all shrink-0 ${
              activeMobileTab === 'pods'
                ? 'bg-teal-700 text-white border-[#111111] shadow-[0_2px_0_#111111]'
                : 'bg-teal-50 text-teal-900 border-teal-300 hover:border-teal-500'
            }`}
          >
            PM / Manager Pods
          </button>
        </div>
      </div>

      {/* Mobile View: Render either selected tab or all zones */}
      <div className="lg:hidden space-y-3">
        {activeMobileTab === 'all' ? (
          <>
            <div className="space-y-3">{CUBICLES.map(renderCubicle)}</div>
            <div className="bg-teal-50/60 rounded-2xl border-2 border-teal-200 p-3 space-y-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-800 block text-center">
                Managers & PMs
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{PODS.map(renderPod)}</div>
            </div>
          </>
        ) : activeMobileTab === 'pods' ? (
          <div className="bg-teal-50/60 rounded-2xl border-2 border-teal-200 p-4 space-y-3">
            <span className="text-xs font-black uppercase tracking-wider text-teal-900 block text-center">
              Managers & PM Pods (4 pods, 14 seats)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{PODS.map(renderPod)}</div>
          </div>
        ) : (
          (() => {
            const cubicle = CUBICLES.find((c) => c.zoneId === activeMobileTab);
            return cubicle ? (
              <div className="p-1">{renderCubicle(cubicle)}</div>
            ) : null;
          })()
        )}
      </div>

      {/* Desktop Floor Plan (>= 1024px): Wide side-by-side grid */}
      <div className="hidden lg:flex gap-4 items-start">
        {/* Left Side: Cubicles 1–7 */}
        <div className="flex-1 space-y-3">
          {/* Top cubicle row (1–3) */}
          <div className="grid grid-cols-3 gap-3">{topRow.map(renderCubicle)}</div>

          {/* Walking path 1 */}
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="flex-1 border-t-2 border-dashed border-stone-300" />
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap bg-[#FFF8F2] px-2 py-0.5 rounded-full border border-stone-200">
              🚶 MAIN AISLE / WALKING PATH
            </span>
            <div className="flex-1 border-t-2 border-dashed border-stone-300" />
          </div>

          {/* Bottom cubicle row (4–6) */}
          <div className="grid grid-cols-3 gap-3">{bottomRow.map(renderCubicle)}</div>

          {/* Walking path 2 */}
          <div className="flex items-center gap-3 px-3 py-1">
            <div className="flex-1 border-t-2 border-dashed border-stone-300" />
            <span className="text-[9px] font-black text-stone-400 uppercase tracking-widest whitespace-nowrap bg-[#FFF8F2] px-2 py-0.5 rounded-full border border-stone-200">
              🚶 SECONDARY AISLE
            </span>
            <div className="flex-1 border-t-2 border-dashed border-stone-300" />
          </div>

          {/* Cubicle 7 (standalone) */}
          <div className="grid grid-cols-3 gap-3">
            {renderCubicle(lastCubicle)}
            <div className="col-span-2 rounded-2xl border-2 border-dashed border-stone-200 p-4 flex items-center justify-center text-stone-400 text-xs font-bold bg-white/40">
              Pantry Entrance & Waiting Area ☕
            </div>
          </div>
        </div>

        {/* Right Side: Pods (Managers & PMs) */}
        <div className="w-[200px] shrink-0 sticky top-20">
          <div className="bg-teal-50/70 rounded-2xl border-2 border-teal-300/80 p-3 space-y-2.5 shadow-[0_2px_0_#0D9488]">
            <div className="text-center pb-1 border-b border-teal-200">
              <span className="text-[10px] font-black uppercase tracking-wider text-teal-900 block">
                Managers & PMs
              </span>
              <span className="text-[9px] font-bold text-teal-700">4 Pods (14 Desks)</span>
            </div>
            <div className="space-y-2">{PODS.map(renderPod)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
