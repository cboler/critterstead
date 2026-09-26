// Populated save captured from the released v1 schema. Do not derive from current defaults.
export const legacyV1 = {
  version: 1,
  seed: 777197,
  day: 7,
  minute: 832,
  totalMinutes: 9472,
  areaId: 'homestead',
  areaInstanceId: 'local-homestead',
  player: {
    id: 'player-local',
    position: {
      x: 3,
      z: 2,
    },
    stamina: 57,
    coins: 42,
  },
  critter: {
    id: 'critter-pip',
    name: 'Pip',
    speciesId: 'brindlekin',
    ageDays: 24,
    sex: 'female',
    personality: 'Curious · food-motivated · quietly brave',
    position: {
      x: 2.4,
      z: 2.6,
    },
    stats: {
      strength: 6.25,
      endurance: 9.5,
      speed: 8.75,
      intelligence: 12,
    },
    stamina: 63,
    health: 94,
    happiness: 83,
    bond: 62,
    hunger: 44,
    berryKnowledge: 5,
    skills: {
      harvesting: 4,
      racing: 6,
    },
    visualTraits: {
      coat: 'peach',
      accent: 'moss',
    },
    pedigree: {
      parentIds: ['ancestor-dawn', 'ancestor-moss'],
    },
    genetics: {
      coat: 'peach/peach',
      crest: 'fern/fern',
    },
    history: [
      'Day 1: A new home at Bramblewick Yard.',
      'Day 5: Harvests on cue.',
      'Day 6: silver in the Clover Cup (21.4s).',
    ],
    competitions: [
      {
        day: 6,
        time: 21.4,
        medal: 'silver',
      },
    ],
  },
  inventory: [
    {
      id: 'stack-feed-1',
      itemId: 'feed',
      quantity: 4,
      quality: 1,
    },
    {
      id: 'stack-seed-1',
      itemId: 'seed',
      quantity: 3,
      quality: 1,
    },
    {
      id: 'stack-berry-2',
      itemId: 'berry',
      quantity: 7,
      quality: 2,
    },
  ],
  resources: [
    {
      id: 'berries-west',
      position: {
        x: -3,
        z: -2,
      },
      areaId: 'glade',
      available: false,
      respawnAt: 9630,
    },
    {
      id: 'berries-hollow',
      position: {
        x: -1,
        z: 2.5,
      },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    },
    {
      id: 'berries-north',
      position: {
        x: 1,
        z: -4,
      },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    },
    {
      id: 'berries-center',
      position: {
        x: 2,
        z: 0,
      },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    },
    {
      id: 'berries-east',
      position: {
        x: 5,
        z: -1.5,
      },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    },
    {
      id: 'berries-south',
      position: {
        x: 4,
        z: 4.5,
      },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    },
  ],
  crop: {
    id: 'crop-feed',
    plantedAt: 9300,
    watered: true,
    readyAt: 9550,
  },
  shedLevel: 1,
  flags: ['cared', 'petted-today', 'trained', 'gathered', 'directed', 'improved', 'raced'],
  journal: ['Day 7: Pip practiced at the hoops.', 'Day 6: Pip earned a silver ribbon.'],
  training: {
    phase: 0.4,
    hits: [0.9],
    elapsed: 1.2,
    lastHitAt: 0.65,
    kind: 'training',
  },
};
