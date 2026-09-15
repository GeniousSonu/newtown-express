/**
 * scripts/seed-menu.ts
 *
 * URGENT RESTORE SCRIPT — populates the real menu into Firestore's
 * menuItems collection. This is the actual root-cause fix for menu items
 * disappearing: they were likely never written to Firestore as real
 * documents, only ever displayed via a mock-data merge that was
 * (correctly) removed in an earlier production-hardening pass.
 *
 * USAGE:
 *   npx tsx scripts/seed-menu.ts --dry-run   (Dry run preview)
 *   npx tsx scripts/seed-menu.ts             (Live write to Firestore)
 *
 * Supports both Firebase Admin SDK (via FIREBASE_SERVICE_ACCOUNT or --key=...)
 * and Firebase Client SDK (via .env.local public config).
 */

import { initializeApp as initAdminApp, cert, getApps as getAdminApps } from "firebase-admin/app";
import { getFirestore as getAdminFirestore } from "firebase-admin/firestore";
import { initializeApp as initClientApp } from "firebase/app";
import { getFirestore as getClientFirestore, doc, writeBatch } from "firebase/firestore";
import fs from "fs";
import path from "path";

// Auto-load .env.local if not already in process.env
function loadLocalEnv() {
  const envLocalPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eqIdx = trimmed.indexOf("=");
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
loadLocalEnv();

const DRY_RUN = process.argv.includes("--dry-run");

type HealthTag = "light" | "balanced" | "indulgent";

interface SeedAddonOption {
  name: string;
  priceDelta: number;
  calorieDelta: number;
}

interface SeedAddonGroup {
  groupName: string;
  required: boolean;
  multiSelect: boolean;
  options: SeedAddonOption[];
}

interface SeedItem {
  name: string;
  category: string;
  price: number;
  calories: number;
  healthTag: HealthTag;
  hasExtras: boolean; // whether the shared "Extras" addon group applies
}

// Shared addon group, attached only to items where it makes sense
// (not beverages/popcorn).
const EXTRAS_GROUP: SeedAddonGroup = {
  groupName: "Extras",
  required: false,
  multiSelect: true,
  options: [
    { name: "Extra Ketchup", priceDelta: 2, calorieDelta: 20 },
    { name: "Extra Butter", priceDelta: 8, calorieDelta: 70 },
    { name: "Extra Cheese", priceDelta: 10, calorieDelta: 60 },
  ],
};

const ITEMS: SeedItem[] = [
  // Healthy Snacks
  { name: "Bread Butter / Jam", category: "Healthy Snacks", price: 10, calories: 150, healthTag: "light", hasExtras: true },
  { name: "Sandwich", category: "Healthy Snacks", price: 20, calories: 200, healthTag: "balanced", hasExtras: true },
  { name: "Bread Omelette", category: "Healthy Snacks", price: 17, calories: 250, healthTag: "balanced", hasExtras: true },
  { name: "Omelette / Poach", category: "Healthy Snacks", price: 12, calories: 180, healthTag: "balanced", hasExtras: false },
  { name: "Boiled Egg", category: "Healthy Snacks", price: 10, calories: 78, healthTag: "light", hasExtras: false },
  { name: "Oats", category: "Healthy Snacks", price: 20, calories: 150, healthTag: "light", hasExtras: false },

  // Sandwiches
  { name: "Single Cheese Veggie Sandwich", category: "Sandwiches", price: 20, calories: 220, healthTag: "balanced", hasExtras: true },
  { name: "Double Cheese Sandwich", category: "Sandwiches", price: 30, calories: 320, healthTag: "balanced", hasExtras: true },
  { name: "Egg Cheese Sandwich with Veggies", category: "Sandwiches", price: 40, calories: 350, healthTag: "indulgent", hasExtras: true },

  // Maggi / Pasta
  { name: "Maggi", category: "Maggi / Pasta", price: 25, calories: 350, healthTag: "indulgent", hasExtras: true },
  { name: "Egg Maggi", category: "Maggi / Pasta", price: 35, calories: 430, healthTag: "indulgent", hasExtras: true },
  { name: "Egg Maggi Special Masala", category: "Maggi / Pasta", price: 40, calories: 450, healthTag: "indulgent", hasExtras: true },
  { name: "Maggi Special Masala", category: "Maggi / Pasta", price: 30, calories: 370, healthTag: "indulgent", hasExtras: true },
  { name: "Pasta", category: "Maggi / Pasta", price: 30, calories: 300, healthTag: "balanced", hasExtras: true },
  { name: "Egg Pasta", category: "Maggi / Pasta", price: 40, calories: 380, healthTag: "indulgent", hasExtras: true },

  // Beverages
  { name: "Maaza / Slice", category: "Beverages", price: 20, calories: 150, healthTag: "light", hasExtras: false },
  { name: "Coke / Thums Up", category: "Beverages", price: 20, calories: 140, healthTag: "light", hasExtras: false },
  { name: "Limca / Sprite / 7UP", category: "Beverages", price: 20, calories: 130, healthTag: "light", hasExtras: false },
  { name: "Tea", category: "Beverages", price: 15, calories: 40, healthTag: "light", hasExtras: false },
  { name: "Coffee", category: "Beverages", price: 20, calories: 60, healthTag: "light", hasExtras: false },

  // Specials
  { name: "Popcorn", category: "Specials", price: 10, calories: 110, healthTag: "light", hasExtras: false },
];

async function main() {
  console.log(`Prepared ${ITEMS.length} menu items to restore.`);

  if (DRY_RUN) {
    console.log("\n--- DRY RUN: no writes performed ---");
    ITEMS.forEach((item) =>
      console.log(`  ${item.category.padEnd(16)} | ${item.name.padEnd(35)} ₹${item.price} | ${item.calories} kcal | ${item.healthTag}${item.hasExtras ? " | +Extras addon" : ""}`)
    );
    console.log("\nSet DRY_RUN = false or run without --dry-run to actually write to Firestore.");
    return;
  }

  let raw = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  const keyArg = process.argv.find((a) => a.startsWith("--key="));
  if (!raw && keyArg) {
    const keyPath = path.resolve(process.cwd(), keyArg.split("=")[1]);
    if (fs.existsSync(keyPath)) {
      raw = fs.readFileSync(keyPath, "utf-8");
    }
  }

  // 1. Try Firebase Admin SDK first if service account is available
  if (raw) {
    console.log("Connecting via Firebase Admin SDK...");
    const trimmed = raw.trim();
    const serviceAccount = JSON.parse(
      trimmed.startsWith("{") ? trimmed : Buffer.from(trimmed, "base64").toString("utf-8")
    );

    if (!getAdminApps().length) {
      initAdminApp({ credential: cert(serviceAccount) });
    }
    const adminDb = getAdminFirestore();
    const batch = adminDb.batch();

    // Clean up legacy incomplete docs if present
    for (const legacyId of ["bev-3", "snack-1", "snack-3"]) {
      batch.delete(adminDb.collection("menuItems").doc(legacyId));
    }

    for (const item of ITEMS) {
      const id = item.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

      const ref = adminDb.collection("menuItems").doc(id);
      batch.set(
        ref,
        {
          id,
          name: item.name,
          category: item.category.toUpperCase(),
          price: item.price,
          calories: item.calories,
          healthTag: item.healthTag,
          description: "",
          imageUrl: "",
          isAvailable: true,
          addonGroups: item.hasExtras ? [EXTRAS_GROUP] : [],
          sortOrder: 0,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    }

    await batch.commit();
    console.log(`✅ Restored ${ITEMS.length} menu items to Firestore via Firebase Admin SDK.`);
    return;
  }

  // 2. Fallback to Firebase Client SDK using public project config
  console.log("Connecting via Firebase Client SDK (using project configuration)...");
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (!apiKey || !projectId) {
    throw new Error("Neither FIREBASE_SERVICE_ACCOUNT nor NEXT_PUBLIC_FIREBASE_PROJECT_ID is set in .env.local. Aborting.");
  }

  const clientApp = initClientApp({
    apiKey,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });

  const clientDb = getClientFirestore(clientApp);
  const clientBatch = writeBatch(clientDb);

  // Clean up legacy incomplete docs if present
  for (const legacyId of ["bev-3", "snack-1", "snack-3"]) {
    clientBatch.delete(doc(clientDb, "menuItems", legacyId));
  }

  for (const item of ITEMS) {
    const id = item.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const docRef = doc(clientDb, "menuItems", id);
    clientBatch.set(
      docRef,
      {
        id,
        name: item.name,
        category: item.category.toUpperCase(),
        price: item.price,
        calories: item.calories,
        healthTag: item.healthTag,
        description: "",
        imageUrl: "",
        isAvailable: true,
        addonGroups: item.hasExtras ? [EXTRAS_GROUP] : [],
        sortOrder: 0,
        updatedAt: Date.now(),
      },
      { merge: true }
    );
  }

  await clientBatch.commit();
  console.log(`✅ Restored ${ITEMS.length} menu items to Firestore via Firebase Client SDK.`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
