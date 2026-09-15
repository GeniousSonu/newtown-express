'use client';

import React, { useState } from 'react';
import { MenuItem } from '@/types';
import { MenuStockRow } from '@/components/MenuStockRow';
import { MenuItemFormDialog } from '@/components/MenuItemFormDialog';
import { useAuth } from '@/context/AuthContext';
import { useMenu } from '@/context/MenuContext';
import { db } from '@/lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { DEFAULT_MENU_ITEMS, EXTRAS_GROUP } from '@/lib/defaultMenuItems';
import { EmptyState } from '@/components/EmptyState';
import {
  Boxes,
  Search,
  Filter,
  RefreshCw,
  Plus,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export default function AdminStockPage() {
  const { isAdmin } = useAuth();
  const { items, categories: liveCategories, loading } = useMenu();

  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSoldOutOnly, setShowSoldOutOnly] = useState(false);
  const [bulkUpdating, setBulkUpdating] = useState(false);

  // Add/Edit Dialog state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isRestoringMenu, setIsRestoringMenu] = useState(false);

  const handleRestoreDefaultMenu = async () => {
    if (!isAdmin) return;
    try {
      setIsRestoringMenu(true);
      const res = await fetch('/api/admin/seed-menu', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Successfully restored ${data.count || 21} menu items!`);
        return;
      }

      // Local dev fallback jodi server e FIREBASE_SERVICE_ACCOUNT na thake
      const firestore = db;
      if (firestore) {
        const batchPromises = DEFAULT_MENU_ITEMS.map((item) => {
          const id = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
          return setDoc(doc(firestore, 'menuItems', id), {
            id,
            name: item.name,
            category: item.category.toUpperCase(),
            price: item.price,
            calories: item.calories,
            healthTag: item.healthTag,
            description: '',
            imageUrl: '',
            isAvailable: true,
            addonGroups: item.hasExtras ? [EXTRAS_GROUP] : [],
            sortOrder: 0,
            updatedAt: Date.now(),
          }, { merge: true });
        });
        await Promise.all(batchPromises);
        toast.success('Successfully restored 21 menu items via Firestore client!');
        return;
      }

      toast.error(data.error || 'Failed to restore menu items.');
    } catch (e) {
      console.error('[RESTORE-MENU] Error:', e);
      toast.error('Failed to restore menu items. Please check network.');
    } finally {
      setIsRestoringMenu(false);
    }
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
    } catch (e) {
      console.error('[BULK-UPDATE] Error:', e);
    } finally {
      setBulkUpdating(false);
    }
  };

  const distinctCategories = Array.from(
    new Set([
      'HEALTHY SNACKS',
      'SANDWICHES',
      'MAGGI / PASTA',
      'BEVERAGES',
      'SPECIALS',
      ...liveCategories,
      ...items.map((it) => it.category).filter(Boolean),
    ])
  );
  const categories = ['ALL', ...distinctCategories];

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
          <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] flex items-center gap-2">
            <Boxes className="w-6 h-6 text-[#0F766E]" />
            Kitchen Stock & Availability
          </h1>
          <p className="text-xs text-[#475569] font-bold mt-0.5">
            Manage live pantry inventory. Toggling &quot;Sold Out&quot; instantly prevents buyer orders.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {isAdmin && (
            <button
              onClick={() => {
                setEditingItem(null);
                setIsFormOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-[#0F766E] hover:bg-[#115E59] text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-[0.98]"
            >
              <Plus className="w-4 h-4 stroke-[3]" />
              <span>Add Menu Item</span>
            </button>
          )}

          {/* Quick Bulk Action */}
          <button
            onClick={handleMarkAllInStock}
            disabled={bulkUpdating || soldOutCount === 0}
            className="min-h-[44px] flex items-center gap-2 px-4 py-2 bg-white hover:bg-stone-50 text-[#0F172A] border-2 border-[#134E4A]/30 rounded-xl text-xs font-black shadow-xs transition-all disabled:opacity-40"
          >
            <RefreshCw className={`w-4 h-4 text-[#0F766E] ${bulkUpdating ? 'animate-spin' : ''}`} />
            <span>Mark All In Stock</span>
          </button>
        </div>
      </div>

      {/* Empty-menu admin warning safeguard */}
      {!loading && items.length === 0 && (
        <div className="p-4 sm:p-5 bg-[#FEF3C7] border-2 border-[#D97706] rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_3px_0_#D97706]">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] border-2 border-[#B45309] flex items-center justify-center text-white shrink-0 shadow-xs">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm sm:text-base font-black text-[#78350F] tracking-tight">
                No menu items found in the database — the buyer-facing menu is currently empty.
              </h3>
              <p className="text-xs font-bold text-[#92400E]">
                The live menu has 0 documents in Firestore. Click &quot;Add Menu Item&quot; or restore the standard 21 pantry dishes below.
              </p>
            </div>
          </div>
          {isAdmin && (
            <button
              type="button"
              disabled={isRestoringMenu}
              onClick={handleRestoreDefaultMenu}
              className="tactile-btn shrink-0 min-h-[44px] px-4 py-2 text-xs font-black bg-[#FF3B30] text-white border-2 border-[#111111] rounded-xl shadow-[0_3px_0_#111111] flex items-center gap-2 disabled:opacity-50 hover:bg-red-600 active:translate-y-0.5"
            >
              {isRestoringMenu ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin stroke-[2.5]" />
                  <span>Restoring...</span>
                </>
              ) : (
                <>
                  <span>🍽️ Restore 21 Menu Items</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="bg-white border-2 border-[#134E4A]/20 rounded-2xl p-3 sm:p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-[#475569] block mb-1">
            Total Items
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#0F172A]">
            {totalItemsCount}
          </span>
        </div>

        <div className="bg-white border-2 border-[#134E4A]/20 rounded-2xl p-3 sm:p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-[#475569] block mb-1">
            In Stock
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#15803D]">
            {inStockCount}
          </span>
        </div>

        <div className="bg-white border-2 border-[#134E4A]/20 rounded-2xl p-3 sm:p-4 text-center shadow-xs">
          <span className="text-[10px] uppercase font-mono font-bold text-[#475569] block mb-1">
            Sold Out
          </span>
          <span className="text-xl sm:text-2xl font-black text-[#B91C1C]">
            {soldOutCount}
          </span>
        </div>
      </div>

      {/* Filters & Search Control Bar */}
      <div className="bg-white border-2 border-[#134E4A]/20 rounded-2xl p-3 sm:p-4 space-y-3 shadow-xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search dish or category..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 bg-stone-50 border-2 border-[#134E4A]/30 rounded-xl text-[16px] sm:text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#0F766E]"
            />
          </div>

          {/* Sold out toggle filter */}
          <button
            onClick={() => setShowSoldOutOnly(!showSoldOutOnly)}
            className={`min-h-[44px] flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black border-2 transition-all ${
              showSoldOutOnly
                ? 'bg-red-50 text-[#B91C1C] border-[#DC2626]'
                : 'bg-white text-[#475569] border-[#134E4A]/30 hover:bg-stone-50'
            }`}
          >
            <Filter className="w-4 h-4" />
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
                className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-black whitespace-nowrap transition-all border-2 ${
                  isActive
                    ? 'bg-[#0F766E] text-white border-[#0F766E] shadow-xs'
                    : 'bg-stone-50 text-[#475569] hover:text-[#0F172A] hover:bg-stone-100 border-[#134E4A]/20'
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      </div>

      {/* Stock List */}
      <div className="space-y-2.5">
        {loading && items.length === 0 ? (
          <div className="p-12 text-center bg-white border-2 border-[#134E4A]/20 rounded-2xl text-[#475569] space-y-3">
            <Loader2 className="w-8 h-8 text-[#0F766E] animate-spin mx-auto" />
            <h4 className="text-sm font-black text-[#0F172A]">Syncing pantry inventory...</h4>
          </div>
        ) : (
          filteredItems.map((item) => (
            <MenuStockRow
              key={item.id}
              item={item}
              allowEditPrice={isAdmin}
              canEditItem={isAdmin}
              onEditItem={(it) => {
                setEditingItem(it);
                setIsFormOpen(true);
              }}
            />
          ))
        )}

        {!loading && filteredItems.length === 0 && (
          <EmptyState
            variant="admin"
            icon="🔍"
            title="No menu items found"
            description="Try adjusting your search query or category filters, or add a new dish to the live inventory."
            action={
              isAdmin
                ? {
                    label: 'Add New Item',
                    onClick: () => {
                      setEditingItem(null);
                      setIsFormOpen(true);
                    },
                    icon: <Plus className="w-4 h-4" />,
                  }
                : undefined
            }
          />
        )}
      </div>

      {/* add / edit modal (admin only) */}
      {isAdmin && (
        <MenuItemFormDialog
          isOpen={isFormOpen}
          onClose={() => {
            setIsFormOpen(false);
            setEditingItem(null);
          }}
          itemToEdit={editingItem}
          existingCategories={distinctCategories}
        />
      )}
    </div>
  );
}
