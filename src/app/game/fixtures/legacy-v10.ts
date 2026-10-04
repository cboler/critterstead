import { legacyV9 } from './legacy-v9';
// Frozen v10 data: v9 with Grandpa's Pip and his satchel, and two boulder lifts behind the
// companion. Pip is written out, so later changes to a new household's Pip cannot alter it.
const world = structuredClone(legacyV9);
export const legacyV10 = {
  ...world,
  version: 10,
  critters: [
    ...world.critters.map((critter) => ({
      ...critter,
      skills: { ...critter.skills, lifting: 2 },
    })),
    {
      id: 'critter-grandpa-pip',
      name: 'Pip',
      ownerId: 'grandpa',
      lastPettedDay: null,
      speciesId: 'brindlekin',
      ageDays: 4800,
      sex: 'male',
      personality: 'Patient · unhurried · knows every bush by name',
      position: { x: -5.5, z: -1.1 },
      stats: { strength: 30, endurance: 42, speed: 18, intelligence: 64 },
      stamina: 100,
      health: 100,
      happiness: 90,
      bond: 100,
      hunger: 20,
      learnedBehaviors: { 'sunberry-foraging': 60, 'lumber-hauling': 30 },
      hauling: { enabled: false, phase: 'idle', cued: false },
      drills: { day: world.day, sessions: {} },
      skills: { harvesting: 40, racing: 12 },
      visualTraits: { coat: 'chestnut', accent: 'fern', size: 0.95 },
      pedigree: { parentIds: [] },
      genetics: {},
      history: [],
      competitions: [],
    },
  ],
  containers: [
    ...world.containers,
    {
      id: 'satchel-critter-grandpa-pip',
      kind: 'satchel',
      location: { actorId: 'critter-grandpa-pip' },
      capacity: null,
      allowed: [
        'berry',
        'feed',
        'seed',
        'timber',
        'stone',
        'lumber',
        'turnip',
        'wheat',
        'turnip-seed',
        'wheat-seed',
        'sunberry-seed',
      ],
      items: [],
    },
  ],
};
