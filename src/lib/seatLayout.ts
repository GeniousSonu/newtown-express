/**
 * seatLayout.ts — Real office geometry for Newtown Express floor plan.
 *
 * Physical layout (121 total desks):
 *   - 14 desks in top workstations: 206 through 219
 *   - 105 desks in bottom workstations: 101 through 205
 *   - 2 executive cabins: MD Cabin ("MD") and Senior Manager Cabin ("MGR")
 *
 * This file is version-controlled and provides static definitions.
 * Live occupancy lives in Firestore `seats/{seatId}` collection.
 */

export type SeatZoneId = 'top' | 'bottom' | 'cabin';

export interface SeatZone {
  zoneId: SeatZoneId;
  label: string;
  description: string;
}

export interface SeatDefinition {
  seatId: string; // "101" .. "219", "MD", "MGR"
  zoneId: SeatZoneId;
  label: string;
  shortCode: string;
}

export const SEAT_ZONES: SeatZone[] = [
  {
    zoneId: 'bottom',
    label: 'Bottom Workstations',
    description: 'Desks 101 – 205 (7 workstation pods)',
  },
  {
    zoneId: 'top',
    label: 'Top Workstations',
    description: 'Desks 206 – 219 (Upper pods)',
  },
  {
    zoneId: 'cabin',
    label: 'Executive Cabins',
    description: 'MD Cabin & Senior Manager Cabin',
  },
];

// Generate all 121 seats
function buildAllSeats(): SeatDefinition[] {
  const seats: SeatDefinition[] = [];

  // 1. Bottom Workstations: 101 to 205
  for (let num = 101; num <= 205; num++) {
    const id = num.toString();
    seats.push({
      seatId: id,
      zoneId: 'bottom',
      label: `Desk ${id}`,
      shortCode: id,
    });
  }

  // 2. Top Workstations: 206 to 219
  for (let num = 206; num <= 219; num++) {
    const id = num.toString();
    seats.push({
      seatId: id,
      zoneId: 'top',
      label: `Desk ${id}`,
      shortCode: id,
    });
  }

  // 3. Cabins: MD and Senior Manager
  seats.push(
    {
      seatId: 'MD',
      zoneId: 'cabin',
      label: 'MD Cabin Desk',
      shortCode: 'MD',
    },
    {
      seatId: 'MGR',
      zoneId: 'cabin',
      label: 'Senior Manager Desk',
      shortCode: 'MGR',
    }
  );

  return seats;
}

const ALL_SEATS: SeatDefinition[] = buildAllSeats();
const SEAT_ID_SET = new Set(ALL_SEATS.map((s) => s.seatId));
const SEAT_MAP = new Map(ALL_SEATS.map((s) => [s.seatId, s]));

/** Returns a list of all 121 seat definitions. */
export function getAllSeats(): SeatDefinition[] {
  return ALL_SEATS;
}

/** Check if a seat ID is valid against the 121 real desks. */
export function isValidSeatId(seatId: string): boolean {
  if (!seatId || typeof seatId !== 'string') return false;
  return SEAT_ID_SET.has(seatId.trim());
}

/** Get a human-readable label for a seat ID. */
export function getSeatLabel(seatId: string): string {
  const seat = SEAT_MAP.get(seatId?.trim());
  return seat?.label ?? (seatId ? `Desk ${seatId}` : 'Unassigned Desk');
}

/** Get a short display code for a seat ID (e.g. "101", "MD", "MGR"). */
export function getSeatShortCode(seatId: string): string {
  if (!seatId) return '—';
  const clean = seatId.trim();
  const seat = SEAT_MAP.get(clean);
  if (seat) return seat.shortCode;

  // Gracefully handle legacy format display if needed
  const cubicleMatch = clean.match(/^cubicle-(\d+)-r(\d+)-s(\d+)$/);
  if (cubicleMatch) {
    return `C${cubicleMatch[1]}-${cubicleMatch[2]}.${cubicleMatch[3]}`;
  }
  const podMatch = clean.match(/^pod-(\d+)-s(\d+)$/);
  if (podMatch) {
    return `P${podMatch[1]}-${podMatch[2]}`;
  }

  return clean;
}

/** Total real seats in the office floor plan. */
export const TOTAL_SEATS = ALL_SEATS.length; // 121
