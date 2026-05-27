import { EraTheme } from './types';

export const ERA_THEMES: Record<string, EraTheme> = {
  'Taylor Swift': {
    colors: { primary: '#8B7355', secondary: '#C4A882', accent: '#4A7C59', bg: '#1a1510' },
    description: 'Where it all began — country roads and teenage dreams',
    year: 2006,
    aesthetic: 'country',
  },
  'Fearless': {
    colors: { primary: '#D4AF37', secondary: '#FFD700', accent: '#FFF8DC', bg: '#1a1608' },
    description: 'Golden and fearless — the fairy tale era',
    year: 2008,
    aesthetic: 'golden',
  },
  'Speak Now': {
    colors: { primary: '#7B2D8E', secondary: '#9B59B6', accent: '#D8B4FE', bg: '#150a1a' },
    description: 'Purple prose and midnight confessions',
    year: 2010,
    aesthetic: 'enchanted',
  },
  'Red': {
    colors: { primary: '#8B0000', secondary: '#DC143C', accent: '#FF6B6B', bg: '#1a0808' },
    description: 'Autumn leaves and burning bridges',
    year: 2012,
    aesthetic: 'autumn',
  },
  '1989': {
    colors: { primary: '#5B9BD5', secondary: '#87CEEB', accent: '#E8D5F5', bg: '#0a1520' },
    description: 'Polaroids and city lights — pop revolution',
    year: 2014,
    aesthetic: 'polaroid',
  },
  'reputation': {
    colors: { primary: '#2D2D2D', secondary: '#4A4A4A', accent: '#C0C0C0', bg: '#0a0a0a' },
    description: 'Snakes and newspapers — the dark era',
    year: 2017,
    aesthetic: 'dark',
  },
  'Lover': {
    colors: { primary: '#FF69B4', secondary: '#FFB6C1', accent: '#87CEEB', bg: '#1a0a15' },
    description: 'Cotton candy skies and kaleidoscope love',
    year: 2019,
    aesthetic: 'pastel',
  },
  'folklore': {
    colors: { primary: '#708090', secondary: '#A9A9A9', accent: '#D3D3C7', bg: '#0f1210' },
    description: 'Cardigan weather and whispered stories in the woods',
    year: 2020,
    aesthetic: 'forest',
  },
  'evermore': {
    colors: { primary: '#8B6914', secondary: '#B8860B', accent: '#DAA520', bg: '#12100a' },
    description: 'Rust and amber — the eternal autumn',
    year: 2020,
    aesthetic: 'rust',
  },
  'Midnights': {
    colors: { primary: '#191970', secondary: '#4169E1', accent: '#E6E6FA', bg: '#08081a' },
    description: '3AM confessions under lavender haze',
    year: 2022,
    aesthetic: 'midnight',
  },
  'The Tortured Poets Department': {
    colors: { primary: '#8B8378', secondary: '#C4B5A5', accent: '#DDD0C0', bg: '#14120f' },
    description: 'Ink-stained pages and phantom pain',
    year: 2024,
    aesthetic: 'parchment',
  },
  'The Life Of A Showgirl': {
    colors: { primary: '#C41E3A', secondary: '#FF6B81', accent: '#FFD700', bg: '#1a0a0e' },
    description: 'Spotlight, sequins, and the price of the show',
    year: 2025,
    aesthetic: 'showgirl',
  },
};

export const ALL_ERAS: string[] = [
  'Taylor Swift',
  'Fearless',
  'Speak Now',
  'Red',
  '1989',
  'reputation',
  'Lover',
  'folklore',
  'evermore',
  'Midnights',
  'The Tortured Poets Department',
  'The Life Of A Showgirl',
];

const DEFAULT_THEME: EraTheme = {
  colors: { primary: '#708090', secondary: '#A9A9A9', accent: '#D3D3C7', bg: '#0f1210' },
  description: 'Unknown era',
  year: 2020,
  aesthetic: 'default',
};

export function getEraTheme(era: string): EraTheme {
  return ERA_THEMES[era] || DEFAULT_THEME;
}

export function getEraGradient(era: string): string {
  const theme = getEraTheme(era);
  return `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.secondary}, ${theme.colors.accent})`;
}

export function getEraClass(era: string): string {
  return `era-${era
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')}`;
}

const ERA_FONT_CLASSES: Record<string, string> = {
  'Taylor Swift': 'font-era-debut',
  'Fearless': 'font-era-fearless',
  'Speak Now': 'font-era-speaknow',
  'Red': 'font-era-red',
  '1989': 'font-era-1989',
  'reputation': 'font-era-reputation',
  'Lover': 'font-era-lover',
  'folklore': 'font-era-folklore',
  'evermore': 'font-era-evermore',
  'Midnights': 'font-era-midnights',
  'The Tortured Poets Department': 'font-era-ttpd',
  'THE TORTURED POETS DEPARTMENT': 'font-era-ttpd',
  'The Life Of A Showgirl': 'font-era-showgirl',
  'THE LIFE OF A SHOWGIRL': 'font-era-showgirl',
  'Red (Deluxe Edition)': 'font-era-red',
  'Red (Taylor\'s Version)': 'font-era-red',
  'Fearless (Taylor\'s Version)': 'font-era-fearless',
  'Speak Now (Taylor\'s Version)': 'font-era-speaknow',
  '1989 (Taylor\'s Version)': 'font-era-1989',
  '1989 (Deluxe)': 'font-era-1989',
};

export function getEraFontClass(album: string): string {
  // Direct match
  if (ERA_FONT_CLASSES[album]) return ERA_FONT_CLASSES[album];
  // Fuzzy match
  const lower = album.toLowerCase();
  for (const [key, cls] of Object.entries(ERA_FONT_CLASSES)) {
    if (lower.includes(key.toLowerCase()) || key.toLowerCase().includes(lower)) return cls;
  }
  return 'font-display'; // Fallback to Playfair Display
}
