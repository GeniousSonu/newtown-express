'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { INITIAL_MENU_ITEMS } from '@/lib/seedData';
import { MenuItem, SelectedAddon } from '@/types';
import { formatINR } from '@/lib/utils';
import { calculateLineItemTotals } from '@/lib/calorieCalculator';
import { AuthGate } from '@/components/AuthGate';
import { HealthScoreRing } from '@/components/HealthScoreRing';
import { HealthierAlternativeNudge } from '@/components/HealthierAlternativeNudge';
import { useKitchenStatus } from '@/context/KitchenStatusContext';
import {
  Plus,
  Minus,
  ShoppingBag,
  Sparkles,
  Search,
  Check,
  X,
  MapPin,
  Flame,
  ArrowRight,
  Star,
  ShieldCheck,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '🍽️', color: '#111111' },
  { id: 'HEALTHY SNACKS', label: 'Healthy Snacks', icon: '🥪', color: '#22C55E' },
  { id: 'SANDWICHES', label: 'Sandwiches', icon: '🧀', color: '#FFD166' },
  { id: 'MAGGI / PASTA', label: 'Maggi & Pasta', icon: '🍜', color: '#FF3B30' },
  { id: 'BEVERAGES', label: 'Beverages', icon: '🥤', color: '#4D96FF' },
  { id: 'SPECIALS', label: 'Specials', icon: '🍿', color: '#8B5CF6' },
] as const;

