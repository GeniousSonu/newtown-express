export interface SeedAddonOption {
  name: string;
  priceDelta: number;
  calorieDelta: number;
}

export interface SeedAddonGroup {
  groupName: string;
  required: boolean;
  multiSelect: boolean;
  options: SeedAddonOption[];
}

export type HealthTag = 'light' | 'balanced' | 'indulgent';

export interface SeedItem {
  name: string;
  category: string;
  price: number;
  calories: number;
  healthTag: HealthTag;
  hasExtras: boolean;
}

export const EXTRAS_GROUP: SeedAddonGroup = {
  groupName: 'Extras',
  required: false,
  multiSelect: true,
  options: [
    { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
    { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
    { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
  ],
};

export const DEFAULT_MENU_ITEMS: SeedItem[] = [
  // Healthy Snacks
  { name: 'Bread Butter / Jam', category: 'Healthy Snacks', price: 10, calories: 150, healthTag: 'light', hasExtras: true },
  { name: 'Sandwich', category: 'Healthy Snacks', price: 20, calories: 200, healthTag: 'balanced', hasExtras: true },
  { name: 'Bread Omelette', category: 'Healthy Snacks', price: 17, calories: 250, healthTag: 'balanced', hasExtras: true },
  { name: 'Omelette / Poach', category: 'Healthy Snacks', price: 12, calories: 180, healthTag: 'balanced', hasExtras: false },
  { name: 'Boiled Egg', category: 'Healthy Snacks', price: 10, calories: 78, healthTag: 'light', hasExtras: false },
  { name: 'Oats', category: 'Healthy Snacks', price: 20, calories: 150, healthTag: 'light', hasExtras: false },

  // Sandwiches
  { name: 'Single Cheese Veggie Sandwich', category: 'Sandwiches', price: 20, calories: 220, healthTag: 'balanced', hasExtras: true },
  { name: 'Double Cheese Sandwich', category: 'Sandwiches', price: 30, calories: 320, healthTag: 'balanced', hasExtras: true },
  { name: 'Egg Cheese Sandwich with Veggies', category: 'Sandwiches', price: 40, calories: 350, healthTag: 'indulgent', hasExtras: true },

  // Maggi / Pasta
  { name: 'Maggi', category: 'Maggi / Pasta', price: 25, calories: 350, healthTag: 'indulgent', hasExtras: true },
  { name: 'Egg Maggi', category: 'Maggi / Pasta', price: 35, calories: 430, healthTag: 'indulgent', hasExtras: true },
  { name: 'Egg Maggi Special Masala', category: 'Maggi / Pasta', price: 40, calories: 450, healthTag: 'indulgent', hasExtras: true },
  { name: 'Maggi Special Masala', category: 'Maggi / Pasta', price: 30, calories: 370, healthTag: 'indulgent', hasExtras: true },
  { name: 'Pasta', category: 'Maggi / Pasta', price: 30, calories: 300, healthTag: 'balanced', hasExtras: true },
  { name: 'Egg Pasta', category: 'Maggi / Pasta', price: 40, calories: 380, healthTag: 'indulgent', hasExtras: true },

  // Beverages
  { name: 'Maaza / Slice', category: 'Beverages', price: 20, calories: 150, healthTag: 'light', hasExtras: false },
  { name: 'Coke / Thums Up', category: 'Beverages', price: 20, calories: 140, healthTag: 'light', hasExtras: false },
  { name: 'Limca / Sprite / 7UP', category: 'Beverages', price: 20, calories: 130, healthTag: 'light', hasExtras: false },
  { name: 'Tea', category: 'Beverages', price: 15, calories: 40, healthTag: 'light', hasExtras: false },
  { name: 'Coffee', category: 'Beverages', price: 20, calories: 60, healthTag: 'light', hasExtras: false },

  // Specials
  { name: 'Popcorn', category: 'Specials', price: 10, calories: 110, healthTag: 'light', hasExtras: false },
];
