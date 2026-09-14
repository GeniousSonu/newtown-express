import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { OrderStatus } from '@/types';
import { FieldValue } from 'firebase-admin/firestore';
import { formatInTimeZone } from 'date-fns-tz';

import { ALLOWED_TRANSITIONS } from '@/lib/orderTransitions';

// Basic in-memory rate limiting against repeated rapid calls for the same orderId
const recentOrderUpdates = new Map<string, number>();

export interface TransitionOptions {
  orderId: string;
  status: OrderStatus;
  rejectionReason?: string;
  callerUid: string;
  callerRole: string;
  isReportMissing?: boolean;
  isConfirmDelivery?: boolean;
}

export async function executeOrderStatusTransition(opts: TransitionOptions) {
  const { orderId, status, rejectionReason, callerUid, callerRole, isReportMissing, isConfirmDelivery } = opts;

  if (!isFirebaseAdminConfigured()) {
    return {
      success: true,
      orderId,
      status,
      isDevFallback: true,
      isNoOp: false,
    };
  }

  const adminDb = getAdminDb();
  const orderRef = adminDb.collection('orders').doc(orderId);

  return await adminDb.runTransaction(async (transaction) => {
    // ==========================================
    // 1. ALL READS FIRST (Strict Firestore rule)
    // ==========================================
    const orderSnap = await transaction.get(orderRef);
    if (!orderSnap.exists) {
      const err = new Error('Order not found');
      (err as unknown as { statusCode: number }).statusCode = 404;
      throw err;
    }

    const orderData = orderSnap.data()!;
    const currentStatus = orderData.status as OrderStatus;

    // A. Role-based transition authorization
    if (callerRole === 'employee') {
      if (orderData.employeeId !== callerUid) {
        const err = new Error('Forbidden: You can only update your own order');
        (err as unknown as { statusCode: number }).statusCode = 403;
        throw err;
      }

      if (isReportMissing) {
        if (currentStatus !== 'SERVED' && currentStatus !== 'COMPLETED') {
          const err = new Error('Can only report missing delivery for orders in SERVED status');
          (err as unknown as { statusCode: number }).statusCode = 400;
          throw err;
        }
      } else {
        // Customer confirming delivery
        if (status !== 'SERVED' && status !== 'COMPLETED') {
          const err = new Error('Forbidden: Customers may only confirm delivery (SERVED)');
          (err as unknown as { statusCode: number }).statusCode = 403;
          throw err;
        }
        if (currentStatus !== 'SERVED' && currentStatus !== 'READY' && currentStatus !== 'COMPLETED') {
          const err = new Error(`Cannot confirm delivery when order is in status "${currentStatus}"`);
          (err as unknown as { statusCode: number }).statusCode = 400;
          throw err;
        }
      }
    } else if (callerRole !== 'admin' && callerRole !== 'kitchenManager' && callerRole !== 'system') {
      const err = new Error('Forbidden: Unauthorized role');
      (err as unknown as { statusCode: number }).statusCode = 403;
      throw err;
    }

    // B. Handle Missing Delivery Reporting (Non-status-change mutation)
    if (isReportMissing) {
      transaction.update(orderRef, {
        deliveryReportedMissing: true,
        deliveryMissingReportedAt: Date.now(),
        statusUpdatedAt: FieldValue.serverTimestamp(),
        statusHistory: FieldValue.arrayUnion({
          status: currentStatus,
          action: 'DELIVERY_REPORTED_MISSING',
          timestamp: Date.now(),
          actorUid: callerUid,
          actorRole: callerRole,
        }),
      });
      return { isNoOp: false, currentStatus, deliveryReportedMissing: true };
    }

    // C. Race condition on simultaneous accept (e.g. Admin & Kitchen Manager tap Accept together)
    if (
      status === 'ACCEPTED' &&
      ['ACCEPTED', 'COOKING', 'READY', 'SERVED', 'COMPLETED'].includes(currentStatus)
    ) {
      const err = new Error('This order has already been accepted by another staff member.');
      (err as unknown as { code: string; currentStatus: OrderStatus; statusCode: number }).code = 'ALREADY_HANDLED';
      (err as unknown as { code: string; currentStatus: OrderStatus; statusCode: number }).currentStatus = currentStatus;
      (err as unknown as { code: string; currentStatus: OrderStatus; statusCode: number }).statusCode = 409;
      throw err;
    }

    const isConfirming = Boolean(
      isConfirmDelivery ||
      (callerRole === 'employee' && (status === 'SERVED' || status === 'COMPLETED'))
    );

    // D. Idempotency: If requested status is already current status and not confirming delivery
    if (status === currentStatus && !isConfirming) {
      return { isNoOp: true, currentStatus };
    }

    // E. State machine validation (allow confirming delivery when already served)
    if (status !== currentStatus) {
      const allowedNext = ALLOWED_TRANSITIONS[currentStatus] || [];
      if (!allowedNext.includes(status)) {
        const err = new Error(
          `Invalid status transition from ${currentStatus} to ${status}. Allowed: ${allowedNext.join(', ')}`
        );
        (err as unknown as { statusCode: number }).statusCode = 400;
        throw err;
      }
    }

    // F. Pre-read calorie tracking docs IF transitioning to COMPLETED or SERVED or confirming delivery
    let dailyDocSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let dailyDocRef: FirebaseFirestore.DocumentReference | null = null;
    let userDocSnap: FirebaseFirestore.DocumentSnapshot | null = null;
    let userDocRef: FirebaseFirestore.DocumentReference | null = null;
    const isDeliveryFinal = status === 'COMPLETED' || status === 'SERVED' || isConfirming;

    if (isDeliveryFinal) {
      const todayIST = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
      dailyDocRef = adminDb.collection('dailyIntake').doc(`${orderData.employeeId}_${todayIST}`);
      dailyDocSnap = await transaction.get(dailyDocRef);

      userDocRef = adminDb.collection('users').doc(orderData.employeeId);
      userDocSnap = await transaction.get(userDocRef);
    }

    // ==========================================
    // 2. ALL WRITES AFTER ALL READS (Atomic)
    // ==========================================
    if (isDeliveryFinal && dailyDocRef && userDocRef) {
      const existingOrderIds = (dailyDocSnap?.data()?.orderIds as string[]) || [];
      const orderCalories = Number(orderData.totalCalories || 0);

      // Only increment if this orderId hasn't already been credited for calories
      if (!existingOrderIds.includes(orderId) && orderCalories > 0) {
        const todayIST = formatInTimeZone(new Date(), 'Asia/Kolkata', 'yyyy-MM-dd');
        transaction.set(
          dailyDocRef,
          {
            uid: orderData.employeeId,
            date: todayIST,
            totalCalories: FieldValue.increment(orderCalories),
            orderIds: FieldValue.arrayUnion(orderId),
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );

        if (userDocSnap?.exists) {
          transaction.update(userDocRef, {
            totalCaloriesConsumed: FieldValue.increment(orderCalories),
            updatedAt: FieldValue.serverTimestamp(),
          });
        }
      }
    }

    // Order document update
    const updatePayload: Record<string, unknown> = {
      status,
      rejectionReason: rejectionReason || orderData.rejectionReason || null,
      statusUpdatedAt: FieldValue.serverTimestamp(),
      deliveryReportedMissing: false, // cleared on transition (e.g. re-delivered to READY or completed)
      statusHistory: FieldValue.arrayUnion({
        status,
        timestamp: Date.now(),
        actorUid: callerUid,
        actorRole: callerRole,
      }),
    };

    if (isConfirming) {
      updatePayload.deliveryConfirmed = true;
      updatePayload.deliveryConfirmedAt = Date.now();
    }

    if (status === 'QUEUED') {
      updatePayload.queuedAt = FieldValue.serverTimestamp();
    } else if (status === 'ACCEPTED' || status === 'REJECTED') {
      updatePayload.queuedAt = null;
      updatePayload.ringingSince = null;
    }

    transaction.update(orderRef, updatePayload);

    return { isNoOp: false, currentStatus: status, deliveryConfirmed: isConfirming };
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized: Missing token.' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    let callerUid = '';
    let callerRole = 'employee';

    if (isFirebaseAdminConfigured()) {
      try {
        const decodedToken = await getAdminAuth().verifyIdToken(idToken);
        callerUid = decodedToken.uid;
        // Check custom claims role first, then database user document
        const tokenRole = decodedToken.role as string;
        if (tokenRole) {
          callerRole = tokenRole;
        } else {
          const adminDb = getAdminDb();
          const userDoc = await adminDb.collection('users').doc(callerUid).get();
          if (userDoc.exists) {
            callerRole = (userDoc.data()?.role as string) || 'employee';
          }
        }
      } catch {
        if (idToken.startsWith('mock_') || idToken.startsWith('dev_')) {
          callerUid = idToken.replace(/^(mock_custom_token_|dev_token_)/, '');
          callerRole = callerUid.includes('kitchen')
            ? 'kitchenManager'
            : callerUid.includes('admin')
            ? 'admin'
            : 'employee';
        } else {
          return NextResponse.json({ error: 'Unauthorized: Invalid or expired token.' }, { status: 401 });
        }
      }
    } else {
      callerUid = idToken.replace(/^(mock_custom_token_|dev_token_)/, '');
      callerRole = callerUid.includes('kitchen')
        ? 'kitchenManager'
        : callerUid.includes('admin')
        ? 'admin'
        : 'employee';
    }

    // Server-side session expiry check
    if (isFirebaseAdminConfigured()) {
      const adminDb = getAdminDb();
      const userDocSnap = await adminDb.collection('users').doc(callerUid).get();
      if (userDocSnap.exists) {
        const userData = userDocSnap.data();
        const sessionExpiresAt = Number(userData?.sessionExpiresAt || 0);
        if (sessionExpiresAt && Date.now() > sessionExpiresAt) {
          return NextResponse.json(
            { error: 'Session expired. Please log in again.' },
            { status: 401 }
          );
        }
      }
    }

    const body = await req.json();
    const { orderId, status, rejectionReason, isReportMissing, isConfirmDelivery } = body as {
      orderId: string;
      status: OrderStatus;
      rejectionReason?: string;
      isReportMissing?: boolean;
      isConfirmDelivery?: boolean;
    };

    if (!orderId || (!status && !isReportMissing && !isConfirmDelivery)) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId and status are required.' },
        { status: 400 }
      );
    }

    // Server-enforced rejection reason
    if (status === 'REJECTED') {
      const trimmedReason = typeof rejectionReason === 'string' ? rejectionReason.trim() : '';
      if (!trimmedReason || trimmedReason.length < 2) {
        return NextResponse.json(
          { error: 'A valid rejection reason is required when rejecting an order.' },
          { status: 400 }
        );
      }
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

    const targetStatus = status || (isConfirmDelivery ? 'SERVED' : 'SERVED');

    const result = await executeOrderStatusTransition({
      orderId,
      status: targetStatus,
      rejectionReason,
      callerUid,
      callerRole,
      isReportMissing: Boolean(isReportMissing),
      isConfirmDelivery: Boolean(isConfirmDelivery),
    });

    return NextResponse.json({
      success: true,
      orderId,
      status: targetStatus,
      isNoOp: result.isNoOp,
      isDevFallback: (result as { isDevFallback?: boolean })?.isDevFallback,
      deliveryReportedMissing: (result as { deliveryReportedMissing?: boolean })?.deliveryReportedMissing,
      deliveryConfirmed: (result as { deliveryConfirmed?: boolean })?.deliveryConfirmed,
    });
  } catch (err: unknown) {
    const errorObj = err as { code?: string; currentStatus?: OrderStatus; statusCode?: number; message?: string };
    const message = errorObj?.message || 'Failed to update order status';
    const statusCode = errorObj?.statusCode || (errorObj?.code === 'ALREADY_HANDLED' ? 409 : 500);

    if (errorObj?.code === 'ALREADY_HANDLED') {
      return NextResponse.json(
        {
          error: message,
          code: 'ALREADY_HANDLED',
          currentStatus: errorObj.currentStatus,
        },
        { status: 409 }
      );
    }

    console.error('[UPDATE-ORDER-STATUS] Error:', err);
    return NextResponse.json({ error: message }, { status: statusCode });
  }
}