export default function HomePage() {
  const { user } = useAuth();
  const { addToCart, items: cartItems, totalAmount, itemCount } = useCart();
  const { isOpen, closedMessage } = useKitchenStatus();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  // Open item customization drawer
  const openCustomizer = (item: MenuItem) => {
    setCustomizingItem(item);
    setQuantity(1);

    const initial: SelectedAddon[] = [];
    if (item.addonGroups) {
      item.addonGroups.forEach((group) => {
        if (group.required && group.options.length > 0) {
          initial.push({
            groupName: group.groupName,
            optionName: group.options[0].name,
            priceDelta: group.options[0].priceDelta,
            calorieDelta: group.options[0].calorieDelta || 0,
          });
        }
      });
    }
    setSelectedAddons(initial);
  };

  const toggleAddon = (
    groupName: string,
    optionName: string,
    priceDelta: number,
    calorieDelta: number = 0,
    multiSelect: boolean = false
  ) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.groupName === groupName && a.optionName === optionName);

      if (multiSelect) {
        if (exists) {
          return prev.filter((a) => !(a.groupName === groupName && a.optionName === optionName));
        } else {
          return [...prev, { groupName, optionName, priceDelta, calorieDelta }];
        }
      } else {
        const filtered = prev.filter((a) => a.groupName !== groupName);
        return [...filtered, { groupName, optionName, priceDelta, calorieDelta }];
      }
    });
  };

  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;
    addToCart(customizingItem, quantity, selectedAddons);
    setCustomizingItem(null);
  };

  const { lineTotal: drawerTotalPrice, lineCalories: drawerTotalCalories } =
    customizingItem
      ? calculateLineItemTotals(customizingItem, selectedAddons, quantity)
      : { lineTotal: 0, lineCalories: 0 };

  // Filter items
  const filteredItems = INITIAL_MENU_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGate>
      <div className="space-y-6 pb-12">
        {/* Section 1: Context & Expressive Headline */}
        <div className="space-y-3 pt-2">
          {/* Location Delivery Context Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] text-xs font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#6B6B6B]">Pantry Open</span>
            <span className="text-[#111111]">·</span>
            <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
            <span className="text-[#111111]">Delivering to Desk {user?.seatCode || 'Select Desk'}</span>
          </div>

          {/* Big Expressive Headline */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-black text-[#111111] tracking-tight leading-[1.08]">
              What are you <br className="hidden sm:block" />
              <span className="text-[#FF3B30] underline decoration-[#FFD166] decoration-wavy decoration-4">
                craving today?
              </span>
            </h1>
            <p className="text-sm sm:text-base font-bold text-[#475569] max-w-md pt-1">
              Cooked hot to order by Newtown pantry staff. Delivered right to your desk.
            </p>
          </div>

          {/* Search Bar with Tactile Input */}
          <div className="relative pt-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#111111] stroke-[2.5]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Maggi, sandwich, chai, cold drinks..."
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#475569] placeholder:font-medium shadow-[0_3px_0_#111111] focus:outline-none focus:shadow-[0_5px_0_#111111] focus:border-[#FF3B30] transition-all"
            />
          </div>
        </div>

        {/* Section 2: Daily Health Score Ring */}
        <HealthScoreRing />

        {/* Kitchen Closed Notice Banner */}
        {!isOpen && (
          <div className="p-4 bg-[#111111] text-white rounded-2xl border-2 border-[#111111] shadow-[0_4px_0_#FF3B30] flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#FF3B30] flex items-center justify-center text-xl shrink-0">
                🔒
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#FFD166]">
                  Pantry is Currently Closed to New Orders
                </h3>
                <p className="text-xs font-bold text-stone-300 mt-0.5">
                  {closedMessage || 'Menu is available to browse! Ordering will resume when pantry reopens.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Section 3: Visual Category Discovery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#111111] tracking-tight">
              Explore Menu
            </h2>
            <span className="text-xs font-extrabold text-[#475569]">
              {INITIAL_MENU_ITEMS.length} dishes
            </span>
          </div>

          {/* Category Cards (Horizontally Scrollable) */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {CATEGORIES.map((cat) => {
              const isSelected = activeCategory === cat.id;

              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.id)}
                  className={`shrink-0 min-h-[44px] flex items-center gap-2.5 px-4 py-2.5 rounded-2xl border-2 border-[#111111] transition-all active:translate-y-1 ${
                    isSelected
                      ? 'bg-[#FF3B30] text-white shadow-[0_4px_0_#111111] -translate-y-0.5'
                      : 'bg-white text-[#111111] shadow-[0_3px_0_#111111] hover:bg-[#FFF8F2]'
                  }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-xs font-black whitespace-nowrap">
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Food Cards Grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#111111] tracking-tight">
              {activeCategory === 'ALL' ? 'Popular Today' : activeCategory}
            </h2>
            <span className="text-xs font-bold text-[#475569]">
              Showing {filteredItems.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="tactile-card overflow-hidden flex flex-col justify-between group bg-white"
              >
                {/* Visual Hero Image */}
                <div className="relative aspect-[16/10] w-full overflow-hidden border-b-2 border-[#111111] bg-stone-100">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />

                  {/* Category Pill Tag */}
                  <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-xl border-2 border-[#111111] text-[10px] font-black text-[#111111] shadow-[0_2px_0_#111111]">
                    {item.category}
                  </div>

                  {/* Health Tag Badge */}
                  <div className="absolute top-3 right-3">
                    <span
                      className={`text-[10px] uppercase font-black px-2 py-1 rounded-xl border-2 border-[#111111] shadow-[0_2px_0_#111111] ${
                        item.healthTag === 'light'
                          ? 'bg-emerald-100 text-emerald-900'
                          : item.healthTag === 'balanced'
                          ? 'bg-[#FFD166] text-[#111111]'
                          : 'bg-red-100 text-red-900'
                      }`}
                    >
                      {item.healthTag}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-5 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-[#111111] tracking-tight leading-snug group-hover:text-[#FF3B30] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#475569] font-bold mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                    <div className="flex items-center gap-1.5 pt-2 text-[11px] font-bold text-stone-600">
                      <Flame className="w-3.5 h-3.5 text-[#FF3B30]" />
                      <span>approx. {item.calories} kcal</span>
                    </div>
                  </div>

                  {/* Price & Tactile Add Action */}
                  <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#475569] uppercase block leading-none">
                        Price
                      </span>
                      <span className="text-lg sm:text-xl font-black text-[#111111]">
                        {formatINR(item.price)}
                      </span>
                    </div>

                    <button
                      onClick={() => openCustomizer(item)}
                      className="tactile-btn min-h-[44px] px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>ADD</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Smart Nudge Card */}
        <HealthierAlternativeNudge onSelectItem={openCustomizer} />

        {/* Customization Drawer / Bottom Sheet */}
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-0 sm:p-4">
            <div className="w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] border-2 border-[#111111] shadow-[0_8px_0_#111111] overflow-hidden max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-5 duration-200">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b-2 border-[#111111] bg-[#FFF8F2] flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-[#111111]">
                    Customize {customizingItem.name}
                  </h3>
                  <div className="flex items-center gap-2 text-xs font-bold text-[#475569]">
                    <span>Base {formatINR(customizingItem.price)}</span>
                    <span>•</span>
                    <span className="text-[#FF3B30] flex items-center gap-1 font-black">
                      <Flame className="w-3 h-3" />
                      approx. {customizingItem.calories} kcal
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="min-w-[44px] min-h-[44px] rounded-full border-2 border-[#111111] bg-white flex items-center justify-center hover:bg-stone-100"
                  aria-label="Close customization drawer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Addon Options Content */}
              <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
                {customizingItem.addonGroups && customizingItem.addonGroups.length > 0 ? (
                  customizingItem.addonGroups.map((group) => (
                    <div key={group.groupName} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                          {group.groupName}
                        </h4>
                        <span className="text-[11px] font-bold text-[#475569]">
                          {group.required ? 'Required (Choose 1)' : 'Optional'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {group.options.map((opt) => {
                          const isSelected = selectedAddons.some(
                            (a) => a.groupName === group.groupName && a.optionName === opt.name
                          );

                          return (
                            <button
                              key={opt.name}
                              type="button"
                              onClick={() =>
                                toggleAddon(
                                  group.groupName,
                                  opt.name,
                                  opt.priceDelta,
                                  opt.calorieDelta || 0,
                                  group.multiSelect
                                )
                              }
                              className={`min-h-[44px] p-3 rounded-2xl text-left border-2 flex items-center justify-between transition-all ${
                                isSelected
                                  ? 'border-[#111111] bg-[#FFD166] text-[#111111] shadow-[0_3px_0_#111111] -translate-y-0.5 font-black'
                                  : 'border-[#111111]/30 bg-white text-[#111111] hover:border-[#111111]'
                              }`}
                            >
                              <div className="flex items-center gap-2.5">
                                <div
                                  className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 border-[#111111] ${
                                    isSelected ? 'bg-[#FF3B30] text-white' : 'bg-white'
                                  }`}
                                >
                                  {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                </div>
                                <div>
                                  <span className="text-xs font-bold block">
                                    {opt.name}
                                  </span>
                                  {opt.calorieDelta && (
                                    <span className="text-[10px] text-[#475569] font-semibold">
                                      +{opt.calorieDelta} kcal
                                    </span>
                                  )}
                                </div>
                              </div>

                              <span className="text-xs font-black">
                                {opt.priceDelta > 0 ? `+${formatINR(opt.priceDelta)}` : 'Free'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-4 text-center text-xs text-[#475569] font-semibold">
                    No extra add-on selections required.
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="pt-3 border-t-2 border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#111111] uppercase tracking-wider block">
                      Quantity
                    </span>
                    <span className="text-xs font-bold text-[#475569]">
                      Total: approx. {drawerTotalCalories} kcal
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-1 rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 flex items-center justify-center text-[#111111] hover:bg-stone-200 font-black"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <span className="text-base font-black w-6 text-center text-[#111111]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="min-w-[44px] min-h-[44px] rounded-xl bg-stone-100 flex items-center justify-center text-[#111111] hover:bg-stone-200 font-black"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sheet Actions */}
              <div className="p-4 sm:p-5 border-t-2 border-[#111111] bg-white pb-safe">
                <button
                  type="button"
                  onClick={handleConfirmAddToCart}
                  className="tactile-btn min-h-[48px] w-full flex items-center justify-between py-3.5 px-5 sm:px-6 text-base"
                >
                  <span className="flex items-center gap-2">
                    <span>Add to Cart</span>
                    <span className="text-xs opacity-80 font-normal">
                      (~{drawerTotalCalories} kcal)
                    </span>
                  </span>
                  <span className="bg-white text-[#111111] px-3 py-1 rounded-xl text-sm font-black border border-[#111111]">
                    {formatINR(drawerTotalPrice)}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGate>
  );
}
