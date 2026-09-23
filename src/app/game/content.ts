import { AreaDefinition, AreaId, Point } from './model';

export const GAME_CONFIG = {
  realSecondsPerDay: 30 * 60,
  interactionDistance: 2.35,
  movementSpeed: 4,
  berryRespawnMinutes: 180,
  cropGrowthMinutes: 180,
  shedCost: 12,
  commandedKnowledge: 3,
  autonomousKnowledge: 7,
} as const;

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
      { id: 'shed', kind: 'shed', name: 'Pip’s nook', position: { x: 4, z: -4 }, radius: 1.5 },
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
