/**
 * seatLayout.ts — Static office geometry for the Newtown Express seat map.
 *
 * Represents the real physical floor plan:
 *   - 7 employee cubicles, each with 14 desks (2 rows of 7, back-to-back, glass divider)
 *   - 4 manager/PM pods (three with 4 seats, one with 2 seats)
 *   - Total: 112 seats
 *
 * This file is version-controlled and does NOT depend on Firestore.
 * Live occupancy lives in the Firestore `seats/{seatId}` collection.
 */

// ─── Zone Types ──────────────────────────────────────────

export interface CubicleZone {
  type: 'cubicle';
  zoneId: string;       // e.g. "cubicle-1"
  label: string;        // e.g. "Cubicle 1"
  rows: 2;
  seatsPerRow: 7;
}

export interface PodZone {
  type: 'pod';
  zoneId: string;       // e.g. "pod-1"
  label: string;        // e.g. "Managers — Pod 1"
  seats: number;        // 4 or 2
}

export type Zone = CubicleZone | PodZone;

// ─── Seat Definition ─────────────────────────────────────

export interface SeatDefinition {
  seatId: string;       // Deterministic ID, e.g. "cubicle-3-r1-s5" or "pod-2-s3"
  zoneId: string;       // Parent zone
  row?: number;         // 1 or 2 (cubicles only)
  position: number;     // 1-based seat position within the row/pod
  label: string;        // Human-readable, e.g. "Cubicle 3, Row 1, Desk 5"
}

// ─── Static Layout ───────────────────────────────────────

export const CUBICLES: CubicleZone[] = Array.from({ length: 7 }, (_, i) => ({
  type: 'cubicle' as const,
  zoneId: `cubicle-${i + 1}`,
  label: `Cubicle ${i + 1}`,
  rows: 2 as const,
  seatsPerRow: 7 as const,
}));

export const PODS: PodZone[] = [
  { type: 'pod', zoneId: 'pod-1', label: 'Managers — Pod 1', seats: 4 },
  { type: 'pod', zoneId: 'pod-2', label: 'Managers — Pod 2', seats: 4 },
  { type: 'pod', zoneId: 'pod-3', label: 'Managers — Pod 3', seats: 4 },
  { type: 'pod', zoneId: 'pod-4', label: 'PMs — Pod 4', seats: 2 },
];

export const ALL_ZONES: Zone[] = [...CUBICLES, ...PODS];

// ─── Seat Generation ─────────────────────────────────────

function generateCubicleSeats(cubicle: CubicleZone): SeatDefinition[] {
  const seats: SeatDefinition[] = [];
  for (let row = 1; row <= cubicle.rows; row++) {
    for (let pos = 1; pos <= cubicle.seatsPerRow; pos++) {
      seats.push({
        seatId: `${cubicle.zoneId}-r${row}-s${pos}`,
        zoneId: cubicle.zoneId,
        row,
        position: pos,
        label: `${cubicle.label}, Row ${row}, Desk ${pos}`,
      });
    }
  }
  return seats;
}

function generatePodSeats(pod: PodZone): SeatDefinition[] {
  return Array.from({ length: pod.seats }, (_, i) => ({
    seatId: `${pod.zoneId}-s${i + 1}`,
    zoneId: pod.zoneId,
    position: i + 1,
    label: `${pod.label}, Seat ${i + 1}`,
  }));
}

// ─── Public API ──────────────────────────────────────────

let _allSeatsCache: SeatDefinition[] | null = null;

/** Returns a flat list of all 112 seat definitions. Cached after first call. */
export function getAllSeats(): SeatDefinition[] {
  if (_allSeatsCache) return _allSeatsCache;

  const seats: SeatDefinition[] = [];
  for (const cubicle of CUBICLES) {
    seats.push(...generateCubicleSeats(cubicle));
  }
  for (const pod of PODS) {
    seats.push(...generatePodSeats(pod));
  }

  _allSeatsCache = seats;
  return seats;
}

let _seatIdSetCache: Set<string> | null = null;

/** Check if a seat ID is valid (exists in the layout). */
export function isValidSeatId(seatId: string): boolean {
  if (!_seatIdSetCache) {
    _seatIdSetCache = new Set(getAllSeats().map((s) => s.seatId));
  }
  return _seatIdSetCache.has(seatId);
}

/** Get a human-readable label for a seat ID. Returns the ID itself if not found. */
export function getSeatLabel(seatId: string): string {
  const seat = getAllSeats().find((s) => s.seatId === seatId);
  return seat?.label ?? seatId;
}

/** Look up which zone a seat belongs to. */
export function getZoneForSeat(seatId: string): Zone | undefined {
  const seat = getAllSeats().find((s) => s.seatId === seatId);
  if (!seat) return undefined;
  return ALL_ZONES.find((z) => z.zoneId === seat.zoneId);
}

/** Get all seats belonging to a specific zone. */
export function getSeatsForZone(zoneId: string): SeatDefinition[] {
  return getAllSeats().filter((s) => s.zoneId === zoneId);
}

/** Get a short display code for a seat ID (for compact UI). */
export function getSeatShortCode(seatId: string): string {
  // cubicle-3-r1-s5 → C3-1.5
  const cubicleMatch = seatId.match(/^cubicle-(\d+)-r(\d+)-s(\d+)$/);
  if (cubicleMatch) {
    return `C${cubicleMatch[1]}-${cubicleMatch[2]}.${cubicleMatch[3]}`;
  }
  // pod-2-s3 → P2-3
  const podMatch = seatId.match(/^pod-(\d+)-s(\d+)$/);
  if (podMatch) {
    return `P${podMatch[1]}-${podMatch[2]}`;
  }
  return seatId;
}

/** Total seat count. */
export const TOTAL_SEATS = 7 * 14 + (4 + 4 + 4 + 2); // 98 + 14 = 112
