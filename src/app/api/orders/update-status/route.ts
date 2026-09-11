import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { OrderStatus } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';

export const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PLACED: ['PAYMENT_VERIFYING', 'REJECTED'],
  PAYMENT_VERIFYING: ['PAYMENT_VERIFIED', 'QUEUED', 'ACCEPTED', 'REJECTED'],
  PAYMENT_VERIFIED: ['QUEUED', 'ACCEPTED', 'REJECTED'],
  QUEUED: ['ACCEPTED', 'REJECTED'],
  ACCEPTED: ['COOKING', 'REJECTED'],
  COOKING: ['READY', 'REJECTED'],
  READY: ['SERVED'],
  SERVED: ['COMPLETED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

// Basic in-memory rate limiting against repeated rapid calls for the same orderId
const recentOrderUpdates = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    if (decodedToken.role !== 'admin') {
      return NextResponse.json(
        { error: 'Forbidden: Kitchen Admin role required.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId, status, rejectionReason } = body as {
      orderId: string;
      status: OrderStatus;
      rejectionReason?: string;
    };

    if (!orderId || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and status are required.' },
        { status: 400 }
      );
    }

    // Rate limiting: block rapid calls for the same orderId within 800ms
    const now = Date.now();
    const lastUpdate = recentOrderUpdates.get(orderId) || 0;
    if (now - lastUpdate < 800) {
      return NextResponse.json(
        { error: 'Too many requests. Please wait a moment.' },
        { status: 429 }
      );
    }
    recentOrderUpdates.set(orderId, now);

    const adminDb = getAdminDb();
    const orderRef = adminDb.collection('orders').doc(orderId);

    const result = await adminDb.runTransaction(async (transaction) => {
      const orderSnap = await transaction.get(orderRef);
      if (!orderSnap.exists) {
        throw new Error('Order not found');
      }

      const orderData = orderSnap.data()!;
      const currentStatus = orderData.status as OrderStatus;

      // Idempotency: If requested status is identical to current status, succeed as a no-op
      if (status === currentStatus) {
        return { isNoOp: true, currentStatus };
      }

      // State machine validation
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        throw new Error(
          `Invalid status transition from ${currentStatus} to ${status}. Allowed: ${allowedNext.join(', ')}`
        );
      }

      // If (and only if) transitioning to SERVED for the first time, increment dailyIntake calories
      if (status === 'SERVED' && currentStatus !== 'SERVED') {
        // Vercel serverless runs in UTC. Explicitly shift by +5.5 hours to Indian Standard Time (IST)
        // so the dailyIntake key matches the employee's local day in India.
        const istDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
        const year = istDate.getUTCFullYear();
        const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
        const day = String(istDate.getUTCDate()).padStart(2, '0');
        const todayIST = `${year}-${month}-${day}`;

        const dailyDocRef = adminDb.collection('dailyIntake').doc(`${orderData.employeeId}_${todayIST}`);

        // Use atomic FieldValue operators: works reliably whether the doc exists or not
        transaction.set(
          dailyDocRef,
          {
            uid: orderData.employeeId,
            date: todayIST,
            totalCalories: FieldValue.increment(orderData.totalCalories || 0),
            orderIds: FieldValue.arrayUnion(orderId),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      // Update order document
      const updatePayload: Record<string, any> = {
        status,
        rejectionReason: rejectionReason || orderData.rejectionReason || null,
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({
          status,
          timestamp: Date.now(),
          actorUid: decodedToken.uid,
        }),
      };

      if (status === 'QUEUED') {
        updatePayload.queuedAt = FieldValue.serverTimestamp();
      } else if (status === 'ACCEPTED' || status === 'REJECTED') {
        updatePayload.queuedAt = null;
        updatePayload.ringingSince = null;
      }

      transaction.update(orderRef, updatePayload);

      return { isNoOp: false, currentStatus: status };
    });

    return NextResponse.json({
      success: true,
      orderId,
      status,
      isNoOp: result.isNoOp,
    });
  } catch (err: unknown) {
    const message = (err as Error).message || 'Failed to update order status';
    const status = message.includes('Invalid status transition') ? 400 : message.includes('Order not found') ? 404 : 500;
    console.error('[UPDATE-ORDER-STATUS] Error:', err);
    return NextResponse.json({ error: message }, { status });
  }
}
