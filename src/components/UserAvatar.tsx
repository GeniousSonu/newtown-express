'use client';

import React from 'react';
import { getAvatarStyle } from '@/lib/avatar';

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
  photoURL,
  size = 'md',
  className = '',
}: UserAvatarProps) {
  const [imgError, setImgError] = React.useState(false);
  const { initials, bgColor, textColor } = getAvatarStyle(uid, name);
  const sizeConfig = SIZE_CONFIGS[size] || SIZE_CONFIGS.md;

  if (photoURL && !imgError) {
    return (
      <div
        className={`shrink-0 flex items-center justify-center border-[#111111] shadow-[0_2px_0_#111111] overflow-hidden ${sizeConfig.box} ${sizeConfig.border} ${className}`}
        title={name || 'User'}
        aria-label={name || 'User avatar'}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photoURL}
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
