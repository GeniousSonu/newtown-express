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
import { MapPin, User, Loader2, X, Utensils, Flame } from 'lucide-react';

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
  const [loadingOccupancy, setLoadingOccupancy] = useState(true);

  // In-flight orders for "eating now" badges (view mode only)
  const [eatingEmployees, setEatingEmployees] = useState<
    Record<string, { status: string; employeeId: string }>
  >({});

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
      setLoadingOccupancy(false);
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
          // Track by employeeId — latest order wins
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

  const getEatingBadge = (seatId: string): { emoji: string; label: string } | null => {
    const occ = occupancy[seatId];
    if (!occ?.occupiedBy) return null;
    const eating = eatingEmployees[occ.occupiedBy];
    if (!eating) return null;

    switch (eating.status) {
      case 'ACCEPTED':
      case 'COOKING':
        return { emoji: '🔥', label: 'Cooking' };
      case 'READY':
        return { emoji: '🍽️', label: 'Ready' };
      case 'SERVED':
        return { emoji: '✅', label: 'Served' };
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

    let seatClasses = 'relative min-h-[44px] min-w-[44px] flex flex-col items-center justify-center rounded-xl border-2 text-[10px] font-black transition-all cursor-pointer ';

    if (isClaimError) {
      seatClasses += 'border-red-500 bg-red-50 text-red-700 animate-shake ';
    } else if (isClaiming) {
      seatClasses += 'border-amber-400 bg-amber-50 text-amber-800 opacity-70 ';
    } else if (isMyself || isSelected) {
      seatClasses += 'border-[#FF3B30] bg-[#FF3B30]/10 text-[#FF3B30] shadow-[0_2px_0_#FF3B30] -translate-y-0.5 ring-2 ring-[#FF3B30]/30 ';
    } else if (isOccupied) {
      seatClasses += 'border-[#111111]/40 bg-stone-100 text-[#475569] ';
    } else {
      seatClasses += 'border-stone-200 bg-white text-[#111111] hover:border-[#111111] hover:shadow-[0_2px_0_#111111] hover:-translate-y-0.5 active:translate-y-0 ';
    }

    return (
      <div key={seat.seatId} className="relative">
        <button
          type="button"
          onClick={() => handleSeatClick(seat.seatId)}
          className={seatClasses}
          title={isOccupied ? (occ?.occupiedByName || 'Occupied') : seat.label}
          disabled={isClaiming}
        >
          {isClaiming ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : isOccupied ? (
            <>
              {occ?.occupiedByPhotoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={occ.occupiedByPhotoURL}
                  alt=""
                  className="w-6 h-6 rounded-lg object-cover border border-stone-200"
                />
              ) : (
                <div className="w-6 h-6 rounded-lg bg-stone-300 flex items-center justify-center text-[8px] font-black text-white">
                  {(occ?.occupiedByName?.[0] || '?').toUpperCase()}
                </div>
              )}
              <span className="text-[8px] leading-tight mt-0.5 max-w-[40px] truncate">
                {isMyself ? 'You' : (occ?.occupiedByName?.split(' ')[0] || shortCode)}
              </span>
            </>
          ) : (
            <span className="text-[9px]">{shortCode}</span>
          )}

          {/* Eating badge */}
          {eatingBadge && (
            <span
              className="absolute -top-1.5 -right-1.5 text-[10px] bg-white rounded-full border border-stone-200 w-5 h-5 flex items-center justify-center shadow-xs"
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
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 bg-white rounded-xl border-2 border-[#111111] shadow-[0_4px_0_#111111] px-3 py-2 min-w-[120px] text-center animate-in fade-in slide-in-from-bottom-1"
          >
            <p className="text-xs font-black text-[#111111] truncate">
              {occ?.occupiedByName || 'Someone'}
            </p>
            <button
              onClick={() => setPopoverSeatId(null)}
              className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-stone-100 border border-stone-300 flex items-center justify-center"
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
      <div key={cubicle.zoneId} className="bg-white rounded-2xl border-2 border-[#111111]/15 p-3 space-y-1">
        {/* Cubicle header */}
        <div className="flex items-center justify-between pb-1.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B]">
            {cubicle.label}
          </span>
          <span className="text-[9px] font-bold text-[#6B6B6B]">
            {occupiedCount}/14
          </span>
        </div>

        {/* Row 1 */}
        <div className="grid grid-cols-7 gap-1">
          {row1.map(renderSeat)}
        </div>

        {/* Glass divider */}
        <div className="flex items-center gap-1.5 py-0.5">
          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-teal-300/50 to-transparent rounded-full" />
          <span className="text-[7px] font-bold text-teal-400/70 uppercase tracking-widest shrink-0">glass</span>
          <div className="flex-1 h-[2px] bg-gradient-to-r from-transparent via-teal-300/50 to-transparent rounded-full" />
        </div>

        {/* Row 2 */}
        <div className="grid grid-cols-7 gap-1">
          {row2.map(renderSeat)}
        </div>
      </div>
    );
  };

  // ─── Render a pod zone ─────────────────────────────────

  const renderPod = (pod: PodZone) => {
    const seats = getSeatsForZone(pod.zoneId);
    const occupiedCount = seats.filter((s) => occupancy[s.seatId]).length;

    return (
      <div key={pod.zoneId} className="bg-white rounded-2xl border-2 border-[#111111]/15 p-2.5 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[9px] font-black uppercase tracking-wider text-[#6B6B6B] truncate">
            {pod.label}
          </span>
          <span className="text-[8px] font-bold text-[#6B6B6B]">
            {occupiedCount}/{pod.seats}
          </span>
        </div>
        <div className={`grid gap-1 ${pod.seats <= 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
          {seats.map(renderSeat)}
        </div>
      </div>
    );
  };

  // ─── Main layout ───────────────────────────────────────

  const topRow = CUBICLES.slice(0, 3);     // Cubicles 1–3
  const bottomRow = CUBICLES.slice(3, 6);  // Cubicles 4–6
  const lastCubicle = CUBICLES[6];         // Cubicle 7

  return (
    <div className="space-y-3">
      {/* Map legend */}
      <div className="flex flex-wrap items-center gap-3 text-[10px] font-black px-1">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-stone-200 bg-white" />
          <span className="text-[#6B6B6B]">Empty</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-[#111111]/40 bg-stone-100" />
          <span className="text-[#6B6B6B]">Occupied</span>
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded border-2 border-[#FF3B30] bg-[#FF3B30]/10 ring-1 ring-[#FF3B30]/30" />
          <span className="text-[#FF3B30]">Your Desk</span>
        </span>
        {mode === 'view' && (
          <>
            <span className="flex items-center gap-1">
              <span>🔥</span>
              <span className="text-[#6B6B6B]">Cooking</span>
            </span>
            <span className="flex items-center gap-1">
              <span>🍽️</span>
              <span className="text-[#6B6B6B]">Ready</span>
            </span>
          </>
        )}
      </div>

      {/* Error toast */}
      {claimError && (
        <div className="p-2.5 bg-red-50 border-2 border-red-400 rounded-xl text-xs font-black text-red-800 text-center animate-in fade-in">
          {claimError}
        </div>
      )}

      {/* Floor plan */}
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Left: Cubicles */}
        <div className="flex-1 space-y-3">
          {/* Top cubicle row (1–3) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {topRow.map(renderCubicle)}
          </div>

          {/* Walking path */}
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 border-t-2 border-dashed border-stone-300/60" />
            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
              ← walking path →
            </span>
            <div className="flex-1 border-t-2 border-dashed border-stone-300/60" />
          </div>

          {/* Bottom cubicle row (4–6) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {bottomRow.map(renderCubicle)}
          </div>

          {/* Walking path */}
          <div className="flex items-center gap-2 px-2">
            <div className="flex-1 border-t-2 border-dashed border-stone-300/60" />
            <span className="text-[8px] font-bold text-stone-400 uppercase tracking-widest whitespace-nowrap">
              ← walking path →
            </span>
            <div className="flex-1 border-t-2 border-dashed border-stone-300/60" />
          </div>

          {/* Cubicle 7 (standalone) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {renderCubicle(lastCubicle)}
          </div>
        </div>

        {/* Right: Pods */}
        <div className="lg:w-[180px] shrink-0">
          <div className="bg-teal-50/50 rounded-2xl border-2 border-teal-200/50 p-2.5 space-y-2">
            <div className="text-center">
              <span className="text-[9px] font-black uppercase tracking-wider text-teal-700">
                Managers & PMs
              </span>
            </div>
            {PODS.map(renderPod)}
          </div>
        </div>
      </div>
    </div>
  );
}
