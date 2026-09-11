import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const snap = await adminDb.collection('appConfig').doc('kitchenStatus').get();
    if (!snap.exists) {
      return NextResponse.json({
        isOpen: true,
        closedMessage: '',
      });
    }

    const data = snap.data();
    return NextResponse.json({
      isOpen: data?.isOpen !== false,
      closedMessage: data?.closedMessage || '',
      lastToggledBy: data?.lastToggledBy || null,
      lastToggledAt: data?.lastToggledAt?.toMillis?.() || null,
    });
  } catch (err: unknown) {
    console.error('[KITCHEN-STATUS-GET] Error:', err);
    return NextResponse.json({ error: 'Failed to fetch kitchen status.' }, { status: 500 });
  }
}

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
    const { isOpen, closedMessage } = body as {
      isOpen?: boolean;
      closedMessage?: string;
    };

    if (typeof isOpen !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid payload: isOpen (boolean) is required.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const statusRef = adminDb.collection('appConfig').doc('kitchenStatus');

    const updatePayload: Record<string, any> = {
      isOpen,
      lastToggledBy: decodedToken.uid,
      lastToggledAt: FieldValue.serverTimestamp(),
    };

    if (closedMessage !== undefined) {
      updatePayload.closedMessage = typeof closedMessage === 'string' ? closedMessage.trim() : '';
    }

    await statusRef.set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      isOpen,
      closedMessage: updatePayload.closedMessage ?? '',
      lastToggledBy: decodedToken.uid,
    });
  } catch (err: unknown) {
    console.error('[KITCHEN-STATUS-POST] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to update kitchen status.' },
      { status: 500 }
    );
  }
}
