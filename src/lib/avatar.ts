// Zero-cost deterministic avatar generator based on UID or identifier

const AVATAR_PALETTES = [
  { bg: '#0D9488', text: '#FFFFFF' }, // Teal
  { bg: '#2563EB', text: '#FFFFFF' }, // Blue
  { bg: '#7C3AED', text: '#FFFFFF' }, // Violet
  { bg: '#DB2777', text: '#FFFFFF' }, // Pink
  { bg: '#EA580C', text: '#FFFFFF' }, // Orange
  { bg: '#16A34A', text: '#FFFFFF' }, // Green
  { bg: '#D97706', text: '#FFFFFF' }, // Amber
  { bg: '#4F46E5', text: '#FFFFFF' }, // Indigo
  { bg: '#0284C7', text: '#FFFFFF' }, // Sky
  { bg: '#9333EA', text: '#FFFFFF' }, // Purple
  { bg: '#E11D48', text: '#FFFFFF' }, // Rose
  { bg: '#059669', text: '#FFFFFF' }, // Emerald
];

export function getInitials(name?: string | null, fallback = 'U'): string {
  if (!name || typeof name !== 'string') return fallback.toUpperCase();
  const trimmed = name.trim();
  if (!trimmed) return fallback.toUpperCase();

  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const first = parts[0][0] || '';
    const last = parts[parts.length - 1][0] || '';
    return (first + last).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

export function getAvatarStyle(uidOrIdentifier: string, name?: string | null): {
  initials: string;
  bgColor: string;
  textColor: string;
} {
  const seed = uidOrIdentifier || name || 'default';
  const colorIndex = hashStringToNumber(seed) % AVATAR_PALETTES.length;
  const palette = AVATAR_PALETTES[colorIndex];
  const initials = getInitials(name || uidOrIdentifier);

  return {
    initials,
    bgColor: palette.bg,
    textColor: palette.text,
  };
}

export function generateInitialsSvgDataUrl(uid: string, name?: string | null, size = 64): string {
  const { initials, bgColor, textColor } = getAvatarStyle(uid, name);
  const fontSize = Math.round(size * 0.42);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.28)}" fill="${bgColor}"/>
    <text x="50%" y="54%" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="${fontSize}" font-weight="900" fill="${textColor}" text-anchor="middle" dominant-baseline="middle" letter-spacing="-0.5px">${initials}</text>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
