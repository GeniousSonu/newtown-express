'use client';

import React, { useState, useEffect } from 'react';
import { INITIAL_MENU_ITEMS } from '@/lib/seedData';
import { MenuItem } from '@/types';
import { MenuStockRow } from '@/components/MenuStockRow';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, doc, setDoc } from 'firebase/firestore';
import {
  Boxes,
  Search,
  CheckCircle2,
  XCircle,
  Filter,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

export default function AdminStockPage() {
  const [items, setItems] = useState<MenuItem[]>(INITIAL_MENU_ITEMS);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSoldOutOnly, setShowSoldOutOnly] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Sync menu overrides from Firestore
  useEffect(() => {
    if (!db) return;

    try {
      const unsub = onSnapshot(collection(db, 'menuItems'), (snapshot) => {
        const overrides: Record<string, Partial<MenuItem>> = {};
        snapshot.forEach((d) => {
          overrides[d.id] = d.data() as Partial<MenuItem>;
        });

        setItems((prev) =>
          INITIAL_MENU_ITEMS.map((base) => {
            const override = overrides[base.id];
            return override ? ({ ...base, ...override } as MenuItem) : base;
          })
        );
      });

      return () => unsub();
    } catch (e) {
      console.warn('[STOCK-PAGE] Firestore listener error:', e);
    }
  }, []);

  const handleStockChange = (itemId: string, isAvailable: boolean) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, isAvailable } : it))
    );
  };

  const handlePriceChange = (itemId: string, price: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, price } : it))
    );
  };

  const handleMarkAllInStock = async () => {
    const firestore = db;
    if (!firestore) return;
    try {
      setBulkUpdating(true);
      const promises = items.map((it) =>
        setDoc(doc(firestore, 'menuItems', it.id), { isAvailable: true, updatedAt: Date.now() }, { merge: true })
      );
      await Promise.all(promises);
      setItems((prev) => prev.map((it) => ({ ...it, isAvailable: true })));
    } catch (e) {
      console.error('[BULK-UPDATE] Error:', e);
    } finally {
      setBulkUpdating(false);
    }
  };

  const categories = ['ALL', 'HEALTHY SNACKS', 'SANDWICHES', 'MAGGI / PASTA', 'BEVERAGES', 'SPECIALS'];

  const filteredItems = items.filter((it) => {
    const matchesCat = activeCategory === 'ALL' || it.category === activeCategory;
    const matchesSearch =
      it.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      it.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSoldOut = showSoldOutOnly ? it.isAvailable === false : true;
    return matchesCat && matchesSearch && matchesSoldOut;
  });

  const totalItemsCount = items.length;
  const inStockCount = items.filter((it) => it.isAvailable !== false).length;
  const soldOutCount = items.filter((it) => it.isAvailable === false).length;

  return (
    <div className="space-y-6 pb-16">
      {/* Top Banner & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-amber-500" />
            Kitchen Stock & Availability
          </h1>
          <p className="text-xs text-slate-400 font-semibold">
            Manage live pantry inventory. Toggling &quot;Sold Out&quot; instantly prevents buyer orders.
          </p>
        </div>

        {/* Quick Bulk Action */}
        <button
          onClick={handleMarkAllInStock}
          disabled={bulkUpdating || soldOutCount === 0}
          className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all disabled:opacity-40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${bulkUpdating ? 'animate-spin' : ''}`} />
          <span>Mark All In Stock</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
            Total Menu Items
          </span>
          <span className="text-2xl font-black text-white">
            {totalItemsCount}
          </span>
        </div>

        <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
            In Stock
          </span>
          <span className="text-2xl font-black text-emerald-400">
            {inStockCount}
          </span>
        </div>

        <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 text-center">
          <span className="text-[10px] uppercase font-mono font-bold text-slate-400 block mb-1">
            Sold Out
          </span>
          <span className="text-2xl font-black text-rose-400">
            {soldOutCount}
          </span>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-[#1E293B] border border-slate-700/80 rounded-2xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or category..."
              className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Sold out toggle filter */}
          <button
            onClick={() => setShowSoldOutOnly(!showSoldOutOnly)}
            className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
              showSoldOutOnly
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                : 'bg-slate-900 text-slate-300 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Sold Out Only ({soldOutCount})</span>
          </button>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {categories.map((cat) => {
            const isActive = activeCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-850 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock List (White Cards on Charcoal Backdrop) */}
      <div className="space-y-2">
        {filteredItems.map((item) => (
          <MenuStockRow
            key={item.id}
            item={item}
            onStockChange={handleStockChange}
            onPriceChange={handlePriceChange}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="p-12 text-center bg-[#1E293B] border border-slate-700/80 rounded-2xl text-slate-400 space-y-2">
            <div className="text-3xl">🔍</div>
            <h4 className="text-sm font-bold text-white">No menu items found</h4>
            <p className="text-xs text-slate-500">
              Try adjusting your search query or category filters.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
