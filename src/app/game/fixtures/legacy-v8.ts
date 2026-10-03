import { legacyV7 } from './legacy-v7';
// Frozen v8 data: v7 plus remembered drill sessions, with a Brindlekin companion.
const world = structuredClone(legacyV7);
export const legacyV8 = {
  ...world,
  version: 8,
  critters: world.critters.map((critter) => ({
    ...critter,
    drills: { day: world.day, sessions: { hoops: 1, lift: 2 } },
  })),
};
