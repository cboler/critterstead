import { legacyV11 } from './legacy-v11';
// Frozen v12 data: the v11 world with its showing finished, a Hedgerow Dash silver beside
// it, and no ladder yet. Written out as data.
const world = structuredClone(legacyV11);
export const legacyV12 = {
  ...world,
  version: 12,
  training: null,
  critters: world.critters.map((critter) =>
    critter.id === world.activeCritterId
      ? {
          ...critter,
          competitions: [
            ...critter.competitions,
            { day: 4, time: 70.2, medal: 'silver', event: 'hedgerow' },
          ],
        }
      : critter,
  ),
};
