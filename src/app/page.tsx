'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { MenuItem, SelectedAddon } from '@/types';
import { formatINR } from '@/lib/utils';
import { calculateLineItemTotals } from '@/lib/calorieCalculator';
import { AuthGate } from '@/components/AuthGate';
import { HealthScoreRing } from '@/components/HealthScoreRing';
import { HealthierAlternativeNudge } from '@/components/HealthierAlternativeNudge';
import { useKitchenStatus } from '@/context/KitchenStatusContext';
import { useMenu } from '@/context/MenuContext';
import { SeatMigrationBanner } from '@/components/SeatMigrationBanner';
import { DeliveryConfirmationBanner } from '@/components/DeliveryConfirmationBanner';
import { MenuCardSkeleton } from '@/components/ui/Skeleton';
import {
  Plus,
  Minus,
  Search,
  Check,
  MapPin,
  Flame,
} from 'lucide-react';
import { toast } from 'sonner';
import { FoodPlaceholder, generateFoodPlaceholderSvgDataUrl, getFoodEmoji } from '@/lib/menuPlaceholder';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

const BASE_CATEGORIES = [
  { id: 'ALL', label: 'All Items', icon: '🍽️', color: '#111111' },
  { id: 'HEALTHY SNACKS', label: 'Healthy Snacks', icon: '🥪', color: '#22C55E' },
  { id: 'SANDWICHES', label: 'Sandwiches', icon: '🧀', color: '#FFD166' },
  { id: 'MAGGI / PASTA', label: 'Maggi & Pasta', icon: '🍜', color: '#FF3B30' },
  { id: 'BEVERAGES', label: 'Beverages', icon: '🥤', color: '#4D96FF' },
  { id: 'SPECIALS', label: 'Specials', icon: '🍿', color: '#8B5CF6' },
] as const;

