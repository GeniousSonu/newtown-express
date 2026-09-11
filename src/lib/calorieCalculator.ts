import { MenuItem, SelectedAddon } from '@/types';

/**
 * Calculates both the line price and line calories for an item with its selected addons and quantity.
 * Using this single source of truth ensures prices and calories never drift.
 */
export function calculateLineItemTotals(
  item: MenuItem,
  selectedAddons: SelectedAddon[],
  quantity: number
) {
  const addonsPriceDelta = selectedAddons.reduce((sum, a) => sum + (a.priceDelta || 0), 0);
  const addonsCalorieDelta = selectedAddons.reduce((sum, a) => sum + (a.calorieDelta || 0), 0);

  const unitPrice = item.price + addonsPriceDelta;
  const unitCalories = (item.calories || 0) + addonsCalorieDelta;

  return {
    unitPrice,
    unitCalories,
    lineTotal: unitPrice * quantity,
    lineCalories: unitCalories * quantity,
  };
}
