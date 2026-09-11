/**
 * scripts/seed-allowlist.ts
 *
 * ONE-TIME bulk import of real ibarts.in staff into the employeeAllowlist
 * Firestore collection, so OTP sending only ever fires for real registered
 * addresses (see the allowlist + accessRequests design already implemented).
 *
 * Also stores each person's real name against their email, so verify-otp
 * can pre-fill displayName on first login instead of leaving it blank.
 *
 * USAGE (run locally, once, from the project root):
 *   npx tsx scripts/seed-allowlist.ts
 *   npx tsx scripts/seed-allowlist.ts --dry-run
 *
 * Requires FIREBASE_SERVICE_ACCOUNT to be set in your local .env (same
 * credential already used by the app's server routes). Never run this
 * against production without reviewing the DRY_RUN output first.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import fs from "fs";
import path from "path";

// Auto-load .env.local if FIREBASE_SERVICE_ACCOUNT is not in process.env
function loadLocalEnv() {
  if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
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
}
loadLocalEnv();

// ---- SAFETY SWITCH ----
// Set to false only when you're ready to actually write to Firestore.
// Pass --dry-run or set DRY_RUN=true to perform a dry run.
const DRY_RUN = process.argv.includes("--dry-run") || process.env.DRY_RUN === "true";

const DOMAIN = "ibarts.in";

// name -> local part (before @ibarts.in). Verified against the list you
// provided. Two special-case entries (Sudipta, admin@genioussonu.me) are
// appended at the bottom with notes.
const STAFF: { name: string; localPart: string }[] = [
  { name: "Syed Adnan Hussain", localPart: "syedadnan" },
  { name: "Abhishek Biswas", localPart: "abhishek_biswas" },
  { name: "Aditya", localPart: "aditya_trainee" },
  { name: "Akash Mistry", localPart: "akash" },
  { name: "Akhilesh Jha", localPart: "akhilesh_jha" },
  { name: "Ambar Kumar Dhara", localPart: "ambardhara" },
  { name: "Amrita", localPart: "amrita_hr" },
  { name: "Anik Karmakar", localPart: "anik_karmakar" },
  { name: "Anit Ashwani", localPart: "anit" },
  { name: "Ankita Chandra", localPart: "ankita18_ibarts" },
  { name: "Anushree", localPart: "anushree" },
  { name: "Argha", localPart: "arghaseal" },
  { name: "Athar Ansari", localPart: "atharansari" },
  { name: "Baibhav Singh", localPart: "baibhav_ios" },
  { name: "Bappa", localPart: "bappa" },
  { name: "Bikram Mondal", localPart: "bikram" },
  { name: "Bishal Chatterjee", localPart: "bishal_intern" },
  { name: "Bratin Kanrar", localPart: "bratin" },
  { name: "Bristy", localPart: "bristy" },
  { name: "Chandan", localPart: "chandan_ibarts_ceo" },
  { name: "Chandan Dutta", localPart: "chandan_d" },
  { name: "Chandrima", localPart: "chandrima" },
  { name: "Chittadeep Biswas", localPart: "chittadeep" },
  { name: "Debabrata", localPart: "debabrata" },
  { name: "Debalina Samanta", localPart: "debalina_hr_executive" },
  { name: "Debasish", localPart: "debasish" },
  { name: "Dhiraj Kumar Singh", localPart: "dhiraj" },
  { name: "Dipshikha", localPart: "dipshikha" },
  { name: "Divya", localPart: "divya_trainee" },
  { name: "Ejaj", localPart: "ejaj" },
  { name: "Faisal", localPart: "faisal" },
  { name: "Gaurav H", localPart: "gaurav_h" },
  { name: "Gauri Shankar Prasad", localPart: "gauri" },
  { name: "Kanak", localPart: "kanak" },
  { name: "Kousik Barik", localPart: "kousik_barik" },
  { name: "Kumar Akshat", localPart: "kumarakshat" },
  { name: "Kundan Kumar", localPart: "kundan_kumar" },
  { name: "Lakshya", localPart: "lakshya" },
  { name: "Manish Kumar", localPart: "kumarmanish" },
  { name: "Md Shahil", localPart: "shahil_intern" },
  { name: "Moumita", localPart: "moumita" },
  { name: "Niladri", localPart: "niladri" },
  { name: "Om Prakash", localPart: "omprakash" },
  { name: "Pawan Kumar", localPart: "pawanroy2234" },
  { name: "Piyush Kumar", localPart: "piyush_se" },
  { name: "Prashant Kumar", localPart: "prashant" },
  { name: "Prashant Prasad", localPart: "prashant_prasad" },
  { name: "Prem", localPart: "prem" },
  { name: "Prem Chand Prasad", localPart: "prem_" },
  { name: "Prince", localPart: "prince" },
  { name: "Pritam Pachal", localPart: "pritam_ios" },
  { name: "Protik Nandi", localPart: "protik" },
  { name: "Rahul Kumar", localPart: "rahul" },
  { name: "Raj", localPart: "rajdip" },
  { name: "Raj", localPart: "raj_trainee" },
  { name: "Rajesh", localPart: "rajesh" },
  { name: "Rajesh Kumbhakar", localPart: "rajesh_k" },
  { name: "Rakesh Howlader", localPart: "rakesh_howlader" },
  { name: "Rani Kumari", localPart: "ranikumari1901" },
  { name: "Rinku Karmakar", localPart: "rinku_karmakar" },
  { name: "Rishav", localPart: "rishav" },
  { name: "Ritu", localPart: "ritu" },
  { name: "Sahinur", localPart: "sahinur" },
  { name: "Sampriti", localPart: "sampriti" },
  { name: "Sandip Shaw", localPart: "sandip_shaw" },
  { name: "Sanjay Maity", localPart: "sanjay" },
  { name: "Sanu", localPart: "sanu" },
  { name: "Sarthak Chakraborty", localPart: "sarthak_trainee" },
  { name: "Saumok Kundu", localPart: "saumok" },
  { name: "Saumyarup", localPart: "saumyarup" },
  { name: "Shakyosingha Dutta", localPart: "shakyosingha" },
  { name: "Shamim Azaz", localPart: "shamim_seo" },
  { name: "Shashank Ranjan", localPart: "shashank" },
  { name: "Shilpa", localPart: "shilpa" },
  { name: "Shilpa Mukherjee", localPart: "shilpa_mukherjee" },
  { name: "Shitanshu Ranjan", localPart: "shitanshu" },
  { name: "Shivam", localPart: "shivam_" },
  { name: "Shrija Das", localPart: "shrija" },
  { name: "Shubhayan Saha", localPart: "shubhayan" },
  { name: "Snigdho Das", localPart: "snigdho" },
  { name: "Sonali", localPart: "sonali" },
  { name: "Soumen", localPart: "soumen" },
  { name: "Soumyanil Das", localPart: "soumyanil_das_ib_arts" },
  { name: "Sourav Bose", localPart: "souravbose" },
  { name: "Sourav Karmakar", localPart: "managing_director" },
  { name: "Souryam", localPart: "souryam" },
  { name: "Soutik", localPart: "soutik" },
  { name: "Souvik Das", localPart: "souvik_das" },
  { name: "Souvik Dutta", localPart: "souvikdutta" },
  { name: "Srijan Paul", localPart: "srijan_trainee" },
  { name: "Subhajit Sau", localPart: "subhajit_sau" },
  { name: "Sujit Kar", localPart: "sujit" },
  { name: "Sulagna Sarkar", localPart: "sulagna_sarkar" },
  { name: "Suman Das", localPart: "suman_das" },
  { name: "Sumit Goswami", localPart: "sumit_goswami" },
  { name: "Sumit Mondal", localPart: "sumit_mondal" },
  { name: "Sunanda Raj", localPart: "sunanda_raj" },
  { name: "Sushmita", localPart: "sushmita" },
  { name: "Tanushri Chatterjee", localPart: "tanushri" },
  { name: "Tapan Nayak", localPart: "tapan" },
  { name: "Ujjawal", localPart: "ujjawal" },
  { name: "Vaswaty Halder", localPart: "vaswaty" },
  { name: "Vikash Oraon", localPart: "vikashoraon" },
  { name: "Vishal Prasad", localPart: "vishalprasad" },
  { name: "Yukti Adhikary", localPart: "yuktiadhikary" },

  // --- Added per project owner's request ---
  // Sudipta is also in ADMIN_EMAILS and bypasses the allowlist check at
  // login, but is included here too so his name/record exists consistently
  // if his role ever changes. Last name unknown — fix in the Bulk Import /
  // Access Requests admin screen once known.
  { name: "Sudipta", localPart: "sudipta" },
];

// NOTE: admin@genioussonu.me is intentionally NOT included here.
// It's off the ibarts.in domain and is handled entirely by the
// ADMIN_EMAILS allowlist bypass in send-otp — it should never be written
// into employeeAllowlist.

function buildRecords() {
  const seen = new Set<string>();
  const records: { email: string; name: string }[] = [];
  const duplicates: string[] = [];

  for (const { name, localPart } of STAFF) {
    const email = `${localPart.trim().toLowerCase()}@${DOMAIN}`;
    if (seen.has(email)) {
      duplicates.push(email);
      continue;
    }
    seen.add(email);
    records.push({ email, name: name.trim() });
  }

  return { records, duplicates };
}

async function main() {
  const { records, duplicates } = buildRecords();

  console.log(`Prepared ${records.length} allowlist records.`);
  if (duplicates.length > 0) {
    console.warn("⚠️  Duplicate emails skipped:", duplicates);
  }

  if (DRY_RUN) {
    console.log("\n--- DRY RUN: no writes performed ---");
    console.log(records.slice(0, 5), "... (showing first 5 of", records.length, ")");
    console.log("\nRun without --dry-run (or DRY_RUN=false) to actually write to Firestore.");
    return;
  }

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) {
    throw new Error("FIREBASE_SERVICE_ACCOUNT env var is not set. Aborting.");
  }
  const serviceAccount = JSON.parse(
    raw.trim().startsWith("{") ? raw : Buffer.from(raw, "base64").toString("utf-8")
  );

  if (!getApps().length) {
    initializeApp({ credential: cert(serviceAccount) });
  }
  const db = getFirestore();

  // Firestore batches max out at 500 operations — this list is well under
  // that, so a single batch is fine. If the staff list ever grows past
  // ~450, chunk this into multiple batches.
  const batch = db.batch();
  const now = new Date();

  for (const { email, name } of records) {
    const ref = db.collection("employeeAllowlist").doc(email);
    batch.set(ref, {
      email,
      name,
      addedAt: now,
      addedBy: "bulk-import-seed",
    });
  }

  await batch.commit();
  console.log(`✅ Wrote ${records.length} records to employeeAllowlist.`);
}

main().catch((err) => {
  console.error("Seed script failed:", err);
  process.exit(1);
});
