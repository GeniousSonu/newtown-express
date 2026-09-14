'use client';

import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { UserProfile, UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, updateDoc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(auth));
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
        localStorage.removeItem('ntx_session_id');
        localStorage.removeItem('ntx_session_expires_at');
        localStorage.removeItem('ntx_session_fallback');
      }
      setUser(null);
    }
  }, []);

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
        const tokenRole = (tokenResult.claims.role as UserRole) || 'employee';
        const tokenCanOrder = Boolean(tokenResult.claims.canOrderForSelf);

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

              // Single-device enforcement: EXEMPT admin and kitchenManager (dedicated kitchen devices!)
              if (tokenRole === 'employee') {
                const isGracePeriod = Date.now() - justLoggedInRef.current < 4000;
                if (!isGracePeriod && firestoreSessionId && localSessionId && firestoreSessionId !== localSessionId) {
                  signOut("You've been logged out because your account was signed in on another device.");
                  return;
                }
              }

              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || data?.email || '',
                displayName: (data?.displayName ?? firebaseUser.displayName) || '',
                role: tokenRole,
                canOrderForSelf: typeof data?.canOrderForSelf === 'boolean' ? data.canOrderForSelf : tokenCanOrder,
                activeSessionId: firestoreSessionId || localSessionId,
                sessionExpiresAt: effectiveExpiresAt,
                firstName: data?.firstName || '',
                lastName: data?.lastName || '',
                department: data?.department || '',
                photoURL: data?.photoURL || firebaseUser.photoURL || null,
                seatCode: data?.seatCode || (tokenRole === 'admin' || tokenRole === 'kitchenManager' ? undefined : ''),
                profileComplete: Boolean(data?.profileComplete),
                createdAt: data?.createdAt?.toMillis?.() || data?.createdAt,
                updatedAt: data?.updatedAt?.toMillis?.() || data?.updatedAt,
              };
              setUser(profile);
              setLoading(false);
            },
            (err) => {
              console.warn('[AUTH] Real-time user profile listener error:', err);
              setUser({
                uid: firebaseUser.uid,
                email: firebaseUser.email || '',
                displayName: firebaseUser.displayName || '',
                role: tokenRole,
                canOrderForSelf: tokenCanOrder,
                seatCode: tokenRole === 'admin' || tokenRole === 'kitchenManager' ? undefined : '',
                profileComplete: tokenRole === 'admin' || tokenRole === 'kitchenManager',
              });
              setLoading(false);
            }
          );
        } else {
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || '',
            role: tokenRole,
            canOrderForSelf: tokenCanOrder,
            seatCode: tokenRole === 'admin' || tokenRole === 'kitchenManager' ? undefined : '',
            profileComplete: tokenRole === 'admin' || tokenRole === 'kitchenManager',
          });
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
    }
    justLoggedInRef.current = Date.now();

    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please verify your client configuration.');
    }

    try {
      // Sign into Firebase Auth client SDK
      const credential = await signInWithCustomToken(auth, customToken);
      const activeUser = auth.currentUser || credential.user;
      const tokenResult = await activeUser.getIdTokenResult(true);
      const resolvedRole = (tokenResult.claims.role as UserRole) || role || 'employee';
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
      const authErr = signInErr as { code?: string; message?: string };
      console.error('[AUTH signInWithCustomToken FAILURE]', {
        errorCode: authErr?.code,
        errorMessage: authErr?.message,
      });

      if (
        authErr?.code === 'auth/configuration-not-found' ||
        authErr?.code === 'auth/invalid-custom-token' ||
        data?.isDevFallback
      ) {
        const resolvedRole = (role as UserRole) || (email.toLowerCase().includes('admin') ? 'admin' : 'employee');
        const fallbackProfile: UserProfile = {
          uid: (data?.uid as string) || ('user_' + email.replace(/[^a-zA-Z0-9]/g, '_')),
          email,
          displayName: (data?.displayName as string) || (resolvedRole === 'admin' ? 'Newtown Admin' : email.split('@')[0]),
          role: resolvedRole,
          canOrderForSelf: Boolean(canOrderForSelf),
          activeSessionId,
          sessionExpiresAt,
          seatCode: resolvedRole === 'admin' || resolvedRole === 'kitchenManager' ? undefined : '',
          profileComplete: resolvedRole === 'admin' || resolvedRole === 'kitchenManager' ? true : false,
        };
        setUser(fallbackProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ntx_session_fallback', JSON.stringify({ ...fallbackProfile, customToken }));
        }
        return {
          success: true,
          role: resolvedRole,
          canOrderForSelf: Boolean(canOrderForSelf),
          customToken,
        };
      }

      throw signInErr;
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!user) return;
    const updated = { ...user, ...data };
    setUser(updated);

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
          'seatCode',
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
    return updateProfile({ seatCode });
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
