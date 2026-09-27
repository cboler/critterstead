import { legacyV1 } from './legacy-v1';

// Frozen v2 shape composed only from the frozen v1 fixture, never current defaults.
// Pip comes first so migration cannot mistake array order for companion selection.
const { critter, ...world } = structuredClone(legacyV1);
export const legacyV2 = {
  ...world,
  version: 2,
  critters: [
    {
      ...structuredClone(critter),
      id: 'grandpa-pip',
      ownerId: 'grandpa',
      berryKnowledge: 20,
      lastPettedDay: null,
    },
    {
      ...critter,
      id: 'player-mallow',
      name: 'Mallow',
      ownerId: world.player.id,
      berryKnowledge: 5,
      lastPettedDay: world.day,
    },
  ],
  activeCritterId: 'player-mallow',
  training: { ...world.training, critterId: 'player-mallow' },
};
