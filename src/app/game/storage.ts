import { Critter, GameState, Training } from './model';
import { CRITTER_KINDS } from './families';
import { createPip, GRANDPA, PIP_ID } from './household';
import { BEHAVIORS, CROPS, DRILL_IDS, initialMaterialNodes, initialPlots } from './content';
import { chessMoments, rhythmSong, runCourse } from './drills';
import { nextDawn } from './calendar';
import { initialContainers, ITEM_IDS, LEGACY_ITEM_IDS, MILL_MINUTES } from './logistics';

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
    return readSave(value);
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

/** Decode without writing: failed validation/migration leaves the stored record intact. */
export function readSave(value: unknown): GameState {
  const root = record(value, 'save');
  if (root['version'] === 1) {
    validateState(value, 1);
    const { critter, ...legacy } = structuredClone(value as LegacyGameStateV1);
    const migrated: LegacyGameStateV2 = {
      ...legacy,
      version: 2,
      critters: [
        {
          ...critter,
          ownerId: legacy.player.id,
          lastPettedDay: legacy.flags.includes('petted-today') ? legacy.day : null,
        },
      ],
      activeCritterId: critter.id,
      training: legacy.training ? { ...legacy.training, critterId: critter.id } : null,
    };
    return readSave(migrated);
  }
  if (root['version'] === 2) {
    validateState(value, 2);
    const legacy = structuredClone(value as LegacyGameStateV2);
    const migrated: LegacyGameStateV3 = {
      ...legacy,
      version: 3,
      critters: legacy.critters.map(({ berryKnowledge, ...critter }) => ({
        ...critter,
        learnedBehaviors: { 'sunberry-foraging': berryKnowledge },
      })),
    };
    return readSave(migrated);
  }
  if (root['version'] === 3) {
    validateState(value, 3);
    for (const key of ['materialNodes', 'groundCargo', 'work'])
      if (root[key] !== undefined) corrupt(`ambiguous ${key}`);
    const legacy = structuredClone(value as LegacyGameStateV3);
    if ('stats' in legacy.player || 'skills' in legacy.player)
      corrupt('ambiguous player capabilities');
    const migrated: LegacyGameStateV4 = {
      ...legacy,
      version: 4,
      player: {
        ...legacy.player,
        stats: { strength: 5, endurance: 5, speed: 4, intelligence: 5 },
        skills: { woodcutting: 1, mining: 1, hauling: 1, foraging: 1 },
      },
      materialNodes: initialMaterialNodes(),
      groundCargo: [],
      work: null,
    };
    return readSave(migrated);
  }
  if (root['version'] === 4) {
    validateState(value, 4);
    if (root['containers'] !== undefined || root['production'] !== undefined)
      corrupt('ambiguous containers');
    const { inventory, ...legacy } = structuredClone(value as LegacyGameStateV4);
    const migrated: LegacyGameStateV5 = {
      ...legacy,
      version: 5,
      containers: initialContainers(
        legacy.player.id,
        legacy.activeCritterId,
        inventory,
        legacy.critters.map((critter) => critter.id),
        LEGACY_ITEM_IDS,
      ),
      production: { progressMinutes: 0 },
    };
    return readSave(migrated);
  }
  if (root['version'] === 5) {
    validateState(value, 5);
    if (root['haulLesson'] !== undefined) corrupt('ambiguous haulLesson');
    const legacy = structuredClone(value as LegacyGameStateV5);
    if (legacy.critters.some((critter) => 'hauling' in critter)) corrupt('ambiguous hauling');
    const migrated: LegacyGameStateV6 = {
      ...legacy,
      version: 6,
      haulLesson: null,
      critters: legacy.critters.map((critter) => ({
        ...critter,
        hauling: { enabled: false, phase: 'idle', cued: false },
      })),
    };
    return readSave(migrated);
  }
  if (root['version'] === 6) {
    validateState(value, 6);
    if (root['plots'] !== undefined || root['companionIndoors'] !== undefined)
      corrupt('ambiguous plots');
    const { crop, ...legacy } = structuredClone(value as LegacyGameStateV6);
    // The former feed garden becomes prepared bed 1; its promised growth is kept.
    const plots = initialPlots();
    plots[0].tilled = true;
    if (crop.plantedAt !== null) {
      const growth = CROPS.feed.growthMinutes;
      plots[0].crop = {
        speciesId: 'feed',
        plantedAt: crop.plantedAt,
        growthMinutes:
          crop.watered && crop.readyAt !== null
            ? Math.max(0, Math.min(growth, growth - (crop.readyAt - legacy.totalMinutes)))
            : 0,
        withered: false,
      };
      if (crop.watered)
        plots[0].moistUntil = Math.max(nextDawn(legacy.totalMinutes), crop.readyAt ?? 0);
    }
    const migrated: LegacyGameStateV7 = {
      ...legacy,
      version: 7,
      player: { ...legacy.player, skills: { farming: 1, ...legacy.player.skills } },
      plots,
      companionIndoors: false,
      containers: legacy.containers.map((container) =>
        container.allowed.length === LEGACY_ITEM_IDS.length &&
        LEGACY_ITEM_IDS.every((item) => container.allowed.includes(item))
          ? { ...container, allowed: [...ITEM_IDS] }
          : container,
      ),
    };
    return readSave(migrated);
  }
  if (root['version'] === 7) {
    validateState(value, 7);
    const legacy = structuredClone(value as LegacyGameStateV7);
    if (legacy.critters.some((critter) => 'drills' in critter)) corrupt('ambiguous drills');
    // No sessions are known before v8, so today's first session of each drill gives full gains.
    const migrated: LegacyGameStateV8 = {
      ...legacy,
      version: 8,
      critters: legacy.critters.map((critter) => ({
        ...critter,
        drills: { day: legacy.day, sessions: {} },
      })),
    };
    return readSave(migrated);
  }
  if (root['version'] === 8) {
    validateState(value, 8);
    const legacy = structuredClone(value as LegacyGameStateV8);
    // Every earlier companion was the provisional Brindlekin starter; it is now Canine (D40),
    // keeping Brindlekin for Pip. Identity, name, stats and history are untouched.
    const migrated: LegacyGameStateV9 = {
      ...legacy,
      version: 9,
      critters: legacy.critters.map((critter) => ({
        ...critter,
        speciesId: critter.speciesId === 'brindlekin' ? 'canine' : critter.speciesId,
        visualTraits: { ...critter.visualTraits, size: 1 },
      })),
    };
    return readSave(migrated);
  }
  if (root['version'] === 9) {
    validateState(value, 9);
    const legacy = structuredClone(value as LegacyGameStateV9);
    if (legacy.critters.some((critter) => critter.id === PIP_ID)) corrupt('ambiguous Pip');
    // v10 adds Oakhaven as a place to be, and Grandpa's Pip (with an empty satchel) to every
    // household. A legacy companion named Pip keeps its own identity and owner.
    const [satchel] = initialContainers(legacy.player.id, PIP_ID, [], [PIP_ID]).filter(
      (container) => container.kind === 'satchel',
    );
    // Pip as v10 knew him, before critters remembered their practice.
    const pip: LegacyCritterV10 & Partial<Critter> = createPip(legacy.day);
    delete pip.practised;
    const migrated: LegacyGameStateV10 = {
      ...legacy,
      version: 10,
      critters: [...legacy.critters, pip],
      containers: [...legacy.containers, satchel],
    };
    return readSave(migrated);
  }
  if (root['version'] === 10) {
    validateState(value, 10);
    const legacy = structuredClone(value as LegacyGameStateV10);
    if (legacy.critters.some((critter) => 'practised' in critter)) corrupt('ambiguous practice');
    // v11 remembers which drills each critter has played together, to unlock its routines.
    // Lifts, pacing and log tosses were counted as skills; hoops leave only the household's
    // 'trained' flag, which belongs to the companion of the day.
    const migrated: GameState = {
      ...legacy,
      version: 11,
      critters: legacy.critters.map((critter) => {
        const count = (skill: string) => critter.skills[skill] ?? 0;
        const practised: Critter['practised'] = {};
        if (legacy.flags.includes('trained') && critter.id === legacy.activeCritterId)
          practised.hoops = 1;
        if (count('lifting')) practised.lift = count('lifting');
        if (count('pacing')) practised.pace = count('pacing');
        if (count('tossing')) practised.toss = count('tossing');
        return critter.ownerId === legacy.player.id
          ? { ...critter, practised }
          : { ...critter, practised: {} };
      }),
    };
    validateSave(migrated);
    return migrated;
  }
  validateSave(value);
  return structuredClone(value);
}

