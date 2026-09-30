import type { Season } from '../model';

/** Seasonal colors for ground and foliage. Presentation only; seasons come from the calendar. */
export interface SeasonPalette {
  grass: string;
  grassLight: string;
  meadow: string;
  forestFloor: string;
  bank: string;
  blade: string;
  flower: string;
  canopy: [string, string, string];
  // Accent canopies mixed into the forest: blossom in spring, fire colors in autumn.
  accent: [string, string, string] | null;
  conifer: [string, string];
  trunk: string;
  bush: [string, string];
  snow: boolean;
  sky: string;
}

export const PALETTES: Record<Season, SeasonPalette> = {
  spring: {
    grass: '#95b865',
    grassLight: '#a9c875',
    meadow: '#8fb35f',
    forestFloor: '#6f9152',
    bank: '#b8a577',
    blade: '#7fa656',
    flower: '#f6e3a6',
    canopy: ['#7fa35d', '#94b86a', '#aac878'],
    accent: ['#e9b8c3', '#f3cad2', '#dca1b1'],
    conifer: ['#4f7a5a', '#5f8b62'],
    trunk: '#8d6a47',
    bush: ['#6f9a58', '#86ad62'],
    snow: false,
    sky: '#dfeae2',
  },
  summer: {
    grass: '#86ad57',
    grassLight: '#9bbf63',
    meadow: '#7fa652',
    forestFloor: '#5e8248',
    bank: '#b3a06f',
    blade: '#6f9a4a',
    flower: '#f1d68a',
    canopy: ['#5f8d4c', '#739f55', '#88b060'],
    accent: null,
    conifer: ['#446f50', '#537f58'],
    trunk: '#86623f',
    bush: ['#5f8b4c', '#76a257'],
    snow: false,
    sky: '#dbe9e4',
  },
  autumn: {
    grass: '#a3a95f',
    grassLight: '#b7b46b',
    meadow: '#a09c5a',
    forestFloor: '#8a7a4c',
    bank: '#b49b6b',
    blade: '#9a9a55',
    flower: '#e6b872',
    canopy: ['#d48a45', '#e3a34f', '#c96f3d'],
    accent: ['#b8503a', '#d9b24a', '#9f6a38'],
    conifer: ['#4d6f4f', '#5a7d56'],
    trunk: '#7e5d3f',
    bush: ['#b07a42', '#9c8a48'],
    snow: false,
    sky: '#ece3d3',
  },
  winter: {
    grass: '#e8edee',
    grassLight: '#f5f7f7',
    meadow: '#e4eaec',
    forestFloor: '#d9e1e5',
    bank: '#c9cfd0',
    blade: '#c6d0cf',
    flower: '#ffffff',
    canopy: ['#9aa39b', '#aab2aa', '#b9c0b8'],
    accent: null,
    conifer: ['#3f6250', '#4a6f5a'],
    trunk: '#6f5a48',
    bush: ['#8a988f', '#a3aea6'],
    snow: true,
    sky: '#e6ecef',
  },
};

// Deterministic value noise so the same area always grows the same scenery.
export function hash2(x: number, y: number, seed: number): number {
  let h =
    Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 1442695041);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function noise2(x: number, y: number, seed: number): number {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const a = hash2(ix, iy, seed);
  const b = hash2(ix + 1, iy, seed);
  const c = hash2(ix, iy + 1, seed);
  const d = hash2(ix + 1, iy + 1, seed);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}

export function fbm(x: number, y: number, seed: number, octaves = 3): number {
  let total = 0;
  let amplitude = 0.5;
  let frequency = 1;
  for (let octave = 0; octave < octaves; octave++) {
    total += noise2(x * frequency, y * frequency, seed + octave * 17) * amplitude;
    amplitude *= 0.5;
    frequency *= 2.03;
  }
  return total / (1 - 0.5 ** octaves);
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.max(0, Math.min(1, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** A seeded pseudo-random stream for scattering scenery. */
export function scatter(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}
