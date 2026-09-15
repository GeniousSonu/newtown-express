import { MenuItem, OrderItem } from '@/types';

export interface CartItemValidation {
  status: 'valid' | 'sold_out' | 'deleted' | 'price_changed' | 'stale_addons';
  isOrderable: boolean;
  warningMessage?: string;
  priceDifference?: { oldPrice: number; newPrice: number };
  staleAddonNames?: string[];
  liveItem?: MenuItem;
}

/**
 * Validates a cart line against the current live menu item from Firestore.
 * Handles:
 * 1. Deleted items (no longer in live menu) -> blocked
 * 2. Sold out items (isAvailable === false) -> blocked
 * 3. Stale/removed addons (addon choice removed or renamed by admin) -> blocked
 * 4. Price change -> flagged with inline notice, updated price
 */
export function validateCartItem(
  cartItem: OrderItem,
  liveItem: MenuItem | undefined
): CartItemValidation {
  if (!liveItem) {
    return {
      status: 'deleted',
      isOrderable: false,
      warningMessage: 'This item is no longer available on the pantry menu.',
    };
  }

  if (liveItem.isAvailable === false) {
    return {
      status: 'sold_out',
      isOrderable: false,
      warningMessage: 'This item was just marked sold out by pantry staff.',
      liveItem,
    };
  }

  // Check if any previously selected addon no longer exists in current live addonGroups
  if (cartItem.selectedAddons && cartItem.selectedAddons.length > 0) {
    const liveGroups = liveItem.addonGroups || [];
    const staleAddons: string[] = [];

    for (const selected of cartItem.selectedAddons) {
      const matchingGroup = liveGroups.find((g) => g.groupName === selected.groupName);
      const matchingOption = matchingGroup?.options.find((o) => o.name === selected.optionName);

      if (!matchingGroup || !matchingOption) {
        staleAddons.push(selected.optionName);
      }
    }

    if (staleAddons.length > 0) {
      return {
        status: 'stale_addons',
        isOrderable: false,
        warningMessage: `Selected addon "${staleAddons.join(', ')}" is no longer offered. Please remove or customize this dish.`,
        staleAddonNames: staleAddons,
        liveItem,
      };
    }
  }

  // Check if base price changed in live menu
  if (liveItem.price !== cartItem.basePrice) {
    return {
      status: 'price_changed',
      isOrderable: true,
      warningMessage: `Price updated: ₹${cartItem.basePrice} → ₹${liveItem.price}`,
      priceDifference: { oldPrice: cartItem.basePrice, newPrice: liveItem.price },
      liveItem,
    };
  }

  return {
    status: 'valid',
    isOrderable: true,
    liveItem,
  };
}

/**
 * Checks whether an entire cart is valid for checkout.
 * Returns false if ANY item is not orderable (sold out, deleted, or stale addons).
 */
export function validateEntireCart(
  cartItems: OrderItem[],
  getItemById: (id: string) => MenuItem | undefined
): {
  isValid: boolean;
  unorderableCount: number;
  validations: Map<string, CartItemValidation>;
} {
  const validations = new Map<string, CartItemValidation>();
  let unorderableCount = 0;

  cartItems.forEach((line) => {
    const liveItem = getItemById(line.itemId);
    const result = validateCartItem(line, liveItem);
    validations.set(line.itemId, result);
    if (!result.isOrderable) {
      unorderableCount++;
    }
  });

  return {
    isValid: unorderableCount === 0,
    unorderableCount,
    validations,
  };
}
