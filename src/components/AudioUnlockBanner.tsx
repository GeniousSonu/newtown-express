'use client';

import React, { useEffect, useState } from 'react';
import { isAudioContextSuspended, unlockAudioContext } from '@/lib/sound';
import { VolumeX } from 'lucide-react';

export function AudioUnlockBanner() {
  const [needsUnlock, setNeedsUnlock] = useState(() => isAudioContextSuspended());

  useEffect(() => {
    // Auto unlock on any page interaction if possible
    const onUserGesture = async () => {
      await unlockAudioContext();
      setNeedsUnlock(false);
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };

    window.addEventListener('click', onUserGesture);
    window.addEventListener('touchstart', onUserGesture);

    return () => {
      window.removeEventListener('click', onUserGesture);
      window.removeEventListener('touchstart', onUserGesture);
    };
  }, []);

  const handleManualUnlock = async () => {
    await unlockAudioContext();
    setNeedsUnlock(false);
  };

  if (!needsUnlock) return null;

  return (
    <div className="bg-amber-100 border-b-2 border-amber-300 px-4 py-2.5 text-amber-900 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn shadow-xs">
      <div className="flex items-center gap-2">
        <VolumeX className="w-4 h-4 text-amber-800 shrink-0" />
        <span>
          <strong className="text-amber-950 font-black">Audio Alerts Paused:</strong> Tap anywhere or click Enable to ensure the order alarm rings loudly.
        </span>
      </div>

      <button
        onClick={handleManualUnlock}
        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-stone-950 rounded-xl text-xs font-black transition-all shadow-xs shrink-0 flex items-center gap-1.5 border border-amber-600/30 active:translate-y-0.5"
      >
        <span>Enable Alarm Sound</span>
      </button>
    </div>
  );
}
