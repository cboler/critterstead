import {
  AreaDefinition,
  AreaId,
  BehaviorDefinition,
  BehaviorId,
  Blocker,
  CropDefinition,
  CropId,
  Drill,
  MaterialNode,
  Point,
  SoilPlot,
  Stats,
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
export interface DrillDefinition {
  name: string;
  stat: keyof Stats;
  // A smaller share of the gain goes to a second stat.
  side: keyof Stats;
  sideShare: number;
  energy: number;
  minutes: number;
  skill: string;
  flag: string;
  // Gain before repeats: base + score × score + care × care (+ a stat × weight).
  gain: {
    base: number;
    score: number;
    care: number;
    bonus?: { stat: keyof Stats; weight: number };
  };
  // Result headings for a great, a good and a weak session.
  praise: readonly [string, string, string];
}
// Plan 004 drill table; tuning is provisional.
export const DRILLS: Record<Drill, DrillDefinition> = {
  hoops: {
    name: 'Practice hoops',
    stat: 'speed',
    side: 'endurance',
    sideShare: 0.35,
    energy: 30,
    minutes: 40,
    skill: 'racing',
    flag: 'trained',
    gain: { base: 0.25, score: 0.8, care: 0.35, bonus: { stat: 'endurance', weight: 0.008 } },
    praise: ['Lovely rhythm!', 'Good practice!', 'Every little try counts.'],
  },
  lift: {
    name: 'Boulder lift',
    stat: 'strength',
    side: 'endurance',
    sideShare: 0.3,
    energy: 25,
    minutes: 30,
    skill: 'lifting',
    flag: 'lifted',
    gain: { base: 0.2, score: 0.7, care: 0.3 },
    praise: ['Superb effort!', 'Solid work!', 'A brave try.'],
  },
  pace: {
    name: 'Distance pacing',
    stat: 'endurance',
    side: 'speed',
    sideShare: 0.3,
    energy: 30,
    minutes: 45,
    skill: 'pacing',
    flag: 'paced',
    gain: { base: 0.2, score: 0.7, care: 0.3 },
    praise: ['Superb effort!', 'Solid work!', 'A brave try.'],
  },
  toss: {
    name: 'Log toss',
    stat: 'strength',
    side: 'speed',
    sideShare: 0.3,
    energy: 25,
    minutes: 30,
    skill: 'tossing',
    flag: 'tossed',
    gain: { base: 0.2, score: 0.7, care: 0.3 },
    praise: ['What a throw!', 'Good distance!', 'A brave try.'],
  },
};
export const DRILL_IDS = Object.keys(DRILLS) as Drill[];
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

// The Colosseum's low wall and back-arc stands, shared by the renderer and walking.
export const ARENA = {
  center: { x: 1, z: -1 },
  wall: { rx: 5.6, rz: 3.8, posts: 26 },
  // Posts left out where the path from the gate enters, beside the steward's booth.
  entrance: [10, 11],
  stands: { tiers: 3, seats: 16 },
} as const;

export function arenaPosts(): { x: number; z: number; angle: number; index: number }[] {
  const { center, wall } = ARENA;
  return Array.from({ length: wall.posts }, (_, index) => {
    const angle = (index / wall.posts) * Math.PI * 2;
    return {
      index,
      angle,
      x: center.x + Math.cos(angle) * wall.rx,
      z: center.z + Math.sin(angle) * wall.rz,
    };
  }).filter((post) => !(ARENA.entrance as readonly number[]).includes(post.index));
}

/** Seats around the far half; every fifth is bare scaffolding in the unfinished shell. */
export function arenaSeats(): {
  x: number;
  z: number;
  angle: number;
  tier: number;
  seat: number;
  scaffold: boolean;
}[] {
  const { center, stands } = ARENA;
  const seats = [];
  for (let tier = 0; tier < stands.tiers; tier++)
    for (let seat = 0; seat < stands.seats; seat++) {
      const angle = Math.PI * 1.02 + (seat / (stands.seats - 1)) * Math.PI * 0.96;
      seats.push({
        tier,
        seat,
        angle,
        scaffold: (seat + tier) % 5 === 4,
        x: center.x + Math.cos(angle) * (6.2 + tier * 0.8),
        z: center.z + Math.sin(angle) * (4.4 + tier * 0.75),
      });
    }
  return seats;
}

// Logs are thrown west from the stump, away from the glade's paths.
export const TOSS_STATION: Point = { x: -5, z: -3.4 };
export const EXHIBITION_BOOTH: Point = { x: -1.8, z: 0.4 };

// Oakhaven's buildings along the north of the square (footprints, without the plinth).
export const TOWN_BUILDINGS: {
  x: number;
  z: number;
  width: number;
  depth: number;
  name?: string;
}[] = [
  { x: -5.2, z: -5.2, width: 3.2, depth: 2.4, name: 'General store' },
  { x: 0, z: -5.8, width: 3.4, depth: 2.4, name: 'Clinic' },
  { x: 5.2, z: -5.2, width: 3.4, depth: 2.6, name: 'Tavern' },
  { x: -8.2, z: -5.6, width: 2.2, depth: 2.2 },
  { x: 8.4, z: -5.4, width: 2, depth: 2.2 },
];
export const TOWN_CARTS: Point[] = [
  { x: -4.6, z: 6 },
  { x: 5, z: 6 },
];
export const TOWN_WELL: Point = { x: 0, z: 0 };
export const TAVERN_BIN: Point = { x: 3.3, z: -3.3 };

const COLOSSEUM_BLOCKERS: Blocker[] = [
  ...arenaPosts().map(({ x, z }) => ({ x, z, r: 0.45 })),
  ...arenaSeats().map(({ x, z }) => ({ x, z, r: 0.65 })),
  { ...EXHIBITION_BOOTH, hx: 0.65, hz: 0.4 },
  { x: 2.9, z: -1, r: 0.65 },
];
const TOWN_BLOCKERS: Blocker[] = [
  ...TOWN_BUILDINGS.map(({ x, z, width, depth }) => ({
    x,
    z,
    hx: (width + 0.3) / 2,
    hz: (depth + 0.3) / 2,
  })),
  ...TOWN_CARTS.map(({ x, z }) => ({ x, z, hx: 0.95, hz: 0.6 })),
  { ...TOWN_WELL, r: 0.9 },
  { ...TAVERN_BIN, r: 0.42 },
  { x: 2.6, z: 2.6, hx: 0.7, hz: 0.15 },
];

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
        id: 'town-gate',
        kind: 'gate',
        name: 'To Oakhaven',
        position: { x: -8, z: 1.2 },
        radius: 1,
        destination: 'town',
        arrival: { x: 6.4, z: 1 },
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
        id: 'pace',
        kind: 'pace',
        name: 'Pacing loop',
        position: { x: 1.2, z: 6.8 },
        radius: 1.1,
      },
      {
        id: 'toss',
        kind: 'toss',
        name: 'Log toss',
        position: TOSS_STATION,
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
        name: 'Back to Oakhaven',
        position: { x: -8, z: 4 },
        radius: 1,
        destination: 'town',
        arrival: { x: -6.4, z: 1 },
      },
      {
        id: 'exhibition',
        kind: 'exhibition',
        name: 'Exhibition steward',
        position: EXHIBITION_BOOTH,
        radius: 1,
      },
    ],
    blockers: COLOSSEUM_BLOCKERS,
  },
  town: {
    id: 'town',
    name: 'Oakhaven',
    subtitle: 'Everyone here knows everyone',
    halfSize: 10,
    spawn: { x: 6.4, z: 1 },
    objects: [
      {
        id: 'gate',
        kind: 'gate',
        name: 'Back to Bramblewick',
        position: { x: 8, z: 1 },
        radius: 1,
        destination: 'homestead',
        arrival: { x: -6.4, z: 1.2 },
      },
      {
        id: 'colosseum-gate',
        kind: 'gate',
        name: 'To the Colosseum grounds',
        position: { x: -8, z: 1 },
        radius: 1,
        destination: 'colosseum',
        arrival: { x: -6, z: 4 },
      },
      {
        id: 'notices',
        kind: 'notices',
        name: 'Notice board',
        position: { x: 2.6, z: 2.6 },
        radius: 0.8,
      },
    ],
    blockers: TOWN_BLOCKERS,
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
