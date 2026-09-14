'use client';

import React from 'react';
import { getAvatarStyle } from '@/lib/avatar';

import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

const memoryAvatarCache = new Map<string, string | null>();
const pendingAvatarFetches = new Map<string, Promise<string | null>>();

async function fetchUserAvatar(uid: string): Promise<string | null> {
  if (!uid) return null;
  if (memoryAvatarCache.has(uid)) return memoryAvatarCache.get(uid) || null;

  if (typeof window !== 'undefined') {
    try {
      const stored = localStorage.getItem(`avatar_cache_${uid}`);
      if (stored) {
        memoryAvatarCache.set(uid, stored);
        return stored;
      }
    } catch {}
  }

  if (pendingAvatarFetches.has(uid)) {
    return pendingAvatarFetches.get(uid)!;
  }

  if (!db) return null;

  const fetchPromise = (async () => {
    try {
      const userSnap = await getDoc(doc(db, 'users', uid));
      const url = (userSnap.data()?.photoURL as string) || null;
      memoryAvatarCache.set(uid, url);
      if (typeof window !== 'undefined' && url) {
        try {
          localStorage.setItem(`avatar_cache_${uid}`, url);
        } catch {}
      }
      return url;
    } catch {
      return null;
    } finally {
      pendingAvatarFetches.delete(uid);
    }
  })();

  pendingAvatarFetches.set(uid, fetchPromise);
  return fetchPromise;
}

interface UserAvatarProps {
  uid: string;
  name?: string | null;
  photoURL?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const SIZE_CONFIGS = {
  xs: { box: 'w-6 h-6 rounded-lg text-[9px]', border: 'border' },
  sm: { box: 'w-8 h-8 rounded-xl text-xs', border: 'border-2' },
  md: { box: 'w-10 h-10 rounded-xl text-sm', border: 'border-2' },
  lg: { box: 'w-12 h-12 rounded-2xl text-base', border: 'border-2' },
  xl: { box: 'w-16 h-16 rounded-2xl text-xl', border: 'border-2' },
};

export function UserAvatar({
  uid,
  name,
  photoURL: propPhotoURL,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const { initials, bgColor, textColor } = getAvatarStyle(uid, name);
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  // Instant local avatar cache for 0ms loading
  const [cachedPhoto, setCachedPhoto] = React.useState<string | null>(() => {
    if (propPhotoURL) return propPhotoURL;
    if (uid && memoryAvatarCache.has(uid)) return memoryAvatarCache.get(uid) || null;
    if (typeof window !== 'undefined' && uid) {
      try {
        return localStorage.getItem(`avatar_cache_${uid}`);
      } catch {}
    }
    return null;
  });

  React.useEffect(() => {
    if (propPhotoURL) {
      memoryAvatarCache.set(uid, propPhotoURL);
      if (typeof window !== 'undefined' && uid) {
        try {
          localStorage.setItem(`avatar_cache_${uid}`, propPhotoURL);
        } catch {}
      }
    } else if (uid) {
      // Automatically sync and fetch avatar if not passed via props (e.g. for admin/colleagues)
      fetchUserAvatar(uid).then((url) => {
        if (url) setCachedPhoto(url);
      });
    }
  }, [propPhotoURL, uid]);

  const activePhoto = propPhotoURL || cachedPhoto;

  if (activePhoto && !imgError) {
    return (
      <div
        className={`shrink-0 flex items-center justify-center border-[#111111] shadow-[0_2px_0_#111111] overflow-hidden ${sizeConfig.box} ${sizeConfig.border} ${className}`}
        title={name || 'User'}
        aria-label={name || 'User avatar'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={activePhoto}
          alt={name || 'User'}
          className="w-full h-full object-cover"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      style={{ backgroundColor: bgColor, color: textColor }}
      className={`shrink-0 flex items-center justify-center font-black tracking-tight border-[#111111] shadow-[0_2px_0_#111111] ${sizeConfig.box} ${sizeConfig.border} ${className}`}
      title={name || 'User'}
      aria-label={name || 'User avatar'}
    >
      <span>{initials}</span>
    </div>
  );
}
