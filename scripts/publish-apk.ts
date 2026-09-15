/**
 * Script to publish the Android APK to Firebase Storage and update
 * the appConfig/androidApp Firestore configuration document.
 */
import fs from 'fs';
import path from 'path';
import { initializeApp as initClientApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Load environment variables from .env.local
const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx > 0) {
      const key = trimmed.substring(0, eqIdx).trim();
      const val = trimmed.substring(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

async function publish() {
  const versionFile = path.resolve(process.cwd(), 'version.json');
  if (!fs.existsSync(versionFile)) {
    throw new Error('version.json not found!');
  }
  const versionData = JSON.parse(fs.readFileSync(versionFile, 'utf8'));
  const { versionCode, versionName } = versionData;

  const apkPath = path.resolve(process.cwd(), 'public/newtown-express.apk');
  if (!fs.existsSync(apkPath)) {
    throw new Error(`APK file not found at ${apkPath}`);
  }

  const apkBuffer = fs.readFileSync(apkPath);
  console.log(`Loaded APK (${(apkBuffer.length / (1024 * 1024)).toFixed(2)} MB) for version ${versionName} (code ${versionCode})`);

  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  const app = initClientApp(firebaseConfig);
  const clientDb = getFirestore(app);
  let finalDownloadUrl = '/newtown-express.apk';

  try {
    const storageInstance = getStorage(app);
    const storagePath = `apk/newtown-express-v${versionCode}.apk`;
    const storageRef = ref(storageInstance, storagePath);

    console.log(`Uploading to Firebase Storage: ${storagePath}...`);
    await uploadBytes(storageRef, apkBuffer, {
      contentType: 'application/vnd.android.package-archive',
      cacheControl: 'public, max-age=31536000',
    });

    finalDownloadUrl = await getDownloadURL(storageRef);
    console.log(`✅ Uploaded to Firebase Storage: ${finalDownloadUrl}`);
  } catch (storageErr) {
    console.warn('⚠️ Firebase Storage upload failed, using direct host path fallback:', (storageErr as Error).message);
  }

  // Update Firestore config
  console.log('Syncing appConfig/androidApp doc in Firestore...');
  const configRef = doc(clientDb, 'appConfig', 'androidApp');
  await setDoc(
    configRef,
    {
      versionCode,
      versionName,
      latestVersion: versionName,
      apkUrl: finalDownloadUrl,
      downloadUrl: finalDownloadUrl,
      fileName: `newtown-express-v${versionCode}.apk`,
      updatedAt: Date.now(),
      updatedAtISO: new Date().toISOString(),
    },
    { merge: true }
  );

  console.log('✅ Firestore config appConfig/androidApp successfully updated!');
  console.log({
    versionCode,
    versionName,
    apkUrl: finalDownloadUrl,
  });
}

publish()
  .then(() => {
    console.log('Publish workflow complete.');
    process.exit(0);
  })
  .catch((err) => {
    console.error('Publish workflow error:', err);
    process.exit(1);
  });