// Versioned differences; frozen legacy fixtures must not depend on new-game defaults.
type LegacyCritter = Omit<LegacyCritterV8, 'learnedBehaviors' | 'hauling'> & {
  berryKnowledge: number;
};
interface LegacyCrop {
  id: string;
  plantedAt: number | null;
  watered: boolean;
  readyAt: number | null;
}
type LegacyCritterV10 = Omit<Critter, 'practised'>;
type LegacyGameStateV10 = Omit<GameState, 'version' | 'critters'> & {
  version: 10;
  critters: LegacyCritterV10[];
};
type LegacyGameStateV9 = Omit<LegacyGameStateV10, 'version'> & { version: 9 };
type LegacyCritterV8 = Omit<Critter, 'visualTraits'> & {
  visualTraits: { coat: string; accent: string };
};
type LegacyGameStateV8 = Omit<LegacyGameStateV9, 'version' | 'critters'> & {
  version: 8;
  critters: LegacyCritterV8[];
};
type LegacyGameStateV7 = Omit<LegacyGameStateV8, 'version' | 'critters'> & {
  version: 7;
  critters: Omit<LegacyCritterV8, 'drills'>[];
};
type LegacyGameStateV6 = Omit<LegacyGameStateV7, 'version' | 'plots' | 'companionIndoors'> & {
  version: 6;
  crop: LegacyCrop;
};
type LegacyGameStateV5 = Omit<LegacyGameStateV6, 'version' | 'critters' | 'haulLesson'> & {
  version: 5;
  critters: Omit<LegacyCritterV8, 'hauling'>[];
};
type LegacyGameStateV4 = Omit<LegacyGameStateV5, 'version' | 'containers' | 'production'> & {
  version: 4;
  inventory: GameState['containers'][number]['items'];
};
type LegacyGameStateV3 = Omit<
  LegacyGameStateV4,
  'version' | 'player' | 'materialNodes' | 'groundCargo' | 'work'
