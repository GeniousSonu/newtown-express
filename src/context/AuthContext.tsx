'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '@/types';
import { auth, db } from '@/lib/firebase';
import { onAuthStateChanged, signInWithCustomToken, signOut as firebaseSignOut, updateProfile as updateFirebaseProfile } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isAdmin: boolean;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, code: string) => Promise<{ success: boolean; role: UserRole; customToken?: string }>;
  signOut: () => Promise<void>;
  updateSeatCode: (seatCode: string) => Promise<void>;
  updateProfile: (data: { displayName?: string; seatCode?: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync session on mount via Firebase Auth
  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (!firebaseUser) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        // Read custom claims from the ID token (source of truth for role)
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const tokenRole = (tokenResult.claims.role as UserRole) || 'employee';

        let profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || '',
          role: tokenRole,
          seatCode: tokenRole === 'admin' ? undefined : '',
        };

        if (db) {
          try {
            const userSnap = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (userSnap.exists()) {
              const data = userSnap.data();
              profile = {
                uid: firebaseUser.uid,
                email: firebaseUser.email || data.email || '',
                displayName: (data.displayName ?? firebaseUser.displayName) || '',
                role: tokenRole,
                seatCode: tokenRole === 'admin' ? undefined : data.seatCode || '',
                createdAt: data.createdAt?.toMillis?.() || data.createdAt,
              };
            }
          } catch (err) {
            console.warn('[AUTH] Could not fetch Firestore user profile:', err);
          }
        }

        setUser(profile);
      } catch (err) {
        console.error('[AUTH] Failed to resolve user session:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Request 6-digit OTP code via server API
  const sendOtp = async (email: string) => {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to send OTP code.');
    }

    return data;
  };

  // Verify OTP, retrieve custom token, and sign in to Firebase Auth
  const verifyOtp = async (email: string, code: string) => {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid OTP code.');
    }

    const { customToken, role } = data;

    if (!auth) {
      throw new Error('Firebase Auth is not initialized. Please verify your client configuration.');
    }

    // Sign into Firebase Auth client SDK
    const credential = await signInWithCustomToken(auth, customToken);
    const tokenResult = await credential.user.getIdTokenResult(true);
    const resolvedRole = (tokenResult.claims.role as UserRole) || role || 'employee';

    return {
      success: true,
      role: resolvedRole,
      customToken,
    };
  };

  const signOut = async () => {
    try {
      if (auth) {
        await firebaseSignOut(auth);
      }
    } catch (err) {
      console.warn('[AUTH] Firebase signOut error:', err);
    } finally {
      setUser(null);
    }
  };

  const updateProfile = async (data: { displayName?: string; seatCode?: string }) => {
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
        await updateDoc(doc(db, 'users', user.uid), data);
      } catch (err) {
        console.warn('[AUTH] Could not update profile in Firestore:', err);
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
