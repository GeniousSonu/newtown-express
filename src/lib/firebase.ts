import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, setPersistence, browserLocalPersistence, type Auth } from 'firebase/auth';
import { initializeFirestore, getFirestore, setLogLevel, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let analytics: Analytics | null = null;

if (process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Configure Firestore with auto-detect long-polling to prevent WebChannel stream disconnects
    // (common when tabs are idle, backgrounded, on Wi-Fi/mobile or behind network proxies)
    try {
      db = initializeFirestore(app, {
        experimentalAutoDetectLongPolling: true,
      });
    } catch {
      db = getFirestore(app);
    }

    storage = getStorage(app);

    if (typeof window !== 'undefined') {
      // Suppress transient WebChannel internal stream drop notices in browser console
      try {
        setLogLevel('error');
      } catch {}

      if (auth) {
        setPersistence(auth, browserLocalPersistence).catch((err) => {
          console.warn('[FIREBASE] setPersistence warning:', err);
        });
      }
      isAnalyticsSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('[FIREBASE] Initialization error:', err);
  }
}

export { app, auth, db, storage, analytics };

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || !app) return null;
  try {
    const supported = await isMessagingSupported();
    if (supported) {
      return getMessaging(app);
    }
  } catch (err) {
    console.warn('Firebase Messaging not supported in this browser:', err);
  }
  return null;
}
