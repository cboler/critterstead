import { ExhibitionId, GameState } from './model';
import { CRITTER_KINDS } from './families';
import { GRANDPA, PIP_ID } from './household';
import {
  BEHAVIORS,
  CROPS,
  DRILL_IDS,
  EXHIBITION_IDS,
  EXHIBITIONS,
  initialPlots,
  legKind,
} from './content';
import { AREAS } from './content';
import { chessMoments, rhythmSong, runCourse } from './drills';
import { ATHLETIC_RANKS, cupLegs, promotionLegs, RANKS } from './ladder';
import { initialContainers, ITEM_IDS, MILL_MINUTES } from './logistics';

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

  /** The stored record as it is, even one that fails validation, so it can be backed up. */
  async loadRaw(): Promise<unknown> {
    await this.writes;
    const database = await this.open();
    return new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction(storeName, 'readonly')
        .objectStore(storeName)
        .get(saveKey);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error('Could not read your homestead.'));
    });
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

/** Saves from builds before this version are retired, not migrated (D55). */
export const SAVE_VERSION = 14;

/** Decode without writing: a failed validation leaves the stored record intact. */
export function readSave(value: unknown): GameState {
  const version = record(value, 'save')['version'];
  if (typeof version === 'number' && Number.isInteger(version) && version < SAVE_VERSION)
    throw new Error(
      `This homestead comes from an earlier build of Critterstead (save v${version}), before the world was redrawn, and cannot be carried forward.`,
    );
  validateSave(value);
  return structuredClone(value);
}

/** A backup file's text: the stored record as JSON, readable in any browser. */
export function encodeSave(value: unknown): string {
  return JSON.stringify(value);
}

/** Reads a backup file's text back into a game, with the same checks as a stored save. */
export function decodeSave(text: string): GameState {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch {
    throw new Error('That file is not a Critterstead backup.');
  }
  return readSave(value);
}

