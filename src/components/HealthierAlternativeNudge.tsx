'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useOrders } from '@/context/OrderContext';
import { MenuItem } from '@/types';
import { INITIAL_MENU_ITEMS } from '@/lib/seedData';
import { Sparkles, X, ArrowRight, Flame } from 'lucide-react';
import Image from 'next/image';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';
import { endOfDay } from 'date-fns';

const NUDGE_DISMISSED_STORAGE_KEY = 'newtown_nudge_dismissed_until';

interface HealthierAlternativeNudgeProps {
  onSelectItem: (item: MenuItem) => void;
}

export function HealthierAlternativeNudge({ onSelectItem }: HealthierAlternativeNudgeProps) {
  const { user } = useAuth();
  const { orders } = useOrders();

  const [frequentItem, setFrequentItem] = useState<MenuItem | null>(null);
  const [alternatives, setAlternatives] = useState<MenuItem[]>([]);
  const [isDismissed, setIsDismissed] = useState<boolean>(true);

  useEffect(() => {
    queueMicrotask(() => {
      if (!user || user.role === 'admin') {
        setIsDismissed(true);
        return;
      }

      // Check if dismissed for today
      try {
        if (typeof window !== 'undefined') {
          const savedUntil = localStorage.getItem(NUDGE_DISMISSED_STORAGE_KEY);
          if (savedUntil) {
            const dismissedUntilMs = parseInt(savedUntil, 10);
            if (Date.now() < dismissedUntilMs) {
              setIsDismissed(true);
              return;
            }
          }
        }
      } catch {
        // Ignore
      }

      // Look at orders in the last 7 days
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const recentOrders = orders.filter(
        (o) =>
          (o.status === 'SERVED' || o.status === 'COMPLETED') &&
          o.createdAt >= sevenDaysAgo &&
          o.employeeId === user.uid
      );

      // Count frequency per item ID
      const frequencyMap: Record<string, number> = {};
      recentOrders.forEach((o) => {
        o.items.forEach((it) => {
          frequencyMap[it.itemId] = (frequencyMap[it.itemId] || 0) + it.quantity;
        });
      });

      // Find first item ordered 3+ times
      let highFreqItemId: string | null = null;
      for (const [id, count] of Object.entries(frequencyMap)) {
        if (count >= 3) {
          highFreqItemId = id;
          break;
        }
      }

      if (!highFreqItemId) {
        setIsDismissed(true);
        return;
      }

      const item = INITIAL_MENU_ITEMS.find((m) => m.id === highFreqItemId);
      if (!item) {
        setIsDismissed(true);
        return;
      }

      // Find 1-2 lower calorie alternatives in the same category that are available
      const lowerCalAlternatives = INITIAL_MENU_ITEMS.filter(
        (m) =>
          m.category === item.category &&
          m.id !== item.id &&
          m.isAvailable &&
          m.calories < item.calories
      ).sort((a, b) => a.calories - b.calories).slice(0, 2);

      if (lowerCalAlternatives.length === 0) {
        setIsDismissed(true);
        return;
      }

      setFrequentItem(item);
      setAlternatives(lowerCalAlternatives);
      setIsDismissed(false);
    });
  }, [user, orders]);

  const handleDismiss = () => {
    // Dismiss until end of current day in Indian Standard Time (IST)
    const zonedNow = toZonedTime(new Date(), 'Asia/Kolkata');
    const endOfZonedDay = endOfDay(zonedNow);
    const endOfDayUtc = fromZonedTime(endOfZonedDay, 'Asia/Kolkata');

    try {
      localStorage.setItem(NUDGE_DISMISSED_STORAGE_KEY, endOfDayUtc.getTime().toString());
    } catch {
      // Ignore
    }
    setIsDismissed(true);
  };

  if (isDismissed || !frequentItem || alternatives.length === 0) {
    return null;
  }

  return (
    <div className="tactile-card p-5 bg-[#FFF8F2] border-2 border-[#111111] space-y-4 relative">
      <button
        onClick={handleDismiss}
        className="absolute top-3.5 right-3.5 p-1 rounded-lg text-[#6B6B6B] hover:text-[#111111] hover:bg-black/5"
        title="Dismiss for today"
      >
        <X className="w-4 h-4" />
      </button>

      <div className="flex items-start gap-3 pr-6">
        <div className="w-9 h-9 rounded-xl bg-[#FFD166] border-2 border-[#111111] flex items-center justify-center shrink-0 shadow-[0_2px_0_#111111]">
          <Sparkles className="w-4 h-4 text-[#111111]" />
        </div>
        <div>
          <h3 className="text-sm font-black text-[#111111]">
            Switch it up? You&apos;ve had {frequentItem.name} frequently this week.
          </h3>
          <p className="text-xs text-[#6B6B6B] font-bold mt-0.5">
            Try a lighter pantry alternative with fewer calories:
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
        {alternatives.map((alt) => {
          const caloriesSaved = frequentItem.calories - alt.calories;
          return (
            <div
              key={alt.id}
              className="bg-white rounded-2xl border-2 border-[#111111] p-3 flex items-center justify-between gap-3 shadow-[0_2px_0_#111111]"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {alt.imageUrl && (
                  <div className="w-12 h-12 rounded-xl border border-[#111111] overflow-hidden shrink-0 relative">
                    <Image
                      src={alt.imageUrl}
                      alt={alt.name}
                      fill
                      className="object-cover"
                      sizes="48px"
                    />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-black text-[#111111] block truncate">
                    {alt.name}
                  </span>
                  <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
                    <Flame className="w-3 h-3 text-[#FF3B30] shrink-0" />
                    <span>approx. {alt.calories} kcal</span>
                    <span className="text-[10px] text-emerald-800 bg-emerald-100 px-1 rounded font-black">
                      -{caloriesSaved} kcal
                    </span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => onSelectItem(alt)}
                className="tactile-btn px-3 py-1.5 text-xs font-black shrink-0 flex items-center gap-1"
              >
                <span>View</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