export default function HomePage() {
  const { user, canOrderForSelf } = useAuth();
  const { addToCart } = useCart();
  const { isOpen, closedMessage } = useKitchenStatus();
  const { items, loading: menuLoading } = useMenu();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedAddons, setSelectedAddons] = useState<SelectedAddon[]>([]);

  const categoriesList = React.useMemo(() => {
    const list: { id: string; label: string; icon: string }[] = [
      { id: 'ALL', label: 'All Items', icon: '🍽️' },
    ];
    const categorySet = new Set<string>();
    BASE_CATEGORIES.forEach((c) => {
      if (c.id !== 'ALL') {
        list.push({ id: c.id, label: c.label, icon: c.icon });
        categorySet.add(c.id);
      }
    });
    items.forEach((it) => {
      if (it.category && !categorySet.has(it.category)) {
        categorySet.add(it.category);
        list.push({
          id: it.category,
          label: it.category,
          icon: getFoodEmoji('', it.category),
        });
      }
    });
    return list;
  }, [items]);

  // Open item customization drawer
  const openCustomizer = (item: MenuItem) => {
    if (!canOrderForSelf || item.isAvailable === false) return;
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

  const handleSearchChange = (val: string) => {
    setSearchQuery(val);
    if (val.trim()) {
      setActiveCategory('ALL');
    }
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
    if (!customizingItem || !canOrderForSelf) return;

    if (customizingItem.addonGroups && customizingItem.addonGroups.length > 0) {
      for (const group of customizingItem.addonGroups) {
        if (group.required) {
          const hasSelection = selectedAddons.some((a) => a.groupName === group.groupName);
          if (!hasSelection) {
            toast.error(`Please select an option for "${group.groupName}"`);
            return;
          }
        }
      }
    }

    addToCart(customizingItem, quantity, selectedAddons);
    setCustomizingItem(null);
  };

  const { lineTotal: drawerTotalPrice, lineCalories: drawerTotalCalories } =
    customizingItem
      ? calculateLineItemTotals(customizingItem, selectedAddons, quantity)
      : { lineTotal: 0, lineCalories: 0 };

  const isSearching = searchQuery.trim().length > 0;

  // Filter items: when searching, search across full menu regardless of activeCategory tab
  const filteredItems = items.filter((item) => {
    const matchesCategory = isSearching || activeCategory === 'ALL' || item.category === activeCategory;
    const matchesSearch =
      !isSearching ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <AuthGate>
      <div className="space-y-6 pb-12">
        {/* Migration Alert Banner */}
        <SeatMigrationBanner />

        {/* Customer Delivery Confirmation Prompt */}
        <DeliveryConfirmationBanner />

        {/* header & location */}
        <div className="space-y-3 pt-2">
          {/* Location Delivery Context Tag */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-white rounded-2xl border-2 border-[#111111] shadow-[0_3px_0_#111111] text-xs font-black">
            {isOpen ? (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] animate-pulse" />
                <span className="text-[#15803D]">Pantry Open</span>
              </>
            ) : (
              <>
                <span className="w-2.5 h-2.5 rounded-full bg-[#DC2626] animate-pulse" />
                <span className="text-[#DC2626] font-black">Pantry Closed</span>
              </>
            )}
            <span className="text-[#111111]">·</span>
            <MapPin className="w-3.5 h-3.5 text-[#FF3B30] stroke-[2.5]" />
            <span className="text-[#111111]">Delivering to Desk {user?.seatCode || 'Select Desk'}</span>
          </div>

          {/* Kitchen Closed Global Live Banner */}
          {!isOpen && (
            <div className="p-4 bg-stone-950 text-white rounded-2xl border-2 border-red-500 shadow-[0_4px_0_#DC2626] flex items-center gap-3 animate-in fade-in">
              <div className="w-10 h-10 rounded-xl bg-red-600/30 border border-red-500 flex items-center justify-center text-xl shrink-0">
                🔒
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-xs font-black uppercase tracking-wider text-red-400">
                  Kitchen Is Currently Closed
                </h3>
                <p className="text-xs font-bold text-stone-300 mt-0.5">
                  {closedMessage || 'Pantry staff temporarily closed ordering. You can still browse the menu and customize items for when we reopen!'}
                </p>
              </div>
            </div>
          )}

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
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search Maggi, sandwich, chai, cold drinks..."
              className="w-full pl-12 pr-4 py-3.5 bg-white rounded-2xl border-2 border-[#111111] text-sm font-bold text-[#111111] placeholder:text-[#475569] placeholder:font-medium shadow-[0_3px_0_#111111] focus:outline-none focus:shadow-[0_5px_0_#111111] focus:border-[#FF3B30] transition-all"
            />
          </div>
        </div>

        {/* Staff Notice: Ordering Disabled for Pantry Staff Accounts */}
        {!canOrderForSelf && (
          <div className="p-4 bg-[#F4FBF7] text-[#0F172A] rounded-2xl border-2 border-[#134E4A] shadow-[0_3px_0_#0F766E] flex items-center justify-between gap-3 animate-in fade-in">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 border border-[#0F766E] flex items-center justify-center text-xl shrink-0">
                👨‍🍳
              </div>
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-[#0F766E]">
                  Staff Account Notice
                </h3>
                <p className="text-xs font-bold text-[#475569] mt-0.5">
                  Personal ordering is disabled for pantry staff accounts ({user?.email}). Use the Kitchen Dashboard to fulfill employee orders.
                </p>
              </div>
            </div>

            <Link
              href={user?.role === 'kitchenManager' ? '/kitchen' : '/admin'}
              className="px-3.5 py-2 bg-[#0F766E] hover:bg-[#134E4A] text-white rounded-xl text-xs font-black transition-all shrink-0 shadow-xs"
            >
              Open Dashboard
            </Link>
          </div>
        )}

        {/* calorie ring */}
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

        {/* categories filter bar */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-[#111111] tracking-tight">
              Explore Menu
            </h2>
            <span className="text-xs font-extrabold text-[#475569]">
              {items.length} dishes
            </span>
          </div>

          {/* Category Cards (Horizontally Scrollable) */}
          <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {categoriesList.map((cat) => {
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

        {/* menu items grid */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-black text-[#111111] tracking-tight">
              {activeCategory === 'ALL' ? 'Popular Today' : activeCategory}
            </h2>
            <span className="text-xs font-bold text-[#475569]">
              {menuLoading && items.length === 0 ? 'Loading dishes...' : `Showing ${filteredItems.length} items`}
            </span>
          </div>

          {menuLoading && items.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <MenuCardSkeleton key={i} />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="p-8 sm:p-12 text-center bg-white border-2 border-[#111111] rounded-3xl text-[#475569] space-y-3 shadow-[0_4px_0_#111111] max-w-md mx-auto my-6">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#FFD166] border-2 border-[#111111] shadow-[0_3px_0_#111111] flex items-center justify-center text-3xl">
                👨‍🍳
              </div>
              <div className="space-y-1">
                <h3 className="text-base sm:text-lg font-black text-[#111111] tracking-tight">
                  The menu&apos;s being updated — check back shortly!
                </h3>
                <p className="text-xs font-bold text-[#6B6B6B]">
                  Our pantry team is currently updating today&apos;s dishes and fresh specials. Please check back in a few minutes.
                </p>
              </div>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="p-12 text-center bg-white border-2 border-[#111111] rounded-2xl text-[#475569] space-y-2 shadow-[0_3px_0_#111111]">
              <div className="text-3xl">🔍</div>
              <h3 className="text-sm font-black text-[#111111]">No dishes match your search</h3>
              <p className="text-xs font-bold text-[#6B6B6B]">
                Try searching for something else or pick a different category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="tactile-card overflow-hidden flex flex-col justify-between group bg-white"
                >
                  {/* Visual Hero Image */}
                  <div className="relative aspect-[16/10] w-full overflow-hidden border-b-2 border-[#111111] bg-stone-100">
                    {item.imageUrl ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        onError={(e) => {
                          e.currentTarget.src = generateFoodPlaceholderSvgDataUrl(item);
                        }}
                        className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-300 ${
                          item.isAvailable === false ? 'grayscale opacity-60' : ''
                        }`}
                      />
                    ) : (
                      <FoodPlaceholder item={item} />
                    )}

                    {/* Category Pill Tag */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/95 backdrop-blur-xs rounded-xl border-2 border-[#111111] text-[10px] font-black text-[#111111] shadow-[0_2px_0_#111111]">
                      {item.category}
                    </div>

                    {/* Health Tag Badge or Sold Out Pill */}
                    <div className="absolute top-3 right-3 flex items-center gap-1.5">
                      {item.isAvailable === false ? (
                        <span className="text-[10px] uppercase font-black px-2.5 py-1 rounded-xl border-2 border-[#111111] bg-[#FF3B30] text-white shadow-[0_2px_0_#111111]">
                          Sold Out
                        </span>
                      ) : (
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
                      )}
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

                      {canOrderForSelf ? (
                        item.isAvailable === false ? (
                          <button
                            disabled
                            className="min-h-[44px] px-3.5 py-2 text-xs font-black bg-stone-200 text-stone-500 rounded-2xl border-2 border-stone-400 cursor-not-allowed select-none"
                          >
                            Sold Out
                          </button>
                        ) : (
                          <button
                            onClick={() => openCustomizer(item)}
                            className="tactile-btn min-h-[44px] px-4 py-2 text-xs flex items-center gap-1.5"
                          >
                            <Plus className="w-4 h-4 stroke-[3]" />
                            <span>ADD</span>
                          </button>
                        )
                      ) : (
                        <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-full border border-stone-300 select-none">
                          Staff View
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* healthier alternative recommendation */}
        {canOrderForSelf && <HealthierAlternativeNudge onSelectItem={openCustomizer} />}

        {/* Customization Drawer / Bottom Sheet */}
        <Dialog open={Boolean(customizingItem)} onOpenChange={(open) => !open && setCustomizingItem(null)}>
          {customizingItem && (
            <DialogContent variant="sheet" size="md" className="p-0 overflow-hidden max-h-[88dvh] flex flex-col">
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b-2 border-[#111111] bg-[#FFF8F2] flex items-center justify-between pr-14">
                <div>
                  <DialogTitle className="text-lg font-black text-[#111111]">
                    Customize {customizingItem.name}
                  </DialogTitle>
                  <DialogDescription className="flex items-center gap-2 text-xs font-bold text-[#475569] mt-0.5">
                    <span>Base {formatINR(customizingItem.price)}</span>
                    <span>•</span>
                    <span className="text-[#FF3B30] flex items-center gap-1 font-black">
                      <Flame className="w-3 h-3" />
                      approx. {customizingItem.calories} kcal
                    </span>
                  </DialogDescription>
                </div>
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
            </DialogContent>
          )}
        </Dialog>
      </div>
    </AuthGate>
  );
}
