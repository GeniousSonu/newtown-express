import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { OrderStatus } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

import { CANCELLABLE_STATUSES } from '@/lib/orderTransitions';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    const body = await req.json();
    const { orderId, reason } = body as { orderId: string; reason?: string };

    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId.' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const snap = await transaction.get(orderRef);
      if (!snap.exists) {
        throw new Error('Order not found');
      }

      const orderData = snap.data()!;

      // 1. Verify caller is the order's owner (or admin).
      // Return identical 'Order not found' error so non-owners cannot probe if an order ID exists.
      if (orderData.employeeId !== callerUid && decodedToken.role !== 'admin') {
        throw new Error('Order not found');
      }

      const currentStatus = orderData.status as OrderStatus;

      // 2. Check if order is in a cancellable state
      if (!CANCELLABLE_STATUSES.includes(currentStatus)) {
        throw new Error(
          currentStatus === 'CANCELLED'
            ? 'Order is already cancelled.'
            : 'Order has already been accepted by the kitchen and cannot be cancelled.'
        );
      }

      // 3. Perform atomic cancellation
      transaction.update(orderRef, {
        status: 'CANCELLED',
        rejectionReason: reason || 'Cancelled by employee',
        ringingSince: null,
        queuedAt: null,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({
          status: 'CANCELLED',
          timestamp: Date.now(),
          actorUid: callerUid,
        }),
      });

      return { success: true };
    });

    return NextResponse.json({
      success: true,
      orderId,
      status: 'CANCELLED',
    });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to cancel order.';
    const status = message.includes('Forbidden')
      ? 403
      : message.includes('Order not found')
      ? 404
      : message.includes('cannot be cancelled') || message.includes('already cancelled')
      ? 400
      : 500;

    console.error('[CANCEL-ORDER] Error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}
