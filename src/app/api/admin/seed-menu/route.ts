import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb, isFirebaseAdminConfigured } from '@/lib/firebaseAdmin';
import { DEFAULT_MENU_ITEMS, EXTRAS_GROUP } from '@/lib/defaultMenuItems';

export async function POST(req: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured()) {
      return NextResponse.json(
        { error: 'Firebase Admin SDK not configured on server. Set FIREBASE_SERVICE_ACCOUNT in environment.' },
        { status: 503 }
      );
    }

    const authHeader = req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1].trim();
      const adminAuth = getAdminAuth();
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (decodedToken.role !== 'admin') {
        return NextResponse.json({ error: 'Unauthorized: Admin role required.' }, { status: 403 });
      }
    }

    const db = getAdminDb();
    const batch = db.batch();

    for (const item of DEFAULT_MENU_ITEMS) {
      const id = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');

      const ref = db.collection('menuItems').doc(id);
      batch.set(
        ref,
        {
          id,
          name: item.name,
          category: item.category.toUpperCase(),
          price: item.price,
          calories: item.calories,
          healthTag: item.healthTag,
          description: '',
          imageUrl: '',
          isAvailable: true,
          addonGroups: item.hasExtras ? [EXTRAS_GROUP] : [],
          sortOrder: 0,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully seeded ${DEFAULT_MENU_ITEMS.length} menu items into Firestore.`,
      count: DEFAULT_MENU_ITEMS.length,
    });
  } catch (err: unknown) {
    console.error('[SEED-MENU-ROUTE] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to seed menu items.' },
      { status: 500 }
    );
  }
}
