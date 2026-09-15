'use client';

import { useEffect, useRef } from 'react';

// map pinch-zoom ba modal open thakle swipe back disable korar jonno
// keep both data-no-swipe-back and react-transform classes so map zoom doesn't glitch
export function isSwipeBackExcluded(target: EventTarget | null): boolean {
  if (!target || typeof (target as Element).closest !== 'function') {
    return false;
  }
  const el = target as Element;
  return Boolean(
    el.closest(
      '[data-no-swipe-back="true"], .react-transform-component, .react-transform-wrapper, [data-transform-wrapper]'
    )
  );
}

interface UseSwipeBackOptions {
  onBack: () => void;
  enabled?: boolean;
  edgeThreshold?: number; // left edge theke koto px dur porjonto track korbe (default: 40px)
  minSwipeDistance?: number; // minimum horizontal swipe distance (default: 80px)
  maxVerticalDeviation?: number; // max vertical deviation allowed (default: 60px)
}

export function useSwipeBack({
  onBack,
  enabled = true,
  edgeThreshold = 40,
  minSwipeDistance = 80,
  maxVerticalDeviation = 60,
}: UseSwipeBackOptions) {
  const touchStartRef = useRef<{ x: number; y: number; valid: boolean } | null>(null);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        touchStartRef.current = null;
        return;
      }

      const touch = e.touches[0];
      const target = e.target;

      // map ba modal er bhitore touch hole swipe cancel
      if (isSwipeBackExcluded(target)) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, valid: false };
        return;
      }

      // left edge check - edge er kache touch korle valid
      if (touch.clientX <= edgeThreshold) {
        touchStartRef.current = { x: touch.clientX, y: touch.clientY, valid: true };
      } else {
        touchStartRef.current = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const start = touchStartRef.current;
      touchStartRef.current = null;

      if (!start || !start.valid) return;

      const touch = e.changedTouches[0];
      if (!touch) return;

      const deltaX = touch.clientX - start.x;
      const deltaY = Math.abs(touch.clientY - start.y);

      // horizontal swipe jeno straight hoy, beshi baka hole cancel
      if (deltaX >= minSwipeDistance && deltaY <= maxVerticalDeviation) {
        onBack();
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [enabled, onBack, edgeThreshold, minSwipeDistance, maxVerticalDeviation]);
}
