import { MenuItem, SeatInfo, PaymentConfig } from '@/types';

export const COMMON_ADDONS = [
  { name: 'Extra Ketchup', priceDelta: 2 },
  { name: 'Extra Butter', priceDelta: 8 },
  { name: 'Extra Cheese', priceDelta: 10 },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  // HEALTHY SNACKS
  {
    id: 'snack-1',
    name: 'Bread Butter / Jam',
    description: 'Crisp golden toasted bread with rich melted Amul butter or sweet mixed fruit jam',
    price: 10,
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
          { name: 'Butter', priceDelta: 0 },
          { name: 'Mixed Fruit Jam', priceDelta: 0 },
          { name: 'Extra Butter', priceDelta: 8 },
        ],
      },
    ],
  },
  {
    id: 'snack-2',
    name: 'Veggie Sandwich',
    description: 'Crisp cucumber, juicy tomato & mint green chutney layered in toasted milk bread',
    price: 20,
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 2,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'snack-3',
    name: 'Bread Omelette',
    description: 'Fluffy masala omelette with onions & green chillies tucked in golden toasted bread',
    price: 17,
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
          { name: 'Extra Cheese', priceDelta: 10 },
          { name: 'Extra Ketchup', priceDelta: 2 },
        ],
      },
    ],
  },
  {
    id: 'snack-4',
    name: 'Omelette / Poach',
    description: 'Cooked fresh: 2-egg spiced masala omelette or runny golden sunny-side poach',
    price: 12,
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 4,
    addonGroups: [
      {
        groupName: 'Preparation',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Masala Omelette', priceDelta: 0 },
          { name: 'Egg Poach (Half Fry)', priceDelta: 0 },
          { name: 'Full Fry Poach', priceDelta: 0 },
        ],
      },
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'snack-5',
    name: 'Boiled Egg',
    description: 'Farm-fresh hard boiled egg served hot with rock salt and crushed black pepper',
    price: 10,
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 5,
    addonGroups: [],
  },
  {
    id: 'snack-6',
    name: 'Oats Bowl',
    description: 'Warm wholesome bowl of masala oats simmered with mild herbs and crunchy veggies',
    price: 20,
    category: 'HEALTHY SNACKS',
    imageUrl: 'https://images.unsplash.com/photo-1584776296944-ab6fb57b0bdd?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 6,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Butter', priceDelta: 8 },
        ],
      },
    ],
  },

  // SANDWICHES
  {
    id: 'sand-1',
    name: 'Single Cheese Veggie Sandwich',
    description: 'Layered veggies, crunchy capsicum & sweet onion with melted cheddar slice',
    price: 20,
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1619860860774-1e2e17343432?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 7,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'sand-2',
    name: 'Double Cheese Sandwich',
    description: 'Gooey double cheddar cheese melt with seasoned herbs on golden toasted bread',
    price: 30,
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1528736235302-52922df5c122?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 8,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: [
          { name: 'Extra Cheese', priceDelta: 10 },
          { name: 'Extra Ketchup', priceDelta: 2 },
        ],
      },
    ],
  },
  {
    id: 'sand-3',
    name: 'Egg Cheese Sandwich with Veggies',
    description: 'Loaded grilled sandwich with spiced egg omelette, melted cheese, and crisp veggies',
    price: 40,
    category: 'SANDWICHES',
    imageUrl: 'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 9,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },

  // MAGGI / PASTA
  {
    id: 'maggi-1',
    name: 'Classic Maggi',
    description: 'Signature 2-minute office favorite prepared piping hot and aromatic',
    price: 25,
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 10,
    addonGroups: [
      {
        groupName: 'Preparation Style',
        required: false,
        multiSelect: false,
        options: [
          { name: 'Regular Soupy', priceDelta: 0 },
          { name: 'Dry / Classic', priceDelta: 0 },
        ],
      },
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'maggi-2',
    name: 'Egg Maggi',
    description: 'Piping hot noodles tossed with spiced scrambled egg and green herbs',
    price: 35,
    category: 'MAGGI / PASTA',
    imageUrl: '/egg-maggie.jpg',
    isAvailable: true,
    sortOrder: 11,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'maggi-3',
    name: 'Egg Maggi (Special Masala)',
    description: 'Double spicy pantry special masala noodles cooked with scrambled egg, chillies & veggies',
    price: 40,
    category: 'MAGGI / PASTA',
    imageUrl: '/egg-maggie.jpg',
    isAvailable: true,
    sortOrder: 12,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'maggi-4',
    name: 'Maggi (Special Masala)',
    description: 'Signature pantry Maggi infused with roasted spices, slit green chillies & diced onions',
    price: 30,
    category: 'MAGGI / PASTA',
    imageUrl: 'https://images.unsplash.com/photo-1552611052-33e04de081de?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 13,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'pasta-1',
    name: 'Red Sauce Pasta',
    description: 'Penne pasta tossed in aromatic spiced tangy tomato sauce with Italian oregano',
    price: 30,
    category: 'MAGGI / PASTA',
    imageUrl: '/red-sause-paste.webp',
    isAvailable: true,
    sortOrder: 14,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },
  {
    id: 'pasta-2',
    name: 'Egg Pasta',
    description: 'Tomato herb penne pasta loaded with fluffy spiced scrambled egg & black pepper',
    price: 40,
    category: 'MAGGI / PASTA',
    imageUrl: '/red-sause-paste.webp',
    isAvailable: true,
    sortOrder: 15,
    addonGroups: [
      {
        groupName: 'Add-ons',
        required: false,
        multiSelect: true,
        options: COMMON_ADDONS,
      },
    ],
  },

  // BEVERAGES
  {
    id: 'bev-1',
    name: 'Maaza / Slice',
    description: 'Chilled rich Alphonso mango fruit drink served ice cold (200ml)',
    price: 20,
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1546173159-315724a31696?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 16,
    addonGroups: [
      {
        groupName: 'Preference',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Maaza', priceDelta: 0 },
          { name: 'Slice', priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'bev-2',
    name: 'Coke / Thums Up',
    description: 'Ice cold carbonated cola refresher to beat the afternoon slump',
    price: 20,
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 17,
    addonGroups: [
      {
        groupName: 'Preference',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Coca Cola', priceDelta: 0 },
          { name: 'Thums Up (Charged)', priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'bev-3',
    name: 'Limca / Sprite / 7UP',
    description: 'Crisp lemon-lime sparkling refresher served chilled',
    price: 20,
    category: 'BEVERAGES',
    imageUrl: 'https://images.unsplash.com/photo-1625772299848-391b6a87d7b3?w=800&auto=format&fit=crop&q=80',
    isAvailable: true,
    sortOrder: 18,
    addonGroups: [
      {
        groupName: 'Preference',
        required: true,
        multiSelect: false,
        options: [
          { name: 'Limca', priceDelta: 0 },
          { name: 'Sprite', priceDelta: 0 },
          { name: '7UP', priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'bev-4',
    name: 'Kadak Adrak Chai',
    description: 'Freshly brewed office cutting adrak-elaichi milk chai served piping hot',
    price: 15,
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
          { name: 'Normal Sugar', priceDelta: 0 },
          { name: 'Less Sugar', priceDelta: 0 },
          { name: 'No Sugar', priceDelta: 0 },
        ],
      },
    ],
  },
  {
    id: 'bev-5',
    name: 'Frothy Hot Coffee',
    description: 'Hot frothy milk coffee prepared instant pantry style with rich crema',
    price: 20,
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
          { name: 'Normal Sugar', priceDelta: 0 },
          { name: 'Less Sugar', priceDelta: 0 },
          { name: 'Strong (Extra Coffee)', priceDelta: 0 },
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
          { name: 'Classic Salted', priceDelta: 0 },
          { name: 'Butter Salted', priceDelta: 8 },
        ],
      },
    ],
  },
];

export const INITIAL_SEAT_MAP: SeatInfo[] = [
  ...Array.from({ length: 12 }, (_, i) => ({
    seatCode: `A-${String(i + 1).padStart(2, '0')}`,
    zone: 'A' as const,
    label: `Bay A Desk ${i + 1}`,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    seatCode: `B-${String(i + 1).padStart(2, '0')}`,
    zone: 'B' as const,
    label: `Bay B Desk ${i + 1}`,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    seatCode: `C-${String(i + 1).padStart(2, '0')}`,
    zone: 'C' as const,
    label: `Bay C Desk ${i + 1}`,
  })),
  ...Array.from({ length: 12 }, (_, i) => ({
    seatCode: `D-${String(i + 1).padStart(2, '0')}`,
    zone: 'D' as const,
    label: `Bay D Desk ${i + 1}`,
  })),
];

export const DEFAULT_PAYMENT_CONFIG: PaymentConfig = {
  upiId: 'newtownexpress@okhdfcbank',
  payeeName: 'Newtown Express Pantry',
  qrImageUrl: '/qr-placeholder.svg',
};
