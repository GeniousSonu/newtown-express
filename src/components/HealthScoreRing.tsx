'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { db } from '@/lib/firebase';
import { doc, onSnapshot, getDoc } from 'firebase/firestore';
import { Activity, Flame, Info, Sparkles } from 'lucide-react';

export function HealthScoreRing() {
  const { user } = useAuth();
  const [totalCalories, setTotalCalories] = useState<number>(0);
  const [budget, setBudget] = useState<number>(600);
  const [loading, setLoading] = useState<boolean>(true);

  // Compute today's date key in IST (UTC + 5.5 hours)
  const getTodayIST = () => {
    const istDate = new Date(Date.now() + 5.5 * 60 * 60 * 1000);
    const year = istDate.getUTCFullYear();
    const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
    const day = String(istDate.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    if (!db || !user) {
      setLoading(false);
      return;
    }

    const todayIST = getTodayIST();
    const intakeDocRef = doc(db, 'dailyIntake', `${user.uid}_${todayIST}`);

    // Fetch budget from appConfig/health
    const fetchBudget = async () => {
      try {
        if (!db) return;
        const configSnap = await getDoc(doc(db, 'appConfig', 'health'));
        if (configSnap.exists()) {
          const data = configSnap.data();
          if (typeof data.dailyCalorieBudget === 'number') {
            setBudget(data.dailyCalorieBudget);
          }
        }
      } catch (err) {
        console.warn('[HEALTH-RING] Could not fetch budget config:', err);
      }
    };

    fetchBudget();

    // Real-time listener for today's daily intake
    const unsubscribe = onSnapshot(
      intakeDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          setTotalCalories(data.totalCalories || 0);
        } else {
          setTotalCalories(0);
        }
        setLoading(false);
      },
      (error) => {
        console.warn('[HEALTH-RING] Intake doc notice:', error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  if (!user || user.role === 'admin') {
    return null; // Health score is tailored for buyers/employees
  }

  // Calculate score: 100 if <= budget; decreases linearly as calories exceed budget
  let score = 100;
  if (totalCalories > budget) {
    const excessRatio = (totalCalories - budget) / budget;
    score = Math.max(0, Math.min(100, Math.round(100 - excessRatio * 100)));
  }

  // Visual state styling
  let statusText = 'On track';
  let strokeColor = '#22C55E'; // green
  let badgeBg = 'bg-emerald-100 text-emerald-900 border-emerald-400';

  if (score < 50) {
    statusText = 'Indulgent day today';
    strokeColor = '#EF4444'; // red
    badgeBg = 'bg-red-100 text-red-900 border-red-400';
  } else if (score < 80) {
    statusText = 'Moderate';
    strokeColor = '#F59E0B'; // yellow
    badgeBg = 'bg-amber-100 text-amber-900 border-amber-400';
  }

  // SVG Gauge calculations
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="tactile-card p-4 sm:p-5 bg-white space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#FFF8F2] border-2 border-[#111111] flex items-center justify-center">
            <Activity className="w-4 h-4 text-[#FF3B30] stroke-[2.5]" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[#111111] leading-none">
              Daily Pantry Health Score
            </h2>
            <span className="text-[10px] font-bold text-[#6B6B6B]">
              Today's Pantry Deliveries
            </span>
          </div>
        </div>

        <span
          className={`text-[11px] font-black px-2.5 py-1 rounded-full border ${badgeBg} shadow-xs`}
        >
          {statusText}
        </span>
      </div>

      <div className="flex items-center justify-between gap-4 pt-1">
        {/* Ring Gauge */}
        <div className="relative w-20 h-20 shrink-0 flex items-center justify-center">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            {/* Track */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="transparent"
              stroke="#E5E7EB"
              strokeWidth="7"
            />
            {/* Progress fill */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              fill="transparent"
              stroke={strokeColor}
              strokeWidth="7"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-700 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-base font-black text-[#111111] leading-none">
              {score}
            </span>
            <span className="text-[9px] font-bold text-[#6B6B6B]">/ 100</span>
          </div>
        </div>

        {/* Breakdown Stats */}
        <div className="flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#6B6B6B] flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-[#FF3B30]" />
              Pantry Calories:
            </span>
            <span className="font-black text-[#111111]">
              approx. {totalCalories} kcal
            </span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#6B6B6B]">Target Budget:</span>
            <span className="font-black text-[#6B6B6B]">{budget} kcal</span>
          </div>

          <div className="w-full bg-[#FFF8F2] h-2 rounded-full border border-[#111111] overflow-hidden">
            <div
              className="h-full transition-all duration-500 rounded-full"
              style={{
                width: `${Math.min(100, (totalCalories / budget) * 100)}%`,
                backgroundColor: strokeColor,
              }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[10px] font-bold text-[#6B6B6B] border-t border-stone-200 pt-2">
        <Info className="w-3 h-3 text-[#111111] shrink-0" />
        <span>Approximate estimate for office desk workers. Not medical or nutrition advice.</span>
      </div>
    </div>
  );
}
