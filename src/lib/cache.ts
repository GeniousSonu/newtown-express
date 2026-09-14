'use client';

import { UserProfile, UserRole } from '@/types';

const SESSION_COOKIE_NAME = 'ntx_user_session';
const DEFAULT_SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const CACHE_KEYS = {
  USER_SESSION: 'ntx_user_session_data',
  KITCHEN_STATUS: 'ntx_kitchen_status_cache',
  MENU_ITEMS: 'ntx_menu_items_cache',
  ORDERS: (uid: string) => `ntx_orders_cache_${uid}`,
} as const;

interface CacheEnvelope<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
  version: number;
}

const CACHE_VERSION = 1;

/**
 * Cookie Utilities for User Session
 */
export function setUserSessionCookie(
  user: UserProfile,
  expiresAtMs: number = Date.now() + DEFAULT_SESSION_TTL_MS
): void {
  if (typeof document === 'undefined') return;

  const sessionPayload = {
    uid: user.uid,
    email: user.email,
    displayName: user.displayName || '',
    role: user.role,
    seatCode: user.seatCode || '',
    canOrderForSelf: user.canOrderForSelf ?? (user.role === 'employee'),
    photoURL: user.photoURL || null,
    expiresAt: expiresAtMs,
  };

  const serialized = encodeURIComponent(JSON.stringify(sessionPayload));
  const maxAgeSeconds = Math.max(0, Math.floor((expiresAtMs - Date.now()) / 1000));
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';

  document.cookie = `${SESSION_COOKIE_NAME}=${serialized}; Path=/; max-age=${maxAgeSeconds}; SameSite=Lax${
    isSecure ? '; Secure' : ''
  }`;
}

export function getUserSessionCookie(): UserProfile | null {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const trimmed = cookie.trim();
    if (trimmed.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      try {
        const raw = trimmed.substring(SESSION_COOKIE_NAME.length + 1);
        const parsed = JSON.parse(decodeURIComponent(raw));
        if (parsed && parsed.uid && parsed.role) {
          if (parsed.expiresAt && Date.now() >= parsed.expiresAt) {
            clearUserSessionCookie();
            return null;
          }
          return {
            uid: parsed.uid,
            email: parsed.email || '',
            displayName: parsed.displayName || parsed.name || '',
            role: parsed.role as UserRole,
            seatCode: parsed.seatCode || '',
            canOrderForSelf: parsed.canOrderForSelf ?? (parsed.role === 'employee'),
            photoURL: parsed.photoURL || parsed.avatarUrl || null,
          };
        }
      } catch (err) {
        console.warn('[CACHE] Failed to parse session cookie:', err);
      }
    }
  }
  return null;
}

export function clearUserSessionCookie(): void {
  if (typeof document === 'undefined') return;
  const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${SESSION_COOKIE_NAME}=; Path=/; max-age=0; SameSite=Lax${isSecure ? '; Secure' : ''}`;
}

/**
 * Client Storage Cache with TTL and Stale-While-Revalidate support
 */
export function setCachedData<T>(key: string, data: T, ttlMs = 15 * 60 * 1000): void {
  if (typeof window === 'undefined') return;
  try {
    const envelope: CacheEnvelope<T> = {
      data,
      cachedAt: Date.now(),
      expiresAt: Date.now() + ttlMs,
      version: CACHE_VERSION,
    };
    localStorage.setItem(key, JSON.stringify(envelope));
  } catch (err) {
    console.warn(`[CACHE] Error writing key "${key}" to localStorage:`, err);
  }
}

export function getCachedData<T>(key: string): { data: T; isStale: boolean } | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const envelope: CacheEnvelope<T> = JSON.parse(raw);
    if (!envelope || envelope.version !== CACHE_VERSION) {
      localStorage.removeItem(key);
      return null;
    }
    const isStale = Date.now() >= envelope.expiresAt;
    return { data: envelope.data, isStale };
  } catch (err) {
    console.warn(`[CACHE] Error reading key "${key}" from localStorage:`, err);
    return null;
  }
}

export function removeCachedData(key: string): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn(`[CACHE] Error removing key "${key}":`, err);
  }
}

/**
 * Session storage utility for short-lived UI states
 */
export function setSessionState<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`[SESSION_STORAGE] Error writing key "${key}":`, err);
  }
}

export function getSessionState<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}
