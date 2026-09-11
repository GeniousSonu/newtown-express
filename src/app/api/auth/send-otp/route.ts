import { NextRequest, NextResponse } from 'next/server';
import { storeOtp } from '@/lib/otpStore';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawEmail = body.email;

    if (!rawEmail || typeof rawEmail !== 'string') {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }

    const email = rawEmail.toLowerCase().trim();

    // Validate standard email format (accepts Gmail, ibarts, or any email)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Please enter a valid email address (e.g. name@gmail.com or name@ibarts.in).' },
        { status: 400 }
      );
    }

    // Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    storeOtp(email, otp, 10); // 10 minutes expiry

    console.log('\n======================================================');
    console.log(`🔑 [NEWTOWN EXPRESS LOGIN OTP]`);
    console.log(`   Recipient: ${email}`);
    console.log(`   OTP Code:  ${otp}`);
    console.log('======================================================\n');

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; background-color: #FFF8F2; border: 2px solid #111111; border-radius: 24px; overflow: hidden; padding: 28px; box-shadow: 0 4px 0 #111111;">
        <div style="text-align: center; margin-bottom: 20px;">
          <div style="display: inline-block; width: 48px; height: 48px; line-height: 48px; background-color: #FF3B30; color: #ffffff; border: 2px solid #111111; border-radius: 14px; font-size: 24px; font-weight: 900; margin-bottom: 12px;">🍜</div>
          <h1 style="color: #111111; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: -0.02em;">Newtown Express</h1>
          <p style="color: #6B6B6B; font-size: 13px; font-weight: 700; margin: 4px 0 0 0;">Pantry One-Time Login Code</p>
        </div>

        <div style="background-color: #ffffff; border: 2px solid #111111; border-radius: 18px; padding: 24px; text-align: center; margin-bottom: 20px; box-shadow: 0 3px 0 #111111;">
          <p style="color: #6B6B6B; font-size: 12px; font-weight: 800; text-transform: uppercase; margin: 0 0 8px 0; letter-spacing: 0.05em;">Your 6-Digit Passcode</p>
          <div style="font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #FF3B30; font-family: monospace;">${otp}</div>
          <p style="color: #6B6B6B; font-size: 12px; font-weight: 600; margin: 10px 0 0 0;">Valid for 10 minutes</p>
        </div>

        <p style="color: #6B6B6B; font-size: 11px; font-weight: 600; text-align: center; margin: 0;">
          If you did not request this code to order from Newtown Express pantry, you can safely ignore this email.
        </p>
      </div>
    `;

    // 1. Check if standard Gmail SMTP is configured (Sends to ANY email in the world with ZERO domain verification!)
    const gmailUser = process.env.GMAIL_USER;
    const gmailPass = process.env.GMAIL_APP_PASSWORD;

    if (gmailUser && gmailPass) {
      try {
        const nodemailer = await import('nodemailer');
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailPass,
          },
        });

        await transporter.sendMail({
          from: `"Newtown Express Pantry" <${gmailUser}>`,
          to: email,
          subject: `${otp} is your Newtown Express pantry login code`,
          html: emailHtml,
        });

        console.log(`[GMAIL SMTP] Dispatched OTP to ${email}`);
        return NextResponse.json({
          success: true,
          message: `A 6-digit login code has been sent to ${email}`,
        });
      } catch (smtpErr) {
        console.warn('[GMAIL SMTP ERROR]:', smtpErr);
      }
    }

    // 2. Otherwise try Resend API
    const resendKey = process.env.RESEND_API_KEY;
    if (resendKey) {
      try {
        const { Resend } = await import('resend');
        const resend = new Resend(resendKey);

        const sendResult = await resend.emails.send({
          from: 'Newtown Express <onboarding@resend.dev>',
          to: email,
          subject: `${otp} is your Newtown Express pantry login code`,
          html: emailHtml,
        });

        if (!sendResult.error) {
          console.log(`[RESEND] Dispatched OTP email to ${email}`);
          return NextResponse.json({
            success: true,
            message: `A 6-digit login OTP has been sent to ${email}`,
          });
        }
      } catch (resendErr) {
        console.warn('[RESEND DISPATCH ERROR]:', resendErr);
      }
    }

    // 3. Sandbox / Dev fallback: allows instant testing without being blocked by domain verification
    return NextResponse.json({
      success: true,
      sandboxFallback: true,
      devOtp: otp,
      message: `Sandbox Test Mode: Code ${otp} generated (Check terminal or enter directly)`,
    });
  } catch (err: unknown) {
    console.error('[SEND-OTP ERROR]:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Failed to send OTP.' },
      { status: 500 }
    );
  }
}
