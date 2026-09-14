'use client';

import React, { useState, useEffect } from 'react';
import { MapPin, X } from 'lucide-react';

const STORAGE_KEY = 'newtown_seen_seat_map_notice_v2';

export function SeatMigrationBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) {
        queueMicrotask(() => setVisible(true));
      }
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, 'true');
    }
  };

  if (!visible) return null;

  return (
    <div className="w-full bg-[#FFD166] border-2 border-[#111111] rounded-2xl p-3 sm:p-4 shadow-[0_3px_0_#111111] flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-white border border-[#111111] flex items-center justify-center shrink-0">
          <MapPin className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
        </div>
        <p className="text-xs sm:text-sm font-black text-[#111111] leading-snug">
          We&apos;ve updated to the official office floor map with all 121 desks. Please select your desk so pantry deliveries reach you accurately!
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss notice"
        className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-xl bg-white/80 hover:bg-white border border-[#111111] text-[#111111] shrink-0 active:translate-y-0.5 transition-all"
      >
        <X className="w-4 h-4 stroke-[2.5]" />
      </button>
    </div>
  );
}
