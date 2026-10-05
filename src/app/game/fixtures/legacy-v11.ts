import { legacyV10 } from './legacy-v10';
// Frozen v11 data: v10 with practice remembered, a silver from an earlier showing, and an
// exhibition caught mid stone pull, its sprint already scored, at the Colosseum with no
// other work under way. Written out as data.
const world = structuredClone(legacyV10);
const companion = world.activeCritterId;
export const legacyV11 = {
  ...world,
  version: 11,
  critters: world.critters.map((critter) =>
    critter.id === companion
      ? {
          ...critter,
          practised: { hoops: 1, lift: 2 },
          competitions: [
            ...critter.competitions,
            { day: 1, time: 66.4, medal: 'silver', event: 'exhibition' },
          ],
        }
      : { ...critter, practised: {} },
  ),
  areaId: 'colosseum',
  areaInstanceId: 'local-colosseum',
  companionIndoors: false,
  work: null,
  training: {
    critterId: companion,
    phase: 0,
    hits: [],
    elapsed: 1.4,
    lastHitAt: 1.2,
    kind: 'exhibition',
    stage: 1,
    meter: 0.6,
    progress: 0.35,
    scores: [0.9],
  },
};
