import { GameState } from './model';

export interface SaveStorage {
  load(): Promise<GameState | null>;
  save(state: GameState): Promise<void>;
  clear(): Promise<void>;
}

const databaseName = 'critterstead';
const storeName = 'saves';
const saveKey = 'homestead';

/** One local save. The database version and the game schema version are independent. */
export class IndexedDbStorage implements SaveStorage {
  private database: Promise<IDBDatabase> | null = null;
  private writes: Promise<void> = Promise.resolve();

  async load(): Promise<GameState | null> {
    await this.writes;
    const database = await this.open();
    const value = await new Promise<unknown>((resolve, reject) => {
      const transaction = database.transaction(storeName, 'readonly');
      const request = transaction.objectStore(storeName).get(saveKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not read your homestead.'));
      transaction.onabort = () =>
        reject(transaction.error ?? new Error('Save read was interrupted.'));
    });
    if (value === undefined) return null;
    validateSave(value);
    return value;
  }

  async save(state: GameState): Promise<void> {
    // Snapshot when requested; a later simulation tick must not change a queued save.
    validateSave(state);
    const snapshot = structuredClone(state);
    return this.enqueue((store) => store.put(snapshot, saveKey));
  }

  clear(): Promise<void> {
    return this.enqueue((store) => store.delete(saveKey));
  }

  private enqueue(operation: (store: IDBObjectStore) => IDBRequest): Promise<void> {
    const next = this.writes.then(async () => {
      const database = await this.open();
      await new Promise<void>((resolve, reject) => {
        const transaction = database.transaction(storeName, 'readwrite');
        operation(transaction.objectStore(storeName));
        transaction.oncomplete = () => resolve();
        transaction.onabort = () =>
          reject(transaction.error ?? new Error('Your homestead could not be saved.'));
        transaction.onerror = () =>
          reject(transaction.error ?? new Error('Your homestead could not be saved.'));
      });
    });
    // A failed write is reported to its caller, but does not permanently stop future saves.
    this.writes = next.catch(() => undefined);
    return next;
  }

  private open(): Promise<IDBDatabase> {
    if (!this.database) {
      this.database = new Promise<IDBDatabase>((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(
            new Error('Device storage is unavailable. Try a browser that supports IndexedDB.'),
          );
          return;
        }
        const request = indexedDB.open(databaseName, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(storeName))
            request.result.createObjectStore(storeName);
        };
        request.onsuccess = () => {
          const database = request.result;
          database.onversionchange = () => {
            database.close();
            this.database = null;
          };
          resolve(database);
        };
        request.onerror = () =>
          reject(request.error ?? new Error('Device storage could not be opened.'));
        request.onblocked = () =>
          reject(
            new Error(
              'Another Critterstead tab is holding an older save open. Close that tab and reload.',
            ),
          );
      }).catch((error: unknown) => {
        this.database = null;
        throw error;
      });
    }
    return this.database;
  }
}

