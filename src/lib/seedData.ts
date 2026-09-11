import { MenuItem, PaymentConfig } from '@/types';

export const COMMON_ADDONS = [
  { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
  { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
  { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
  { name: 'Boiled Egg', priceDelta: 10, calorieDelta: 78 },
  { name: 'Omelette', priceDelta: 15, calorieDelta: 90 },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // HEALTHY SNACKS
  {
    id: 'snack-1',
    name: 'Bread Butter / Jam',
    description: 'Crisp golden toasted bread with rich melted butter or sweet mixed fruit jam',
    price: 10,
    calories: 150,
    healthTag: 'light',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 1,
    addonGroups: [
      {
        groupName: 'Topping Choice',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Butter', priceDelta: 0, calorieDelta: 0 },
          { name: 'Mixed Fruit Jam', priceDelta: 0, calorieDelta: 0 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },
  {
    id: 'snack-2',
    name: 'Veggie Sandwich',
    description: 'Crisp cucumber, juicy tomato & mint green chutney layered in toasted bread',
    price: 20,
    calories: 200,
    healthTag: 'balanced',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 2,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
        ],
      },
    ],
  },
  {
    id: 'snack-3',
    name: 'Bread Omelette',
    description: 'Fluffy masala omelette with onions & green chillies tucked in golden toasted bread',
    price: 17,
    calories: 250,
    healthTag: 'balanced',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 3,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
        ],
      },
    ],
  },
  {
    id: 'snack-4',
    name: 'Omelette / Poach',
    description: 'Two farm-fresh eggs spiced with black pepper and herbs, cooked hot to order',
    price: 15,
    calories: 180,
    healthTag: 'balanced',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 4,
    addonGroups: [
      {
        groupName: 'Preparation Style',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Double Egg Masala Omelette', priceDelta: 0, calorieDelta: 0 },
          { name: 'Half Fry / Sunny Side Up', priceDelta: 0, calorieDelta: 0 },
          { name: 'Full Fried Poach', priceDelta: 0, calorieDelta: 0 },
        ],
      },
      {
        groupName: 'Extras',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
        ],
      },
    ],
  },
  {
    id: 'snack-5',
    name: 'Boiled Egg',
    description: 'Pantry hard-boiled farm egg sprinkled with chat masala & black pepper',
    price: 8,
    calories: 78,
    healthTag: 'light',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 5,
    addonGroups: [
      {
        groupName: 'Quantity & Seasoning',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Add Extra Boiled Egg', priceDelta: 8, calorieDelta: 78 },
          { name: 'Extra Pepper & Salt', priceDelta: 0, calorieDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'snack-6',
    name: 'Warm Oats Bowl',
    description: 'Nutritious warm rolled oats bowl seasoned with mild spices or light milk',
    price: 25,
    calories: 150,
    healthTag: 'light',
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1586495777744-4413f21062fa?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 6,
    addonGroups: [
      {
        groupName: 'Style',
        required: false,
        multiSelect: false,
        options: [
          { name: 'Masala Veggie Oats', priceDelta: 0, calorieDelta: 0 },
          { name: 'Sweet Milk Oats', priceDelta: 0, calorieDelta: 0 },
        ],
      },
    ],
  },

  // SANDWICHES
  {
    id: 'sand-1',
    name: 'Single Cheese Veggie Sandwich',
    description: 'Melted Amul cheese slice on fresh cucumber and tomato toast with tangy herbs',
    price: 35,
    calories: 220,
    healthTag: 'balanced',
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 7,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
          { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
        ],
      },
    ],
  },
  {
    id: 'sand-2',
    name: 'Double Cheese Sandwich',
    description: 'Two slices of golden melted cheese grilled till crispy and stretchy',
    price: 45,
    calories: 320,
    healthTag: 'balanced',
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 8,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
          { name: 'Extra Ketchup', priceDelta: 2, calorieDelta: 20 },
        ],
      },
    ],
  },
  {
    id: 'sand-3',
    name: 'Egg Cheese Sandwich w/ Veggies',
    description: 'Hot fluffy spiced omelette topped with melted cheese, cucumber and tomatoes',
    price: 45,
    calories: 350,
    healthTag: 'indulgent',
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 9,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },

  // MAGGI & PASTA
  {
    id: 'maggi-1',
    name: 'Classic Pantry Maggi',
    description: 'The legendary 2-minute noodles tossed in aromatic tastemaker masala',
    price: 15,
    calories: 350,
    healthTag: 'indulgent',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 10,
    addonGroups: [
      {
        groupName: 'Gravy Preference',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Normal Soupy', priceDelta: 0, calorieDelta: 0 },
          { name: 'Dry Style', priceDelta: 0, calorieDelta: 0 },
        ],
      },
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Boiled Egg', priceDelta: 10, calorieDelta: 78 },
        ],
      },
    ],
  },
  {
    id: 'maggi-2',
    name: 'Egg Maggi',
    description: 'Classic hot Maggi tossed with scrambled masala eggs and herbs',
    price: 25,
    calories: 430,
    healthTag: 'indulgent',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 11,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },
  {
    id: 'maggi-3',
    name: 'Egg Maggi Special Masala',
    description: 'Rich Maggi packed with double spices, butter, fresh veggies and scrambled eggs',
    price: 35,
    calories: 450,
    healthTag: 'indulgent',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 12,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },
  {
    id: 'maggi-4',
    name: 'Maggi Special Masala',
    description: 'Hot pantry Maggi infused with extra aromatic roasted garam masala & chopped onions',
    price: 25,
    calories: 370,
    healthTag: 'indulgent',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 13,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },
  {
    id: 'pasta-1',
    name: 'Classic Penne Pasta',
    description: 'Pantry style tangy tomato penne pasta cooked with herbs, sweet corn & butter',
    price: 25,
    calories: 300,
    healthTag: 'balanced',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 14,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Boiled Egg', priceDelta: 10, calorieDelta: 78 },
        ],
      },
    ],
  },
  {
    id: 'pasta-2',
    name: 'Egg Penne Pasta',
    description: 'Tangy red sauce penne pasta tossed with fresh scrambled egg and melted butter',
    price: 35,
    calories: 380,
    healthTag: 'indulgent',
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1621996346565-e3d5d6281691?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 15,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10, calorieDelta: 60 },
          { name: 'Extra Butter', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },

  // BEVERAGES
  {
    id: 'bev-1',
    name: 'Maaza / Slice (250ml)',
    description: 'Chilled thick mango drink straight from the pantry cooler',
    price: 20,
    calories: 150,
    healthTag: 'light',
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 16,
  },
  {
    id: 'bev-2',
    name: 'Coke / Thums Up (250ml)',
    description: 'Ice cold fizzy cola to recharge your afternoon work session',
    price: 20,
    calories: 140,
    healthTag: 'light',
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 17,
  },
  {
    id: 'bev-3',
    name: 'Limca / Sprite / 7UP (250ml)',
    description: 'Crisp, refreshing lemon lime soda served chilled',
    price: 20,
    calories: 130,
    healthTag: 'light',
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 18,
  },
  {
    id: 'bev-4',
    name: 'Special Pantry Milk Chai',
    description: 'Steaming hot cup brewed with ginger, crushed cardamom & full cream milk',
    price: 10,
    calories: 40,
    healthTag: 'light',
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 19,
    addonGroups: [
      {
        groupName: 'Sugar Level',
        required: false,
        multiSelect: false,
        options: [
          { name: 'Normal Sugar', priceDelta: 0, calorieDelta: 0 },
          { name: 'Less Sugar', priceDelta: 0, calorieDelta: 0 },
          { name: 'Without Sugar', priceDelta: 0, calorieDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'bev-5',
    name: 'Hot Pantry Coffee',
    description: 'Hot frothy milk coffee prepared instant pantry style with rich crema',
    price: 20,
    calories: 60,
    healthTag: 'light',
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 20,
    addonGroups: [
      {
        groupName: 'Sugar Level',
        required: false,
        multiSelect: false,
        options: [
          { name: 'Normal Sugar', priceDelta: 0, calorieDelta: 0 },
          { name: 'Less Sugar', priceDelta: 0, calorieDelta: 0 },
          { name: 'Strong (Extra Coffee)', priceDelta: 0, calorieDelta: 0 },
        ],
      },
    ],
  },

  // SPECIALS
  {
    id: 'spec-1',
    name: 'Pantry Butter Popcorn',
    description: 'Freshly popped warm salted pantry popcorn tub with buttery crunch',
    price: 10,
    calories: 110,
    healthTag: 'light',
    category: 'SPECIALS',
    imageUrl: 'https://images.unsplash.com/photo-1578849278619-e73505e9610f?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 21,
    addonGroups: [
      {
        groupName: 'Flavor',
        required: false,
        multiSelect: false,
        options: [
          { name: 'Classic Salted', priceDelta: 0, calorieDelta: 0 },
          { name: 'Butter Salted', priceDelta: 8, calorieDelta: 70 },
        ],
      },
    ],
  },
];

/** @deprecated — Old Zone A–D seat map removed. See lib/seatLayout.ts for the real floor plan. */

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  upiId: 'newtownexpress@okhdfcbank',
  payeeName: 'Newtown Express Pantry',
  qrImageUrl: '/qr-placeholder.svg',
};

export const DEFAULT_DEPARTMENTS: string[] = [
  'Engineering',
  'Design',
  'Sales',
  'Ops',
  'HR',
  'Other',
];
