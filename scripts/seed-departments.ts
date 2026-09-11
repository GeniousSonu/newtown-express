import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';

function loadLocalEnv() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
    const envLocalPath = path.resolve(process.cwd(), '.env.local');
    if (fs.existsSync(envLocalPath)) {
      const content = fs.readFileSync(envLocalPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (!process.env[key]) {
            process.env[key] = val;
          }
        }
      }
    }
  }
}
loadLocalEnv();

const DEFAULT_DEPARTMENTS = [
  'Engineering',
  'Design',
  'Sales',
  'Ops',
  'HR',
  'Other',
];

async function seedDepartments() {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!sa) {
    console.error('FIREBASE_SERVICE_ACCOUNT not found.');
    process.exit(1);
  }

  const credentials = JSON.parse(sa);
  const app = getApps().length ? getApps()[0] : initializeApp({ credential: cert(credentials) });
  const db = getFirestore(app);

  console.log('[SEED] Seeding appConfig/departments...');
  await db.collection('appConfig').doc('departments').set(
    {
      list: DEFAULT_DEPARTMENTS,
      updatedAt: new Date(),
    },
    { merge: true }
  );
  console.log('✅ Successfully seeded appConfig/departments:', DEFAULT_DEPARTMENTS);
}

seedDepartments()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Failed to seed departments:', err);
    process.exit(1);
  });
