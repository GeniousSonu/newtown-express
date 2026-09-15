'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types';
import { formatINR } from '@/lib/utils';
import { db } from '@/lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { CheckCircle2, XCircle, Flame, Edit2, Check, X, Pencil } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { stockPriceSchema, StockPriceFormData } from '@/lib/validations/schemas';
import { toast } from 'sonner';

interface MenuStockRowProps {
  item: MenuItem;
  onStockChange?: (itemId: string, isAvailable: boolean) => void;
  onPriceChange?: (itemId: string, newPrice: number) => void;
  allowEditPrice?: boolean;
  canEditItem?: boolean;
  onEditItem?: (item: MenuItem) => void;
}

export function MenuStockRow({
  item,
  onStockChange,
  onPriceChange,
  allowEditPrice = true,
  canEditItem = false,
  onEditItem,
}: MenuStockRowProps) {
  const isAvailable = item.isAvailable !== false;
  const currentPrice = item.price;
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
  } = useForm<StockPriceFormData>({
    resolver: zodResolver(stockPriceSchema),
    defaultValues: { price: item.price },
  });

  const handleToggleStock = async () => {
    const nextState = !isAvailable;
    onStockChange?.(item.id, nextState);

    const firestore = db;
    if (!firestore) return;
    try {
      setSaving(true);
      await setDoc(
        doc(firestore, 'menuItems', item.id),
        {
          isAvailable: nextState,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('[STOCK-TOGGLE] Failed to update Firestore:', err);
      // Revert on error
      onStockChange?.(item.id, !nextState);
    } finally {
      setSaving(false);
    }
  };

  const handleSavePrice = async (data: StockPriceFormData) => {
    setIsEditingPrice(false);
    onPriceChange?.(item.id, data.price);

    const firestore = db;
    if (!firestore) return;
    try {
      setSaving(true);
      await setDoc(
        doc(firestore, 'menuItems', item.id),
        {
          price: data.price,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      toast.success(`Updated ${item.name} price to ₹${data.price}`);
    } catch (err) {
      console.error('[PRICE-SAVE] Failed to update price:', err);
      onPriceChange?.(item.id, item.price);
      toast.error('Failed to update price');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isAvailable
          ? 'bg-white border-[#134E4A]/20 shadow-xs'
          : 'bg-red-50/30 border-red-200/80 opacity-95'
      }`}
    >
      {/* Left / Top: Item Details */}
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 text-base font-black border-2 ${
            isAvailable
              ? 'bg-emerald-50 text-[#15803D] border-emerald-300'
              : 'bg-red-50 text-[#B91C1C] border-red-300'
          }`}
        >
          {isAvailable ? '✓' : '✕'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="text-sm font-black text-[#0F172A] truncate">
              {item.name}
            </h4>
            <span className="text-[10px] uppercase font-mono font-bold px-2 py-0.5 rounded-md bg-stone-100 text-[#475569] border border-stone-200">
              {item.category}
            </span>
          </div>

          <div className="flex items-center gap-3 text-xs text-[#475569] font-bold mt-0.5">
            {/* Calories tag */}
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-600" />
              <span>{item.calories} kcal</span>
            </span>

            {/* Addon count */}
            {item.addonGroups && item.addonGroups.length > 0 && (
              <span className="text-[11px] text-[#475569]">
                • {item.addonGroups.reduce((acc, g) => acc + g.options.length, 0)} addons
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Right / Bottom: Price & Quick Toggle Controls (Stacked cleanly on mobile <480px) */}
      <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-100">
        {/* Price (Editable only if allowEditPrice is true) */}
        {!allowEditPrice ? (
          <div className="px-3 py-1.5 flex items-center">
            <span className="font-black text-sm text-[#0F172A]">
              {formatINR(currentPrice)}
            </span>
          </div>
        ) : isEditingPrice ? (
          <form onSubmit={handleSubmit(handleSavePrice)} className="flex items-center gap-1">
            <span className="text-[#0F172A] font-black text-sm">₹</span>
            <input
              type="number"
              {...register('price', { valueAsNumber: true })}
              className="w-20 min-h-[44px] px-2 py-1 bg-white border-2 border-[#0F766E] rounded-xl text-[16px] font-black text-[#0F172A] focus:outline-none"
              autoFocus
            />
            <button
              type="submit"
              disabled={saving}
              className="min-w-[44px] min-h-[44px] bg-[#15803D] hover:bg-[#166534] text-white rounded-xl flex items-center justify-center shadow-xs"
              aria-label="Save price"
            >
              <Check className="w-4 h-4 stroke-[3]" />
            </button>
            <button
              type="button"
              onClick={() => {
                reset({ price: currentPrice });
                setIsEditingPrice(false);
              }}
              className="min-w-[44px] min-h-[44px] text-[#475569] hover:bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center"
              aria-label="Cancel editing"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsEditingPrice(true)}
            className="group min-h-[44px] px-3 py-1.5 flex items-center gap-1.5 rounded-xl hover:bg-stone-100 text-[#0F172A] hover:text-[#0F766E] border border-transparent hover:border-[#0F766E]/20 transition-all"
            title="Click to edit price"
          >
            <span className="font-black text-sm text-[#0F172A] group-hover:text-[#0F766E]">
              {formatINR(currentPrice)}
            </span>
            <Edit2 className="w-3 h-3 text-[#475569] group-hover:text-[#0F766E]" />
          </button>
        )}

        {/* Edit Details Button (Admin Only) */}
        {canEditItem && onEditItem && (
          <button
            type="button"
            onClick={() => onEditItem(item)}
            className="min-h-[44px] px-3 py-2 bg-stone-100 hover:bg-[#0F766E]/10 text-[#0F172A] hover:text-[#0F766E] border border-stone-200 hover:border-[#0F766E]/30 rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-xs"
            title="Edit full menu item details"
          >
            <Pencil className="w-3.5 h-3.5 text-[#0F766E]" />
            <span>Edit</span>
          </button>
        )}

        {/* In Stock / Sold Out Toggle Button */}
        <button
          onClick={handleToggleStock}
          disabled={saving}
          className={`min-h-[44px] min-w-[124px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black transition-all shadow-xs active:translate-y-0.5 ${
            isAvailable
              ? 'bg-[#15803D] hover:bg-[#166534] text-white border-2 border-[#15803D]'
              : 'bg-[#B91C1C] hover:bg-[#991B1B] text-white border-2 border-[#B91C1C]'
          }`}
        >
          {isAvailable ? (
            <>
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>IN STOCK</span>
            </>
          ) : (
            <>
              <XCircle className="w-4 h-4 stroke-[2.5]" />
              <span>SOLD OUT</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
