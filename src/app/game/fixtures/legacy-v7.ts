import { legacyV6 } from './legacy-v6';
// Frozen v7 data composed only from frozen fixtures and literal values, never current defaults.
const { crop, ...world } = structuredClone(legacyV6);
const general = ['berry', 'feed', 'seed', 'timber', 'stone', 'lumber'];
export const legacyV7 = {
  ...world,
  version: 7,
  player: { ...world.player, skills: { farming: 1, ...world.player.skills } },
  companionIndoors: false,
  plots: [
    {
      id: 'plot-1',
      position: { x: -5, z: 2 },
      tilled: true,
      moistUntil: 10440,
      crop: { speciesId: 'feed', plantedAt: crop.plantedAt, growthMinutes: 102, withered: false },
    },
    { id: 'plot-2', position: { x: -3.6, z: 2 }, tilled: false, moistUntil: 0, crop: null },
    { id: 'plot-3', position: { x: -5, z: 3.4 }, tilled: false, moistUntil: 0, crop: null },
    { id: 'plot-4', position: { x: -3.6, z: 3.4 }, tilled: false, moistUntil: 0, crop: null },
  ],
  containers: world.containers.map((container) =>
    container.allowed.length === general.length
      ? {
          ...container,
          allowed: [...general, 'turnip', 'wheat', 'turnip-seed', 'wheat-seed', 'sunberry-seed'],
        }
      : container,
  ),
};
