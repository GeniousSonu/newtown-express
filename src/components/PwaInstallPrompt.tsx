'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Smartphone, X, ArrowRight } from 'lucide-react';

const COOLDOWN_KEY = 'ntx_install_nudge_dismissed_at';
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;

export function PwaInstallPrompt() {
  const [showNudge, setShowNudge] = useState(false);

  useEffect(() => {
    // 1. Detect if running inside installed Android TWA
    const isTwa =
      typeof document !== 'undefined' &&
      document.referrer.startsWith('android-app://');

    if (isTwa) {
      return; // Never show install prompt inside TWA
    }

    // 2. Detect if running inside installed PWA (iOS standalone or Desktop standalone)
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (navigator as unknown as { standalone?: boolean }).standalone === true;

    if (isStandalone) {
      return; // Never show install prompt inside installed PWA
    }

    // 3. Check 3-day dismissal cooldown
    try {
      const dismissedAt = localStorage.getItem(COOLDOWN_KEY);
      if (dismissedAt) {
        const timePassed = Date.now() - parseInt(dismissedAt, 10);
        if (timePassed < THREE_DAYS_MS) {
          return; // Under cooldown period
        }
      }
    } catch {
      // Ignore localStorage errors (e.g. strict privacy mode)
    }

    // Delay slightly to not interrupt initial page load
    const timer = setTimeout(() => {
      setShowNudge(true);
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setShowNudge(false);
    try {
      localStorage.setItem(COOLDOWN_KEY, Date.now().toString());
    } catch {}
  };

  if (!showNudge) {
    return null;
  }

  return (
    <div className="fixed bottom-20 sm:bottom-6 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-40 animate-in slide-in-from-bottom-3 duration-300">
      <div className="tactile-card p-3.5 sm:p-4 bg-white border-2 border-[#111111] shadow-[0_6px_0_#111111] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-[#FF3B30] text-white flex items-center justify-center shrink-0 border border-[#111111] shadow-[0_2px_0_#111111]">
            <Smartphone className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-[#111111] truncate">
              Install Newtown Express
            </p>
            <p className="text-[11px] text-stone-600 font-bold leading-tight line-clamp-1 sm:line-clamp-2">
              Standalone window, faster ordering &amp; instant desk delivery sirens.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link
            href="/get-app"
            onClick={() => setShowNudge(false)}
            className="tactile-btn px-3 py-1.5 text-xs bg-[#FFD166] text-[#111111] font-black flex items-center gap-1 border border-[#111111] hover:bg-[#ffe082]"
          >
            <span>Get App</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <button
            type="button"
            onClick={handleDismiss}
            className="w-7 h-7 rounded-full border border-stone-300 flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors"
            aria-label="Dismiss install prompt for 3 days"
            title="Dismiss for 3 days"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