/** Fail closed: never turn an unreadable or newer save into a fresh, overwritten game. */
export function validateSave(value: unknown): asserts value is GameState {
  const root = record(value, 'save');
  if (root['version'] !== 1) {
    throw new Error(
      `Unsupported save version ${String(root['version'])}. Your existing homestead has been kept.`,
    );
  }
  ensureFiniteTree(value);
  number(root['seed'], 'seed', 0, 4294967295, true);
  number(root['day'], 'day', 1, Number.MAX_SAFE_INTEGER, true);
  number(root['minute'], 'minute', 0, 1440);
  number(root['totalMinutes'], 'totalMinutes');
  if ((root['minute'] as number) >= 1440) corrupt('minute');
  if (root['day'] !== Math.floor((root['totalMinutes'] as number) / 1440) + 1) corrupt('calendar');
  area(root['areaId']);
  string(root['areaInstanceId'], 'areaInstanceId');

  const player = record(root['player'], 'player');
  string(player['id'], 'player.id');
  point(player['position']);
  number(player['stamina'], 'player.stamina', 0, 100);
  number(player['coins'], 'player.coins');

  const critter = record(root['critter'], 'critter');
  for (const key of ['id', 'name', 'speciesId', 'personality'])
    string(critter[key], `critter.${key}`);
  choice(critter['sex'], ['female', 'male'], 'critter.sex');
  point(critter['position']);
  for (const key of ['ageDays', 'berryKnowledge']) number(critter[key], `critter.${key}`);
  for (const key of ['stamina', 'health', 'happiness', 'bond', 'hunger'])
    number(critter[key], `critter.${key}`, 0, 100);
  const stats = record(critter['stats'], 'critter.stats');
  for (const key of ['strength', 'endurance', 'speed', 'intelligence'])
    number(stats[key], `critter.stats.${key}`);
  const skills = record(critter['skills'], 'critter.skills');
  number(skills['harvesting'], 'critter.skills.harvesting');
  number(skills['racing'], 'critter.skills.racing');
  const traits = record(critter['visualTraits'], 'critter.visualTraits');
  string(traits['coat'], 'critter.visualTraits.coat');
  string(traits['accent'], 'critter.visualTraits.accent');
  strings(
    record(critter['pedigree'], 'critter.pedigree')['parentIds'],
    'critter.pedigree.parentIds',
  );
  for (const gene of Object.values(record(critter['genetics'], 'critter.genetics')))
    string(gene, 'critter.genetics');
  strings(critter['history'], 'critter.history');
  for (const item of array(critter['competitions'], 'critter.competitions')) {
    const result = record(item, 'competition');
    number(result['day'], 'competition.day', 1, Number.MAX_SAFE_INTEGER, true);
    number(result['time'], 'competition.time');
    string(result['medal'], 'competition.medal');
  }
  const ids = new Set<string>([player['id'] as string, critter['id'] as string]);
  if (ids.size !== 2) corrupt('duplicate entity IDs');
  for (const value of array(root['inventory'], 'inventory')) {
    const item = record(value, 'inventory item');
    entityId(item['id'], ids);
    choice(item['itemId'], ['berry', 'feed', 'seed'], 'inventory.itemId');
    number(item['quantity'], 'inventory.quantity', 0, Number.MAX_SAFE_INTEGER, true);
    number(item['quality'], 'inventory.quality', 1, 3);
  }
  for (const value of array(root['resources'], 'resources')) {
    const node = record(value, 'resource');
    entityId(node['id'], ids);
    area(node['areaId']);
    point(node['position']);
    boolean(node['available'], 'resource.available');
    number(node['respawnAt'], 'resource.respawnAt');
  }
  const crop = record(root['crop'], 'crop');
  entityId(crop['id'], ids);
  for (const key of ['plantedAt', 'readyAt'])
    if (crop[key] !== null) number(crop[key], `crop.${key}`);
  boolean(crop['watered'], 'crop.watered');
  number(root['shedLevel'], 'shedLevel', 0, Number.MAX_SAFE_INTEGER, true);
  strings(root['flags'], 'flags');
  strings(root['journal'], 'journal');
  if (root['training'] !== null) {
    const training = record(root['training'], 'training');
    number(training['phase'], 'training.phase', 0, 1);
    number(training['elapsed'], 'training.elapsed');
    if (training['lastHitAt'] !== undefined) number(training['lastHitAt'], 'training.lastHitAt');
    choice(training['kind'], ['training', 'race'], 'training.kind');
    for (const hit of array(training['hits'], 'training.hits')) number(hit, 'training.hit', 0, 1);
  }
}

function corrupt(path: string): never {
  throw new Error(
    `The saved homestead is damaged (${path}). It has been kept; reset only if you want to start over.`,
  );
}
function record(value: unknown, path: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) corrupt(path);
  return value as Record<string, unknown>;
}
function string(value: unknown, path: string): asserts value is string {
  if (typeof value !== 'string' || !value.length || value.length > 10000) corrupt(path);
}
function number(
  value: unknown,
  path: string,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  integer = false,
): void {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < min ||
    value > max ||
    (integer && !Number.isInteger(value))
  )
    corrupt(path);
}
function boolean(value: unknown, path: string): void {
  if (typeof value !== 'boolean') corrupt(path);
}
function array(value: unknown, path: string): unknown[] {
  if (!Array.isArray(value) || value.length > 10000) corrupt(path);
  return value;
}
function strings(value: unknown, path: string): void {
  for (const item of array(value, path)) string(item, path);
}
function choice(value: unknown, choices: string[], path: string): void {
  if (typeof value !== 'string' || !choices.includes(value)) corrupt(path);
}
function area(value: unknown): void {
  choice(value, ['homestead', 'glade'], 'areaId');
}
function point(value: unknown): void {
  const position = record(value, 'position');
  number(position['x'], 'position.x', -1000, 1000);
  number(position['z'], 'position.z', -1000, 1000);
}
function entityId(value: unknown, ids: Set<string>): void {
  string(value, 'entity ID');
  if (ids.has(value)) corrupt('duplicate entity IDs');
  ids.add(value);
}
function ensureFiniteTree(value: unknown, ancestors = new Set<object>(), depth = 0): void {
  if (depth > 30) corrupt('excessive nesting');
  if (typeof value === 'number' && !Number.isFinite(value)) corrupt('non-finite number');
  if (typeof value === 'object' && value !== null) {
    if (ancestors.has(value)) corrupt('cyclic data');
    ancestors.add(value);
    for (const item of Object.values(value)) ensureFiniteTree(item, ancestors, depth + 1);
    ancestors.delete(value);
  }
}
