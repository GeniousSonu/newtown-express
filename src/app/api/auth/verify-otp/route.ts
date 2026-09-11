import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminAuth, getAdminDb, isAdminEmail } from '@/lib/firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body.email;
    const rawCode = body.code || body.otp;

    if (!rawEmail || !rawCode) {
      return NextResponse.json(
        { error: 'Email and 6-digit OTP code are required.' },
        { status: 400 }
      );
    }

    const email = String(rawEmail).toLowerCase().trim();
    const code = String(rawCode).trim();

    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Please enter a valid 6-digit numeric code.' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();
    const now = Date.now();

    const docRef = adminDb.collection('otpRequests').doc(email);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      return NextResponse.json(
        { error: 'No active login code found for this email. Please request a new code.' },
        { status: 400 }
      );
    }

    const data = docSnap.data();
    const storedCodeHash = String(data?.codeHash || '');
    const expiresAtMs = data?.expiresAt?.toMillis?.() || 0;
    const attempts = typeof data?.attempts === 'number' ? data.attempts : 0;

    // 1. Check expiration
    if (now > expiresAtMs) {
      return NextResponse.json(
        { error: 'This login code has expired. Please request a new code.' },
        { status: 400 }
      );
    }

    // 2. Check max attempts
    if (attempts >= 5) {
      return NextResponse.json(
        { error: 'Too many incorrect attempts. Please request a fresh login code.' },
        { status: 400 }
      );
    }

    // 3. Timing-Safe Hash Comparison
    const submittedHash = crypto.createHash('sha256').update(code).digest('hex');
    const bufSubmitted = Buffer.from(submittedHash, 'hex');
    const bufStored = Buffer.from(storedCodeHash, 'hex');

    const isMatch =
      bufSubmitted.length === bufStored.length &&
      crypto.timingSafeEqual(bufSubmitted, bufStored);

    if (!isMatch) {
      const nextAttempts = attempts + 1;
      await docRef.update({
        attempts: FieldValue.increment(1),
      });

      const remaining = 5 - nextAttempts;
      if (remaining <= 0) {
        return NextResponse.json(
          { error: 'Too many incorrect attempts. Please request a fresh login code.' },
          { status: 400 }
        );
      }

      return NextResponse.json(
        {
          error: `Incorrect code. ${remaining} attempt${remaining > 1 ? 's' : ''} remaining.`,
          remainingAttempts: remaining,
        },
        { status: 400 }
      );
    }

    // 4. Code matches! Delete the single-use OTP document
    await docRef.delete();

    // 5. Recompute role on EVERY login
    const role: 'admin' | 'employee' = isAdminEmail(email) ? 'admin' : 'employee';

    // 6. Look up or create Firebase Auth user
    let userRecord;
    let allowlistName: string | null = null;

    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch (err: unknown) {
      const authErr = err as { code?: string };
      if (authErr.code === 'auth/user-not-found') {
        // Look up employeeAllowlist/{email} in Firestore before calling createUser
        try {
          const allowlistSnap = await adminDb.collection('employeeAllowlist').doc(email).get();
          if (allowlistSnap.exists) {
            const allowlistData = allowlistSnap.data();
            if (allowlistData?.name && typeof allowlistData.name === 'string' && allowlistData.name.trim()) {
              allowlistName = allowlistData.name.trim();
            }
          }
        } catch (allowlistErr) {
          console.warn('[VERIFY-OTP] Could not query employeeAllowlist:', allowlistErr);
        }

        userRecord = await adminAuth.createUser({
          email,
          emailVerified: true,
          ...(allowlistName ? { displayName: allowlistName } : {}),
        });
      } else {
        throw err;
      }
    }

    // Embed custom token claims
    await adminAuth.setCustomUserClaims(userRecord.uid, { role });
    const customToken = await adminAuth.createCustomToken(userRecord.uid, { role });

    // Sync users/{uid} document
    const userDocRef = adminDb.collection('users').doc(userRecord.uid);
    const userDocSnap = await userDocRef.get();

    if (!userDocSnap.exists) {
      const initialDisplayName = userRecord.displayName || allowlistName || '';
      await userDocRef.set({
        uid: userRecord.uid,
        email,
        displayName: initialDisplayName,
        role,
        ...(role === 'admin' ? {} : { seatCode: '' }),
        createdAt: FieldValue.serverTimestamp(),
      });
    } else {
      // Existing user: do not overwrite displayName in case user modified it
      await userDocRef.set(
        {
          role,
          email,
        },
        { merge: true }
      );
    }

    return NextResponse.json({
      success: true,
      customToken,
      role,
      uid: userRecord.uid,
    });
  } catch (err: unknown) {
    console.error('[VERIFY-OTP] Error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to verify login code.' },
      { status: 500 }
    );
  }
}
