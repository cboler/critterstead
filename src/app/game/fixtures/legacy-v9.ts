import { legacyV8 } from './legacy-v8';
// Frozen v9 data: v8 with the companion recast as Canine at ordinary size.
const world = structuredClone(legacyV8);
export const legacyV9 = {
  ...world,
  version: 9,
  critters: world.critters.map((critter) => ({
    ...critter,
    speciesId: 'canine',
    visualTraits: { ...critter.visualTraits, size: 1 },
  })),
};
