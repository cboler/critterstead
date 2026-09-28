import { legacyV3 } from './legacy-v3';

// Frozen v4 shape, including cargo on the ground and already-paid unfinished work.
export const legacyV4 = {
  ...structuredClone(legacyV3),
  version: 4,
  player: {
    ...legacyV3.player,
    stats: { strength: 7.2, endurance: 6.1, speed: 4.5, intelligence: 5 },
    skills: { woodcutting: 3.5, mining: 2, hauling: 4, foraging: 5 },
  },
  materialNodes: [
    {
      id: 'yard-timber',
      areaId: 'homestead',
      position: { x: -1, z: -5 },
      kind: 'timber',
      remaining: 4,
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
  ],
  groundCargo: [
    {
      id: 'ground-cargo-1',
      areaId: 'glade',
      position: { x: 1, z: 0 },
      items: [{ id: 'ground-cargo-1-stone-2', itemId: 'stone', quantity: 3, quality: 2 }],
    },
  ],
  training: null,
  work: {
    nodeId: 'yard-timber',
    remainingSeconds: 0.6,
    result: {
      degree: 0.2,
      staminaCost: 6,
      timeMinutes: 9,
      durationSeconds: 2.7,
      damage: 2,
      skillXpGained: 0.35,
      statXpGained: { strength: 0.02 },
    },
  },
};
