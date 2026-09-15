'use client';

import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigation } from '@/context/NavigationContext';
import { useSwipeBack } from '@/hooks/useSwipeBack';

interface BackHeaderProps {
  fallbackHref: string;
  title?: string;
  subtitle?: string;
  rightAction?: React.ReactNode;
  enableSwipeBack?: boolean;
  className?: string;
}

export function BackHeader({
  fallbackHref,
  title,
  subtitle,
  rightAction,
  enableSwipeBack = true,
  className = '',
}: BackHeaderProps) {
  const { goBack } = useNavigation();

  const handleBack = () => {
    goBack(fallbackHref);
  };

  // mobile screen e swipe back enable koro
  useSwipeBack({
    onBack: handleBack,
    enabled: enableSwipeBack,
  });

  return (
    <div
      style={{ touchAction: 'pan-y' }}
      className={`flex items-center justify-between gap-3 py-2 w-full select-none ${className}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        <button
          type="button"
          onClick={handleBack}
          aria-label="Go back"
          className="min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-white border-2 border-[#111111] shadow-[0_2px_0_#111111] hover:bg-stone-50 active:translate-y-0.5 active:shadow-none active:scale-[0.98] transition-all flex items-center justify-center shrink-0 text-[#111111] cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        {(title || subtitle) && (
          <div className="min-w-0 flex-1">
            {title && (
              <h1 className="text-base sm:text-lg font-black text-[#111111] tracking-tight truncate leading-snug">
                {title}
              </h1>
            )}
            {subtitle && (
              <p className="text-xs font-bold text-[#6B6B6B] truncate">
                {subtitle}
              </p>
            )}
          </div>
        )}
      </div>

      {rightAction && <div className="shrink-0 flex items-center gap-2">{rightAction}</div>}
    </div>
  );
}
