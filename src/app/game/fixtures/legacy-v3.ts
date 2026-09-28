import { legacyV2 } from './legacy-v2';
// Frozen historical v3 data, never constructed from current game defaults.
export const legacyV3 = {
  ...structuredClone(legacyV2),
  version: 3,
  critters: legacyV2.critters.map(({ berryKnowledge, ...critter }) => ({
    ...structuredClone(critter),
    learnedBehaviors: { 'sunberry-foraging': berryKnowledge },
  })),
};
