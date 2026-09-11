import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await context.params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;
    const isAdmin = decodedToken.role === 'admin';

    const adminDb = getAdminDb();
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();

    // Anti-enumeration / IDOR defense:
    // If order does not exist OR belongs to another employee, return IDENTICAL generic 404
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const orderData = orderDoc.data()!;
    if (orderData.employeeId !== callerUid && !isAdmin) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({
      order: {
        id: orderDoc.id,
        ...orderData,
      },
    });
  } catch (err: unknown) {
    console.error('[GET-ORDER-BY-ID] Error:', err);
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
}
