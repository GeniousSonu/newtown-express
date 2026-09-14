'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { KitchenStatus } from '@/types';
import { toValidMillis } from '@/lib/utils';
import { setCachedData, getCachedData, CACHE_KEYS } from '@/lib/cache';
import { useAuth } from './AuthContext';

interface KitchenStatusContextType {
  isOpen: boolean;
  closedMessage: string;
  lastToggledAt: number | null;
  lastToggledBy: string | null;
  loading: boolean;
  toggleKitchenStatus: (isOpen: boolean, closedMessage?: string) => Promise<void>;
}

const KitchenStatusContext = createContext<KitchenStatusContextType | undefined>(undefined);

export function KitchenStatusProvider({ children }: { children: React.ReactNode }) {
  const { user, getIdToken } = useAuth();
  const [status, setStatus] = useState<KitchenStatus>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<KitchenStatus>(CACHE_KEYS.KITCHEN_STATUS);
      if (cached?.data) return cached.data;
    }
    return {
      isOpen: true,
      closedMessage: '',
      lastToggledAt: null,
      lastToggledBy: null,
    };
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<KitchenStatus>(CACHE_KEYS.KITCHEN_STATUS);
      if (cached?.data) return false;
    }
    return Boolean(db);
  });

  useEffect(() => {
    if (!db) {
      return;
    }

    try {
      const docRef = doc(db, 'appConfig', 'kitchenStatus');
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          if (snap.exists()) {
            const data = snap.data();
            const newStatus: KitchenStatus = {
              isOpen: data.isOpen !== false,
              closedMessage: data.closedMessage || '',
              lastToggledAt: data.lastToggledAt ? toValidMillis(data.lastToggledAt) : null,
              lastToggledBy: data.lastToggledBy || null,
            };
            setStatus(newStatus);
            setCachedData(CACHE_KEYS.KITCHEN_STATUS, newStatus, 15 * 60 * 1000);
          } else {
            // Default to open if not configured yet
            const defaultStatus: KitchenStatus = {
              isOpen: true,
              closedMessage: '',
              lastToggledAt: null,
              lastToggledBy: null,
            };
            setStatus(defaultStatus);
            setCachedData(CACHE_KEYS.KITCHEN_STATUS, defaultStatus, 15 * 60 * 1000);
          }
          setLoading(false);
        },
        (error) => {
          console.warn('[KITCHEN-STATUS] Subscription error:', error);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.warn('[KITCHEN-STATUS] Listener init error:', err);
      queueMicrotask(() => setLoading(false));
    }
  }, []);

  const toggleKitchenStatus = async (isOpen: boolean, closedMessage?: string) => {
    if (!user) {
      throw new Error('Admin authentication required.');
    }

    const token = await getIdToken(true);
    const res = await fetch('/api/admin/kitchen-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        isOpen,
        closedMessage,
      }),
    });

    const text = await res.text();
    let data: { error?: string } | null = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {}

    if (!res.ok) {
      throw new Error(data?.error || `Failed to update kitchen status (${res.status})`);
    }

    const updatedStatus: KitchenStatus = {
      isOpen,
      closedMessage: closedMessage || '',
      lastToggledAt: Date.now(),
      lastToggledBy: user.email || user.displayName || 'Admin',
    };
    setStatus(updatedStatus);
    setCachedData(CACHE_KEYS.KITCHEN_STATUS, updatedStatus, 15 * 60 * 1000);
  };

  return (
    <KitchenStatusContext.Provider
      value={{
        isOpen: status.isOpen,
        closedMessage: status.closedMessage || '',
        lastToggledAt: status.lastToggledAt || null,
        lastToggledBy: status.lastToggledBy || null,
        loading,
        toggleKitchenStatus,
      }}
    >
      {children}
    </KitchenStatusContext.Provider>
  );
}

export function useKitchenStatus() {
  const ctx = useContext(KitchenStatusContext);
  if (!ctx) {
    throw new Error('useKitchenStatus must be used within KitchenStatusProvider');
  }
  return ctx;
}
