import { AreaDefinition, AreaId, BehaviorDefinition, BehaviorId, Point } from './model';

// Provisional loop-testing starter, separate from Grandpa’s narrative Pip.
export const STARTER = { id: 'critter-mallow', name: 'Mallow' } as const;

export const GAME_CONFIG = {
  realSecondsPerDay: 30 * 60,
  interactionDistance: 2.35,
  movementSpeed: 4,
  berryRespawnMinutes: 180,
  cropGrowthMinutes: 180,
  shedCost: 12,
  // M3 balance experiment: a same-day break and a reserve for self-directed work.
  restMinutes: 120,
  restPlayerEnergy: 30,
  restCritterEnergy: 35,
  autonomousEnergyReserve: 20,
  berryEnergy: 12,
  practiceEnergy: 30,
  trialEnergy: 35,
} as const;

// One authored learning arc. Work/reward execution remains an explicit host rule.
export const BEHAVIORS: Record<BehaviorId, BehaviorDefinition> = {
  'sunberry-foraging': {
    id: 'sunberry-foraging',
    name: 'Sunberry foraging',
    gains: { observation: 1, cue: 2, autonomous: 1 },
    practiceCeiling: 20,
    stages: [
      {
        id: 'unfamiliar',
        threshold: 0,
        label: 'Curious companion',
        hint: '{name} learns by watching you gather sunberries.',
        milestone: '',
      },
      {
        id: 'observing',
        threshold: 1,
        label: 'Learning by watching',
        hint: 'Let {name} watch three harvests, then try a cue.',
        milestone: '{name} is learning what sunberries are for. Keep gathering together.',
      },
      {
        id: 'cued',
        threshold: 3,
        label: 'Harvests on cue',
        hint: 'Try asking {name} to gather a nearby sunberry bush.',
        milestone: '{name} understands! You can now ask for a harvest of berries near a bush.',
      },
      {
        id: 'autonomous',
        threshold: 7,
        label: 'Independent forager',
        hint: '{name} recognizes ripe sunberries and can help independently.',
        milestone:
          'A little light goes on. {name} will now gather nearby berries independently when rested and well-fed.',
      },
    ],
  },
};

export const SPECIES = {
  brindlekin: {
    name: 'Brindlekin',
    description: 'A soft-footed woodland forager with a leafy crest and an enormous curiosity.',
    lifespanDays: 1200,
    gatheringAptitudes: ['berries'],
  },
} as const;

export const AREAS: Record<AreaId, AreaDefinition> = {
  homestead: {
    id: 'homestead',
    name: 'Bramblewick Yard',
    subtitle: 'A little patch of possibility',
    halfSize: 10,
    spawn: { x: 0, z: 0 },
    objects: [
      { id: 'house', kind: 'house', name: 'Your cottage', position: { x: -5, z: -4 }, radius: 1.9 },
      { id: 'shed', kind: 'shed', name: 'Companion nook', position: { x: 4, z: -4 }, radius: 1.5 },
      { id: 'crop', kind: 'crop', name: 'Feed garden', position: { x: -5, z: 2 }, radius: 1.25 },
      {
        id: 'training',
        kind: 'training',
        name: 'Practice hoops',
        position: { x: 3, z: 2 },
        radius: 1.2,
      },
      {
        id: 'market',
        kind: 'market',
        name: 'Honesty stall',
        position: { x: -6, z: 5 },
        radius: 1.1,
      },
      { id: 'gate', kind: 'gate', name: 'To Clover Glade', position: { x: 8, z: 0 }, radius: 1 },
      {
        id: 'race',
        kind: 'race',
        name: 'Clover Cup time trial',
        position: { x: 2, z: 6 },
        radius: 1.2,
      },
    ],
  },
  glade: {
    id: 'glade',
    name: 'Clover Glade',
    subtitle: 'Good things grow a little off the path',
    halfSize: 10,
    spawn: { x: -6, z: 0 },
    objects: [
      { id: 'gate', kind: 'gate', name: 'Back to the yard', position: { x: -8, z: 0 }, radius: 1 },
    ],
  },
};

export const BERRY_NODES: { id: string; position: Point }[] = [
  { id: 'berries-west', position: { x: -3, z: -2 } },
  { id: 'berries-hollow', position: { x: -1, z: 2.5 } },
  { id: 'berries-north', position: { x: 1, z: -4 } },
  { id: 'berries-center', position: { x: 2, z: 0 } },
  { id: 'berries-east', position: { x: 5, z: -1.5 } },
  { id: 'berries-south', position: { x: 4, z: 4.5 } },
];
