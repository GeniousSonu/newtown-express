import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { orderId, seatCode, employeeName, totalAmount } = body;

    console.log(`[NOTIFY-ADMIN] Order #${orderId} from ${employeeName} (Desk ${seatCode}) - ₹${totalAmount}`);

    try {
      const { getAdminApp } = await import('@/lib/firebaseAdmin');
      const { getFirestore } = await import('firebase-admin/firestore');
      const { getMessaging } = await import('firebase-admin/messaging');

      const app = getAdminApp();
      if (app) {
        const db = getFirestore(app);
        const adminsSnap = await db.collection('users').where('role', '==', 'admin').get();
        const tokens: string[] = [];

        adminsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          if (Array.isArray(data?.fcmTokens)) {
            tokens.push(...data.fcmTokens);
          }
        });

        if (tokens.length > 0) {
          const messaging = getMessaging(app);
          const response = await messaging.sendEachForMulticast({
            tokens,
            notification: {
              title: `🚨 NEW ORDER #${String(orderId).slice(-4)}`,
              body: `${employeeName} at Desk ${seatCode} ordered ₹${totalAmount}`,
            },
            data: {
              orderId: String(orderId),
              seatCode: String(seatCode),
              url: '/admin',
            },
            android: {
              priority: 'high',
              notification: {
                sound: 'default',
                priority: 'high',
                channelId: 'kitchen_orders',
              },
            },
          });
          console.log(`[FCM] Sent to ${tokens.length} tokens, success: ${response.successCount}`);
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
