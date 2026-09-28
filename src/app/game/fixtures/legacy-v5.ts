import { legacyV4 } from './legacy-v4';
import type { Container, InventoryItem } from '../model';
// Frozen v5 container definitions, intentionally independent of current defaults.
export const ITEM_IDS: InventoryItem['itemId'][] = [
  'berry',
  'feed',
  'seed',
  'timber',
  'stone',
  'lumber',
];
export const MILL_MINUTES = 12;

function frozenContainers(
  playerId: string,
  critterId: string,
  items: InventoryItem[],
  critterIds = [critterId],
): Container[] {
  return [
    {
      id: 'player-backpack',
      kind: 'backpack',
      location: { actorId: playerId },
      capacity: null,
      allowed: [...ITEM_IDS],
      items,
    },
    ...critterIds.map((actorId): Container => ({
      id: `satchel-${actorId}`,
      kind: 'satchel',
      location: { actorId },
      capacity: null,
      allowed: [...ITEM_IDS],
      items: [],
    })),
    {
      id: 'yard-chest',
      kind: 'chest',
      location: { areaId: 'homestead', position: { x: -1, z: 4 } },
      capacity: 64,
      allowed: [...ITEM_IDS],
      items: [],
    },
    {
      id: 'mill-input',
      kind: 'mill-input',
      location: { areaId: 'homestead', position: { x: 5, z: 1 } },
      capacity: 4,
      allowed: ['timber'],
      items: [],
    },
    {
      id: 'mill-output',
      kind: 'mill-output',
      location: { areaId: 'homestead', position: { x: 6.5, z: 1 } },
      capacity: 4,
      allowed: ['lumber'],
      items: [],
    },
    {
      id: 'feed-trough',
      kind: 'trough',
      location: { areaId: 'homestead', position: { x: 6.5, z: -2 } },
      capacity: 8,
      allowed: ['feed'],
      items: [],
    },
  ];
}

const { inventory, ...world } = structuredClone(legacyV4);
export const legacyV5 = {
  ...world,
  version: 5,
  containers: frozenContainers(
    world.player.id,
    world.activeCritterId,
    inventory as InventoryItem[],
    world.critters.map((critter) => critter.id),
  ),
  production: { progressMinutes: 5.5 },
};
