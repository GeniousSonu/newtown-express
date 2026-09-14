import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminDb, isAllowedEmail, isAdminBypassEmail } from '@/lib/firebaseAdmin';
import { sendOtpEmail } from '@/lib/brevo';
import { Timestamp } from 'firebase-admin/firestore';
import { redis } from '@/lib/redis';

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
    const isAdminBypass = isAdminBypassEmail(email);
    const isKitchenBypass = email === 'kitchen@ibarts.in';
    const isBypass = isAdminBypass || isKitchenBypass;
    const cooldownKey = `otp:cooldown:${email}`;
    const dailyKey = `otp:daily:${email}`;

    // Redis Rate-Limiting: 60s Resend Cooldown & 10/day Send Cap (skipped for test/bypass accounts)
    if (!isBypass) {
      try {
        const onCooldown = await redis.get(cooldownKey);
        if (onCooldown) {
          const ttl = await redis.ttl(cooldownKey);
          const retryAfterSeconds = ttl > 0 ? ttl : 60;
          return NextResponse.json(
            {
              error: `Please wait ${retryAfterSeconds}s before requesting another code.`,
              retryAfter: retryAfterSeconds,
            },
            { status: 429 }
          );
        }

        const dailyCount = (await redis.get<number>(dailyKey)) || 0;
        if (dailyCount >= 10) {
          return NextResponse.json(
            { error: 'Daily OTP request limit reached (10 per day). Please try again tomorrow.' },
            { status: 429 }
          );
        }
      } catch (redisErr) {
        console.warn('[SEND-OTP] Redis rate check warning:', redisErr);
      }
    }

    // Generate 6-digit OTP code (815987 for master admin, 092026 for kitchen manager)
    const otp = isAdminBypass
      ? '815987'
      : isKitchenBypass
      ? '092026'
      : crypto.randomInt(100000, 1000000).toString();
    const codeHash = crypto.createHash('sha256').update(otp).digest('hex');

    console.log('\n======================================================');
    console.log('🔑 [NEWTOWN EXPRESS LOGIN OTP]');
    console.log(`   Recipient: ${email}`);
    console.log(`   OTP Code:  ${otp}`);
    console.log('======================================================\n');

    // Attempt email dispatch via Brevo ONLY for non-bypass accounts
    if (!isBypass) {
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
    } else {
      console.log(`[SEND-OTP] Bypass account (${email}): skipping external email dispatch.`);
    }

    // Persist OTP code hash and rate limits in Redis with TTLs
    const codeKey = `otp:code:${email}`;
    const attemptsKey = `otp:attempts:${email}`;
    const otpTtl = isBypass ? 86400 : 300; // 5 minutes (or 24h for bypass accounts)

    try {
      await redis.set(codeKey, codeHash, { ex: otpTtl });
      await redis.del(attemptsKey); // Clear any old lockout

      if (!isBypass) {
        await redis.set(cooldownKey, '1', { ex: 60 });
        const newDaily = await redis.incr(dailyKey);
        if (newDaily === 1) {
          await redis.expire(dailyKey, 86400); // 24-hour window
        }
      }
    } catch (redisErr) {
      console.warn('[SEND-OTP] Redis write warning:', redisErr);
    }

    // Dual-write to Firestore for audit / legacy fallback without blocking
    try {
      const adminDb = getAdminDb();
      const docRef = adminDb.collection('otpRequests').doc(email);
      await docRef.set({
        email,
        codeHash,
        expiresAt: Timestamp.fromDate(new Date(now + (isBypass ? 24 * 60 * 60 * 1000 : 5 * 60 * 1000))),
        attempts: 0,
        lastSentAt: Timestamp.now(),
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[SEND-OTP] Firestore sync warning:', fsErr);
    }

    return NextResponse.json({
      success: true,
      message: isAdminBypass
        ? 'Admin bypass active. Enter 815987 to sign in.'
        : isKitchenBypass
        ? 'Kitchen manager bypass active. Enter 092026 to sign in.'
        : `A 6-digit login code has been sent to ${email}`,
      isBypass,
    });
  } catch (err: unknown) {
    console.error('[SEND-OTP] Unexpected error:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to process OTP request.' },
      { status: 500 }
    );
  }
}
