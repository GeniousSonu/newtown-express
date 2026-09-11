'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types';
import { formatINR } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, Flame, Edit2, Check, X } from 'lucide-react';

interface MenuStockRowProps {
  item: MenuItem;
  onStockChange?: (itemId: string, isAvailable: boolean) => void;
  onPriceChange?: (itemId: string, newPrice: number) => void;
}

export function MenuStockRow({ item, onStockChange, onPriceChange }: MenuStockRowProps) {
  const [isAvailable, setIsAvailable] = useState<boolean>(item.isAvailable !== false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [priceInput, setPriceInput] = useState(String(item.price));
  const [saving, setSaving] = useState(false);

  const handleToggleStock = async () => {
    const nextState = !isAvailable;
    setIsAvailable(nextState);
    onStockChange?.(item.id, nextState);

    const firestore = db;
    if (!firestore) return;
    try {
      setSaving(true);
      await setDoc(
        doc(firestore, 'menuItems', item.id),
        {
          isAvailable: nextState,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[STOCK-TOGGLE] Failed to update Firestore:', err);
      // Revert on error
      setIsAvailable(!nextState);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrice = async () => {
    const numPrice = Number(priceInput);
    if (isNaN(numPrice) || numPrice < 0) return;

    setIsEditingPrice(false);
    onPriceChange?.(item.id, numPrice);

    const firestore = db;
    if (!firestore) return;
    try {
      setSaving(true);
      await setDoc(
        doc(firestore, 'menuItems', item.id),
        {
          price: numPrice,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[PRICE-SAVE] Failed to update price:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`p-3 sm:p-4 rounded-xl border transition-all flex items-center justify-between gap-3 ${
        isAvailable
          ? 'bg-white border-slate-200 shadow-sm'
          : 'bg-slate-100/90 border-slate-300 opacity-80'
      }`}
    >
      {/* Left: Item Details */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-base font-black border ${
            isAvailable
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
          }`}
        >
          {isAvailable ? '✓' : '✕'}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-black text-slate-900 truncate">
              {item.name}
            </h4>
            <span className="text-[10px] uppercase font-mono font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200">
              {item.category}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold mt-0.5">
            {/* Calories tag */}
            <span className="flex items-center gap-1">
              <Flame className="w-3 h-3 text-orange-500" />
              <span>{item.calories} kcal</span>
            </span>

            {/* Price (Editable) */}
            {isEditingPrice ? (
              <div className="flex items-center gap-1">
                <span className="text-slate-900 font-black">₹</span>
                <input
                  type="number"
                  value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="w-16 px-1 py-0.5 bg-white border border-amber-400 rounded text-xs font-black text-slate-900 focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={handleSavePrice}
                  className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>
                <button
                  onClick={() => {
                    setPriceInput(String(item.price));
                    setIsEditingPrice(false);
                  }}
                  className="p-1 text-slate-400 hover:bg-slate-100 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditingPrice(true)}
                className="group flex items-center gap-1 hover:text-amber-600 transition-colors"
                title="Click to edit price"
              >
                <span className="font-black text-slate-900 group-hover:text-amber-600">
                  {formatINR(Number(priceInput))}
                </span>
                <Edit2 className="w-2.5 h-2.5 opacity-40 group-hover:opacity-100" />
              </button>
            )}

            {/* Addon count */}
            {item.addonGroups && item.addonGroups.length > 0 && (
              <span className="text-[10px] text-slate-400">
                • {item.addonGroups.reduce((acc, g) => acc + g.options.length, 0)} addons
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right: Quick In Stock / Sold Out Toggle */}
      <div className="shrink-0">
        <button
          onClick={handleToggleStock}
          disabled={saving}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black transition-all ${
            isAvailable
              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:scale-[1.02]'
              : 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm hover:scale-[1.02]'
          }`}
        >
          {isAvailable ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>IN STOCK</span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>SOLD OUT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
