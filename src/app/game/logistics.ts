import { Container, InventoryItem } from './model';

export const ITEM_IDS: InventoryItem['itemId'][] = [
  'berry',
  'feed',
  'seed',
  'timber',
  'stone',
  'lumber',
];
export const MILL_MINUTES = 12;

export function initialContainers(
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

export function quantity(container: Container, itemId?: InventoryItem['itemId']): number {
  return container.items.reduce(
    (sum, item) => sum + (!itemId || item.itemId === itemId ? item.quantity : 0),
    0,
  );
}
export function room(container: Container, itemId: InventoryItem['itemId']): number {
  return container.allowed.includes(itemId)
    ? container.capacity === null
      ? Infinity
      : container.capacity - quantity(container)
    : 0;
}
export function addItem(
  container: Container,
  itemId: InventoryItem['itemId'],
  amount: number,
  quality = 1,
): void {
  const stack = container.items.find((item) => item.itemId === itemId && item.quality === quality);
  if (stack) stack.quantity += amount;
  else
    container.items.push({
      id: `${container.id}-${itemId}-${quality}`,
      itemId,
      quantity: amount,
      quality,
    });
}
export function transfer(
  source: Container,
  destination: Container,
  itemId: InventoryItem['itemId'],
  amount = 1,
): boolean {
  if (
    source === destination ||
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    quantity(source, itemId) < amount ||
    room(destination, itemId) < amount
  )
    return false;
  let left = amount;
  for (const item of source.items.filter((item) => item.itemId === itemId)) {
    const moved = Math.min(left, item.quantity);
    if (moved) addItem(destination, itemId, moved, item.quality);
    item.quantity -= moved;
    left -= moved;
  }
  source.items = source.items.filter((item) => item.quantity > 0);
  return true;
}

export function productionStatus(containers: Container[]): string {
  const input = containers.find((container) => container.kind === 'mill-input')!;
  const output = containers.find((container) => container.kind === 'mill-output')!;
  if (room(output, 'lumber') < 2)
    return 'Stopped: output crate full. Carry lumber to the yard chest.';
  if (!quantity(input, 'timber'))
    return 'Stopped: no timber in the input hopper. Bring chopped logs here.';
  return 'Sawing: one timber becomes two lumber every 12 game minutes.';
}
