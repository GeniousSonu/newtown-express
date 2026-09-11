import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getMessaging, isSupported as isMessagingSupported, type Messaging } from 'firebase/messaging';
import { getAnalytics, isSupported as isAnalyticsSupported, type Analytics } from 'firebase/analytics';

export const isMockMode = !process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'mock-api-key',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'mock-project.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'mock-project',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'mock-project.firebasestorage.app',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '715745223331',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '1:715745223331:web:30619698052d38fe091516',
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID || 'G-VGFZ6XZPLH',
};

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;
let googleProvider: GoogleAuthProvider | null = null;
let analytics: Analytics | null = null;

if (!isMockMode) {
  try {
    app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ hd: 'ibarts.in' });

    if (typeof window !== 'undefined') {
      isAnalyticsSupported().then((supported) => {
        if (supported && app) {
          analytics = getAnalytics(app);
        }
      }).catch(() => {});
    }
  } catch (err) {
    console.error('Failed to initialize Firebase:', err);
  }
}

export { app, auth, db, storage, googleProvider, analytics };

export async function getMessagingInstance(): Promise<Messaging | null> {
  if (typeof window === 'undefined' || isMockMode || !app) return null;
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
