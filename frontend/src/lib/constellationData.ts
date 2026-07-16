import { ConstellationStar, TaylorSong } from './types';

// Each era gets a cluster position in 3D space, arranged in a spiral
// Balanced spiral — not too tight, not too spread
export const ERA_CLUSTER_CENTERS: Record<string, [number, number, number]> = {
  'Taylor Swift': [-10, 1, -5],
  'Fearless': [-7, 4, -1],
  'Speak Now': [-3, 6, 2],
  'Red': [1, 4, 5],
  '1989': [6, 2, 4],
  'reputation': [8, -1, 2],
  'Lover': [5, 0, -3],
  'folklore': [1, 5, -6],
  'evermore': [-3, 6, -4],
  'Midnights': [-6, 2, 1],
  'The Tortured Poets Department': [-1, -1, -2],
  'The Life Of A Showgirl': [3, -2, -1],
};

// Simple hash of a string for deterministic seeding
function hashString(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    const char = s.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return hash;
}

// Seeded pseudo-random number in [0, 1)
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

export function generateConstellationStars(catalog: TaylorSong[]): ConstellationStar[] {
  return catalog.map((song, index) => {
    const center = ERA_CLUSTER_CENTERS[song.era] || [0, 0, 0];
    const seed = hashString(song.name);
    const r1 = seededRandom(seed);
    const r2 = seededRandom(seed + 1);
    const r3 = seededRandom(seed + 2);

    // Spread songs around the cluster center
    const spread = 3.0;
    const position: [number, number, number] = [
      center[0] + (r1 - 0.5) * spread,
      center[1] + (r2 - 0.5) * spread,
      center[2] + (r3 - 0.5) * spread,
    ];

    return {
      id: `${song.era}-${index}`,
      name: song.name,
      album: song.album,
      era: song.era,
      position,
      brightness: song.is_single ? 1.0 : 0.4 + seededRandom(seed + 3) * 0.4,
      isSingle: song.is_single,
    };
  });
}
