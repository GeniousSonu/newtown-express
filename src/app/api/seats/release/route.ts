import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/seats/release
 *
 * Releases the authenticated user's currently claimed seat.
 * Primarily for admin use or explicit "unclaim" actions.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized: Missing auth token.' },
        { status: 401 }
      );
    }

    const idToken = authHeader.split('Bearer ')[1].trim();
    const adminAuth = getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const callerUid = decodedToken.uid;

    // 2. Atomic release
    const db = getAdminDb();

    await db.runTransaction(async (tx) => {
      const userRef = db.doc(`users/${callerUid}`);
      const userSnap = await tx.get(userRef);
      const userData = userSnap.data();
      const currentSeatId = userData?.seatCode;

      if (!currentSeatId) {
        return; // No seat to release — idempotent
      }

      // Clear the seat document
      const seatRef = db.doc(`seats/${currentSeatId}`);
      tx.set(seatRef, {
        occupiedBy: null,
        occupiedByName: null,
        occupiedByPhotoURL: null,
        claimedAt: null,
      });

      // Clear user's seatCode
      tx.update(userRef, {
        seatCode: null,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Unknown error';
    console.error('[SEATS/RELEASE] Error:', message);
    return NextResponse.json(
      { error: 'Failed to release seat.', details: message },
      { status: 500 }
    );
  }
}
