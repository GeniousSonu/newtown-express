import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { OrderStatus } from '@/types';

const TERMINAL_STATUSES: OrderStatus[] = ['SERVED', 'COMPLETED', 'REJECTED', 'CANCELLED'];

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing auth token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let callerUid = 'dev_staff';
    let role = 'admin';

    if (isFirebaseAdminConfigured()) {
      try {
        const decoded = await getAdminAuth().verifyIdToken(idToken);
        callerUid = decoded.uid;
        role = decoded.role || 'employee';
      } catch {
        return NextResponse.json(
          { error: 'Unauthorized: Invalid token.' },
          { status: 401 }
        );
      }
    }

    if (role !== 'admin' && role !== 'kitchenManager') {
      return NextResponse.json(
        { error: 'Forbidden: Kitchen staff role required to dismiss stale alarms.' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { orderId } = body as { orderId?: string };

    if (!orderId || typeof orderId !== 'string') {
      return NextResponse.json(
        { error: 'Missing required field: orderId is required.' },
        { status: 400 }
      );
    }

    if (isFirebaseAdminConfigured()) {
      const adminDb = getAdminDb();
      const orderRef = adminDb.collection('orders').doc(orderId);
      const orderSnap = await orderRef.get();

      if (!orderSnap.exists) {
        return NextResponse.json({ error: 'Order not found.' }, { status: 404 });
      }

      const orderData = orderSnap.data()!;
      const currentStatus = orderData.status as OrderStatus;

      // Strictly verify that status is actually terminal before allowing stale dismissal
      if (!TERMINAL_STATUSES.includes(currentStatus)) {
        return NextResponse.json(
          {
            error:
              'Order is still active in the kitchen pipeline. Please make an operational decision (Accept, Queue, or Reject) instead of silencing the alarm.',
            currentStatus,
          },
          { status: 400 }
        );
      }

      // Record audit metadata for stale dismissal
      await orderRef.update({
        dismissedAsStale: true,
        dismissedBy: callerUid,
        dismissedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      return NextResponse.json({
        success: true,
        message: `Order #${orderId.slice(-4)} alarm dismissed as stale.`,
        orderId,
      });
    }

    // Dev fallback
    return NextResponse.json({
      success: true,
      message: `Order #${orderId.slice(-4)} dismissed (dev mode).`,
      orderId,
      isDevFallback: true,
    });
  } catch (err: unknown) {
    console.error('[DISMISS-STALE-ERROR]:', err);
    return NextResponse.json(
      { error: (err as Error)?.message || 'Failed to dismiss stale alarm.' },
      { status: 500 }
    );
  }
}
