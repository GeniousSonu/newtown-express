import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, isAllowedEmail } from '@/lib/firebaseAdmin';
import { sendOtpEmail } from '@/lib/brevo';
import { Timestamp } from 'firebase-admin/firestore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    const email = rawEmail.toLowerCase().trim();

    // Enforce email format & domain / admin allowlist
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || !isAllowedEmail(email)) {
      return NextResponse.json(
        { error: 'Access restricted to @ibarts.in email addresses and authorized administrators.' },
        { status: 400 }
      );
    }

    const now = Date.now();
    const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
    let dailyCount = 0;
    let windowStartMs = now;
    let windowStartTimestamp: Timestamp = Timestamp.now();

    const adminDb = getAdminDb();
    const docRef = adminDb.collection('otpRequests').doc(email);
    const docSnap = await docRef.get();

    if (docSnap.exists) {
      const data = docSnap.data();

      // 60-Second Cooldown Check
      const lastSentMs = data?.lastSentAt?.toMillis?.() || 0;
      const elapsedMs = now - lastSentMs;
      if (elapsedMs < 60000) {
        const retryAfterSeconds = Math.ceil((60000 - elapsedMs) / 1000);
        return NextResponse.json(
          {
            error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
            retryAfter: retryAfterSeconds,
          },
          { status: 429 }
        );
      }

      // Daily Send Cap Check (Max 10 per 24 hours)
      const existingWindowStart = data?.dailyWindowStart?.toMillis?.() || 0;
      if (now - existingWindowStart < TWENTY_FOUR_HOURS) {
        dailyCount = typeof data?.dailyCount === 'number' ? data.dailyCount : 0;
        windowStartMs = existingWindowStart;
        windowStartTimestamp = data?.dailyWindowStart;
      } else {
        dailyCount = 0;
        windowStartMs = now;
        windowStartTimestamp = Timestamp.now();
      }

      if (dailyCount >= 10) {
        return NextResponse.json(
          { error: 'Daily OTP request limit reached (10 per day). Please try again tomorrow.' },
          { status: 429 }
        );
      }
    }

    // Generate random 6-digit OTP code and SHA-256 hash
    const otp = crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex');

    // Attempt email dispatch via Brevo FIRST before writing doc
    try {
      await sendOtpEmail({
        toEmail: email,
        otpCode: otp,
      });
      console.log(`[SEND-OTP] Brevo successfully dispatched login code to ${email}`);
    } catch (sendErr: unknown) {
      console.error('[SEND-OTP] Brevo dispatch failed for', email, sendErr);
      return NextResponse.json(
        { error: (sendErr as Error)?.message || 'Could not send login code. Please check Brevo configuration.' },
        { status: 500 }
      );
    }

    // Persist hashed OTP in Firestore
    await docRef.set({
      email,
      codeHash,
      expiresAt: Timestamp.fromDate(new Date(now + 5 * 60 * 1000)),
      attempts: 0,
      lastSentAt: Timestamp.now(),
      dailyCount: dailyCount + 1,
      dailyWindowStart: windowStartTimestamp,
    });

    return NextResponse.json({
      success: true,
      message: `A 6-digit login code has been sent to ${email}`,
    });
  } catch (err: unknown) {
    console.error('[SEND-OTP] Unexpected error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process OTP request.' },
      { status: 500 }
    );
  }
}
