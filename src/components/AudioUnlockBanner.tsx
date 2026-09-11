'use client';

import React, { useEffect, useState } from 'react';
import { isAudioContextSuspended, unlockAudioContext } from '@/lib/sound';
import { Volume2, VolumeX, Sparkles } from 'lucide-react';

export function AudioUnlockBanner() {
  const [needsUnlock, setNeedsUnlock] = useState(false);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    // Check initial suspended state
    if (isAudioContextSuspended()) {
      setNeedsUnlock(true);
    }

    // Auto unlock on any page interaction if possible
    const onUserGesture = async () => {
      await unlockAudioContext();
      setNeedsUnlock(false);
      setUnlocked(true);
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
    setUnlocked(true);
  };

  if (!needsUnlock) return null;

  return (
    <div className="bg-amber-500/15 border-b border-amber-500/30 px-4 py-2 text-amber-300 text-xs font-bold flex items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-2">
        <VolumeX className="w-4 h-4 text-amber-400 shrink-0" />
        <span>
          <strong className="text-amber-200">Audio Alerts Paused:</strong> Tap anywhere or click Enable to ensure the order alarm rings loudly.
        </span>
      </div>

      <button
        onClick={handleManualUnlock}
        className="px-3 py-1 bg-amber-500 text-slate-950 rounded-lg text-xs font-black hover:bg-amber-400 transition-all shadow-sm shrink-0"
      >
        Enable Sound
      </button>
    </div>
  );
}
