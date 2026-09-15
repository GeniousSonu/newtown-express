import React from 'react';
import { hashStringToNumber } from '@/lib/avatar';

const FOOD_PALETTES = [
  { bg: '#FFF1E6', border: '#FF7700', text: '#D95D00', tagBg: '#FF7700', tagText: '#FFFFFF' }, // Warm Orange
  { bg: '#F0FDF4', border: '#16A34A', text: '#15803D', tagBg: '#16A34A', tagText: '#FFFFFF' }, // Fresh Emerald
  { bg: '#EFF6FF', border: '#2563EB', text: '#1D4ED8', tagBg: '#2563EB', tagText: '#FFFFFF' }, // Crisp Blue
  { bg: '#FEF3C7', border: '#D97706', text: '#B45309', tagBg: '#D97706', tagText: '#FFFFFF' }, // Golden Amber
  { bg: '#FAF5FF', border: '#9333EA', text: '#7E22CE', tagBg: '#9333EA', tagText: '#FFFFFF' }, // Royal Violet
  { bg: '#FFF1F2', border: '#E11D48', text: '#BE123C', tagBg: '#E11D48', tagText: '#FFFFFF' }, // Rose Berry
  { bg: '#F0FDFA', border: '#0D9488', text: '#0F766E', tagBg: '#0D9488', tagText: '#FFFFFF' }, // Artisan Teal
  { bg: '#FDF4FF', border: '#C026D3', text: '#A21CAF', tagBg: '#C026D3', tagText: '#FFFFFF' }, // Vibrant Fuchsia
];

export function getFoodEmoji(name = '', category = ''): string {
  const text = `${name} ${category}`.toLowerCase();
  if (text.includes('sandwich') || text.includes('toast')) return '🥪';
  if (text.includes('maggi') || text.includes('pasta') || text.includes('noodle')) return '🍜';
  if (text.includes('chai') || text.includes('tea') || text.includes('coffee') || text.includes('latte')) return '☕';
  if (text.includes('beverage') || text.includes('shake') || text.includes('juice') || text.includes('soda') || text.includes('drink')) return '🥤';
  if (text.includes('roll') || text.includes('wrap') || text.includes('burrito')) return '🌯';
  if (text.includes('egg') || text.includes('omelet')) return '🍳';
  if (text.includes('salad') || text.includes('healthy') || text.includes('fruit')) return '🥗';
  if (text.includes('burger')) return '🍔';
  if (text.includes('pizza')) return '🍕';
  if (text.includes('popcorn') || text.includes('snack') || text.includes('special')) return '🍿';
  if (text.includes('rice') || text.includes('biryani') || text.includes('bowl')) return '🍛';
  if (text.includes('soup')) return '🍲';
  return '🍽️';
}

export function getFoodPlaceholderStyle(item: { id?: string; name: string; category?: string }) {
  const seed = `${item.id || ''}-${item.name || ''}-${item.category || ''}`;
  const index = hashStringToNumber(seed) % FOOD_PALETTES.length;
  const palette = FOOD_PALETTES[index];
  const emoji = getFoodEmoji(item.name, item.category);

  return {
    palette,
    emoji,
    bg: palette.bg,
    border: palette.border,
    text: palette.text,
  };
}

export function generateFoodPlaceholderSvgDataUrl(
  item: { id?: string; name: string; category?: string },
  size = 320
): string {
  const { palette, emoji } = getFoodPlaceholderStyle(item);
  const cleanName = (item.name || 'Kitchen Item').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const cleanCategory = (item.category || 'Specialty').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${Math.round(size * 0.625)}" width="${size}" height="${Math.round(size * 0.625)}">
    <defs>
      <pattern id="grid-${palette.border.replace('#', '')}" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="2" cy="2" r="1.2" fill="${palette.border}" opacity="0.12"/>
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="${palette.bg}"/>
    <rect width="100%" height="100%" fill="url(#grid-${palette.border.replace('#', '')})"/>
    <g transform="translate(${Math.round(size * 0.5)}, ${Math.round(size * 0.28)})">
      <circle r="${Math.round(size * 0.16)}" fill="#FFFFFF" stroke="${palette.border}" stroke-width="2.5" opacity="0.95"/>
      <text font-size="${Math.round(size * 0.16)}" text-anchor="middle" dominant-baseline="central">${emoji}</text>
    </g>
    <text x="50%" y="${Math.round(size * 0.5)}" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(size * 0.045)}" font-weight="900" fill="#111111" text-anchor="middle" dominant-baseline="middle">${cleanName}</text>
    <g transform="translate(${Math.round(size * 0.5)}, ${Math.round(size * 0.56)})">
      <text font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${Math.round(size * 0.035)}" font-weight="800" fill="${palette.text}" text-anchor="middle" letter-spacing="1px">${cleanCategory.toUpperCase()}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function FoodPlaceholder({
  item,
  className = '',
}: {
  item: { id?: string; name: string; category?: string };
  className?: string;
}) {
  const { palette, emoji } = getFoodPlaceholderStyle(item);

  return (
    <div
      style={{ backgroundColor: palette.bg }}
      className={`w-full h-full flex flex-col items-center justify-center relative overflow-hidden select-none ${className}`}
    >
      <div
        className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-white border-2 flex items-center justify-center text-2xl sm:text-3xl shadow-sm mb-1.5 transition-transform group-hover:scale-110 duration-200"
        style={{ borderColor: palette.border }}
      >
        <span>{emoji}</span>
      </div>
      <span
        style={{ color: palette.text }}
        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/80 border border-current/20"
      >
        {item.category || 'Special'}
      </span>
    </div>
  );
}
