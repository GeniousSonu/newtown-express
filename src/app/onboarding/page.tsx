'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { INITIAL_SEAT_MAP } from '@/lib/seedData';
import { MapPin, Check, ArrowRight, Building2 } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateSeatCode } = useAuth();

  const [selectedZone, setSelectedZone] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [selectedSeat, setSelectedSeat] = useState<string>(user?.seatCode || 'B-04');
  const [saving, setSaving] = useState(false);

  const zoneDesks = INITIAL_SEAT_MAP.filter((s) => s.zone === selectedZone);

  const handleSave = async () => {
    if (!selectedSeat) return;
    setSaving(true);
    try {
      await updateSeatCode(selectedSeat);
      router.push('/');
    } catch (err) {
      console.error('Failed to save seat:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[80vh] py-8 px-4 flex flex-col items-center justify-center">
      <div className="w-full max-w-md bg-white rounded-[28px] p-6 sm:p-8 border-2 border-[#111111] shadow-[0_6px_0_#111111] space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFD166] border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center text-3xl">
            📍
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            Select Your Desk
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-bold max-w-xs mx-auto">
            Pick your desk code once. Newtown pantry staff delivers hot meals right to your seat.
          </p>
        </div>

        {/* Zone Selector Tabs */}
        <div className="flex p-1.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
          {(['A', 'B', 'C', 'D'] as const).map((zone) => (
            <button
              key={zone}
              onClick={() => setSelectedZone(zone)}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all ${
                selectedZone === zone
                  ? 'bg-[#FF3B30] text-white shadow-[0_2px_0_#111111] -translate-y-0.5'
                  : 'text-[#111111] hover:bg-white'
              }`}
            >
              Bay {zone}
            </button>
          ))}
        </div>

        {/* Seat Grid */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between text-xs font-black text-[#6B6B6B] uppercase tracking-wider">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-[#111111]" />
              Bay {selectedZone} Desks
            </span>
            <span className="text-[#FF3B30]">
              Selected: {selectedSeat || 'None'}
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2.5">
            {zoneDesks.map((seat) => {
              const isSelected = selectedSeat === seat.seatCode;
              return (
                <button
                  key={seat.seatCode}
                  onClick={() => setSelectedSeat(seat.seatCode)}
                  className={`relative p-3 rounded-2xl text-center border-2 transition-all active:translate-y-1 ${
                    isSelected
                      ? 'border-[#111111] bg-[#FFD166] text-[#111111] font-black shadow-[0_3px_0_#111111] -translate-y-0.5'
                      : 'border-[#111111]/30 bg-white text-[#111111] font-bold hover:border-[#111111]'
                  }`}
                >
                  <span className="text-[10px] block text-[#6B6B6B] font-bold">Bay {seat.zone}</span>
                  <span className="text-sm font-black">{seat.seatCode.split('-')[1]}</span>
                  {isSelected && (
                    <span className="absolute -top-1.5 -right-1.5 bg-[#FF3B30] text-white rounded-full p-0.5 border border-[#111111] shadow-xs">
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Banner */}
        <div className="flex items-center justify-between p-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111]">
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-[#FF3B30] stroke-[2.5]" />
            <div>
              <span className="text-[10px] text-[#6B6B6B] font-black uppercase block">Active Desk</span>
              <span className="text-base font-black text-[#111111]">{selectedSeat}</span>
            </div>
          </div>
          <span className="text-xs font-black text-[#111111] bg-[#22C55E]/30 border border-[#22C55E] px-2.5 py-0.5 rounded-full">
            Ready
          </span>
        </div>

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedSeat}
          className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
        >
          <span>{saving ? 'Saving...' : 'Confirm Desk & Start Ordering'}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
