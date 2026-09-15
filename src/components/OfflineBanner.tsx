'use client';

import React, { useSyncExternalStore } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

function subscribe(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getSnapshot() {
  return navigator.onLine;
}

function getServerSnapshot() {
  return true;
}

export function OfflineBanner() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  if (isOnline) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 bg-[#111111] text-white px-4 py-2.5 shadow-lg border-b-2 border-[#FFD166] flex items-center justify-between gap-3 text-xs font-bold animate-in slide-in-from-top duration-300"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-[#FFD166] flex items-center justify-center shrink-0 border border-amber-400/40">
          <WifiOff className="w-3.5 h-3.5" />
        </span>
        <span className="truncate">
          <strong className="text-[#FFD166] font-black mr-1">No Connection:</strong>
          You are currently offline. Orders and live updates will resume when reconnected.
        </span>
      </div>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-bold text-white shrink-0 flex items-center gap-1 border border-white/20 transition-colors"
      >
        <RefreshCw className="w-3 h-3" />
        <span>Check</span>
      </button>
    </div>
  );
}
