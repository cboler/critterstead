import { legacyV5 } from './legacy-v5';
// Frozen v6 data composed only from frozen fixtures, never current defaults.
const world = structuredClone(legacyV5);
export const legacyV6 = {
  ...world,
  version: 6,
  haulLesson: null,
  critters: world.critters.map((critter) => ({
    ...critter,
    hauling: { enabled: false, phase: 'idle', cued: false },
  })),
};
