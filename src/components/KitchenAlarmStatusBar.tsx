'use client';

import React, { useEffect, useState } from 'react';
import { subscribeAudioState, unlockAudioContext, testAlarmChime } from '@/lib/sound';
import { Volume2, VolumeX } from 'lucide-react';

interface KitchenAlarmStatusBarProps {
  unhandledCount: number;
}

export function KitchenAlarmStatusBar({ unhandledCount }: KitchenAlarmStatusBarProps) {
  const [armed, setArmed] = useState(false);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    const unsub = subscribeAudioState((isArmed) => {
      setArmed(isArmed);
    });
    return () => unsub();
  }, []);

  const handleUnlock = async () => {
    setUnlocking(true);
    await unlockAudioContext();
    testAlarmChime();
    setUnlocking(false);
  };

  return (
    <div className={`p-3 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
      armed
        ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
        : 'bg-amber-50 border-amber-300 text-amber-950 animate-pulse'
    }`}>
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 ${
          armed
            ? 'bg-emerald-100 border-emerald-500 text-emerald-800'
            : 'bg-amber-100 border-amber-500 text-amber-900'
        }`}>
          {armed ? (
            <Volume2 className="w-5 h-5 stroke-[2.5]" />
          ) : (
            <VolumeX className="w-5 h-5 stroke-[2.5]" />
          )}
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-black tracking-tight">
              {armed ? 'Kitchen Audio Siren Armed' : 'Kitchen Audio Siren Paused'}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase border ${
              armed
                ? 'bg-emerald-100 border-emerald-400 text-emerald-800'
                : 'bg-amber-100 border-amber-400 text-amber-900'
            }`}>
              {armed ? 'Ready' : 'Requires Tap'}
            </span>
          </div>
          <p className="text-[11px] font-bold opacity-80 mt-0.5">
            {armed
              ? (unhandledCount > 0
                  ? `🚨 Siren is actively looping for ${unhandledCount} unhandled order(s)!`
                  : 'Alarm will ring automatically on incoming orders without user interaction.')
              : 'Browsers block background audio until enabled. Tap "Enable Alarm Sound" once per session.'}
          </p>
        </div>
      </div>

      {!armed && (
        <button
          type="button"
          onClick={handleUnlock}
          disabled={unlocking}
          className="min-h-[44px] px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-xl text-xs font-black shadow-xs transition-all flex items-center justify-center gap-1.5 shrink-0 active:translate-y-0.5"
        >
          <Volume2 className="w-4 h-4 stroke-[2.5]" />
          <span>{unlocking ? 'Arming Audio...' : 'Enable Alarm Sound'}</span>
        </button>
      )}
    </div>
  );
}
