'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { MenuItem, OrderItem, SelectedAddon } from '@/types';
import { calculateLineItemTotals } from '@/lib/calorieCalculator';

interface CartContextType {
  items: OrderItem[];
  addToCart: (item: MenuItem, quantity: number, selectedAddons: SelectedAddon[]) => void;
  removeFromCart: (index: number) => void;
  updateQuantity: (index: number, quantity: number) => void;
  clearCart: () => void;
  totalAmount: number;
  totalCalories: number;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'newtown_cart_v2';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<OrderItem[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage errors
    }
  }, [items]);

  const addToCart = (item: MenuItem, quantity: number, selectedAddons: SelectedAddon[]) => {
    const { lineTotal, lineCalories } = calculateLineItemTotals(item, selectedAddons, quantity);

    const newItem: OrderItem = {
      itemId: item.id,
      name: item.name,
      basePrice: item.price,
      baseCalories: item.calories,
      selectedAddons,
      lineTotal,
      lineCalories,
      quantity,
    };

    setItems((prev) => [...prev, newItem]);
  };

  const removeFromCart = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(index);
      return;
    }

    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        const addonsPriceDelta = item.selectedAddons.reduce((sum, a) => sum + (a.priceDelta || 0), 0);
        const addonsCalorieDelta = item.selectedAddons.reduce((sum, a) => sum + (a.calorieDelta || 0), 0);
        const unitPrice = item.basePrice + addonsPriceDelta;
        const unitCalories = (item.baseCalories || 0) + addonsCalorieDelta;

        return {
          ...item,
          quantity,
          lineTotal: unitPrice * quantity,
          lineCalories: unitCalories * quantity,
        };
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const totalCalories = items.reduce((sum, item) => sum + (item.lineCalories || 0), 0);
  const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalAmount,
        totalCalories,
        itemCount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
