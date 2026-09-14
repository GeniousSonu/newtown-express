export function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export function getStatusDetails(status: string): {
  label: string;
  emoji: string;
  color: string;
  bgColor: string;
  step: number;
} {
  switch (status) {
    case 'PLACED':
      return { label: 'Order Placed', emoji: '🧾', color: 'text-amber-600', bgColor: 'bg-amber-100', step: 1 };
    case 'PAYMENT_VERIFYING':
      return { label: 'Verifying Payment', emoji: '💳', color: 'text-blue-600', bgColor: 'bg-blue-100', step: 2 };
    case 'PAYMENT_VERIFIED':
      return { label: 'Payment Verified', emoji: '✅', color: 'text-blue-600', bgColor: 'bg-blue-100', step: 2 };
    case 'QUEUED':
      return { label: 'Queued by Kitchen', emoji: '⏳', color: 'text-amber-600', bgColor: 'bg-amber-100', step: 3 };
    case 'ACCEPTED':
      return { label: 'Order Accepted', emoji: '👍', color: 'text-indigo-600', bgColor: 'bg-indigo-100', step: 4 };
    case 'COOKING':
      return { label: 'Cooking in Kitchen', emoji: '🍳', color: 'text-orange-600', bgColor: 'bg-orange-100', step: 5 };
    case 'READY':
      return { label: 'Ready to Serve', emoji: '🍽️', color: 'text-emerald-600', bgColor: 'bg-emerald-100', step: 6 };
    case 'SERVED':
      return { label: 'Served at Desk', emoji: '🛵', color: 'text-green-600', bgColor: 'bg-green-100', step: 7 };
    case 'COMPLETED':
      return { label: 'Plate Collected', emoji: '✨', color: 'text-purple-600', bgColor: 'bg-purple-100', step: 8 };
    case 'REJECTED':
      return { label: 'Order Declined', emoji: '❌', color: 'text-red-600', bgColor: 'bg-red-100', step: 0 };
    case 'CANCELLED':
      return { label: 'Order Cancelled', emoji: '🚫', color: 'text-stone-600', bgColor: 'bg-stone-200', step: 0 };
    default:
      return { label: status, emoji: '⏳', color: 'text-gray-600', bgColor: 'bg-gray-100', step: 1 };
  }
}

/**
 * Converts any Firestore Timestamp, Date, string, or number to a guaranteed valid JavaScript Date.
 * Never returns an 'Invalid Date'.
 */
export function toValidDate(val: unknown): Date {
  if (!val) return new Date();
  if (val instanceof Date) return isNaN(val.getTime()) ? new Date() : val;
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if (typeof obj.toDate === 'function') {
      try {
        const d = (obj.toDate as () => Date)();
        if (d instanceof Date && !isNaN(d.getTime())) return d;
      } catch {}
    }
    if (typeof obj.toMillis === 'function') {
      try {
        const ms = (obj.toMillis as () => number)();
        if (typeof ms === 'number' && !isNaN(ms) && ms > 0) return new Date(ms);
      } catch {}
    }
    if (typeof obj.seconds === 'number' && !isNaN(obj.seconds)) {
      return new Date(obj.seconds * 1000);
    }
    if (typeof obj._seconds === 'number' && !isNaN(obj._seconds)) {
      return new Date(obj._seconds * 1000);
    }
  }
  if (typeof val === 'number') {
    if (isNaN(val) || val <= 0) return new Date();
    // Support both seconds (< 10^10) and milliseconds
    return new Date(val < 10000000000 ? val * 1000 : val);
  }
  if (typeof val === 'string') {
    const num = Number(val);
    if (!isNaN(num) && num > 0) return toValidDate(num);
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

/**
 * Returns epoch milliseconds, guaranteed to be a valid number > 0.
 */
export function toValidMillis(val: unknown): number {
  return toValidDate(val).getTime();
}

import { formatInTimeZone } from 'date-fns-tz';

export const IST_TIMEZONE = 'Asia/Kolkata';

/**
 * Formats a timestamp as a clean 12-hour time string in IST (e.g. "04:35 PM").
 */
export function formatOrderTime(val: unknown): string {
  const date = toValidDate(val);
  return formatInTimeZone(date, IST_TIMEZONE, 'hh:mm a');
}

/**
 * Formats a timestamp as a date string in IST (e.g. "Sep 14").
 */
export function formatOrderDate(val: unknown): string {
  const date = toValidDate(val);
  return formatInTimeZone(date, IST_TIMEZONE, 'MMM d');
}

/**
 * Formats a timestamp as "Sep 14 • 04:35 PM" in IST.
 */
export function formatOrderDateTime(val: unknown): string {
  const date = toValidDate(val);
  return formatInTimeZone(date, IST_TIMEZONE, "MMM d • hh:mm a");
}

/**
 * Formats a timestamp as ISO date "YYYY-MM-DD" in IST.
 */
export function formatOrderISODate(val: unknown): string {
  const date = toValidDate(val);
  return formatInTimeZone(date, IST_TIMEZONE, 'yyyy-MM-dd');
}
