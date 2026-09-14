import { getApps, initializeApp, cert, type App, type ServiceAccount } from 'firebase-admin/app';
import { getAuth, type Auth } from 'firebase-admin/auth';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

function parseServiceAccount(raw: string): ServiceAccount {
  if (!raw || typeof raw !== 'string') {
    throw new Error('FIREBASE_SERVICE_ACCOUNT is not set or empty.');
  }

  let trimmed = raw.trim().replace(/^\uFEFF/, '');

  // Strip wrapping single or double quotes if present (common when pasting into env configs)
  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    trimmed = trimmed.slice(1, -1).trim();
  }

  let parsed: Record<string, unknown>;
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

  const projectId = (parsed.project_id || parsed.projectId) as string | undefined;
  const clientEmail = (parsed.client_email || parsed.clientEmail) as string | undefined;
  let privateKey = (parsed.private_key || parsed.privateKey || '') as string;

  if (typeof privateKey === 'string') {
    // Handle double-escaped or single-escaped newlines in Vercel env vars
    privateKey = privateKey.replace(/\\n/g, '\n');
  }

  return {
    ...parsed,
    projectId,
    clientEmail,
    privateKey,
  };
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
    projectId: creds.projectId,
  });
}

export function getAdminAuth(): Auth {
  return getAuth(getAdminApp());
}

export function getAdminDb(): Firestore {
  return getFirestore(getAdminApp());
}

export function getAdminStorage(): Storage {
  return getStorage(getAdminApp());
}

export function getAdminEmails(): string[] {
  const raw = process.env.ADMIN_EMAILS || '';
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function getKitchenManagerEmails(): string[] {
  const raw = process.env.KITCHEN_MANAGER_EMAILS || '';
  const parsed = raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (!parsed.includes('kitchen@ibarts.in')) {
    parsed.push('kitchen@ibarts.in');
  }
  return parsed;
}

export function isKitchenBypassEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  return normalized === 'kitchen@ibarts.in' || normalized === 'kitchen-manager@ibarts.in';
}

// Log startup warning if critical auth env vars are missing or if lists overlap
if (typeof process !== 'undefined') {
  const missingEnvVars: string[] = [];
  if (!process.env.ADMIN_EMAILS || !process.env.ADMIN_EMAILS.trim()) {
    missingEnvVars.push('ADMIN_EMAILS');
  }
  if (!process.env.KITCHEN_MANAGER_EMAILS || !process.env.KITCHEN_MANAGER_EMAILS.trim()) {
    missingEnvVars.push('KITCHEN_MANAGER_EMAILS');
  }
  if (!process.env.MASTER_ADMIN_EMAIL || !process.env.MASTER_ADMIN_EMAIL.trim()) {
    missingEnvVars.push('MASTER_ADMIN_EMAIL');
  }

  if (missingEnvVars.length > 0) {
    console.warn(
      `⚠️ [AUTH-ENV-WARNING] Missing or empty role assignment environment variable(s): ${missingEnvVars.join(
        ', '
      )}. Users attempting to log in may default to "employee". Verify your Vercel/environment configuration.`
    );
  }

  const admins = getAdminEmails();
  const kitchen = getKitchenManagerEmails();
  const overlap = admins.filter((e) => kitchen.includes(e));
  if (overlap.length > 0) {
    console.warn(
      `⚠️ [AUTH-CONFIG-WARNING] Email(s) found in BOTH ADMIN_EMAILS and KITCHEN_MANAGER_EMAILS: ${overlap.join(
        ', '
      )}. Admin role will take precedence.`
    );
  }
}

export function isMasterAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  const rawMaster = process.env.MASTER_ADMIN_EMAIL || 'admin@genioussonu.me';
  const masterList = rawMaster
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  return (
    masterList.some((m) => m === normalized) ||
    normalized === 'admin@genioussonu.me' ||
    normalized === 'admin@geniussonu.me'
  );
}

export function isAdminBypassEmail(email: string): boolean {
  return isMasterAdminEmail(email);
}

export function isAdminEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (isAdminBypassEmail(normalized)) return true;
  const admins = getAdminEmails();
  return admins.some((adm) => adm.trim().toLowerCase() === normalized);
}

export function isKitchenManagerEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (isAdminEmail(normalized)) return false; // Admin takes strict precedence
  if (isKitchenBypassEmail(normalized)) return true;
  const kitchenManagers = getKitchenManagerEmails();
  return kitchenManagers.some((km) => km.trim().toLowerCase() === normalized);
}

export function isAllowedEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const normalized = email.trim().toLowerCase();
  if (isMasterAdminEmail(normalized)) return true;
  if (isAdminEmail(normalized)) return true;
  if (isKitchenManagerEmail(normalized)) return true;
  return normalized.endsWith('@ibarts.in');
}


