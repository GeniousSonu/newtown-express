'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { INITIAL_SEAT_MAP } from '@/lib/seedData';
import { MapPin, Check, ArrowRight, Building2, UserCheck, User } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const preFilledName = user?.displayName?.trim() || '';
  const hasPreFilledName = Boolean(preFilledName);

  const [customName, setCustomName] = useState('');
  const [selectedZone, setSelectedZone] = useState<'A' | 'B' | 'C' | 'D'>('B');
  const [selectedSeat, setSelectedSeat] = useState<string>(user?.seatCode || 'B-04');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zoneDesks = INITIAL_SEAT_MAP.filter((s) => s.zone === selectedZone);
  const effectiveName = hasPreFilledName ? preFilledName : customName.trim();

  const handleSave = async () => {
    if (!effectiveName) {
      setError('Please enter your full name before continuing.');
      return;
    }
    if (!selectedSeat) {
      setError('Please pick a desk code.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      if (hasPreFilledName) {
        await updateProfile({ seatCode: selectedSeat });
      } else {
        await updateProfile({ displayName: effectiveName, seatCode: selectedSeat });
      }
      router.push('/');
    } catch (err) {
      console.error('Failed to save onboarding details:', err);
      setError('Failed to save profile. Please try again.');
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
            {hasPreFilledName ? '👋' : '📍'}
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight">
            {hasPreFilledName ? `Welcome, ${preFilledName}!` : 'Select Your Desk'}
          </h1>
          <p className="text-xs sm:text-sm text-[#6B6B6B] font-bold max-w-xs mx-auto">
            {hasPreFilledName
              ? 'Pick your desk code once. Newtown pantry staff delivers hot meals right to your seat.'
              : 'Tell us your name and pick your desk code. Newtown pantry delivers hot meals to your seat.'}
          </p>
        </div>

        {/* Name Step: Pre-filled Confirmable Badge OR Input Field */}
        {hasPreFilledName ? (
          <div className="flex items-center gap-3 p-3.5 bg-[#FFF8F2] rounded-2xl border-2 border-[#111111] shadow-[0_2px_0_#111111]">
            <div className="w-10 h-10 rounded-xl bg-[#22C55E]/20 border-2 border-[#22C55E] flex items-center justify-center text-[#22C55E] shrink-0">
              <UserCheck className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase font-black tracking-wider text-[#6B6B6B]">
                  Staff Directory
                </span>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-[#22C55E] text-white rounded-md">
                  Verified
                </span>
              </div>
              <span className="text-sm sm:text-base font-black text-[#111111] truncate block">
                {preFilledName}
              </span>
            </div>
          </div>
        ) : (
          <div className="space-y-1.5">
            <label className="text-xs font-black text-[#111111] uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-4 h-4 text-[#FF3B30]" />
              <span>Your Full Name</span>
            </label>
            <input
              type="text"
              value={customName}
              onChange={(e) => {
                setCustomName(e.target.value);
                if (error) setError(null);
              }}
              placeholder="e.g. Syed Adnan Hussain"
              className="w-full p-3.5 bg-[#FFF8F2] border-2 border-[#111111] rounded-2xl text-sm font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-[#FF3B30] shadow-[0_2px_0_#111111]"
              required
            />
            <p className="text-[11px] text-[#6B6B6B] font-bold">
              Enter your name so pantry staff knows who to deliver your order to.
            </p>
          </div>
        )}

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

        {/* Error alert */}
        {error && (
          <div className="p-3 bg-red-100 border-2 border-red-500 rounded-xl text-xs font-black text-red-800">
            {error}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleSave}
          disabled={saving || !selectedSeat || (!hasPreFilledName && !customName.trim())}
          className="tactile-btn w-full flex items-center justify-center gap-2 py-4 px-6 text-sm disabled:opacity-50"
        >
          <span>{saving ? 'Saving...' : 'Confirm Desk & Start Ordering'}</span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
