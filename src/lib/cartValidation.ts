import { MenuItem, OrderItem } from '@/types';

export interface CartItemValidation {
  status: 'valid' | 'sold_out' | 'deleted' | 'price_changed' | 'stale_addons';
  isOrderable: boolean;
  warningMessage?: string;
  priceDifference?: { oldPrice: number; newPrice: number };
  staleAddonNames?: string[];
  liveItem?: MenuItem;
}

// cart item validate koro live menu r sathe
// item deleted/sold-out ba addon remove hole checkout block hobe
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

  // kono selected addon live menu theke gayeb hoyeche kina check
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

  // base price change hole warning dekhabe, kintu checkout hobe
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

// full cart valid kina check - kono item unorderable hole checkout off
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
