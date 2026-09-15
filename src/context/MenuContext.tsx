'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { MenuItem } from '@/types';
import { db } from '@/lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { setCachedData, getCachedData, CACHE_KEYS } from '@/lib/cache';

interface MenuContextType {
  items: MenuItem[];
  categories: string[];
  loading: boolean;
  getItemById: (id: string) => MenuItem | undefined;
}

const MenuContext = createContext<MenuContextType | undefined>(undefined);

export function MenuProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<MenuItem[]>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<MenuItem[]>(CACHE_KEYS.MENU_ITEMS);
      if (cached?.data && Array.isArray(cached.data)) {
        return cached.data;
      }
    }
    return [];
  });
  const [loading, setLoading] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const cached = getCachedData<MenuItem[]>(CACHE_KEYS.MENU_ITEMS);
      if (cached?.data && Array.isArray(cached.data) && cached.data.length > 0) {
        return false;
      }
    }
    return Boolean(db);
  });

  useEffect(() => {
    if (!db) return;

    try {
      const colRef = collection(db, 'menuItems');
      const unsubscribe = onSnapshot(
        colRef,
        (snapshot) => {
          const liveItems: MenuItem[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Partial<MenuItem>;
            liveItems.push({
              id: docSnap.id,
              name: data.name || 'Untitled Dish',
              description: data.description || '',
              price: typeof data.price === 'number' ? data.price : 0,
              calories: typeof data.calories === 'number' ? data.calories : 0,
              healthTag: data.healthTag || 'balanced',
              imageUrl: data.imageUrl || '',
              category: (data.category as MenuItem['category']) || 'SPECIALS',
              isAvailable: data.isAvailable !== false,
              addonGroups: Array.isArray(data.addonGroups) ? data.addonGroups : [],
              sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 999,
              updatedAt: typeof data.updatedAt === 'number' ? data.updatedAt : undefined,
            });
          });

          // Sort deterministically: by sortOrder ascending, then name
          liveItems.sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));

          setItems(liveItems);
          setCachedData(CACHE_KEYS.MENU_ITEMS, liveItems, 30 * 60 * 1000);
          setLoading(false);
        },
        (err) => {
          console.error('[MENU-CONTEXT] Firestore onSnapshot subscription error:', err);
          setLoading(false);
        }
      );

      // Strict cleanup: unsubscribe when MenuProvider unmounts
      return () => {
        unsubscribe();
      };
    } catch (err) {
      console.error('[MENU-CONTEXT] Failed to initialize listener:', err);
      queueMicrotask(() => setLoading(false));
    }
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((it) => {
      if (it.category && typeof it.category === 'string') {
        set.add(it.category.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  const getItemById = (id: string): MenuItem | undefined => {
    return items.find((it) => it.id === id);
  };

  return (
    <MenuContext.Provider
      value={{
        items,
        categories,
        loading,
        getItemById,
      }}
    >
      {children}
    </MenuContext.Provider>
  );
}

export function useMenu(): MenuContextType {
  const ctx = useContext(MenuContext);
  if (!ctx) {
    throw new Error('useMenu must be used within MenuProvider');
  }
  return ctx;
}
