'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';
import {
  setUserSessionCookie,
  getUserSessionCookie,
  clearUserSessionCookie,
  setCachedData,
  getCachedData,
  removeCachedData,
  CACHE_KEYS,
} from '@/lib/cache';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  isKitchenManager: boolean;
  isKitchenStaff: boolean;
  canOrderForSelf: boolean;
  sessionAlertMessage: string | null;
  clearSessionAlert: () => void;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; role: UserRole; canOrderForSelf?: boolean; customToken?: string }>;
  signOut: (reason?: string) => Promise<void>;
  updateSeatCode: (seatCode: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  getIdToken: (forceRefresh?: boolean) => Promise<string>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    if (typeof window === 'undefined') return null;
    const cookieUser = getUserSessionCookie();
    if (cookieUser) return cookieUser;
    const cached = getCachedData<UserProfile>(CACHE_KEYS.USER_SESSION);
    if (cached?.data) return cached.data;
    const fallback = localStorage.getItem('ntx_session_fallback');
    if (fallback) {
      try {
        return JSON.parse(fallback);
      } catch {}
    }
    return null;
  });

  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const cookieUser = getUserSessionCookie();
    if (cookieUser) return false;
    const cached = getCachedData<UserProfile>(CACHE_KEYS.USER_SESSION);
    if (cached?.data) return false;
    const fallback = localStorage.getItem('ntx_session_fallback');
    if (fallback) {
      try {
        const parsed = JSON.parse(fallback);
        if (parsed?.uid) return false;
      } catch {}
    }
    return Boolean(auth);
  });
  const [sessionAlertMessage, setSessionAlertMessage] = useState<string | null>(null);

  // 4-second grace period ref after fresh verification to prevent snapshot race condition
  const justLoggedInRef = useRef<number>(0);
  const expiryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const clearSessionAlert = useCallback(() => {
    setSessionAlertMessage(null);
  }, []);

  const scheduleExpiryTimer = useCallback((expiresAtMs: number, onExpire: (reason: string) => void) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    const msRemaining = expiresAtMs - Date.now();
    if (msRemaining <= 0) {
      onExpire('Your 24-hour session has expired. Please log in again.');
      return;
    }
    expiryTimerRef.current = setTimeout(() => {
      onExpire('Your 24-hour session has expired. Please log in again.');
    }, msRemaining);
  }, []);

  const signOut = useCallback(async (reason?: string) => {
    if (expiryTimerRef.current) {
      clearTimeout(expiryTimerRef.current);
      expiryTimerRef.current = null;
    }
    if (reason) {
      setSessionAlertMessage(reason);
    }
    try {
      if (auth?.currentUser && db) {
        await updateDoc(doc(db, 'users', auth.currentUser.uid), { activeSessionId: null }).catch(() => {});
      }
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('[AUTH] Firebase signOut error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        clearUserSessionCookie();
        removeCachedData(CACHE_KEYS.USER_SESSION);
        localStorage.removeItem('ntx_session_id');
        localStorage.removeItem('ntx_session_expires_at');
        localStorage.removeItem('ntx_session_fallback');
        localStorage.removeItem('ntx_session_token');
      }
      setUser(null);
    }
  }, []);

  const getIdToken = useCallback(async (forceRefresh = false): Promise<string> => {
    if (auth?.currentUser) {
      try {
        const t = await auth.currentUser.getIdToken(forceRefresh);
        if (t) return t;
      } catch (err) {
        console.warn('[AUTH] auth.currentUser.getIdToken error, using fallback token:', err);
      }
    }

    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('ntx_session_token');
      if (stored) return stored;

      const fallback = localStorage.getItem('ntx_session_fallback');
      if (fallback) {
        try {
          const parsed = JSON.parse(fallback);
          if (parsed?.customToken) return parsed.customToken;
        } catch {}
      }
    }

    if (user?.uid) {
      return `dev_token_${user.uid}`;
    }

    throw new Error('Authentication required. Please log in.');
  }, [user]);

  // Sync session on mount via Firebase Auth & real-time Firestore user doc
  useEffect(() => {
    if (!auth) {
      return;
    }

    // Immediate client-side 24h session check before waiting for network
    if (typeof window !== 'undefined') {
      const storedExpiresAt = localStorage.getItem('ntx_session_expires_at');
      if (storedExpiresAt && Date.now() >= Number(storedExpiresAt)) {
        queueMicrotask(() => {
          signOut('Your 24-hour session has expired. Please log in again.');
          setLoading(false);
        });
        return;
      }
    }

    let userDocUnsubscribe: Unsubscribe | null = null;

    const authUnsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
        userDocUnsubscribe = null;
      }

      if (!firebaseUser) {
        if (typeof window !== 'undefined') {
          const saved = localStorage.getItem('ntx_session_fallback');
          if (saved) {
            try {
              const parsed = JSON.parse(saved);
              if (parsed && parsed.email && parsed.role) {
                setUser(parsed);
                setLoading(false);
                return;
              }
            } catch {}
          }
        }
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const isRecentLogin = Date.now() - justLoggedInRef.current < 15000;
        const tokenResult = await firebaseUser.getIdTokenResult(isRecentLogin);
        const emailLower = (firebaseUser.email || '').trim().toLowerCase();
        const isKnownKitchen = emailLower === 'kitchen@ibarts.in' || emailLower === 'kitchen-manager@ibarts.in';
        const isKnownAdmin = emailLower === 'admin@genioussonu.me' || emailLower === 'sudipta@ibarts.in';

        // Listen in real-time to users/{uid} document
        if (db) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          userDocUnsubscribe = onSnapshot(
            userDocRef,
            (snap) => {
              const data = snap.data();
              const firestoreSessionId = data?.activeSessionId;
              const firestoreExpiresAt = data?.sessionExpiresAt;

              const localSessionId = typeof window !== 'undefined' ? localStorage.getItem('ntx_session_id') : null;
              const localExpiresAt = typeof window !== 'undefined' ? Number(localStorage.getItem('ntx_session_expires_at')) : null;
              const effectiveExpiresAt = firestoreExpiresAt || localExpiresAt;

              // Check 24-hour expiry
              if (effectiveExpiresAt) {
                if (Date.now() >= effectiveExpiresAt) {
                  signOut('Your 24-hour session has expired. Please log in again.');
                  return;
                }
                scheduleExpiryTimer(effectiveExpiresAt, signOut);
              }

              // Resilient role resolution: never downgrade kitchenManager to employee
              const rawRole = (tokenResult.claims.role as UserRole) || (data?.role as UserRole);
              const effectiveRole: UserRole =
                rawRole ||
                (isKnownKitchen ? 'kitchenManager' : isKnownAdmin ? 'admin' : 'employee');

              const effectiveCanOrder =
                typeof data?.canOrderForSelf === 'boolean'
                  ? data.canOrderForSelf
                  : Boolean(tokenResult.claims.canOrderForSelf || isKnownAdmin);

              // Single-device enforcement: EXEMPT admin and kitchenManager (dedicated kitchen devices!)
              if (effectiveRole === 'employee') {
                const isGracePeriod = Date.now() - justLoggedInRef.current < 4000;
                if (!isGracePeriod && firestoreSessionId && localSessionId && firestoreSessionId !== localSessionId) {
                  signOut("You've been logged out because your account was signed in on another device.");
                  return;
                }
              }

              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || data?.email || '',
                displayName: (data?.displayName ?? firebaseUser.displayName) || (isKnownKitchen ? 'Kitchen Manager' : ''),
                role: effectiveRole,
                canOrderForSelf: effectiveCanOrder,
                activeSessionId: firestoreSessionId || localSessionId,
                sessionExpiresAt: effectiveExpiresAt,
                firstName: data?.firstName || '',
                lastName: data?.lastName || '',
                department: data?.department || (isKnownKitchen ? 'Kitchen' : ''),
                photoURL: data?.photoURL || firebaseUser.photoURL || null,
                seatCode: data?.seatCode || (effectiveRole === 'admin' || effectiveRole === 'kitchenManager' ? undefined : ''),
                profileComplete: effectiveRole === 'admin' || effectiveRole === 'kitchenManager' ? true : Boolean(data?.profileComplete),
                createdAt: data?.createdAt?.toMillis?.() || data?.createdAt,
                updatedAt: data?.updatedAt?.toMillis?.() || data?.updatedAt,
              };
              setUser(profile);
              setUserSessionCookie(profile, effectiveExpiresAt || Date.now() + 24 * 60 * 60 * 1000);
              setCachedData(CACHE_KEYS.USER_SESSION, profile, 24 * 60 * 60 * 1000);
              setLoading(false);
            },
            (err) => {
              console.warn('[AUTH] Real-time user profile listener error:', err);
              const effectiveRole: UserRole =
                (tokenResult.claims.role as UserRole) ||
                (isKnownKitchen ? 'kitchenManager' : isKnownAdmin ? 'admin' : 'employee');
              const fallbackObj: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || (isKnownKitchen ? 'Kitchen Manager' : ''),
                role: effectiveRole,
                canOrderForSelf: isKnownAdmin || Boolean(tokenResult.claims.canOrderForSelf),
                seatCode: effectiveRole === 'admin' || effectiveRole === 'kitchenManager' ? undefined : '',
                profileComplete: effectiveRole === 'admin' || effectiveRole === 'kitchenManager',
              };
              setUser(fallbackObj);
              setUserSessionCookie(fallbackObj, Date.now() + 24 * 60 * 60 * 1000);
              setCachedData(CACHE_KEYS.USER_SESSION, fallbackObj, 24 * 60 * 60 * 1000);
              setLoading(false);
            }
          );
        } else {
          const effectiveRole: UserRole =
            (tokenResult.claims.role as UserRole) ||
            (isKnownKitchen ? 'kitchenManager' : isKnownAdmin ? 'admin' : 'employee');
          const fallbackObj: UserProfile = {
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || (isKnownKitchen ? 'Kitchen Manager' : ''),
            role: effectiveRole,
            canOrderForSelf: isKnownAdmin || Boolean(tokenResult.claims.canOrderForSelf),
            seatCode: effectiveRole === 'admin' || effectiveRole === 'kitchenManager' ? undefined : '',
            profileComplete: effectiveRole === 'admin' || effectiveRole === 'kitchenManager',
          };
          setUser(fallbackObj);
          setUserSessionCookie(fallbackObj, Date.now() + 24 * 60 * 60 * 1000);
          setCachedData(CACHE_KEYS.USER_SESSION, fallbackObj, 24 * 60 * 60 * 1000);
          setLoading(false);
        }
      } catch (err) {
        console.error('[AUTH] Failed to resolve user session:', err);
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      authUnsubscribe();
      if (userDocUnsubscribe) {
        userDocUnsubscribe();
      }
      if (expiryTimerRef.current) {
        clearTimeout(expiryTimerRef.current);
      }
    };
  }, [scheduleExpiryTimer, signOut]);

  // Request 6-digit OTP code via server API
  const sendOtp = async (email: string) => {
    let res: Response;
    try {
      res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } catch (netErr: unknown) {
      throw new Error((netErr as Error)?.message || 'Network error while connecting to server.');
    }

    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const serverMsg = (data?.error as string) || (text && text.length < 300 ? text : `Server request failed (${res.status})`);
      throw new Error(serverMsg);
    }

    return {
      success: Boolean(data?.success ?? true),
      message: typeof data?.message === 'string' ? data.message : undefined,
    };
  };

  // Verify OTP, retrieve custom token, and sign in to Firebase Auth
  const verifyOtp = async (email: string, code: string) => {
    let res: Response;
    try {
      res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
    } catch (netErr: unknown) {
      throw new Error((netErr as Error)?.message || 'Network error while connecting to server.');
    }

    const text = await res.text();
    let data: Record<string, unknown> | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const serverMsg = (data?.error as string) || (text && text.length < 300 ? text : `Verification failed (${res.status})`);
      throw new Error(serverMsg);
    }

    const { customToken, role, canOrderForSelf, activeSessionId, sessionExpiresAt } = (data || {}) as {
      customToken: string;
      role: string;
      canOrderForSelf?: boolean;
      activeSessionId?: string;
      sessionExpiresAt?: number;
      isDevFallback?: boolean;
      uid?: string;
      displayName?: string;
    };

    // RACE CONDITION FIX: Store session details in localStorage BEFORE credential resolution and snapshot attachment
    if (typeof window !== 'undefined') {
      if (activeSessionId) {
        localStorage.setItem('ntx_session_id', activeSessionId);
      }
      if (sessionExpiresAt) {
        localStorage.setItem('ntx_session_expires_at', String(sessionExpiresAt));
      }
      if (customToken) {
        localStorage.setItem('ntx_session_token', customToken);
      }
    }
    justLoggedInRef.current = Date.now();

    const isMockToken = Boolean(
      data?.isDevFallback ||
      (typeof customToken === 'string' && customToken.startsWith('mock_'))
    );

    const emailLower = email.toLowerCase().trim();
    const isExplicitKitchen = emailLower === 'kitchen@ibarts.in' || emailLower.includes('kitchen') || role === 'kitchenManager';
    const isExplicitAdmin = emailLower.includes('admin') || role === 'admin';

    // If running in local development mode with a mock custom token,
    // establish the user session directly without attempting remote Google Identity Toolkit call
    if (isMockToken) {
      const resolvedRole: UserRole =
        isExplicitAdmin ? 'admin' : isExplicitKitchen ? 'kitchenManager' : (role as UserRole) || 'employee';

      const fallbackProfile: UserProfile = {
        uid:
          (data?.uid as string) ||
          ('user_' + email.replace(/[^a-zA-Z0-9]/g, '_')),
        email,
        displayName:
          (data?.displayName as string) ||
          (resolvedRole === 'admin'
            ? 'Newtown Admin'
            : resolvedRole === 'kitchenManager'
            ? 'Kitchen Manager'
            : email.split('@')[0]),
        role: resolvedRole,
        canOrderForSelf: Boolean(canOrderForSelf),
        activeSessionId,
        sessionExpiresAt,
        seatCode:
          resolvedRole === 'admin' || resolvedRole === 'kitchenManager'
            ? undefined
            : '',
        profileComplete:
          resolvedRole === 'admin' || resolvedRole === 'kitchenManager'
            ? true
            : false,
      };

      setUser(fallbackProfile);
      setUserSessionCookie(fallbackProfile, sessionExpiresAt || Date.now() + 24 * 60 * 60 * 1000);
      setCachedData(CACHE_KEYS.USER_SESSION, fallbackProfile, 24 * 60 * 60 * 1000);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'ntx_session_fallback',
          JSON.stringify({ ...fallbackProfile, customToken })
        );
      }

      if (sessionExpiresAt) {
        scheduleExpiryTimer(sessionExpiresAt, signOut);
      }

      return {
        success: true,
        role: resolvedRole,
        canOrderForSelf: Boolean(canOrderForSelf),
        customToken,
      };
    }

    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please verify your client configuration.');
    }

    try {
      // Sign into Firebase Auth client SDK with genuine token
      const credential = await signInWithCustomToken(auth, customToken);
      const activeUser = auth.currentUser || credential.user;
      const tokenResult = await activeUser.getIdTokenResult(true);
      const resolvedRole: UserRole =
        isExplicitAdmin
          ? 'admin'
          : isExplicitKitchen
          ? 'kitchenManager'
          : (tokenResult.claims.role as UserRole) || (role as UserRole) || 'employee';
      const resolvedCanOrder = Boolean(tokenResult.claims.canOrderForSelf ?? canOrderForSelf);

      if (sessionExpiresAt) {
        scheduleExpiryTimer(sessionExpiresAt, signOut);
      }

      return {
        success: true,
        role: resolvedRole,
        canOrderForSelf: resolvedCanOrder,
        customToken,
      };
    } catch (signInErr: unknown) {
      console.warn('[AUTH] Client custom token sign-in deferred to local session:', signInErr);

      const resolvedRole: UserRole =
        isExplicitAdmin
          ? 'admin'
          : isExplicitKitchen
          ? 'kitchenManager'
          : (role as UserRole) || 'employee';

      const fallbackProfile: UserProfile = {
        uid:
          (data?.uid as string) ||
          ('user_' + email.replace(/[^a-zA-Z0-9]/g, '_')),
        email,
        displayName:
          (data?.displayName as string) ||
          (resolvedRole === 'admin'
            ? 'Newtown Admin'
            : resolvedRole === 'kitchenManager'
            ? 'Kitchen Manager'
            : email.split('@')[0]),
        role: resolvedRole,
        canOrderForSelf: Boolean(canOrderForSelf),
        activeSessionId,
        sessionExpiresAt,
        seatCode:
          resolvedRole === 'admin' || resolvedRole === 'kitchenManager'
            ? undefined
            : '',
        profileComplete:
          resolvedRole === 'admin' || resolvedRole === 'kitchenManager'
            ? true
            : false,
      };

      setUser(fallbackProfile);
      setUserSessionCookie(fallbackProfile, sessionExpiresAt || Date.now() + 24 * 60 * 60 * 1000);
      setCachedData(CACHE_KEYS.USER_SESSION, fallbackProfile, 24 * 60 * 60 * 1000);
      if (typeof window !== 'undefined') {
        localStorage.setItem(
          'ntx_session_fallback',
          JSON.stringify({ ...fallbackProfile, customToken })
        );
      }

      return {
        success: true,
        role: resolvedRole,
        canOrderForSelf: Boolean(canOrderForSelf),
        customToken,
      };
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);
    setUserSessionCookie(updated, updated.sessionExpiresAt || Date.now() + 24 * 60 * 60 * 1000);
    setCachedData(CACHE_KEYS.USER_SESSION, updated, 24 * 60 * 60 * 1000);

    if (auth?.currentUser && data.displayName !== undefined) {
      try {
        await updateFirebaseProfile(auth.currentUser, { displayName: data.displayName });
      } catch (err) {
        console.warn('[AUTH] Could not update auth profile:', err);
      }
    }

    if (db) {
      try {
        const allowedKeys = [
          'firstName',
          'lastName',
          'displayName',
          'department',
          'photoURL',
          'profileComplete',
          'activeSessionId',
        ];
        const payload: Record<string, unknown> = {
          updatedAt: serverTimestamp(),
        };
        for (const key of allowedKeys) {
          if (data[key as keyof UserProfile] !== undefined) {
            payload[key] = data[key as keyof UserProfile];
          }
        }
        await updateDoc(doc(db, 'users', user.uid), payload);
      } catch (err) {
        console.error('[AUTH] Could not update profile in Firestore:', err);
        throw err;
      }
    }
  };

  const updateSeatCode = async (seatCode: string) => {
    if (!user) return;
    const idToken = await getIdToken();
    const res = await fetch('/api/profile/claim-seat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ seatCode }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || err.error || 'Failed to claim desk.');
    }
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, seatCode };
      setUserSessionCookie(updated, updated.sessionExpiresAt || Date.now() + 24 * 60 * 60 * 1000);
      setCachedData(CACHE_KEYS.USER_SESSION, updated, 24 * 60 * 60 * 1000);
      return updated;
    });
  };

  const isKitchenManager = user?.role === 'kitchenManager';
  const isAdmin = user?.role === 'admin';
  const isKitchenStaff = isAdmin || isKitchenManager;
  const canOrderForSelf = user?.role === 'employee' || Boolean(user?.canOrderForSelf);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin,
        isKitchenManager,
        isKitchenStaff,
        canOrderForSelf,
        sessionAlertMessage,
        clearSessionAlert,
        sendOtp,
        verifyOtp,
        signOut,
        updateSeatCode,
        updateProfile,
        getIdToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