> & {
  version: 3;
  player: Omit<GameState['player'], 'stats' | 'skills'>;
};
type LegacyGameStateV2 = Omit<LegacyGameStateV3, 'version' | 'critters'> & {
  version: 2;
  critters: LegacyCritter[];
};
type LegacyGameStateV1 = Omit<
  LegacyGameStateV3,
  'version' | 'critters' | 'activeCritterId' | 'training'
> & {
  version: 1;
  critter: Omit<LegacyCritter, 'ownerId' | 'lastPettedDay'>;
  training: Omit<Training, 'critterId'> | null;
};

/** Writes accept only the current schema. Older records must pass readSave first. */
export function validateSave(value: unknown): asserts value is GameState {
  validateState(value, 11);
}

type SaveVersion = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
function validateState(value: unknown, version: SaveVersion): void {
  const root = record(value, 'save');
  if (root['version'] !== version) {
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
  area(root['areaId'], version);
  string(root['areaInstanceId'], 'areaInstanceId');

  const player = record(root['player'], 'player');
  string(player['id'], 'player.id');
  point(player['position']);
  number(player['stamina'], 'player.stamina', 0, 100);
  number(player['coins'], 'player.coins');
  if (version >= 4) {
    const stats = record(player['stats'], 'player.stats');
    for (const key of ['strength', 'endurance', 'speed', 'intelligence'])
      number(stats[key], `player.stats.${key}`, 1, 999);
    const skills = record(player['skills'], 'player.skills');
    for (const key of ['woodcutting', 'mining', 'hauling', 'foraging'])
      number(skills[key], `player.skills.${key}`, 0, 99);
    for (const [key, value] of Object.entries(skills)) number(value, `player.skills.${key}`, 0, 99);
  }

  const ids = new Set<string>([player['id'] as string]);
  const individuals = version === 1 ? [root['critter']] : array(root['critters'], 'critters');
  for (const individual of individuals) {
    const critter = record(individual, 'critter');
    validateCritter(critter, version);
    entityId(critter['id'], ids);
    if (version >= 2) {
      string(critter['ownerId'], 'critter.ownerId');
      if (version >= 10 && ![player['id'], GRANDPA.id].includes(critter['ownerId'] as string))
        corrupt('critter.ownerId');
      if (critter['lastPettedDay'] !== null)
        number(critter['lastPettedDay'], 'critter.lastPettedDay', 1, root['day'] as number, true);
    }
  }
  if (version >= 2) {
    string(root['activeCritterId'], 'activeCritterId');
    const selected = individuals.find(
      (item) => record(item, 'critter')['id'] === root['activeCritterId'],
    ) as Record<string, unknown> | undefined;
    if (!selected || selected['ownerId'] !== player['id']) corrupt('activeCritterId');
    if (
      version >= 10 &&
      !individuals.some((item) => {
        const critter = record(item, 'critter');
        return critter['id'] === PIP_ID && critter['ownerId'] === GRANDPA.id;
      })
    )
      corrupt('household');
    if (root['critter'] !== undefined) corrupt('obsolete critter field');
  }
  if (version < 5)
    for (const value of array(root['inventory'], 'inventory')) {
      const item = record(value, 'inventory item');
      entityId(item['id'], ids);
      choice(
        item['itemId'],
        version >= 4
          ? ['berry', 'feed', 'seed', 'timber', 'stone', 'lumber']
          : ['berry', 'feed', 'seed'],
        'inventory.itemId',
      );
      number(item['quantity'], 'inventory.quantity', 0, Number.MAX_SAFE_INTEGER, true);
      number(item['quality'], 'inventory.quality', 1, 3);
    }
  if (version >= 5) {
    if (root['inventory'] !== undefined) corrupt('obsolete inventory');
    const containers = array(root['containers'], 'containers');
    const expected = initialContainers(
      player['id'] as string,
      root['activeCritterId'] as string,
      [],
      individuals.map((item) => record(item, 'critter')['id'] as string),
      version >= 7 ? ITEM_IDS : LEGACY_ITEM_IDS,
    );
    if (containers.length !== expected.length) corrupt('container count');
    for (const value of containers) {
      const container = record(value, 'container');
      entityId(container['id'], ids);
      const authored = expected.find((item) => item.id === container['id']);
      if (
        !authored ||
        container['kind'] !== authored.kind ||
        container['capacity'] !== authored.capacity ||
        array(container['allowed'], 'container.allowed').length !== authored.allowed.length ||
        !authored.allowed.every((item) => (container['allowed'] as string[]).includes(item))
      )
        corrupt('container definition');
      const location = record(container['location'], 'container.location');
      if ('actorId' in authored.location) {
        if (
          location['actorId'] !== authored.location.actorId ||
          location['position'] !== undefined ||
          location['areaId'] !== undefined
        )
          corrupt('container owner');
      } else {
        const at = record(location['position'], 'container.position');
        if (
          location['actorId'] !== undefined ||
          location['areaId'] !== authored.location.areaId ||
          at['x'] !== authored.location.position.x ||
          at['z'] !== authored.location.position.z
        )
          corrupt('container position');
      }
      let count = 0;
      for (const entry of array(container['items'], 'container.items')) {
        const item = record(entry, 'container.item');
        entityId(item['id'], ids);
        choice(item['itemId'], authored.allowed, 'container.itemId');
        number(item['quantity'], 'inventory.quantity', 0, Number.MAX_SAFE_INTEGER, true);
        number(item['quality'], 'inventory.quality', 1, 3);
        count += item['quantity'] as number;
      }
      if (authored.capacity !== null && count > authored.capacity) corrupt('container capacity');
    }
    number(
      record(root['production'], 'production')['progressMinutes'],
      'production.progress',
      0,
      MILL_MINUTES,
    );
    if ((record(root['production'], 'production')['progressMinutes'] as number) >= MILL_MINUTES)
      corrupt('production.progress');
    if (version >= 6 && root['haulLesson'] !== null) {
      const lesson = record(root['haulLesson'], 'haulLesson');
      if (lesson['critterId'] !== root['activeCritterId']) corrupt('haulLesson.critterId');
      const bag = containers
        .map((item) => record(item, 'container'))
        .find((item) => item['kind'] === 'backpack')!;
      const lumber = array(bag['items'], 'items')
        .map((item) => record(item, 'item'))
        .filter((item) => item['itemId'] === 'lumber')
        .reduce((sum, item) => sum + (item['quantity'] as number), 0);
      number(lesson['lumber'], 'haulLesson.lumber', 1, lumber, true);
    }
    if (version >= 6)
      for (const individual of individuals) {
        const critter = record(individual, 'critter');
        const job = record(critter['hauling'], 'hauling');
        if (job['phase'] === 'deliver') {
          const bag = containers
            .map((item) => record(item, 'container'))
            .find(
              (item) =>
                item['kind'] === 'satchel' &&
                record(item['location'], 'location')['actorId'] === critter['id'],
            )!;
          if (
            !array(bag['items'], 'items').some((item) => {
              const stack = record(item, 'item');
              return stack['itemId'] === 'lumber' && (stack['quantity'] as number) > 0;
            })
          )
            corrupt('hauling cargo');
        }
      }
  }
  if (version >= 4) {
    const nodes = array(root['materialNodes'], 'materialNodes');
    for (const value of nodes) {
      const node = record(value, 'materialNode');
      entityId(node['id'], ids);
      area(node['areaId'], version);
      point(node['position']);
      choice(node['kind'], ['timber', 'stone'], 'materialNode.kind');
      number(node['remaining'], 'materialNode.remaining', 0, 6, true);
      number(node['respawnAt'], 'materialNode.respawnAt');
    }
    for (const value of array(root['groundCargo'], 'groundCargo')) {
      const pile = record(value, 'groundCargo');
      entityId(pile['id'], ids);
      area(pile['areaId'], version);
      point(pile['position']);
      for (const entry of array(pile['items'], 'groundCargo.items')) {
        const item = record(entry, 'groundCargo.item');
        entityId(item['id'], ids);
        choice(item['itemId'], ['timber', 'stone', 'lumber'], 'groundCargo.itemId');
        number(item['quantity'], 'groundCargo.quantity', 1, Number.MAX_SAFE_INTEGER, true);
        number(item['quality'], 'groundCargo.quality', 1, 3);
      }
    }
    if (root['work'] !== null) {
      const work = record(root['work'], 'work');
      const target = nodes
        .map((node) => record(node, 'node'))
        .find((node) => node['id'] === work['nodeId']);
      if (
        !target ||
        target['areaId'] !== root['areaId'] ||
        (target['remaining'] as number) <= 0 ||
        root['training'] !== null
      )
        corrupt('work target');
      const result = record(work['result'], 'work.result');
      number(result['degree'], 'work.degree', -1, 1);
      number(result['durationSeconds'], 'work.duration', 0.8, 4);
      number(work['remainingSeconds'], 'work.remaining', 0, result['durationSeconds'] as number);
      number(result['damage'], 'work.damage', 1, 3, true);
      number(result['staminaCost'], 'work.stamina', 2, 10);
      number(result['timeMinutes'], 'work.time', 2, 13);
      number(result['skillXpGained'], 'work.skillXp', 0, 0.35);
      for (const [key, amount] of Object.entries(record(result['statXpGained'], 'work.statXp'))) {
        choice(key, ['strength', 'endurance', 'speed', 'intelligence'], 'work.stat');
        number(amount, 'work.statXp', 0, 0.035);
      }
    }
  }
  for (const value of array(root['resources'], 'resources')) {
    const node = record(value, 'resource');
    entityId(node['id'], ids);
    area(node['areaId'], version);
    point(node['position']);
    boolean(node['available'], 'resource.available');
    number(node['respawnAt'], 'resource.respawnAt');
  }
  if (version < 7) {
    const crop = record(root['crop'], 'crop');
    entityId(crop['id'], ids);
    for (const key of ['plantedAt', 'readyAt'])
      if (crop[key] !== null) number(crop[key], `crop.${key}`);
    boolean(crop['watered'], 'crop.watered');
  } else {
    if (root['crop'] !== undefined) corrupt('obsolete crop');
    validatePlots(root, ids);
  }
  number(root['shedLevel'], 'shedLevel', 0, Number.MAX_SAFE_INTEGER, true);
  strings(root['flags'], 'flags');
  strings(root['journal'], 'journal');
  if (root['training'] !== null) {
    const training = record(root['training'], 'training');
    if (version >= 2 && training['critterId'] !== root['activeCritterId'])
      corrupt('training.critterId');
    number(training['phase'], 'training.phase', 0, 1);
    number(training['elapsed'], 'training.elapsed');
    if (training['lastHitAt'] !== undefined) number(training['lastHitAt'], 'training.lastHitAt');
    choice(
      training['kind'],
      version >= 11
        ? [
            'training',
            'race',
            'lift',
            'pace',
            'toss',
            'beam',
            'run',
            'rhythm',
            'chess',
            'exhibition',
            'routine',
          ]
        : version >= 10
          ? ['training', 'race', 'lift', 'pace', 'toss', 'exhibition']
          : version >= 8
            ? ['training', 'race', 'lift', 'pace', 'exhibition']
            : ['training', 'race'],
      'training.kind',
    );
    for (const key of ['meter', 'progress', 'reserve'])
      if (training[key] !== undefined) number(training[key], `training.${key}`, 0, 1);
    if (training['stage'] !== undefined)
      choice(
        String(training['stage']),
        training['kind'] === 'run' ? ['0', '1', '2'] : ['0', '1'],
        'training.stage',
      );
    if (training['rise'] !== undefined) number(training['rise'], 'training.rise', -100, 100);
    if (training['seed'] !== undefined) number(training['seed'], 'training.seed', 0, 1);
    if (
      (training['kind'] === 'beam' || training['kind'] === 'run') &&
      [training['meter'], training['progress'], training['seed']].includes(undefined)
    )
      corrupt('training course');
    if (
      (training['kind'] === 'rhythm' || training['kind'] === 'chess') &&
      [training['reserve'], training['seed']].includes(undefined)
    )
      corrupt('training sitting');
    if (training['scores'] !== undefined)
      for (const score of array(training['scores'], 'training.scores'))
        number(score, 'training.score', 0, 1);
    if (training['assist'] !== undefined) boolean(training['assist'], 'training.assist');
    if (training['chargeStart'] !== undefined)
      number(training['chargeStart'], 'training.chargeStart');
    if (
      version >= 8 &&
      (training['kind'] === 'lift' || training['kind'] === 'pace') &&
      (training['meter'] === undefined || training['progress'] === undefined)
    )
      corrupt('training gauge');
    if (training['kind'] === 'toss' && training['meter'] === undefined) corrupt('training toss');
    if (training['kind'] === 'routine') {
      choice(training['drill'], DRILL_IDS, 'training.drill');
      if (array(training['scores'], 'training.scores').length !== 1) corrupt('routine score');
    } else if (training['drill'] !== undefined) corrupt('training.drill');
    const hits = array(training['hits'], 'training.hits');
    for (const hit of hits) number(hit, 'training.hit', 0, 1);
    // A run, a song or a sitting keeps one result per hurdle, note or moment; other
    // activities at most two in play.
    const seed = training['seed'] as number;
    const sequences: Record<string, (seed: number) => unknown[]> = {
      run: runCourse,
      rhythm: rhythmSong,
      chess: chessMoments,
    };
    const sequence = sequences[training['kind'] as string];
    const hitLimit = sequence ? sequence(seed).length : 2;
    if (
      version >= 2 &&
      (hits.length > hitLimit ||
        ((training['lastHitAt'] as number) ?? 0) > (training['elapsed'] as number))
    )
      corrupt('training progress');
  }
}

function validatePlots(root: Record<string, unknown>, ids: Set<string>): void {
  boolean(root['companionIndoors'], 'companionIndoors');
  if (root['companionIndoors'] && root['areaId'] !== 'cottage') corrupt('companionIndoors');
  const plots = array(root['plots'], 'plots');
  const authored = initialPlots();
  if (plots.length !== authored.length) corrupt('plot count');
  for (const value of plots) {
    const plot = record(value, 'plot');
    entityId(plot['id'], ids);
    const layout = authored.find((item) => item.id === plot['id']);
    const at = record(plot['position'], 'plot.position');
    if (!layout || at['x'] !== layout.position.x || at['z'] !== layout.position.z)
      corrupt('plot position');
    boolean(plot['tilled'], 'plot.tilled');
    number(plot['moistUntil'], 'plot.moistUntil');
    if (plot['crop'] === null) continue;
    if (!plot['tilled']) corrupt('plot crop');
    const crop = record(plot['crop'], 'plot.crop');
    choice(crop['speciesId'], Object.keys(CROPS), 'plot.crop.speciesId');
    number(crop['plantedAt'], 'plot.crop.plantedAt', 0, root['totalMinutes'] as number);
    number(
      crop['growthMinutes'],
      'plot.crop.growthMinutes',
      0,
      CROPS[crop['speciesId'] as keyof typeof CROPS].growthMinutes,
    );
    boolean(crop['withered'], 'plot.crop.withered');
  }
}

function validateCritter(critter: Record<string, unknown>, version: SaveVersion): void {
  for (const key of ['id', 'name', 'speciesId', 'personality'])
    string(critter[key], `critter.${key}`);
  choice(critter['sex'], ['female', 'male'], 'critter.sex');
  point(critter['position']);
  number(critter['ageDays'], 'critter.ageDays');
  if (version < 3) {
    number(critter['berryKnowledge'], 'critter.berryKnowledge');
    if (critter['learnedBehaviors'] !== undefined) corrupt('ambiguous learnedBehaviors');
  } else {
    if (critter['berryKnowledge'] !== undefined) corrupt('obsolete berryKnowledge');
    const learned = record(critter['learnedBehaviors'], 'critter.learnedBehaviors');
    for (const [id, progress] of Object.entries(learned)) {
      if (!Object.hasOwn(BEHAVIORS, id) || (version < 6 && id !== 'sunberry-foraging'))
        corrupt('unknown learned behavior');
      number(progress, `critter.learnedBehaviors.${id}`);
    }
  }
  if (version >= 6) {
    const job = record(critter['hauling'], 'hauling');
    boolean(job['enabled'], 'hauling.enabled');
    boolean(job['cued'], 'hauling.cued');
    choice(job['phase'], ['idle', 'collect', 'deliver', 'eat', 'rest'], 'hauling.phase');
    const progress =
      (record(critter['learnedBehaviors'], 'learnedBehaviors')['lumber-hauling'] as number) ?? 0;
    if (job['enabled'] && progress < 6) corrupt('hauling assignment');
    if (job['cued'] && progress < 2) corrupt('hauling cue');
    if (job['phase'] !== 'idle' && !job['enabled'] && !job['cued']) corrupt('hauling phase');
  }
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
  if (version >= 9) {
    number(traits['size'], 'critter.visualTraits.size', 0.5, 2);
    if (!CRITTER_KINDS.includes(critter['speciesId'] as string)) corrupt('critter.speciesId');
  } else if (traits['size'] !== undefined) corrupt('ambiguous visualTraits.size');
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
    if (result['event'] !== undefined && (version < 8 || result['event'] !== 'exhibition'))
      corrupt('competition.event');
  }
  if (version >= 8) {
    const drills = record(critter['drills'], 'critter.drills');
    number(drills['day'], 'drills.day', 1, Number.MAX_SAFE_INTEGER, true);
    for (const [drill, count] of Object.entries(record(drills['sessions'], 'drills.sessions'))) {
      // v10 saves widen with the drill table (plan 004); earlier saves knew three drills.
      choice(drill, version >= 10 ? DRILL_IDS : ['hoops', 'lift', 'pace'], 'drills.drill');
      number(count, 'drills.count', 0, 10000, true);
    }
  }
  if (version >= 11)
    for (const [drill, count] of Object.entries(
      record(critter['practised'], 'critter.practised'),
    )) {
      choice(drill, DRILL_IDS, 'practised.drill');
      number(count, 'practised.count', 1, Number.MAX_SAFE_INTEGER, true);
    }
  else if ('practised' in critter) corrupt('critter.practised');
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
function area(value: unknown, version: SaveVersion): void {
  choice(
    value,
    version >= 10
      ? ['homestead', 'glade', 'cottage', 'colosseum', 'town']
      : version >= 8
        ? ['homestead', 'glade', 'cottage', 'colosseum']
        : version >= 7
          ? ['homestead', 'glade', 'cottage']
          : ['homestead', 'glade'],
    'areaId',
  );
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
