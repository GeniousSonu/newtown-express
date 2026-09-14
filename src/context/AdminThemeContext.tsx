'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, auth } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';

interface AdminThemeContextType {
  accentColor: string;
  updateAccentColor: (hex: string) => Promise<void>;
}

const AdminThemeContext = createContext<AdminThemeContextType | undefined>(undefined);

export function AdminThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentColor, setAccentColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('admin_accent_color') || '#F59E0B';
    }
    return '#F59E0B';
  });

  useEffect(() => {
    // Set CSS variable on mount if cached
    if (typeof window !== 'undefined') {
      const cached = localStorage.getItem('admin_accent_color');
      if (cached) {
        document.documentElement.style.setProperty('--user-accent', cached);
      }
    }

    if (!db) return;

    try {
      const docRef = doc(db, 'appConfig', 'adminTheme');
      const unsub = onSnapshot(docRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const color = data?.accentColor || '#F59E0B';
          setAccentColor(color);
          document.documentElement.style.setProperty('--user-accent', color);
          if (typeof window !== 'undefined') {
            localStorage.setItem('admin_accent_color', color);
          }
        }
      });
      return () => unsub();
    } catch (e) {
      console.warn('[ADMIN-THEME] Firestore subscription skipped:', e);
    }
  }, []);

  const updateAccentColor = async (hex: string) => {
    setAccentColor(hex);
    document.documentElement.style.setProperty('--user-accent', hex);
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_accent_color', hex);
    }

    if (!auth?.currentUser) return;
    const token = await auth.currentUser.getIdToken(true);
    const res = await fetch('/api/admin/theme', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ accentColor: hex }),
    });

    if (!res.ok) {
      const text = await res.text();
      let data: { error?: string } | null = null;
      try {
        data = JSON.parse(text);
      } catch {}
      throw new Error(data?.error || 'Failed to save accent color');
    }
  };

  return (
    <AdminThemeContext.Provider value={{ accentColor, updateAccentColor }}>
      {children}
    </AdminThemeContext.Provider>
  );
}

export function useAdminTheme() {
  const ctx = useContext(AdminThemeContext);
  if (!ctx) {
    return {
      accentColor: '#F59E0B',
      updateAccentColor: async () => {},
    };
  }
  return ctx;
}
