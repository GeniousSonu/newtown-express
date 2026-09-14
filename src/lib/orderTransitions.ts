import { OrderStatus } from '@/types';

/**
 * Single source of truth for cancellable order states.
 * Employees can only cancel their order BEFORE the kitchen accepts it and starts cooking.
 */
export const CANCELLABLE_STATUSES: readonly OrderStatus[] = [
  'PLACED',
  'PAYMENT_VERIFYING',
  'PAYMENT_VERIFIED',
  'QUEUED',
] as const;

/**
 * Authoritative state machine mapping every allowed transition.
 * Transitions not in this map are strictly rejected with 400.
 */
export const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  // Initial unacknowledged states: can move to payment verification, acceptance, queue hold, rejection, or employee cancellation
  PLACED: ['PAYMENT_VERIFYING', 'ACCEPTED', 'QUEUED', 'REJECTED', 'CANCELLED'],
  PAYMENT_VERIFYING: ['PAYMENT_VERIFIED', 'ACCEPTED', 'QUEUED', 'REJECTED', 'CANCELLED'],
  PAYMENT_VERIFIED: ['ACCEPTED', 'QUEUED', 'REJECTED', 'CANCELLED'],

  // Queue hold: kitchen holds order for up to 3 mins before ringing re-escalates
  QUEUED: ['ACCEPTED', 'REJECTED', 'CANCELLED'],

  // In kitchen preparation: cancellation is strictly forbidden once accepted
  ACCEPTED: ['COOKING', 'READY'],
  COOKING: ['READY'],

  // Ready for desk delivery
  READY: ['SERVED', 'COMPLETED'],

  // Served / Completed: Served is the final step of the fulfillment process (can return to READY for re-delivery)
  SERVED: ['SERVED', 'READY', 'COMPLETED'],
  COMPLETED: ['SERVED', 'READY'],

  // Terminal aborted states
  REJECTED: [],
  CANCELLED: [],
};

/**
 * Validates if transition from current to target is allowed.
 * Identical status is allowed (idempotent no-op).
 */
export function canTransition(current: OrderStatus, target: OrderStatus): boolean {
  if (current === target) return true;
  const allowed = ALLOWED_TRANSITIONS[current] || [];
  return allowed.includes(target);
}

/**
 * Checks whether an order is in a state where the customer can cancel it.
 */
export function isCancellable(status: OrderStatus): boolean {
  return CANCELLABLE_STATUSES.includes(status);
}
