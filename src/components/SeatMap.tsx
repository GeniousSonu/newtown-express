'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { useAuth } from '@/context/AuthContext';
import {
  TransformWrapper,
  TransformComponent,
  useControls,
} from 'react-zoom-pan-pinch';
import { DESK_COORDINATES, DeskCoordinate } from '@/lib/deskCoordinates';
import { getSeatShortCode } from '@/lib/seatLayout';
import type { SeatOccupancy, Order } from '@/types';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
  Check,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

// ─── Component Props ──────────────────────────────────────

interface SeatMapProps {
  mode: 'select' | 'status' | 'pick' | 'view'; // Supports both names: select/pick, status/view
  selectedSeatId?: string | null;
  onSeatClaimed?: (seatId: string) => void;
  /** Admin status mode: fires when any desk is tapped */
  onSeatTapped?: (seatId: string, occupancy: SeatOccupancy | null) => void;
}

// ─── Map Navigation Toolbar ───────────────────────────────

function MapToolbar() {
  const { zoomIn, zoomOut, resetTransform, setTransform } = useControls();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-white/95 backdrop-blur-md rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111]">
      {/* Zone Quick-Jump Navigation */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        <span className="text-[10px] font-black uppercase tracking-wider text-[#6B6B6B] px-1 hidden sm:inline">
          Jump:
        </span>
        <button
          type="button"
          onClick={() => resetTransform(300)}
          className="min-h-[36px] px-2.5 py-1 text-xs font-black rounded-xl border border-[#111111]/30 bg-stone-50 hover:bg-[#111111] hover:text-white transition-all shrink-0"
        >
          All (Fit)
        </button>
        <button
          type="button"
          onClick={() => setTransform(-350, -40, 1.8, 300)}
          className="min-h-[36px] px-2.5 py-1 text-xs font-black rounded-xl border border-[#111111]/30 bg-stone-50 hover:bg-[#111111] hover:text-white transition-all shrink-0"
        >
          Cabins (MD/MGR)
        </button>
        <button
          type="button"
          onClick={() => setTransform(-40, -40, 2.0, 300)}
          className="min-h-[36px] px-2.5 py-1 text-xs font-black rounded-xl border border-[#111111]/30 bg-stone-50 hover:bg-[#111111] hover:text-white transition-all shrink-0"
        >
          Top Desks (206-219)
        </button>
        <button
          type="button"
          onClick={() => setTransform(-160, -420, 1.6, 300)}
          className="min-h-[36px] px-2.5 py-1 text-xs font-black rounded-xl border border-[#111111]/30 bg-stone-50 hover:bg-[#111111] hover:text-white transition-all shrink-0"
        >
          Bottom Desks (101-205)
        </button>
      </div>

      {/* Zoom / Reset Controls */}
      <div className="flex items-center gap-1 ml-auto shrink-0">
        <button
          type="button"
          onClick={() => zoomIn()}
          aria-label="Zoom In"
          title="Zoom In"
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl border border-[#111111]/30 bg-white hover:bg-stone-100 active:translate-y-0.5 flex items-center justify-center transition-all"
        >
          <ZoomIn className="w-4 h-4 stroke-[2.5] text-[#111111]" />
        </button>
        <button
          type="button"
          onClick={() => zoomOut()}
          aria-label="Zoom Out"
          title="Zoom Out"
          className="min-w-[36px] min-h-[36px] p-2 rounded-xl border border-[#111111]/30 bg-white hover:bg-stone-100 active:translate-y-0.5 flex items-center justify-center transition-all"
        >
          <ZoomOut className="w-4 h-4 stroke-[2.5] text-[#111111]" />
        </button>
        <button
          type="button"
          onClick={() => resetTransform(300)}
          aria-label="Reset View / Fit to Screen"
          title="Reset View / Fit to Screen"
          className="min-h-[36px] px-3 rounded-xl border-2 border-[#111111] bg-[#FFD166] text-[#111111] text-xs font-black hover:bg-[#f6c244] active:translate-y-0.5 flex items-center gap-1.5 transition-all shadow-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}

// ─── Main SeatMap Component ───────────────────────────────

export function SeatMap({
  mode: inputMode,
  selectedSeatId,
  onSeatClaimed,
  onSeatTapped,
}: SeatMapProps) {
  const { user, updateSeatCode } = useAuth();

  // Normalize mode to either 'select' or 'status'
  const isSelectMode = inputMode === 'select' || inputMode === 'pick';

  // Live occupancy from Firestore `seats` collection
  const [occupancy, setOccupancy] = useState<Record<string, SeatOccupancy>>({});
  const [loadingOccupancy, setLoadingOccupancy] = useState(Boolean(db));

  // In-flight active orders for status view
  const [activeOrdersByDesk, setActiveOrdersByDesk] = useState<
    Record<string, { status: string; orderId: string; employeeName: string }>
  >({});

  // Claim state in select mode
  const [claimingSeatId, setClaimingSeatId] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [claimSuccess, setClaimSuccess] = useState<string | null>(null);

  // 1. Listen to live seat occupancy
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
        console.warn('[SEAT-MAP] Occupancy listener warning:', err);
        setLoadingOccupancy(false);
      }
    );

    return () => unsub();
  }, []);

  // 2. Listen to active orders in status mode
  useEffect(() => {
    if (isSelectMode || !db) return;

    const ordersQuery = query(
      collection(db, 'orders'),
      where('status', 'in', ['PLACED', 'PAYMENT_VERIFYING', 'ACCEPTED', 'COOKING', 'READY', 'SERVED'])
    );

    const unsub = onSnapshot(
      ordersQuery,
      (snap) => {
        const deskMap: Record<
          string,
          { status: string; orderId: string; employeeName: string }
        > = {};

        snap.forEach((doc) => {
          const d = doc.data() as Order;
          if (d.seatCode) {
            deskMap[d.seatCode] = {
              status: d.status,
              orderId: doc.id,
              employeeName: d.employeeName || 'Colleague',
            };
          }
        });

        setActiveOrdersByDesk(deskMap);
      },
      (err) => {
        console.warn('[SEAT-MAP] Orders listener warning:', err);
      }
    );

    return () => unsub();
  }, [isSelectMode]);

  // 3. Claim desk via transactional server route & auth context
  const handleClaimSeat = useCallback(
    async (seatId: string) => {
      if (claimingSeatId) return;
      if (!user) return;

      setClaimingSeatId(seatId);
      setClaimError(null);
      setClaimSuccess(null);

      try {
        await updateSeatCode(seatId);
        setClaimSuccess(`Desk ${seatId} claimed successfully!`);
        setTimeout(() => setClaimSuccess(null), 3000);
        onSeatClaimed?.(seatId);
      } catch (err: unknown) {
        console.error('[SEAT-MAP] Claim error:', err);
        const msg = (err as Error).message || 'Failed to claim desk.';
        if (msg.includes('just taken') || msg.includes('SEAT_TAKEN')) {
          setClaimError('This desk was just taken — pick another');
        } else {
          setClaimError(msg);
        }
        setTimeout(() => setClaimError(null), 3500);
      } finally {
        setClaimingSeatId(null);
      }
    },
    [claimingSeatId, user, updateSeatCode, onSeatClaimed]
  );

  // 4. Desk click handler
  const handleDeskClick = useCallback(
    (deskId: string) => {
      const occ = occupancy[deskId] || null;
      const isOccupied = Boolean(occ?.occupiedBy);
      const isMyself = occ?.occupiedBy === user?.uid;

      if (!isSelectMode) {
        // Status mode: opens order/seat detail
        onSeatTapped?.(deskId, occ);
        return;
      }

      // Select mode:
      if (isOccupied && !isMyself) {
        // Desk privacy: Occupied desks are non-interactive in select mode
        return;
      }

      if (isMyself) {
        // Already my desk - inform the user they can move anytime
        setClaimSuccess(`This is your current desk (${deskId}). Tap another available desk to move.`);
        setTimeout(() => setClaimSuccess(null), 3000);
        return;
      }

      // Empty desk -> claim transactionally
      handleClaimSeat(deskId);
    },
    [isSelectMode, occupancy, user?.uid, onSeatTapped, handleClaimSeat]
  );

  // Memoized desk list
  const deskList = useMemo(() => DESK_COORDINATES, []);

  const contentGroupRef = React.useRef<SVGGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState('10 15 1220 1325');
  const [containerAspectRatio, setContainerAspectRatio] = useState('1220 / 1325');
  const [computedInitialScale, setComputedInitialScale] = useState(1.0);
  const [measured, setMeasured] = useState(false);

  useEffect(() => {
    if (contentGroupRef.current) {
      try {
        const bbox = contentGroupRef.current.getBBox();
        const padding = 20;
        const x = Math.floor(bbox.x - padding);
        const y = Math.floor(bbox.y - padding);
        const w = Math.ceil(bbox.width + padding * 2);
        const h = Math.ceil(bbox.height + padding * 2);
        if (w > 100 && h > 100) {
          setViewBox(`${x} ${y} ${w} ${h}`);
          setContainerAspectRatio(`${w} / ${h}`);

          if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const cW = rect.width || 360;
            const cH = rect.height || 480;
            const fitScale = Math.min(cW / w, cH / h);
            setComputedInitialScale(Math.max(0.6, Math.min(fitScale * 0.98, 2.5)));
          }
          setMeasured(true);
        }
      } catch (err) {
        console.warn('[SEATMAP] getBBox measure notice:', err);
      }
    }
  }, []);

  return (
    <div className="w-full flex flex-col space-y-3">
      {/* Dynamic Status / Collision Alerts */}
      {claimError && (
        <div className="p-3 bg-red-50 border-2 border-red-500 rounded-2xl text-xs font-black text-red-900 flex items-center justify-center gap-2 animate-in fade-in shadow-[0_2px_0_#EF4444]">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{claimError}</span>
        </div>
      )}

      {claimSuccess && (
        <div className="p-3 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-xs font-black text-emerald-900 flex items-center justify-center gap-2 animate-in fade-in shadow-[0_2px_0_#10B981]">
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{claimSuccess}</span>
        </div>
      )}

      {/* Pan & Zoom Canvas */}
      <div
        ref={containerRef}
        data-no-swipe-back="true"
        style={{ aspectRatio: containerAspectRatio }}
        className="relative w-full max-h-[76vh] min-h-[380px] rounded-3xl border-3 border-[#111111] bg-[#FAFAF9] overflow-hidden shadow-[0_6px_0_#111111]"
      >
        <TransformWrapper
          key={measured ? `measured-${computedInitialScale.toFixed(2)}` : 'initial'}
          initialScale={computedInitialScale}
          minScale={0.4}
          maxScale={4.0}
          centerOnInit
          limitToBounds={false}
          wheel={{ step: 0.1 }}
          pinch={{ step: 5 }}
        >
          {() => (
            <>
              {/* Floating Toolbar */}
              <div className="absolute top-3 left-3 right-3 z-20 pointer-events-auto">
                <MapToolbar />
              </div>

              {/* Loading Overlay */}
              {loadingOccupancy && (
                <div className="absolute inset-0 z-30 bg-white/70 backdrop-blur-xs flex items-center justify-center gap-2 text-sm font-black text-[#111111]">
                  <Loader2 className="w-5 h-5 animate-spin text-[#FF3B30]" />
                  <span>Loading floor plan…</span>
                </div>
              )}

              {/* Full Bleed SVG Canvas */}
              <TransformComponent
                wrapperClass="!w-full !h-full cursor-grab active:cursor-grabbing select-none"
                contentClass="!w-full !h-full flex items-center justify-center"
              >
                <svg
                  viewBox={viewBox}
                  preserveAspectRatio="xMidYMid meet"
                  className="w-full h-full max-w-none max-h-none"
                  xmlns="http://www.w3.org/2000/svg"
                  fontFamily="Arial, sans-serif"
                >
                  <defs>
                    <pattern
                      id="taken-hatch"
                      width="6"
                      height="6"
                      patternTransform="rotate(45 0 0)"
                      patternUnits="userSpaceOnUse"
                    >
                      <line
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="6"
                        stroke="#94a3b8"
                        strokeWidth="1.5"
                      />
                    </pattern>
                  </defs>

                  {/* Canvas Background */}
                  <rect width="100%" height="100%" fill="#ffffff" />

                  {/* Dynamic Measured Content Group */}
                  <g ref={contentGroupRef} id="map-content">
                    {/* Header Title */}
                    <text
                      x="620"
                      y="45"
                      textAnchor="middle"
                      fontSize="28"
                      fontWeight="bold"
                      fill="#0f172a"
                    >
                      OFFICE FLOOR PLAN
                    </text>
                    <text
                      x="620"
                      y="72"
                      textAnchor="middle"
                      fontSize="14"
                      fill="#64748b"
                    >
                      121 Desks • 7 Workstation Pods • Executive Cabins • Central Passage
                    </text>

                    {/* Separator */}
                    <line
                      x1="30"
                      y1="100"
                      x2="1210"
                      y2="100"
                      stroke="#e2e8f0"
                      strokeWidth="2"
                    />

                  {/* ─── Architectural Bounds ───────────────────────── */}

                  {/* Upper Office Boundary */}
                  <rect
                    x="30"
                    y="128"
                    width="700"
                    height="572"
                    fill="#fcfcfc"
                    stroke="#334155"
                    strokeWidth="2"
                    rx="4"
                  />

                  {/* Upper Pod Enclosures */}
                  <rect
                    x="60"
                    y="176"
                    width="168"
                    height="136"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="246"
                    y="176"
                    width="168"
                    height="136"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="432"
                    y="176"
                    width="90"
                    height="136"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="538"
                    y="176"
                    width="168"
                    height="136"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />

                  {/* MD Cabin */}
                  <rect
                    x="760"
                    y="128"
                    width="230"
                    height="572"
                    fill="#fafafa"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    rx="4"
                  />
                  <text
                    x="785"
                    y="414"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#475569"
                    transform="rotate(-90 785 414)"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    MD CABIN
                  </text>
                  {/* Cabin visitor chairs */}
                  <circle cx="820" cy="625" r="10" fill="#e2e8f0" stroke="#94a3b8" />
                  <circle cx="870" cy="625" r="10" fill="#e2e8f0" stroke="#94a3b8" />

                  {/* Senior Manager Cabin */}
                  <rect
                    x="1000"
                    y="128"
                    width="210"
                    height="572"
                    fill="#fafafa"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    rx="4"
                  />
                  <text
                    x="1185"
                    y="414"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#475569"
                    transform="rotate(-90 1185 414)"
                    textAnchor="middle"
                    letterSpacing="1"
                  >
                    SENIOR MANAGER
                  </text>
                  {/* Cabin visitor chairs */}
                  <circle cx="1100" cy="625" r="10" fill="#e2e8f0" stroke="#94a3b8" />
                  <circle cx="1150" cy="625" r="10" fill="#e2e8f0" stroke="#94a3b8" />

                  {/* ─── Central Common Passage ───────────────────────── */}
                  <rect
                    x="30"
                    y="710"
                    width="1180"
                    height="80"
                    fill="#f1f5f9"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <text
                    x="620"
                    y="758"
                    textAnchor="middle"
                    fontSize="18"
                    fontWeight="bold"
                    fill="#475569"
                    letterSpacing="3"
                  >
                    CENTRAL PASSAGE
                  </text>

                  {/* ─── Lower Office Boundary ───────────────────────── */}
                  <rect
                    x="30"
                    y="800"
                    width="1180"
                    height="520"
                    fill="none"
                    stroke="#334155"
                    strokeWidth="2"
                    rx="4"
                  />

                  {/* Stairway Outline */}
                  <rect
                    x="30"
                    y="800"
                    width="180"
                    height="520"
                    fill="#f8fafc"
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                  />
                  <text
                    x="120"
                    y="1060"
                    textAnchor="middle"
                    fontSize="16"
                    fontWeight="bold"
                    fill="#64748b"
                    transform="rotate(-90 120 1060)"
                    letterSpacing="2"
                  >
                    STAIR
                  </text>

                  {/* Bottom Pod Perimeter Boxes */}
                  <rect
                    x="272"
                    y="890"
                    width="156"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="444"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="560"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="676"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="792"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="908"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />
                  <rect
                    x="1024"
                    y="890"
                    width="108"
                    height="316"
                    fill="none"
                    stroke="#cbd5e1"
                    strokeWidth="1.5"
                    rx="4"
                  />



                  {/* ─── DESKS RENDERING (All 121 Desks) ─────────────── */}
                  {deskList.map((desk: DeskCoordinate) => {
                    const occ = occupancy[desk.id];
                    const isOccupied = Boolean(occ?.occupiedBy);
                    const isMyself =
                      occ?.occupiedBy === user?.uid ||
                      selectedSeatId === desk.id ||
                      user?.seatCode === desk.id;
                    const isClaiming = claimingSeatId === desk.id;

                    const activeOrder = activeOrdersByDesk[desk.id];
                    const isCooking =
                      activeOrder?.status === 'ACCEPTED' ||
                      activeOrder?.status === 'COOKING';
                    const isReady = activeOrder?.status === 'READY';
                    const isServed = activeOrder?.status === 'SERVED';

                    // Styling computation
                    let fillColor = '#ffffff';
                    let strokeColor = '#2c3e50';
                    let textColor = '#0f172a';
                    let strokeWidth = 1.2;

                    if (isClaiming) {
                      fillColor = '#fef3c7';
                      strokeColor = '#d97706';
                      textColor = '#92400e';
                    } else if (isMyself) {
                      fillColor = '#fee2e2';
                      strokeColor = '#ef4444';
                      textColor = '#b91c1c';
                      strokeWidth = 2.5;
                    } else if (isOccupied) {
                      if (isSelectMode) {
                        // Privacy in select mode: grayed out hatch, no personal info
                        fillColor = '#f1f5f9';
                        strokeColor = '#94a3b8';
                        textColor = '#94a3b8';
                      } else {
                        // Status view: occupied highlight
                        fillColor = '#e2e8f0';
                        strokeColor = '#475569';
                        textColor = '#1e293b';
                      }
                    } else {
                      // Empty available desk
                      fillColor = '#dbe9f7';
                      strokeColor = '#2c3e50';
                      textColor = '#1a3d6d';
                    }

                    // Pulse highlight in status mode
                    if (!isSelectMode) {
                      if (isCooking) {
                        fillColor = '#fef3c7';
                        strokeColor = '#f59e0b';
                        strokeWidth = 2.5;
                      } else if (isReady) {
                        fillColor = '#dcfce7';
                        strokeColor = '#10b981';
                        strokeWidth = 3;
                      }
                    }

                    const isClickable =
                      !isSelectMode || (!isOccupied && !isMyself) || isMyself;

                    return (
                      <g
                        key={desk.id}
                        id={`desk-${desk.id}`}
                        data-desk={desk.id}
                        onClick={() => handleDeskClick(desk.id)}
                        className={`transition-transform duration-100 ${
                          isClickable
                            ? 'cursor-pointer hover:opacity-90'
                            : 'cursor-not-allowed opacity-60'
                        }`}
                      >
                        {/* Generous Hit Target (≥44×44px hit bounds) */}
                        <rect
                          x={desk.x - 6}
                          y={desk.y - 6}
                          width={desk.w + 12}
                          height={desk.h + 12}
                          fill="transparent"
                          pointerEvents="all"
                        />

                        {/* Visual Desk Rectangle */}
                        <rect
                          x={desk.x}
                          y={desk.y}
                          width={desk.w}
                          height={desk.h}
                          rx={desk.zone === 'cabin' ? 6 : 3}
                          fill={fillColor}
                          stroke={strokeColor}
                          strokeWidth={strokeWidth}
                        />

                        {/* Desk Label */}
                        <text
                          x={desk.textX}
                          y={desk.textY}
                          textAnchor="middle"
                          fontSize={desk.zone === 'cabin' ? 14 : desk.zone === 'top' ? 14 : 12.5}
                          fontWeight="bold"
                          fill={textColor}
                          pointerEvents="none"
                        >
                          {desk.id}
                        </text>

                        {/* Status Mode Occupant Tag or Order Status Indicator */}
                        {!isSelectMode && isOccupied && (
                          <text
                            x={desk.textX}
                            y={desk.textY + 11}
                            textAnchor="middle"
                            fontSize="8"
                            fontWeight="bold"
                            fill="#475569"
                            pointerEvents="none"
                          >
                            {occ?.occupiedByName?.split(' ')[0] || 'Seated'}
                          </text>
                        )}

                        {/* Active Order Badges in Status Mode */}
                        {!isSelectMode && (isCooking || isReady || isServed) && (
                          <g
                            transform={`translate(${desk.x + desk.w - 10}, ${
                              desk.y - 8
                            })`}
                            pointerEvents="none"
                          >
                            <circle
                              cx="8"
                              cy="8"
                              r="10"
                              fill={
                                isCooking
                                  ? '#f59e0b'
                                  : isReady
                                  ? '#10b981'
                                  : '#3b82f6'
                              }
                              stroke="#ffffff"
                              strokeWidth="1.5"
                            />
                            <text
                              x="8"
                              y="11"
                              textAnchor="middle"
                              fontSize="9"
                              fill="#ffffff"
                              fontWeight="bold"
                            >
                              {isCooking ? '🔥' : isReady ? '🍽️' : '✓'}
                            </text>
                          </g>
                        )}

                        {/* My Desk Indicator Ring */}
                        {isMyself && (
                          <circle
                            cx={desk.x + 8}
                            cy={desk.y + 8}
                            r="4"
                            fill="#ef4444"
                          />
                        )}
                      </g>
                    );
                  })}
                  </g>
                </svg>
              </TransformComponent>
            </>
          )}
        </TransformWrapper>
      </div>

      {/* Legend & Instructions Footer */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111]">
        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs font-black">
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-1.5 border-[#2c3e50] bg-[#dbe9f7]" />
            <span className="text-[#64748b]">Available</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-1.5 border-[#94a3b8] bg-[#f1f5f9]" />
            <span className="text-[#64748b]">Taken</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 h-3.5 rounded-md border-2 border-[#ef4444] bg-[#fee2e2]" />
            <span className="text-[#ef4444]">Your Desk</span>
          </span>

          {!isSelectMode && (
            <>
              <span className="flex items-center gap-1 text-amber-800 font-bold">
                <span className="w-2.5 h-2.5 rounded-full bg-[#f59e0b] animate-pulse" />
                <span>Cooking 🔥</span>
              </span>
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10b981] animate-pulse" />
                <span>Ready 🍽️</span>
              </span>
            </>
          )}
        </div>

        {/* Selected Desk Badge */}
        {selectedSeatId && (
          <div className="inline-flex items-center gap-1.5 text-xs font-black text-[#111111] bg-[#FFD166] px-3 py-1 rounded-xl border border-[#111111]">
            <Sparkles className="w-3.5 h-3.5 text-[#111111]" />
            <span>Selected: Desk {getSeatShortCode(selectedSeatId)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
