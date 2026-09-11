'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc, onSnapshot, serverTimestamp, Unsubscribe } from 'firebase/firestore';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; role: UserRole; customToken?: string }>;
  signOut: () => Promise<void>;
  updateSeatCode: (seatCode: string) => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount via Firebase Auth & real-time Firestore user doc
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
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
        const tokenResult = await firebaseUser.getIdTokenResult();
        const tokenRole = (tokenResult.claims.role as UserRole) || 'employee';

        // Listen in real-time to users/{uid} document
        if (db) {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          userDocUnsubscribe = onSnapshot(
            userDocRef,
            (snap) => {
              const data = snap.data();
              const profile: UserProfile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || data?.email || '',
                displayName: (data?.displayName ?? firebaseUser.displayName) || '',
                role: tokenRole,
                firstName: data?.firstName || '',
                lastName: data?.lastName || '',
                department: data?.department || '',
                photoURL: data?.photoURL || firebaseUser.photoURL || null,
                seatCode: data?.seatCode || (tokenRole === 'admin' ? undefined : ''),
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
                seatCode: tokenRole === 'admin' ? undefined : '',
                profileComplete: false,
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
            seatCode: tokenRole === 'admin' ? undefined : '',
            profileComplete: false,
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
    };
  }, []);

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
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const serverMsg = data?.error || (text && text.length < 300 ? text : `Server request failed (${res.status})`);
      throw new Error(serverMsg);
    }

    return data || {};
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
    let data: any = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = null;
    }

    if (!res.ok) {
      const serverMsg = data?.error || (text && text.length < 300 ? text : `Verification failed (${res.status})`);
      throw new Error(serverMsg);
    }

    const { customToken, role } = data;

    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please verify your client configuration.');
    }

    const clientProjectId = auth.app.options.projectId;
    const clientApiKeyPrefix = auth.app.options.apiKey
      ? auth.app.options.apiKey.slice(0, 8) + '...'
      : 'undefined';
    const serverAdminProjectId = data.serverAdminProjectId;

    console.log('[AUTH DIAGNOSTIC REPORT]', {
      clientProjectId,
      serverAdminProjectId,
      projectIdsMatch: clientProjectId === serverAdminProjectId,
      clientApiKeyPrefix,
    });

    try {
      // Sign into Firebase Auth client SDK
      const credential = await signInWithCustomToken(auth, customToken);
      const tokenResult = await credential.user.getIdTokenResult(true);
      const resolvedRole = (tokenResult.claims.role as UserRole) || role || 'employee';

      return {
        success: true,
        role: resolvedRole,
        customToken,
      };
    } catch (signInErr: any) {
      console.error('[AUTH signInWithCustomToken FAILURE]', {
        errorCode: signInErr?.code,
        errorMessage: signInErr?.message,
        clientProjectId,
        serverAdminProjectId,
      });

      if (signInErr?.code === 'auth/configuration-not-found') {
        console.warn(
          '[AUTH] Firebase Authentication has not yet been initialized in Firebase Console (Build > Authentication > Get started). Activating session fallback.'
        );
        const resolvedRole = (role as UserRole) || (email.toLowerCase().includes('admin') ? 'admin' : 'employee');
        const fallbackProfile: UserProfile = {
          uid: data.uid || ('user_' + email.replace(/[^a-zA-Z0-9]/g, '_')),
          email,
          displayName: data.displayName || (resolvedRole === 'admin' ? 'Newtown Admin' : email.split('@')[0]),
          role: resolvedRole,
          seatCode: resolvedRole === 'admin' ? undefined : '',
          profileComplete: resolvedRole === 'admin' ? true : false,
        };
        setUser(fallbackProfile);
        if (typeof window !== 'undefined') {
          localStorage.setItem('ntx_session_fallback', JSON.stringify({ ...fallbackProfile, customToken }));
        }
        return {
          success: true,
          role: resolvedRole,
          customToken,
        };
      }

      throw signInErr;
    }
  };

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('[AUTH] Firebase signOut error:', err);
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ntx_session_fallback');
      }
      setUser(null);
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
        ];
        const payload: Record<string, any> = {
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

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAdmin: user?.role === 'admin',
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
