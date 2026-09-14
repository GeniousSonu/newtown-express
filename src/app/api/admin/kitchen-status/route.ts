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

    if (decodedToken.role !== 'admin' && decodedToken.role !== 'kitchenManager') {
      return NextResponse.json(
        { error: 'Forbidden: Kitchen Admin or Kitchen Manager role required.' },
        { status: 403 }
      );
    }

    const adminDb = getAdminDb();

    // Server-side session expiry check
    const userDocSnap = await adminDb.collection('users').doc(decodedToken.uid).get();
    if (!userDocSnap.exists) {
      return NextResponse.json({ error: 'User profile not found.' }, { status: 401 });
    }
    const userData = userDocSnap.data();
    const sessionExpiresAt = Number(userData?.sessionExpiresAt || 0);
    if (!sessionExpiresAt || Date.now() > sessionExpiresAt) {
      return NextResponse.json(
        { error: 'Session expired. Please log in again.' },
        { status: 401 }
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

    const statusRef = adminDb.collection('appConfig').doc('kitchenStatus');

    const updatePayload: Record<string, unknown> = {
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
