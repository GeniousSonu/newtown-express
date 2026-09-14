import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, seatCode, employeeName, totalAmount } = body;

    console.log(`[NOTIFY-ADMIN] Received notify trigger for Order #${orderId} from ${employeeName} (Desk ${seatCode}) - ₹${totalAmount}`);

    // Short debounce window (1200ms) to allow concurrent burst order creations in the same second
    // to settle into Firestore before querying the live unhandled queue count.
    await new Promise((resolve) => setTimeout(resolve, 1200));

    try {
      const { getAdminApp } = await import('@/lib/firebaseAdmin');
      const { getFirestore } = await import('firebase-admin/firestore');
      const { getMessaging } = await import('firebase-admin/messaging');

      const app = getAdminApp();
      if (app) {
        const db = getFirestore(app);

        // Fetch tokens for both admin and kitchenManager
        const staffSnap = await db
          .collection('users')
          .where('role', 'in', ['admin', 'kitchenManager'])
          .get();

        const tokens: string[] = [];
        staffSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data?.fcmTokens)) {
            tokens.push(...data.fcmTokens);
          }
        });

        // Query current count of unhandled orders across Firestore
        const unhandledSnap = await db
          .collection('orders')
          .where('status', 'in', ['PLACED', 'PAYMENT_VERIFYING', 'PAYMENT_VERIFIED'])
          .get();

        const unhandledCount = Math.max(1, unhandledSnap.size);

        const notifTitle =
          unhandledCount > 1
            ? `🚨 ${unhandledCount} ORDERS WAITING`
            : `🚨 NEW ORDER #${String(orderId).slice(-4)}`;

        const notifBody =
          unhandledCount > 1
            ? `${unhandledCount} orders waiting — tap to view`
            : `${employeeName} at Desk ${seatCode} ordered ₹${totalAmount}`;

        if (tokens.length > 0) {
          const messaging = getMessaging(app);
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: notifTitle,
              body: notifBody,
            },
            data: {
              orderId: String(orderId),
              seatCode: String(seatCode),
              unhandledCount: String(unhandledCount),
              url: '/kitchen',
            },
            android: {
              priority: 'high',
              collapseKey: 'kitchen_orders',
              notification: {
                tag: 'kitchen_orders',
                sound: 'default',
                priority: 'high',
                channelId: 'kitchen_orders',
                defaultSound: true,
                defaultVibrateTimings: true,
              },
            },
            webpush: {
              notification: {
                tag: 'kitchen_orders',
                renotify: true,
              },
            },
          });
          console.log(`[FCM] Sent notification for ${unhandledCount} orders to ${tokens.length} tokens, success: ${response.successCount}`);
        }
      }
    } catch (adminErr) {
      console.warn('[FCM] Firebase Admin push error:', adminErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Admin notification dispatched',
      orderId,
    });
  } catch (err: unknown) {
    console.error('[NOTIFY-ADMIN] Error:', err);
    return NextResponse.json({ error: (err as Error).message || 'Server error' }, { status: 500 });
  }
}
