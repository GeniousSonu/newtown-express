import { NextRequest, NextResponse } from 'next/server';
import { verifyOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body.email;
    const rawOtp = body.otp;

    if (!rawEmail || !rawOtp) {
      return NextResponse.json({ error: 'Email and 6-digit OTP code are required.' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();
    const otp = String(rawOtp).trim();

    const verification = verifyOtp(email, otp);
    if (!verification.valid) {
      return NextResponse.json({ error: verification.reason || 'Invalid OTP code.' }, { status: 400 });
    }

    // Format friendly display name from email (e.g., "sahinur.khan" -> "Sahinur Khan")
    const username = email.split('@')[0].replace(/[._-]/g, ' ');
    const displayName = username
      .split(' ')
      .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    const uid = `usr_${Buffer.from(email).toString('hex').slice(0, 16)}`;

    // Default role (admin can be flagged if specific pantry admin email)
    const isAdmin = email.includes('admin') || email.includes('pantry');

    const userProfile = {
      uid,
      email,
      displayName: displayName || 'Employee',
      role: isAdmin ? 'admin' : 'employee',
      createdAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      message: 'OTP verified successfully!',
      user: userProfile,
    });
  } catch (err: unknown) {
    console.error('[VERIFY-OTP ERROR]:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to verify OTP.' },
      { status: 500 }
    );
  }
}
