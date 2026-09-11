'use client';

import React, { useState } from 'react';
import { useAdminTheme } from '@/context/AdminThemeContext';
import { Palette, Check, Sparkles } from 'lucide-react';

const PRESET_COLORS = [
  { name: 'Amber Alert', hex: '#F59E0B' },
  { name: 'Crimson Red', hex: '#EF4444' },
  { name: 'Neon Orange', hex: '#F97316' },
  { name: 'Cyber Blue', hex: '#0EA5E9' },
  { name: 'Emerald Ops', hex: '#10B981' },
];

export function AdminAccentColorPicker() {
  const { accentColor, updateAccentColor } = useAdminTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [customHex, setCustomHex] = useState(accentColor);
  const [saving, setSaving] = useState(false);

  const handleSelectColor = async (hex: string) => {
    try {
      setSaving(true);
      await updateAccentColor(hex);
      setCustomHex(hex);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleApplyCustom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (/^#[0-9A-Fa-f]{6}$/.test(customHex)) {
      await handleSelectColor(customHex);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] hover:bg-[#334155] border border-slate-700 rounded-xl text-xs font-bold text-slate-200 transition-all shadow-sm"
        title="Change Kitchen Accent Color"
      >
        <div
          className="w-3.5 h-3.5 rounded-full border border-white/40 shadow-sm"
          style={{ backgroundColor: accentColor }}
        />
        <span className="hidden sm:inline">Theme</span>
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-64 p-4 bg-[#1E293B] border border-slate-700 rounded-2xl shadow-2xl z-50 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-amber-400" />
                Accent Color
              </span>
              <span className="text-[10px] font-mono text-slate-400 uppercase">
                {accentColor}
              </span>
            </div>

            {/* Presets */}
            <div className="grid grid-cols-5 gap-2">
              {PRESET_COLORS.map((c) => {
                const isSelected = accentColor.toLowerCase() === c.hex.toLowerCase();
                return (
                  <button
                    key={c.hex}
                    onClick={() => handleSelectColor(c.hex)}
                    title={c.name}
                    className={`w-9 h-9 rounded-xl flex items-center justify-center border-2 transition-transform hover:scale-105 ${
                      isSelected ? 'border-white scale-105 shadow-md' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c.hex }}
                  >
                    {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                  </button>
                );
              })}
            </div>

            {/* Custom Hex Form */}
            <form onSubmit={handleApplyCustom} className="flex items-center gap-2 pt-1 border-t border-slate-700">
              <input
                type="text"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                placeholder="#F59E0B"
                className="w-full px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-slate-200 uppercase focus:outline-none focus:border-amber-400"
              />
              <button
                type="submit"
                disabled={saving}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-50"
              >
                Set
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