/** Writes accept only the current schema. Older records must pass readSave first. */
export function validateSave(value: unknown): asserts value is GameState {
  const root = record(value, 'save');
  if (root['version'] !== SAVE_VERSION) {
    throw new Error(
      `Unsupported save version ${String(root['version'])}. Your existing homestead has been kept.`,
    );
  }
  ensureFiniteTree(value);
  number(root['seed'], 'seed', 0, 4294967295, true);
  number(root['origin'], 'origin', 0, 4294967295, true);
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
  const stats = record(player['stats'], 'player.stats');
  for (const key of ['strength', 'endurance', 'speed', 'intelligence'])
    number(stats[key], `player.stats.${key}`, 1, 999);
  const skills = record(player['skills'], 'player.skills');
  for (const key of ['woodcutting', 'mining', 'hauling', 'foraging'])
    number(skills[key], `player.skills.${key}`, 0, 99);
  for (const [key, value] of Object.entries(skills)) number(value, `player.skills.${key}`, 0, 99);

  const ids = new Set<string>([player['id'] as string]);
  const individuals = array(root['critters'], 'critters');
  for (const individual of individuals) {
    const critter = record(individual, 'critter');
    validateCritter(critter);
    entityId(critter['id'], ids);
    string(critter['ownerId'], 'critter.ownerId');
    if (![player['id'], GRANDPA.id].includes(critter['ownerId'] as string))
      corrupt('critter.ownerId');
    if (critter['lastPettedDay'] !== null)
      number(critter['lastPettedDay'], 'critter.lastPettedDay', 1, root['day'] as number, true);
  }
  string(root['activeCritterId'], 'activeCritterId');
  const selected = individuals.find(
    (item) => record(item, 'critter')['id'] === root['activeCritterId'],
  ) as Record<string, unknown> | undefined;
  if (!selected || selected['ownerId'] !== player['id']) corrupt('activeCritterId');
  if (
    !individuals.some((item) => {
      const critter = record(item, 'critter');
      return critter['id'] === PIP_ID && critter['ownerId'] === GRANDPA.id;
    })
  )
    corrupt('household');
  {
    const containers = array(root['containers'], 'containers');
    const expected = initialContainers(
      player['id'] as string,
      root['activeCritterId'] as string,
      [],
      individuals.map((item) => record(item, 'critter')['id'] as string),
      ITEM_IDS,
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
    if (root['haulLesson'] !== null) {
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
  {
    const nodes = array(root['materialNodes'], 'materialNodes');
    for (const value of nodes) {
      const node = record(value, 'materialNode');
      entityId(node['id'], ids);
      area(node['areaId']);
      point(node['position']);
      choice(node['kind'], ['timber', 'stone'], 'materialNode.kind');
      number(node['remaining'], 'materialNode.remaining', 0, 6, true);
      number(node['respawnAt'], 'materialNode.respawnAt');
    }
    for (const value of array(root['groundCargo'], 'groundCargo')) {
      const pile = record(value, 'groundCargo');
      entityId(pile['id'], ids);
      area(pile['areaId']);
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
    area(node['areaId']);
    point(node['position']);
    boolean(node['available'], 'resource.available');
    number(node['respawnAt'], 'resource.respawnAt');
  }
  validatePlots(root, ids);
  number(root['shedLevel'], 'shedLevel', 0, Number.MAX_SAFE_INTEGER, true);
  strings(root['flags'], 'flags');
  strings(root['journal'], 'journal');
  if (root['training'] !== null) {
    const training = record(root['training'], 'training');
    if (training['critterId'] !== root['activeCritterId']) corrupt('training.critterId');
    number(training['phase'], 'training.phase', 0, 1);
    number(training['elapsed'], 'training.elapsed');
    if (training['lastHitAt'] !== undefined) number(training['lastHitAt'], 'training.lastHitAt');
    choice(
      training['kind'],
      ['training', 'race', 'lift', 'pace', 'toss', 'beam', 'run', 'rhythm', 'chess', 'routine'],
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
      (training['kind'] === 'lift' || training['kind'] === 'pace') &&
      (training['meter'] === undefined || training['progress'] === undefined)
    )
      corrupt('training gauge');
    if (training['kind'] === 'toss' && training['meter'] === undefined) corrupt('training toss');
    if (['event', 'leg', 'hard'].some((key) => training[key] !== undefined)) {
      // A Colosseum event's current leg: its drill, on harder settings, after the legs scored.
      // Ranked cups' days chose their legs.
      choice(training['event'], [...EXHIBITION_IDS, 'cup', 'promotion'], 'training.event');
      const cup = training['event'] === 'cup' || training['event'] === 'promotion';
      if (cup) number(training['cupDay'], 'training.cupDay', 1, Number.MAX_SAFE_INTEGER, true);
      else if (training['cupDay'] !== undefined) corrupt('training.cupDay');
      const legs =
        training['event'] === 'promotion'
          ? promotionLegs(training['cupDay'] as number)
          : cup
            ? cupLegs(training['cupDay'] as number)
            : EXHIBITIONS[training['event'] as ExhibitionId].legs;
      number(training['leg'], 'training.leg', 0, legs.length - 1, true);
      const leg = training['leg'] as number;
      if (training['hard'] !== true) corrupt('training.hard');
      if (training['kind'] !== legKind(legs[leg].drill)) corrupt('training leg');
      if (array(training['scores'], 'training.scores').length !== leg) corrupt('training legs');
    }
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
      hits.length > hitLimit ||
      ((training['lastHitAt'] as number) ?? 0) > (training['elapsed'] as number)
    )
      corrupt('training progress');
  }
}

function validatePlots(root: Record<string, unknown>, ids: Set<string>): void {
  boolean(root['companionIndoors'], 'companionIndoors');
  const gemothy = record(root['gemothy'], 'gemothy');
  number(gemothy['trust'], 'gemothy.trust', 0, 1000, true);
  number(gemothy['visitedDay'], 'gemothy.visitedDay', 0, root['day'] as number, true);
  number(gemothy['findDay'], 'gemothy.findDay', 0, root['day'] as number, true);
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

function validateCritter(critter: Record<string, unknown>): void {
  for (const key of ['id', 'name', 'speciesId', 'personality'])
    string(critter[key], `critter.${key}`);
  choice(critter['sex'], ['female', 'male'], 'critter.sex');
  point(critter['position']);
  number(critter['ageDays'], 'critter.ageDays');
  const learned = record(critter['learnedBehaviors'], 'critter.learnedBehaviors');
  for (const [id, progress] of Object.entries(learned)) {
    if (!Object.hasOwn(BEHAVIORS, id)) corrupt('unknown learned behavior');
    number(progress, `critter.learnedBehaviors.${id}`);
  }
  {
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
  number(traits['size'], 'critter.visualTraits.size', 0.5, 2);
  if (!CRITTER_KINDS.includes(critter['speciesId'] as string)) corrupt('critter.speciesId');
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
    // Ranked cups also keep their placing, the size of the field and the rank run at.
    if (result['event'] !== undefined)
      choice(result['event'], [...EXHIBITION_IDS, 'cup', 'promotion'], 'competition.event');
    if (result['event'] === 'cup' || result['event'] === 'promotion') {
      number(result['field'], 'competition.field', 1, 100, true);
      number(result['placing'], 'competition.placing', 1, result['field'] as number, true);
      number(result['rank'], 'competition.rank', 0, ATHLETIC_RANKS - 1, true);
    } else if (['placing', 'field', 'rank'].some((key) => result[key] !== undefined))
      corrupt('competition.placing');
  }
  const ladder = record(critter['ladder'], 'critter.ladder');
  number(ladder['rank'], 'ladder.rank', 0, RANKS.length - 1, true);
  number(ladder['points'], 'ladder.points', 0, 10000, true);
  {
    const drills = record(critter['drills'], 'critter.drills');
    number(drills['day'], 'drills.day', 1, Number.MAX_SAFE_INTEGER, true);
    for (const [drill, count] of Object.entries(record(drills['sessions'], 'drills.sessions'))) {
      choice(drill, DRILL_IDS, 'drills.drill');
      number(count, 'drills.count', 0, 10000, true);
    }
  }
  for (const [drill, count] of Object.entries(record(critter['practised'], 'critter.practised'))) {
    choice(drill, DRILL_IDS, 'practised.drill');
    number(count, 'practised.count', 1, Number.MAX_SAFE_INTEGER, true);
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
  choice(value, Object.keys(AREAS), 'areaId');
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
