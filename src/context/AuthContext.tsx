'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { UserProfile, UserRole } from '@/types';
import { db, isMockMode } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  domainError: string | null;
  isMock: boolean;
  sendOtp: (email: string) => Promise<{ success: boolean; message?: string }>;
  verifyOtp: (email: string, otp: string) => Promise<{ success: boolean; message?: string }>;
  signOut: () => Promise<void>;
  updateSeatCode: (seatCode: string) => Promise<void>;
  switchMockRole: (role: UserRole) => void;
  setMockSeatCode: (seat: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const USER_STORAGE_KEY = 'newtown_user_session_v2';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [domainError, setDomainError] = useState<string | null>(null);

  // Load existing session on mount
  useEffect(() => {
    try {
      const savedSession = typeof window !== 'undefined' ? localStorage.getItem(USER_STORAGE_KEY) : null;
      if (savedSession) {
        setUser(JSON.parse(savedSession));
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
    }
  }, []);

  // Request 6-digit OTP via Resend API
  const sendOtp = async (email: string) => {
    setDomainError(null);
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

  // Verify 6-digit OTP and login
  const verifyOtp = async (email: string, otp: string) => {
    setDomainError(null);
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Invalid OTP code.');
    }

    const verifiedUser: UserProfile = data.user;

    // Check if user already had a saved seat in Firestore
    if (db) {
      try {
        const userDocRef = doc(db, 'users', verifiedUser.uid);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const existingData = userSnap.data() as UserProfile;
          if (existingData.seatCode) {
            verifiedUser.seatCode = existingData.seatCode;
          }
          if (existingData.role) {
            verifiedUser.role = existingData.role;
          }
        } else {
          await setDoc(userDocRef, verifiedUser);
        }
      } catch (err) {
        console.warn('Could not sync Firestore profile:', err);
      }
    }

    setUser(verifiedUser);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(verifiedUser));
    }

    return data;
  };

  const signOut = async () => {
    setUser(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(USER_STORAGE_KEY);
    }
  };

  const updateSeatCode = async (seatCode: string) => {
    if (!user) return;
    const updated = { ...user, seatCode };
    setUser(updated);

    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    }

    if (db) {
      try {
        await updateDoc(doc(db, 'users', user.uid), { seatCode });
      } catch (err) {
        console.warn('Could not update seat in Firestore (using local):', err);
      }
    }
  };

  const switchMockRole = (role: UserRole) => {
    if (!isMockMode || !user) return;
    const updated: UserProfile = {
      ...user,
      role,
      displayName: role === 'admin' ? 'Kitchen Admin (Chef Ramesh)' : user.displayName,
    };
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  const setMockSeatCode = (seat: string) => {
    if (!isMockMode || !user) return;
    const updated = { ...user, seatCode: seat };
    setUser(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(updated));
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        domainError,
        isMock: isMockMode,
        sendOtp,
        verifyOtp,
        signOut,
        updateSeatCode,
        switchMockRole,
        setMockSeatCode,
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
