/**
 * scripts/seed-seats.ts
 *
 * One-time seed script for Newtown Express office floor plan (121 desks):
 *   - 105 desks in bottom workstations (101 to 205)
 *   - 14 desks in top workstations (206 to 219)
 *   - 2 executive cabins (MD Cabin: "MD", Senior Manager Cabin: "MGR")
 *
 * Populates Firestore `seats/{seatId}` and `seatMap/{seatId}` with the real desks.
 *
 * Inspects all users in the `users` collection:
 *   - Identifies employee users whose seatCode points to legacy placeholder grids
 *     or needs re-selection on the accurate new floor plan.
 *   - In --dry-run mode (default): EXPLICITLY prints each affected employee's
 *     name, email, and current seatCode without modifying the database.
 *   - In execution mode (--run): Resets their seatCode to "" so they can select
 *     their exact physical desk against the new map.
 *
 * USAGE:
 *   npx tsx scripts/seed-seats.ts --dry-run
 *   npx tsx scripts/seed-seats.ts --run
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { getAllSeats, isValidSeatId } from '../src/lib/seatLayout';

// ─── Environment Setup ─────────────────────────────────────

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
          if (
            (val.startsWith('"') && val.endsWith('"')) ||
            (val.startsWith("'") && val.endsWith("'"))
          ) {
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

const serviceAccountRaw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
let hasCredentials = false;

if (serviceAccountRaw) {
  try {
    let parsed: Record<string, unknown>;
    const trimmed = serviceAccountRaw.trim();
    if (trimmed.startsWith('{')) {
      parsed = JSON.parse(trimmed);
    } else {
      parsed = JSON.parse(Buffer.from(trimmed, 'base64').toString('utf-8'));
    }
    if (!getApps().length) {
      initializeApp({
        credential: cert(parsed),
      });
    }
    hasCredentials = true;
  } catch (e) {
    console.warn('⚠️ Could not parse FIREBASE_SERVICE_ACCOUNT:', (e as Error).message);
  }
}

const db = hasCredentials ? getFirestore() : null;

// ─── Command Arguments ────────────────────────────────────

const isRun = process.argv.includes('--run') && !process.argv.includes('--dry-run');
const isDryRun = !isRun;

async function runSeed() {
  console.log('====================================================');
  console.log(`📍 NEWTOWN EXPRESS SEAT MAP SEEDING & MIGRATION`);
  console.log(`Mode: ${isDryRun ? '🔍 DRY RUN (No writes will occur)' : '🚀 LIVE EXECUTION (Writing to Firestore)'}`);
  console.log('====================================================\n');

  const allSeats = getAllSeats();
  console.log(`Total real desks in floor plan: ${allSeats.length}`);
  console.log(`- Bottom Workstations: 101 to 205 (105 desks)`);
  console.log(`- Top Workstations:    206 to 219 (14 desks)`);
  console.log(`- Executive Cabins:    MD, MGR    (2 desks)\n`);

  // 1. Inspect existing users
  if (!db) {
    console.log('⚠️ FIREBASE_SERVICE_ACCOUNT is not set in .env.local.');
    console.log('Static audit: All 121 desks defined and ready to seed once credentials are provided.');
    console.log('Add FIREBASE_SERVICE_ACCOUNT to .env.local to scan remote Firestore users and write documents.\n');
    return;
  }

  console.log(`🔍 Scanning Firestore users collection for seat migration...`);
  const usersSnap = await db.collection('users').get();
  
  interface AffectedUser {
    uid: string;
    name: string;
    email: string;
    role: string;
    currentSeatCode: string;
    reason: string;
  }

  const affectedUsers: AffectedUser[] = [];
  const validUsersWithNewSeats: AffectedUser[] = [];

  usersSnap.forEach((doc) => {
    const data = doc.data();
    const role = data.role || 'employee';
    const currentSeat = data.seatCode;

    // Staff accounts don't use desk seats
    if (role === 'admin' || role === 'kitchenManager') {
      return;
    }

    if (!currentSeat) {
      return; // Already has no seatCode
    }

    const name = data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Anonymous';
    const email = data.email || 'No email';

    if (!isValidSeatId(currentSeat)) {
      affectedUsers.push({
        uid: doc.id,
        name,
        email,
        role,
        currentSeatCode: currentSeat,
        reason: 'Legacy placeholder seat code (does not exist in new 121 desks)',
      });
    } else {
      // Valid seat code under new layout
      validUsersWithNewSeats.push({
        uid: doc.id,
        name,
        email,
        role,
        currentSeatCode: currentSeat,
        reason: 'Already on valid new seat',
      });
    }
  });

  console.log(`Found ${usersSnap.size} total users in database.`);
  console.log(`Employees with outdated/placeholder seat codes to reset: ${affectedUsers.length}\n`);

  if (affectedUsers.length > 0) {
    console.log(`----------------------------------------------------`);
    console.log(`AFFECTED EMPLOYEES SCHEDULED FOR SEATCODE RESET:`);
    console.log(`----------------------------------------------------`);
    affectedUsers.forEach((u, i) => {
      console.log(
        `  ${(i + 1).toString().padStart(2, ' ')}. ${u.name} <${u.email}>\n` +
        `      UID: ${u.uid}\n` +
        `      Current SeatCode: "${u.currentSeatCode}" (${u.reason})\n` +
        `      Action: Reset seatCode to "" so they can pick their real desk\n`
      );
    });
    console.log(`----------------------------------------------------\n`);
  } else {
    console.log(`✅ No employees have stale legacy seat codes.\n`);
  }

  if (isDryRun) {
    console.log(`🔎 DRY RUN COMPLETE.`);
    console.log(`No writes were made to Firestore.`);
    console.log(`To apply these changes and seed the 121 desks, re-run with:`);
    console.log(`  npx tsx scripts/seed-seats.ts --run\n`);
    return;
  }

  // ─── EXECUTION MODE: WRITES ─────────────────────────────
  console.log(`🚀 Executing seed and migration...`);

  // A. Seed all 121 seats into `seats/{seatId}` and `seatMap/{seatId}`
  const BATCH_SIZE = 400;
  let batch = db.batch();
  let opCount = 0;

  for (const s of allSeats) {
    const seatRef = db.doc(`seats/${s.seatId}`);
    const seatMapRef = db.doc(`seatMap/${s.seatId}`);

    const seatDocData = {
      seatId: s.seatId,
      zoneId: s.zoneId,
      label: s.label,
      shortCode: s.shortCode,
      updatedAt: FieldValue.serverTimestamp(),
    };

    batch.set(seatRef, seatDocData, { merge: true });
    batch.set(seatMapRef, seatDocData, { merge: true });
    opCount += 2;

    if (opCount >= BATCH_SIZE) {
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    await batch.commit();
    batch = db.batch();
    opCount = 0;
  }
  console.log(`✅ Successfully seeded 121 desks into seats/ and seatMap/ collections.`);

  // B. Reset affected employee seat codes
  if (affectedUsers.length > 0) {
    for (const u of affectedUsers) {
      const userRef = db.doc(`users/${u.uid}`);
      batch.set(
        userRef,
        {
          seatCode: '',
          hasSeenSeatMapResetNotice_v2: false, // Flag for one-time banner
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      opCount++;

      if (opCount >= BATCH_SIZE) {
        await batch.commit();
        batch = db.batch();
        opCount = 0;
      }
    }

    if (opCount > 0) {
      await batch.commit();
    }
    console.log(`✅ Successfully reset ${affectedUsers.length} employee seat codes.`);
  }

  // C. Mark migration status in appConfig/seatMapMigration
  await db.doc('appConfig/seatMapMigration').set({
    version: 'real-office-svg-121',
    migratedAt: FieldValue.serverTimestamp(),
    totalDesks: allSeats.length,
    resetEmployeesCount: affectedUsers.length,
  }, { merge: true });

  console.log(`\n🎉 SEAT MAP MIGRATION COMPLETE! All 121 desks ready.`);
}

runSeed().catch((err) => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
