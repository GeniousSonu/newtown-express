import { NextResponse } from 'next/server';

export async function GET() {
  const missing: string[] = [];

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccount || !serviceAccount.trim()) {
    missing.push('FIREBASE_SERVICE_ACCOUNT');
  }

  if (!process.env.ADMIN_EMAILS || !process.env.ADMIN_EMAILS.trim()) {
    missing.push('ADMIN_EMAILS');
  }

  if (!process.env.BREVO_API_KEY || !process.env.BREVO_API_KEY.trim()) {
    missing.push('BREVO_API_KEY');
  }

  if (!process.env.BREVO_SENDER_EMAIL || !process.env.BREVO_SENDER_EMAIL.trim()) {
    missing.push('BREVO_SENDER_EMAIL');
  }

  let adminStatus = 'not_checked';
  let adminError = null;
  try {
    const { getAdminDb } = await import('@/lib/firebaseAdmin');
    getAdminDb();
    adminStatus = 'initialized';
  } catch (e: unknown) {
    const err = e as Error;
    adminStatus = 'error';
    adminError = {
      message: err?.message,
      stack: err?.stack,
      name: err?.name,
    };
  }

  const isDev = process.env.NODE_ENV === 'development';

  return NextResponse.json({
    ok: isDev ? true : missing.length === 0 && adminStatus === 'initialized',
    missing: isDev ? [] : missing,
    devMissing: isDev ? missing : [],
    adminStatus,
    adminError,
  });
}
