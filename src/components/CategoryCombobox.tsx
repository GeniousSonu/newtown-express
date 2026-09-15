'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Check, ChevronsUpDown, Plus, Search, Tag, X } from 'lucide-react';

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  existingCategories?: string[];
  error?: string;
  disabled?: boolean;
}

const DEFAULT_CATEGORIES = [
  'HEALTHY SNACKS',
  'SANDWICHES',
  'MAGGI / PASTA',
  'BEVERAGES',
  'SPECIALS',
];

export function CategoryCombobox({
  value,
  onChange,
  existingCategories = [],
  error,
  disabled = false,
}: CategoryComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Distinct sorted categories list combining existing items with defaults
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    // Add defaults first
    DEFAULT_CATEGORIES.forEach((c) => set.add(c.trim().toUpperCase()));
    // Add any categories currently in database
    existingCategories.forEach((c) => {
      if (c && typeof c === 'string' && c.trim()) {
        set.add(c.trim().toUpperCase());
      }
    });
    return Array.from(set).sort();
  }, [existingCategories]);

  // Outside click listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Focus search input on open
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const query = searchQuery.trim().toUpperCase();

  // Filtered categories
  const filtered = useMemo(() => {
    if (!query) return categoriesList;
    return categoriesList.filter((cat) => cat.includes(query));
  }, [categoriesList, query]);

  // Check if query exactly matches any category in the list
  const hasExactMatch = categoriesList.some((cat) => cat === query);

  const handleSelect = (categoryName: string) => {
    onChange(categoryName.trim().toUpperCase());
    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <div ref={containerRef} className="relative w-full space-y-1">
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full min-h-[46px] px-3.5 py-2.5 bg-white border-2 rounded-2xl text-left flex items-center justify-between gap-2 transition-all ${
          error
            ? 'border-red-500 ring-2 ring-red-100'
            : isOpen
            ? 'border-[#FF3B30] shadow-[0_3px_0_#111111]'
            : 'border-[#111111] shadow-[0_2px_0_#111111] hover:bg-stone-50'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Tag className="w-4 h-4 text-[#FF3B30] shrink-0 stroke-[2.5]" />
          {value ? (
            <span className="text-xs sm:text-sm font-black text-[#111111] truncate bg-stone-100 px-2.5 py-0.5 rounded-lg border border-stone-300">
              {value}
            </span>
          ) : (
            <span className="text-xs sm:text-sm font-bold text-stone-400">
              Select or type a category...
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 text-stone-400">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onChange('');
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.stopPropagation();
                  onChange('');
                }
              }}
              className="p-1 hover:text-[#111111] hover:bg-stone-100 rounded-md"
              title="Clear category"
            >
              <X className="w-3.5 h-3.5 stroke-[2.5]" />
            </span>
          )}
          <ChevronsUpDown className="w-4 h-4 stroke-[2.5]" />
        </div>
      </button>

      {error && (
        <p className="text-[11px] font-bold text-red-600 px-1 animate-in fade-in">
          {error}
        </p>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-[150] bg-white border-3 border-[#111111] rounded-2xl shadow-[0_8px_0_#111111] overflow-hidden flex flex-col max-h-64 animate-in fade-in zoom-in-95 duration-150">
          {/* Search Input */}
          <div className="p-2 border-b-2 border-stone-200 bg-stone-50 relative">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 stroke-[2.5]" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search category or type new..."
              className="w-full pl-7 pr-3 py-1.5 bg-white border-2 border-[#111111] rounded-xl text-xs font-bold text-[#111111] placeholder:text-stone-400 focus:outline-none focus:border-[#FF3B30]"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filtered.length > 0 && query && filtered[0] === query) {
                    handleSelect(filtered[0]);
                  } else if (query) {
                    handleSelect(query);
                  }
                } else if (e.key === 'Escape') {
                  setIsOpen(false);
                }
              }}
            />
          </div>

          {/* Categories List */}
          <div className="overflow-y-auto p-1.5 space-y-1 flex-1 text-xs">
            {filtered.map((cat) => {
              const isSelected = value === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => handleSelect(cat)}
                  className={`w-full px-3 py-2 rounded-xl text-left font-black flex items-center justify-between transition-colors ${
                    isSelected
                      ? 'bg-[#FFD166] text-[#111111] border border-[#111111]'
                      : 'hover:bg-stone-100 text-[#111111]'
                  }`}
                >
                  <span>{cat}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-[#111111] stroke-[3]" />}
                </button>
              );
            })}

            {/* "+ Add new category" Option if search query doesn't match an existing category */}
            {query && !hasExactMatch && (
              <button
                type="button"
                onClick={() => handleSelect(query)}
                className="w-full px-3 py-2.5 rounded-xl text-left font-black text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border-2 border-emerald-500 flex items-center gap-2 transition-colors mt-1"
              >
                <Plus className="w-4 h-4 text-emerald-600 stroke-[3] shrink-0" />
                <span className="truncate">
                  Add new category: <span className="underline font-mono">&quot;{query}&quot;</span>
                </span>
              </button>
            )}

            {filtered.length === 0 && !query && (
              <div className="py-4 text-center text-xs font-bold text-stone-400">
                No categories found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
