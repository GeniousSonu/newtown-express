import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebaseAdmin';
import { isValidSeatId } from '@/lib/seatLayout';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * POST /api/seats/claim
 *
 * Atomically claims a seat for the authenticated user.
 * - Validates the seat ID against the static layout
 * - Uses a Firestore transaction to prevent double-booking
 * - Releases the caller's previous seat in the same transaction
 * - Returns 409 if the seat was already taken by another user
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

    // 2. Parse and validate seat ID
    const body = await req.json();
    const { seatId } = body as { seatId: string };

    if (!seatId || typeof seatId !== 'string') {
      return NextResponse.json(
        { error: 'Missing or invalid seatId.' },
        { status: 400 }
      );
    }

    if (!isValidSeatId(seatId)) {
      return NextResponse.json(
        { error: `Invalid seat ID: "${seatId}" does not exist in the office layout.` },
        { status: 400 }
      );
    }

    // 3. Atomic Firestore transaction
    const db = getAdminDb();

    await db.runTransaction(async (tx) => {
      const seatRef = db.doc(`seats/${seatId}`);
      const userRef = db.doc(`users/${callerUid}`);

      const [seatSnap, userSnap] = await Promise.all([
        tx.get(seatRef),
        tx.get(userRef),
      ]);

      // Check if seat is already taken by someone else
      const seatData = seatSnap.data();
      if (
        seatData &&
        seatData.occupiedBy &&
        seatData.occupiedBy !== callerUid
      ) {
        throw new Error('SEAT_TAKEN');
      }

      // If the user already has this exact seat, no-op (idempotent)
      const userData = userSnap.data();
      const prevSeatId = userData?.seatCode;
      if (prevSeatId === seatId) {
        return; // Already claimed — nothing to do
      }

      // Release previous seat atomically
      if (prevSeatId && prevSeatId !== seatId) {
        const prevSeatRef = db.doc(`seats/${prevSeatId}`);
        tx.set(prevSeatRef, {
          occupiedBy: null,
          occupiedByName: null,
          occupiedByPhotoURL: null,
          claimedAt: null,
        });
      }

      // Claim the new seat
      const displayName =
        (userData?.firstName && userData?.lastName)
          ? `${userData.firstName} ${userData.lastName}`
          : userData?.displayName || decodedToken.name || 'Unknown';

      tx.set(seatRef, {
        occupiedBy: callerUid,
        occupiedByName: displayName,
        occupiedByPhotoURL: userData?.photoURL || null,
        claimedAt: FieldValue.serverTimestamp(),
      });

      // Update user's seatCode
      tx.update(userRef, {
        seatCode: seatId,
        updatedAt: FieldValue.serverTimestamp(),
      });
    });

    return NextResponse.json({ success: true, seatId });
  } catch (err: unknown) {
    const message = (err as Error)?.message || 'Unknown error';

    if (message === 'SEAT_TAKEN') {
      return NextResponse.json(
        { error: 'SEAT_TAKEN', message: 'Someone just claimed that seat — try another!' },
        { status: 409 }
      );
    }

    console.error('[SEATS/CLAIM] Error:', message);
    return NextResponse.json(
      { error: 'Failed to claim seat.', details: message },
      { status: 500 }
    );
  }
}
