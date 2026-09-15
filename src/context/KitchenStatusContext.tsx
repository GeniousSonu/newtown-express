'use client';

import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { db } from '@/lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { KitchenStatus } from '@/types';
import { toValidMillis } from '@/lib/utils';
import { setCachedData, getCachedData, CACHE_KEYS } from '@/lib/cache';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface KitchenStatusContextType {
  isOpen: boolean;
  closedMessage: string;
  lastToggledAt: number | null;
  lastToggledBy: string | null;
  loading: boolean;
  isToggling: boolean;
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
  const [isToggling, setIsToggling] = useState(false);

  // Track previous status to detect genuine live transitions and avoid initial load toasts
  const prevIsOpenRef = useRef<boolean | null>(null);
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    if (!db) return;

    try {
      const docRef = doc(db, 'appConfig', 'kitchenStatus');
      const unsubscribe = onSnapshot(
        docRef,
        (snap) => {
          let newStatus: KitchenStatus;
          if (snap.exists()) {
            const data = snap.data();
            newStatus = {
              isOpen: data.isOpen !== false,
              closedMessage: data.closedMessage || '',
              lastToggledAt: data.lastToggledAt ? toValidMillis(data.lastToggledAt) : null,
              lastToggledBy: data.lastToggledBy || null,
            };
          } else {
            // Default to open if not configured yet
            newStatus = {
              isOpen: true,
              closedMessage: '',
              lastToggledAt: null,
              lastToggledBy: null,
            };
          }

          // Trigger live broadcast toast on transition (skip initial mount)
          if (!isInitialLoadRef.current && prevIsOpenRef.current !== null && prevIsOpenRef.current !== newStatus.isOpen) {
            if (!newStatus.isOpen) {
              toast.error('Kitchen just closed — orders are paused.', {
                id: 'kitchen-status-live-alert',
                description: newStatus.closedMessage || 'We are currently not accepting new orders.',
                duration: 8000,
              });
            } else {
              toast.success('Kitchen is open again!', {
                id: 'kitchen-status-live-alert',
                description: 'You can now place orders from the pantry.',
                duration: 5000,
              });
            }
          }

          prevIsOpenRef.current = newStatus.isOpen;
          isInitialLoadRef.current = false;
          setStatus(newStatus);
          setCachedData(CACHE_KEYS.KITCHEN_STATUS, newStatus, 15 * 60 * 1000);
          setLoading(false);
        },
        (error) => {
          console.warn('[KITCHEN-STATUS] Subscription error:', error);
          setLoading(false);
        }
      );

      // Strict cleanup: unsubscribe on unmount
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.warn('[KITCHEN-STATUS] Listener init error:', err);
      queueMicrotask(() => setLoading(false));
    }
  }, []);

  const toggleKitchenStatus = async (nextIsOpen: boolean, closedMessage?: string) => {
    if (!user) {
      throw new Error('Admin authentication required.');
    }

    // Capture previous status for rollback if network/server fails
    const prevStatus = { ...status };

    // 1. Apply optimistic local UI update immediately (< 1ms feedback)
    const optimisticStatus: KitchenStatus = {
      isOpen: nextIsOpen,
      closedMessage: closedMessage !== undefined ? closedMessage : prevStatus.closedMessage,
      lastToggledAt: Date.now(),
      lastToggledBy: user.email || user.displayName || 'Admin',
    };
    setStatus(optimisticStatus);
    setIsToggling(true);

    try {
      const token = await getIdToken(true);
      const res = await fetch('/api/admin/kitchen-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          isOpen: nextIsOpen,
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

      setCachedData(CACHE_KEYS.KITCHEN_STATUS, optimisticStatus, 15 * 60 * 1000);
    } catch (err: unknown) {
      console.error('[KITCHEN-STATUS] Toggle failed, rolling back:', err);
      // Revert optimistic state back to previous
      setStatus(prevStatus);
      toast.error("Couldn't update kitchen status, try again");
      throw err;
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <KitchenStatusContext.Provider
      value={{
        isOpen: status.isOpen,
        closedMessage: status.closedMessage || '',
        lastToggledAt: status.lastToggledAt || null,
        lastToggledBy: status.lastToggledBy || null,
        loading,
        isToggling,
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
