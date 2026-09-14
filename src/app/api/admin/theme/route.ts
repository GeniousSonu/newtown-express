import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    const docSnap = await adminDb.collection('appConfig').doc('adminTheme').get();
    if (!docSnap.exists) {
      return NextResponse.json({ accentColor: '#F59E0B' });
    }
    const data = docSnap.data();
    return NextResponse.json({ accentColor: data?.accentColor || '#F59E0B' });
  } catch {
    return NextResponse.json({ accentColor: '#F59E0B' });
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
    const decoded = await adminAuth.verifyIdToken(idToken);

    if (decoded.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin role required.' }, { status: 403 });
    }

    const body = await req.json();
    const { accentColor } = body as { accentColor: string };

    if (!accentColor || !/^#[0-9A-Fa-f]{6}$/.test(accentColor)) {
      return NextResponse.json({ error: 'Valid 6-digit hex color required (e.g. #F59E0B).' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    await adminDb.collection('appConfig').doc('adminTheme').set(
      {
        accentColor,
        updatedBy: decoded.uid,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, accentColor });
  } catch (err: unknown) {
    console.error('[ADMIN-THEME] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to update theme.' },
      { status: 500 }
    );
  }
}
