import { getApps, initializeApp, cert, type App } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

function parseServiceAccount(raw: string) {
  if (!raw || typeof raw !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set or empty.');
  }

  let trimmed = raw.trim();

  // Strip wrapping single or double quotes if present (common when pasting into env configs)
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  let parsed: any;
  if (trimmed.startsWith('{')) {
    parsed = JSON.parse(trimmed);
  } else {
    try {
      const decoded = Buffer.from(trimmed, 'base64').toString('utf-8');
      parsed = JSON.parse(decoded);
    } catch {
      parsed = JSON.parse(trimmed);
    }
  }

  // Ensure private_key has actual newlines and not literal escaped \n
  if (parsed && typeof parsed.private_key === 'string') {
    parsed.private_key = parsed.private_key.replace(/\\n/g, '\n');
  }

  return parsed;
}

export function isFirebaseAdminConfigured(): boolean {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  return Boolean(rawKey && rawKey.trim().length > 10);
}

export function getAdminApp(): App {
  const apps = getApps();
  if (apps.length > 0) {
    return apps[0];
  }

  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!rawKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not configured');
  }

  const creds = parseServiceAccount(rawKey);
  return initializeApp({
    credential: cert(creds),
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  const admins = getAdminEmails();
  return admins.includes(normalized);
}

export function isAllowedEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return normalized.endsWith('@ibarts.in') || isAdminEmail(normalized);
}
