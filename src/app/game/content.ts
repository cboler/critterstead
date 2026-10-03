import {
  AreaDefinition,
  AreaId,
  BehaviorDefinition,
  BehaviorId,
  CropDefinition,
  CropId,
  MaterialNode,
  Point,
  SoilPlot,
} from './model';

export const GAME_CONFIG = {
  realSecondsPerDay: 30 * 60,
  interactionDistance: 2.35,
  movementSpeed: 4,
  berryRespawnMinutes: 180,
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

// M8 provisional training tuning: share of gains for the 1st, 2nd, 3rd and later same-day session.
export const DRILL_GAIN_STEPS = [1, 0.55, 0.3, 0.15];
export const DRILLS = {
  hoops: { energy: 30, minutes: 40 },
  lift: { energy: 25, minutes: 30 },
  pace: { energy: 30, minutes: 45 },
} as const;
export const EXHIBITION = {
  energy: 40,
  minutes: 60,
  gold: 80,
  silver: 62,
  coins: { gold: 15, silver: 9, bronze: 5 },
} as const;

// One authored learning arc. Work/reward execution remains an explicit host rule.
export const BEHAVIORS: Record<BehaviorId, BehaviorDefinition> = {
  'lumber-hauling': {
    id: 'lumber-hauling',
    name: 'Lumber hauling',
    steps: ['collect', 'deliver'],
    gains: { observation: 1, cue: 2, autonomous: 1 },
    practiceCeiling: 20,
    stages: [
      {
        id: 'unfamiliar',
        threshold: 0,
        label: 'New to hauling',
        hint: 'Let {name} watch you take lumber from the mill and store it in the yard chest twice.',
        milestone: '',
      },
      {
        id: 'observing',
        threshold: 1,
        label: 'Watching the route',
        hint: 'Show the whole mill-to-chest route once more.',
        milestone: '{name} watches where the lumber belongs. Show that route again.',
      },
      {
        id: 'cued',
        threshold: 2,
        label: 'Hauls on cue',
        hint: 'At the mill or chest, ask {name} to haul a board to the chest.',
        milestone: '{name} understands the route. Try a hauling cue at the mill or chest.',
      },
      {
        id: 'autonomous',
        threshold: 6,
        label: 'Independent hauler',
        hint: '{name} can clear the mill while you do other work in the yard.',
        milestone:
          '{name} knows the whole route! Lumber hauling is on; ask them to follow to pause it.',
      },
    ],
  },
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
      {
        id: 'gate',
        kind: 'gate',
        name: 'To Clover Glade',
        position: { x: 8, z: 0 },
        radius: 1,
        destination: 'glade',
        arrival: { x: -6, z: 0 },
      },
      {
        id: 'lift',
        kind: 'lift',
        name: 'Boulder lift',
        position: { x: 5.2, z: 6.6 },
        radius: 1.1,
      },
      {
        id: 'race',
        kind: 'race',
        name: 'Clover Cup time trial',
        position: { x: 2, z: 6 },
        radius: 1.2,
      },
    ],
  },
  cottage: {
    id: 'cottage',
    name: 'Inside your cottage',
    subtitle: 'Warm boards and a crackling hearth',
    halfSize: 5,
    spawn: { x: 1.6, z: 3.3 },
    objects: [
      {
        id: 'door',
        kind: 'door',
        name: 'Out to the yard',
        position: { x: 1.6, z: 4.4 },
        radius: 0.8,
      },
      { id: 'bed', kind: 'bed', name: 'Quilted bed', position: { x: -3, z: -2.6 }, radius: 1.1 },
      {
        id: 'calendar',
        kind: 'calendar',
        name: 'Wall calendar',
        position: { x: 0.2, z: -3.9 },
        radius: 0.6,
      },
      {
        id: 'hearth',
        kind: 'hearth',
        name: 'Stone hearth',
        position: { x: 3, z: -3.7 },
        radius: 1,
      },
      {
        id: 'counter',
        kind: 'counter',
        name: 'Kitchen counter',
        position: { x: -3.9, z: 1.6 },
        radius: 0.9,
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
      {
        id: 'gate',
        kind: 'gate',
        name: 'Back to the yard',
        position: { x: -8, z: 0 },
        radius: 1,
        destination: 'homestead',
        arrival: { x: 6, z: 0 },
      },
      {
        id: 'colosseum-gate',
        kind: 'gate',
        name: 'To the Colosseum grounds',
        position: { x: 7.6, z: -4.4 },
        radius: 1,
        destination: 'colosseum',
        arrival: { x: -6, z: 4 },
      },
      {
        id: 'pace',
        kind: 'pace',
        name: 'Pacing loop',
        position: { x: 1.2, z: 6.8 },
        radius: 1.1,
      },
    ],
  },
  colosseum: {
    id: 'colosseum',
    name: 'The Colosseum grounds',
    subtitle: 'Unfinished stands, very finished enthusiasm',
    halfSize: 10,
    spawn: { x: -6, z: 4 },
    objects: [
      {
        id: 'gate',
        kind: 'gate',
        name: 'Back to Clover Glade',
        position: { x: -8, z: 4 },
        radius: 1,
        destination: 'glade',
        arrival: { x: 6.4, z: -3.4 },
      },
      {
        id: 'exhibition',
        kind: 'exhibition',
        name: 'Exhibition steward',
        position: { x: -3, z: 1 },
        radius: 1,
      },
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

// Fixed campaign resource sites; depletion lasts until the next morning.
export function initialMaterialNodes(): MaterialNode[] {
  return [
    {
      id: 'yard-timber',
      areaId: 'homestead',
      position: { x: -1, z: -5 },
      kind: 'timber',
      remaining: 6,
      respawnAt: 0,
    },
    {
      id: 'yard-stone',
      areaId: 'homestead',
      position: { x: 6, z: 4 },
      kind: 'stone',
      remaining: 6,
      respawnAt: 0,
    },
    {
      id: 'glade-timber',
      areaId: 'glade',
      position: { x: -4, z: 5 },
      kind: 'timber',
      remaining: 6,
      respawnAt: 0,
    },
    {
      id: 'glade-stone',
      areaId: 'glade',
      position: { x: 5, z: -5 },
      kind: 'stone',
      remaining: 6,
      respawnAt: 0,
    },
  ];
}

// Campaign 001 provisional crop table. Growth accrues only while a bed is moist.
export const CROPS: Record<CropId, CropDefinition> = {
  feed: {
    name: 'Feed greens',
    seedItem: 'seed',
    seedLabel: 'feed seed',
    seedPrice: 1,
    seasons: ['spring', 'summer', 'autumn'],
    growthMinutes: 180,
    harvest: [
      { itemId: 'feed', quantity: 3 },
      { itemId: 'seed', quantity: 1 },
    ],
  },
  turnip: {
    name: 'Crisp turnips',
    seedItem: 'turnip-seed',
    seedLabel: 'turnip seed',
    seedPrice: 2,
    seasons: ['spring', 'autumn'],
    growthMinutes: 1200,
    harvest: [{ itemId: 'turnip', quantity: 3 }],
  },
  wheat: {
    name: 'Grain wheat',
    seedItem: 'wheat-seed',
    seedLabel: 'wheat seed',
    seedPrice: 2,
    seasons: ['spring', 'summer'],
    growthMinutes: 2400,
    harvest: [{ itemId: 'wheat', quantity: 4 }],
  },
  sunberry: {
    name: 'Garden sunberries',
    seedItem: 'sunberry-seed',
    seedLabel: 'sunberry seed',
    seedPrice: 3,
    seasons: ['summer', 'autumn'],
    growthMinutes: 1800,
    harvest: [{ itemId: 'berry', quantity: 5 }],
  },
};
export const CROP_IDS = Object.keys(CROPS) as CropId[];
export const PRODUCE_PRICES: Partial<Record<string, number>> = { turnip: 2, wheat: 2 };

// Four fixed beds; the first keeps the former feed garden's prepared soil and position.
export function initialPlots(): SoilPlot[] {
  return [
    { x: -5, z: 2 },
    { x: -3.6, z: 2 },
    { x: -5, z: 3.4 },
    { x: -3.6, z: 3.4 },
  ].map((position, index) => ({
    id: `plot-${index + 1}`,
    position,
    tilled: index === 0,
    moistUntil: 0,
    crop: null,
  }));
}
