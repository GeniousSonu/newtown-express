'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { INITIAL_MENU_ITEMS } from '@/lib/mockData';
import { MenuItem, SelectedAddon } from '@/types';
import { formatINR } from '@/lib/utils';
import { AuthGate } from '@/components/AuthGate';
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
          });
        }
      });
    }
    setSelectedAddons(initial);
  };

  const toggleAddon = (groupName: string, optionName: string, priceDelta: number, multiSelect: boolean) => {
    setSelectedAddons((prev) => {
      const exists = prev.some((a) => a.groupName === groupName && a.optionName === optionName);

      if (multiSelect) {
        if (exists) {
          return prev.filter((a) => !(a.groupName === groupName && a.optionName === optionName));
        } else {
          return [...prev, { groupName, optionName, priceDelta }];
        }
      } else {
        const filtered = prev.filter((a) => a.groupName !== groupName);
        return [...filtered, { groupName, optionName, priceDelta }];
      }
    });
  };

  const handleConfirmAddToCart = () => {
    if (!customizingItem) return;
    addToCart(customizingItem, quantity, selectedAddons);
    setCustomizingItem(null);
  };

  const currentAddonsDelta = selectedAddons.reduce((sum, a) => sum + a.priceDelta, 0);
  const drawerUnitPrice = (customizingItem?.price || 0) + currentAddonsDelta;
  const drawerTotalPrice = drawerUnitPrice * quantity;

  // Filter items
  const filteredItems = INITIAL_MENU_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Featured Hero Item (Chef's Special)
  const featuredItem = INITIAL_MENU_ITEMS.find((i) => i.id === 'maggi-3') || INITIAL_MENU_ITEMS[0];

  return (
    <AuthGate>
      <div className="space-y-8 pb-12">
        {/* Section 1: Context & Expressive Headline */}
        <div className="space-y-3 pt-2">
          {/* Location Delivery Context Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] text-xs font-black">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
            <span className="text-[#6B6B6B]">Pantry Open</span>
            <span className="text-[#111111]">·</span>
            <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
            <span className="text-[#111111]">Delivering to Desk {user?.seatCode || 'B-04'}</span>
          </div>

          {/* Big Expressive Headline */}
          <div className="space-y-1">
            <h1 className="text-3xl sm:text-5xl font-black text-[#111111] tracking-tight leading-[1.08]">
              What are you <br className="hidden sm:block" />
              <span className="text-[#FF3B30] underline decoration-[#FFD166] decoration-wavy decoration-4">
                craving today?
              </span>
            </h1>
            <p className="text-sm sm:text-base font-bold text-[#6B6B6B] max-w-md pt-1">
              Cooked hot to order by Newtown pantry staff. Order in 15 seconds, delivered right to your desk.
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
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#6B6B6B] placeholder:font-medium shadow-[0_3px_0_#111111] focus:outline-none focus:shadow-[0_5px_0_#111111] focus:border-[#FF3B30] transition-all"
            />
          </div>
        </div>

        {/* Section 2: Visual Category Discovery */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#111111] tracking-tight">
              Explore Menu
            </h2>
            <span className="text-xs font-extrabold text-[#6B6B6B]">
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
                  className={`shrink-0 flex items-center gap-2.5 px-4 py-3 rounded-2xl border-2 border-[#111111] transition-all active:translate-y-1 ${
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

        {/* Section 3: Featured Spotlight Hero Card */}
        {activeCategory === 'ALL' && !searchQuery && (
          <div className="tactile-card-featured p-6 sm:p-7 relative overflow-hidden bg-gradient-to-br from-white via-white to-orange-50">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="space-y-3 z-10">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-[#FFD166] text-[#111111] border-2 border-[#111111] text-[11px] font-black shadow-[0_2px_0_#111111]">
                  <Flame className="w-3.5 h-3.5 text-[#FF3B30] fill-[#FF3B30]" />
                  <span>MOST ORDERED AT NEWTOWN</span>
                </div>

                <h3 className="text-2xl sm:text-3xl font-black text-[#111111] tracking-tight leading-tight">
                  {featuredItem.name}
                </h3>

                <p className="text-xs sm:text-sm font-semibold text-[#6B6B6B] leading-relaxed">
                  {featuredItem.description}
                </p>

                <div className="flex items-center gap-4 pt-2">
                  <span className="text-2xl font-black text-[#111111]">
                    {formatINR(featuredItem.price)}
                  </span>

                  <button
                    onClick={() => openCustomizer(featuredItem)}
                    className="tactile-btn px-6 py-3 text-xs flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4 stroke-[3]" />
                    <span>Customize & Order</span>
                  </button>
                </div>
              </div>

              {/* Featured Food Image */}
              <div className="relative aspect-[16/11] rounded-2xl overflow-hidden border-2 border-[#111111] shadow-[0_4px_0_#111111] group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={featuredItem.imageUrl}
                  alt={featuredItem.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-3 right-3 bg-white/90 backdrop-blur-xs px-2.5 py-1 rounded-xl border-2 border-[#111111] text-[10px] font-black text-[#111111] shadow-[0_2px_0_#111111] flex items-center gap-1">
                  <Star className="w-3 h-3 fill-[#FFD166] text-[#111111]" /> 4.9 Rating
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Section 4: Food Cards Grid (Food is the Visual Hero!) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#111111] tracking-tight">
              {activeCategory === 'ALL' ? 'Popular Today' : activeCategory}
            </h2>
            <span className="text-xs font-bold text-[#6B6B6B]">
              Showing {filteredItems.length} items
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className="tactile-card overflow-hidden flex flex-col justify-between group"
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

                  {/* Veg / Quick Serve Badge */}
                  {item.price <= 15 && (
                    <div className="absolute bottom-3 left-3 px-2 py-0.5 bg-[#22C55E] text-white rounded-lg border border-[#111111] text-[10px] font-black shadow-[0_2px_0_#111111]">
                      ₹ Budget Snack
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 flex flex-col justify-between flex-1 space-y-3">
                  <div>
                    <h3 className="text-lg font-black text-[#111111] tracking-tight leading-snug group-hover:text-[#FF3B30] transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#6B6B6B] font-semibold mt-1 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  </div>

                  {/* Price & Tactile Add Action */}
                  <div className="pt-3 border-t-2 border-stone-100 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-[#6B6B6B] uppercase block leading-none">
                        Price
                      </span>
                      <span className="text-xl font-black text-[#111111]">
                        {formatINR(item.price)}
                      </span>
                    </div>

                    <button
                      onClick={() => openCustomizer(item)}
                      className="tactile-btn px-4 py-2 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>ADD</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="tactile-card p-12 text-center space-y-3">
              <div className="text-5xl">🔍</div>
              <h3 className="text-lg font-black text-[#111111]">No food items match your search</h3>
              <p className="text-xs text-[#6B6B6B] font-semibold">
                Try searching for &quot;Maggi&quot;, &quot;Tea&quot;, or tap another category above.
              </p>
            </div>
          )}
        </div>

        {/* Section 5: Promotional Combo Callout */}
        <div className="tactile-card p-6 bg-gradient-to-r from-[#FFD166] via-amber-200 to-[#FFD166] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center sm:text-left">
            <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#111111] text-white rounded-md">
              Pantry Combo Perk
            </span>
            <h4 className="text-xl font-black text-[#111111]">
              Maggi + Kadak Adrak Chai = The 4 PM Lifesaver
            </h4>
            <p className="text-xs font-bold text-[#111111]/80">
              Order your favorite noodles with freshly brewed hot ginger tea.
            </p>
          </div>

          <button
            onClick={() => {
              const maggi = INITIAL_MENU_ITEMS.find((i) => i.id === 'maggi-1');
              if (maggi) openCustomizer(maggi);
            }}
            className="tactile-btn-dark px-6 py-3 text-xs whitespace-nowrap flex items-center gap-2 shrink-0"
          >
            <span>Order Maggi Combo</span>
            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>

        {/* Sticky Floating Cart Bar (Tactile Style) */}
        {itemCount > 0 && (
          <div className="sticky bottom-20 sm:bottom-6 z-30 pt-2 animate-in slide-in-from-bottom-3 duration-200">
            <Link
              href="/cart"
              className="tactile-card p-4 bg-[#111111] text-white flex items-center justify-between border-2 border-[#111111] shadow-[0_6px_0_#FF3B30] hover:translate-y-[-1px] active:translate-y-[2px] transition-all"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-[#FF3B30] border-2 border-white flex items-center justify-center font-black text-white text-base shadow-xs">
                  {itemCount}
                </div>
                <div>
                  <div className="text-xs font-bold text-stone-300">Your Desk Order</div>
                  <div className="text-xl font-black text-white">
                    {formatINR(totalAmount)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 font-black text-xs bg-[#FF3B30] text-white px-5 py-2.5 rounded-2xl border-2 border-white shadow-[0_2px_0_#ffffff]">
                <span>Review Cart</span>
                <ShoppingBag className="w-4 h-4 stroke-[2.5]" />
              </div>
            </Link>
          </div>
        )}

        {/* Tactile Addon Customizer Bottom Sheet */}
        {customizingItem && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[85vh] flex flex-col overflow-hidden border-2 border-[#111111] shadow-[0_8px_0_#111111] animate-in slide-in-from-bottom-4 duration-200">
              {/* Sheet Header with Image Preview */}
              <div className="relative border-b-2 border-[#111111]">
                <div className="h-32 sm:h-36 w-full overflow-hidden relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={customizingItem.imageUrl}
                    alt={customizingItem.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                </div>

                <button
                  onClick={() => setCustomizingItem(null)}
                  className="absolute top-3 right-3 w-9 h-9 bg-white/90 hover:bg-white text-[#111111] rounded-full border-2 border-[#111111] shadow-[0_2px_0_#111111] flex items-center justify-center"
                >
                  <X className="w-5 h-5 stroke-[2.5]" />
                </button>

                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <span className="text-[10px] uppercase font-black px-2 py-0.5 bg-[#FF3B30] text-white rounded-md border border-white">
                    {customizingItem.category}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1 drop-shadow-xs">
                    {customizingItem.name}
                  </h2>
                  <p className="text-xs font-bold text-stone-200">
                    Base: {formatINR(customizingItem.price)}
                  </p>
                </div>
              </div>

              {/* Addon Options Scrollable Body */}
              <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 bg-[#FFF8F2]">
                {customizingItem.addonGroups && customizingItem.addonGroups.length > 0 ? (
                  customizingItem.addonGroups.map((group) => (
                    <div key={group.groupName} className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-black uppercase tracking-wider text-[#111111]">
                          {group.groupName}
                        </h4>
                        <span className="text-[11px] font-bold text-[#6B6B6B]">
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
                                toggleAddon(group.groupName, opt.name, opt.priceDelta, group.multiSelect)
                              }
                              className={`p-3 rounded-2xl text-left border-2 flex items-center justify-between transition-all ${
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
                                <span className="text-xs font-bold">
                                  {opt.name}
                                </span>
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
                  <div className="py-4 text-center text-xs text-[#6B6B6B] font-semibold">
                    No extra add-on selections required.
                  </div>
                )}

                {/* Quantity Selector */}
                <div className="pt-3 border-t-2 border-stone-200 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-black text-[#111111] uppercase tracking-wider block">
                      Quantity
                    </span>
                    <span className="text-xs font-bold text-[#6B6B6B]">
                      Subtotal: {formatINR(drawerTotalPrice)}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 bg-white p-1.5 rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111]">
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-[#111111] hover:bg-stone-200 font-black"
                    >
                      <Minus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                    <span className="text-base font-black w-6 text-center text-[#111111]">
                      {quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => setQuantity((q) => q + 1)}
                      className="w-8 h-8 rounded-xl bg-stone-100 flex items-center justify-center text-[#111111] hover:bg-stone-200 font-black"
                    >
                      <Plus className="w-4 h-4 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Sheet Actions */}
              <div className="p-4 sm:p-5 border-t-2 border-[#111111] bg-white">
                <button
                  type="button"
                  onClick={handleConfirmAddToCart}
                  className="tactile-btn w-full flex items-center justify-between py-4 px-6 text-base"
                >
                  <span>Add to Cart</span>
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
