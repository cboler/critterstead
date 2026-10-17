/** Deterministic noise in [0, 1) from whole numbers, so the same day always looks the same. */
export function noise(...values: number[]): number {
  let h = 2166136261;
  for (const value of values) {
    h ^= Math.floor(value) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 2246822507) >>> 0;
  }
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
