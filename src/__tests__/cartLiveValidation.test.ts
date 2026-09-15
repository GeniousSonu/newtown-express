import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { validateCartItem, validateEntireCart } from '../lib/cartValidation';
import { MenuItem, OrderItem } from '../types';

const baseLiveItem: MenuItem = {
  id: 'dish_maggi_1',
  name: 'Classic Masala Maggi',
  price: 45,
  category: 'MAGGI / PASTA',
  description: 'Hot 2-minute masala Maggi noodles',
  calories: 320,
  healthTag: 'balanced',
  sortOrder: 1,
  isAvailable: true,
  addonGroups: [
    {
      groupName: 'Cheese & Toppings',
      required: false,
      multiSelect: true,
      options: [
        { name: 'Amul Cheese Slice', priceDelta: 20 },
        { name: 'Extra Butter', priceDelta: 15 },
      ],
    },
  ],
};

const baseCartItem: OrderItem = {
  itemId: 'dish_maggi_1',
  name: 'Classic Masala Maggi',
  quantity: 1,
  basePrice: 45,
  lineTotal: 65,
  selectedAddons: [
    {
      groupName: 'Cheese & Toppings',
      optionName: 'Amul Cheese Slice',
      priceDelta: 20,
    },
  ],
};

describe('Cart Live Validation - Stale Addons, Sold-Out, & Price Changes', () => {
  test('approves a fully valid cart item matching live menu and addons', () => {
    const result = validateCartItem(baseCartItem, baseLiveItem);
    assert.equal(result.status, 'valid');
    assert.equal(result.isOrderable, true);
    assert.equal(result.warningMessage, undefined);
  });

  test('blocks checkout if item was deleted from live menu', () => {
    const result = validateCartItem(baseCartItem, undefined);
    assert.equal(result.status, 'deleted');
    assert.equal(result.isOrderable, false);
    assert.match(result.warningMessage || '', /no longer available/i);
  });

  test('blocks checkout if item was marked sold-out by pantry staff', () => {
    const soldOutItem: MenuItem = { ...baseLiveItem, isAvailable: false };
    const result = validateCartItem(baseCartItem, soldOutItem);
    assert.equal(result.status, 'sold_out');
    assert.equal(result.isOrderable, false);
    assert.match(result.warningMessage || '', /marked sold out/i);
  });

  test('blocks checkout if selected addon was removed or renamed in live menu', () => {
    // Live item has cheese slice removed by admin, only Extra Butter remains
    const modifiedLiveItem: MenuItem = {
      ...baseLiveItem,
      addonGroups: [
        {
          groupName: 'Cheese & Toppings',
          required: false,
          multiSelect: true,
          options: [{ name: 'Extra Butter', priceDelta: 15 }],
        },
      ],
    };

    const result = validateCartItem(baseCartItem, modifiedLiveItem);
    assert.equal(result.status, 'stale_addons');
    assert.equal(result.isOrderable, false);
    assert.deepEqual(result.staleAddonNames, ['Amul Cheese Slice']);
    assert.match(result.warningMessage || '', /Amul Cheese Slice.*no longer offered/i);
  });

  test('flags price changes but keeps item orderable with delta note', () => {
    // Admin increased price from ₹45 to ₹55
    const repricedLiveItem: MenuItem = { ...baseLiveItem, price: 55 };
    const result = validateCartItem(baseCartItem, repricedLiveItem);
    assert.equal(result.status, 'price_changed');
    assert.equal(result.isOrderable, true);
    assert.deepEqual(result.priceDifference, { oldPrice: 45, newPrice: 55 });
    assert.match(result.warningMessage || '', /₹45 → ₹55/);
  });

  test('validateEntireCart blocks checkout when any item has stale addons or is sold out', () => {
    const validItem: OrderItem = {
      itemId: 'dish_maggi_1',
      name: 'Classic Masala Maggi',
      quantity: 1,
      basePrice: 45,
      lineTotal: 45,
      selectedAddons: [],
    };

    const staleItem: OrderItem = {
      itemId: 'dish_pasta_2',
      name: 'White Sauce Pasta',
      quantity: 1,
      basePrice: 80,
      lineTotal: 100,
      selectedAddons: [
        { groupName: 'Sauce', optionName: 'Truffle Oil', priceDelta: 20 },
      ],
    };

    const livePasta: MenuItem = {
      id: 'dish_pasta_2',
      name: 'White Sauce Pasta',
      price: 80,
      category: 'MAGGI / PASTA',
      description: 'Creamy pasta',
      calories: 450,
      healthTag: 'indulgent',
      sortOrder: 2,
      isAvailable: true,
      addonGroups: [
        // Truffle Oil removed by admin
        { groupName: 'Sauce', required: false, multiSelect: false, options: [{ name: 'Herb Butter', priceDelta: 10 }] },
      ],
    };

    const menuMap = new Map<string, MenuItem>([
      ['dish_maggi_1', baseLiveItem],
      ['dish_pasta_2', livePasta],
    ]);

    const result = validateEntireCart([validItem, staleItem], (id) => menuMap.get(id));

    assert.equal(result.isValid, false);
    assert.equal(result.unorderableCount, 1);
    assert.equal(result.validations.get('dish_pasta_2')?.status, 'stale_addons');
    assert.equal(result.validations.get('dish_maggi_1')?.status, 'valid');
  });
});
