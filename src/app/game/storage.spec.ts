import { initialContainers } from './logistics';
import { backpack, InventoryItem } from './model';
import { createInitialState, LocalGameHost } from './host';
import { readSave, validateSave } from './storage';
import { activeCritter } from './model';
import { legacyV1 } from './fixtures/legacy-v1';
import { legacyV2 } from './fixtures/legacy-v2';
import { legacyV3 } from './fixtures/legacy-v3';
import { legacyV4 } from './fixtures/legacy-v4';
import { legacyV5 } from './fixtures/legacy-v5';
import { legacyV6 } from './fixtures/legacy-v6';
import { legacyV7 } from './fixtures/legacy-v7';
import { legacyV8 } from './fixtures/legacy-v8';
import { legacyV9 } from './fixtures/legacy-v9';
import { legacyV10 } from './fixtures/legacy-v10';
import { legacyV11 } from './fixtures/legacy-v11';
import { kept } from './fixtures/household';
import { createPip, PIP_ID } from './household';

const pipSatchel = initialContainers('player-local', PIP_ID, [], [PIP_ID])[1];

// Golden v7 garden for the frozen v1 crop: planted 9300, watered, ready 9550, now 9472.
const legacyGarden = [
  {
    id: 'plot-1',
    position: { x: -5, z: 2 },
    tilled: true,
    moistUntil: 10440,
    crop: { speciesId: 'feed', plantedAt: 9300, growthMinutes: 102, withered: false },
  },
  { id: 'plot-2', position: { x: -3.6, z: 2 }, tilled: false, moistUntil: 0, crop: null },
  { id: 'plot-3', position: { x: -5, z: 3.4 }, tilled: false, moistUntil: 0, crop: null },
  { id: 'plot-4', position: { x: -3.6, z: 3.4 }, tilled: false, moistUntil: 0, crop: null },
];

describe('versioned homestead save validation', () => {
  it('accepts the initial state and an ordinary day transition', () => {
    const host = new LocalGameHost();
    expect(() => validateSave(host.state)).not.toThrow();
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('rejects a future schema rather than silently starting over', () => {
    const value = { ...createInitialState(), version: 999 };
    expect(() => validateSave(value)).toThrow(/Unsupported save version 999.*kept/);
  });

  it('rejects a missing nested field before simulation can consume it', () => {
    const value = { ...createInitialState(), critters: [{ name: 'Pip' }] };
    expect(() => validateSave(value)).toThrow(/saved homestead is damaged/);
  });

  it('rejects NaN even in an otherwise unrecognized extension', () => {
    const value = { ...createInitialState(), extension: { score: Number.NaN } };
    expect(() => validateSave(value)).toThrow(/non-finite number/);
  });

  it('rejects cyclic data from a malformed IndexedDB record', () => {
    const value: Record<string, unknown> = { ...createInitialState() };
    value['extension'] = value;
    expect(() => validateSave(value)).toThrow(/cyclic data/);
  });

  it('rejects invalid energy and fractional inventory quantities', () => {
    const value = createInitialState();
    activeCritter(value).stamina = -1;
    expect(() => validateSave(value)).toThrow(/critter.stamina/);
    activeCritter(value).stamina = 100;
    backpack(value).items[0].quantity = 1.5;
    expect(() => validateSave(value)).toThrow(/inventory.quantity/);
  });

  it('rejects duplicate persistent IDs', () => {
    const value = createInitialState();
    value.resources[0].id = activeCritter(value).id;
    expect(() => validateSave(value)).toThrow(/duplicate entity IDs/);
  });

  it('accepts a saved training activity and rejects invalid cue timing', () => {
    const value = createInitialState();
    value.training = {
      critterId: value.activeCritterId,
      phase: 0.5,
      hits: [0.8],
      elapsed: 1.2,
      kind: 'training',
    };
    expect(() => validateSave(value)).not.toThrow();
    value.training.phase = 2;
    expect(() => validateSave(value)).toThrow(/training.phase/);
  });

  it('rejects an impossible calendar', () => {
    const value = createInitialState();
    value.day = 9;
    expect(() => validateSave(value)).toThrow(/calendar/);
  });
});

describe('v1 migration and individual references', () => {
  it('preserves the entire populated legacy save, keeping its own Pip apart from Grandpa’s', () => {
    const original = structuredClone(legacyV1);
    const { critter, inventory, crop, ...world } = original;
    const { berryKnowledge, ...individual } = critter;
    const migrated = readSave(original);
    expect(crop.readyAt).toBe(9550);
    expect(migrated).toEqual({
      ...world,
      version: 12,
      haulLesson: null,
      plots: legacyGarden,
      companionIndoors: false,
      containers: [
        ...initialContainers(original.player.id, critter.id, inventory as InventoryItem[]),
        pipSatchel,
      ],
      production: { progressMinutes: 0 },
      player: {
        ...original.player,
        stats: createInitialState().player.stats,
        skills: createInitialState().player.skills,
      },
      materialNodes: createInitialState().materialNodes,
      groundCargo: [],
      work: null,
      critters: [
        {
          ...individual,
          hauling: { enabled: false, phase: 'idle', cued: false },
          drills: { day: original.day, sessions: {} },
          // The household had trained at the hoops (its flag), so that routine is unlocked.
          practised: { hoops: 1 },
          speciesId: 'canine',
          visualTraits: { ...individual.visualTraits, size: 1 },
          learnedBehaviors: { 'sunberry-foraging': berryKnowledge },
          ownerId: original.player.id,
          lastPettedDay: original.day,
        },
        createPip(original.day),
      ],
      activeCritterId: critter.id,
      training: { ...original.training, critterId: critter.id },
    });
    expect(original).toEqual(legacyV1);
    expect(readSave(migrated)).toEqual(migrated);
    expect(readSave(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    // The legacy companion named Pip stays the player's; Grandpa's Pip is a separate individual.
    expect(migrated.critters).toHaveLength(2);
    expect(migrated.critters[0]).toMatchObject({
      id: 'critter-pip',
      name: 'Pip',
      ageDays: 24,
      ownerId: original.player.id,
    });
    expect(migrated.critters[1]).toMatchObject({ id: PIP_ID, ownerId: 'grandpa' });
  });

  it('preserves the daily care restriction, including saves that have not been petted', () => {
    const petted = readSave({ ...structuredClone(legacyV1), training: null });
    petted.player.position = { ...activeCritter(petted).position };
    const host = new LocalGameHost(petted);
    expect(host.dispatch({ type: 'interact', targetId: 'critter-pip', action: 'pet' })).toBe(false);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(host.dispatch({ type: 'interact', targetId: 'critter-pip', action: 'pet' })).toBe(true);
    const unpetted = readSave({ ...structuredClone(legacyV1), flags: [], training: null });
    expect(activeCritter(unpetted).lastPettedDay).toBeNull();
  });

  it.each(['training', 'race'] as const)(
    'continues migrated %s without charging twice or changing seeded outcomes',
    (kind) => {
      const old = structuredClone(legacyV1);
      old.training.kind = kind;
      const host = new LocalGameHost(readSave(old));
      expect(host.state.training).toMatchObject({
        critterId: old.critter.id,
        hits: [0.9],
        lastHitAt: 0.65,
      });
      for (let cue = 0; cue < 2; cue++) {
        host.update(0.7);
        expect(host.dispatch({ type: 'training-hit' })).toBe(true);
      }
      // Golden outcomes recorded from the unmodified 06aa91e host and this fixture.
      expect(host.critter.stamina).toBe(63);
      expect(host.state.player.stamina).toBe(57);
      expect(host.state.training).toBeNull();
      if (kind === 'training') {
        expect(host.critter.stats).toEqual({
          strength: 6.25,
          endurance: 9.87,
          speed: 9.82,
          intelligence: 12,
        });
        expect(host.state.seed).toBe(777197);
        expect(host.state.player.coins).toBe(42);
      } else {
        expect(host.state.seed).toBe(1892584552);
        expect(host.state.player.coins).toBe(50);
        expect(host.critter.competitions).toEqual([
          { day: 6, time: 21.4, medal: 'silver' },
          { day: 7, time: 16.4, medal: 'gold' },
        ]);
      }
      expect(() => validateSave(host.state)).not.toThrow();
    },
  );

  it('leaves damaged legacy and unknown future inputs unchanged when decoding fails', () => {
    const damaged = structuredClone(legacyV1);
    damaged.critter.stamina = -1;
    for (const input of [damaged, { version: 999, precious: 'keep this' }]) {
      const before = structuredClone(input);
      expect(() => readSave(input)).toThrow(/kept/);
      expect(input).toEqual(before);
    }
  });

  it('rejects missing, duplicate, or non-player companion references', () => {
    const value = createInitialState();
    value.critters.push({
      ...structuredClone(value.critters[0]),
      id: 'grandpa-pip',
      name: 'Pip',
      ownerId: 'grandpa',
    });
    value.containers.push({
      ...structuredClone(value.containers.find((container) => container.kind === 'satchel')!),
      id: 'satchel-grandpa-pip',
      location: { actorId: 'grandpa-pip' },
      items: [],
    });
    expect(() => validateSave(value)).not.toThrow();
    value.activeCritterId = 'missing';
    expect(() => validateSave(value)).toThrow(/activeCritterId/);
    value.activeCritterId = 'grandpa-pip';
    expect(() => validateSave(value)).toThrow(/activeCritterId/);
    value.activeCritterId = value.critters[0].id;
    value.critters[1].id = value.critters[0].id;
    expect(() => validateSave(value)).toThrow(/duplicate entity IDs/);
  });

  it('rejects an activity bound to another individual and invalid per-individual care state', () => {
    const value = readSave(legacyV1);
    value.training!.critterId = 'another-critter';
    expect(() => validateSave(value)).toThrow(/training.critterId/);
    value.training!.critterId = value.activeCritterId;
    activeCritter(value).lastPettedDay = value.day + 1;
    expect(() => validateSave(value)).toThrow(/lastPettedDay/);
  });
});

describe('v2 learning migration and v3 protection', () => {
  it('preserves every individual and world field, including paid activity and seeded state', () => {
    const before = structuredClone(legacyV2);
    const migrated = readSave(before);
    const { inventory, crop, ...oldWorld } = before;
    expect(crop).toEqual(legacyV1.crop);
    expect(migrated).toEqual({
      ...oldWorld,
      version: 12,
      haulLesson: null,
      plots: legacyGarden,
      companionIndoors: false,
      containers: [
        ...initialContainers(
          before.player.id,
          before.activeCritterId,
          inventory as InventoryItem[],
          before.critters.map((critter) => critter.id),
        ),
        pipSatchel,
      ],
      production: { progressMinutes: 0 },
      player: {
        ...before.player,
        stats: createInitialState().player.stats,
        skills: createInitialState().player.skills,
      },
      materialNodes: createInitialState().materialNodes,
      groundCargo: [],
      work: null,
      critters: [
        ...before.critters.map(({ berryKnowledge, ...individual }) => ({
          ...individual,
          hauling: { enabled: false, phase: 'idle', cued: false },
          drills: { day: before.day, sessions: {} },
          // The hoops flag belongs to the companion of the day.
          practised: individual.id === before.activeCritterId ? { hoops: 1 } : {},
          learnedBehaviors: { 'sunberry-foraging': berryKnowledge },
          speciesId: 'canine',
          visualTraits: { ...individual.visualTraits, size: 1 },
        })),
        createPip(before.day),
      ],
    });
    expect(before).toEqual(legacyV2);
    expect(readSave(migrated)).toEqual(migrated);
    expect(readSave(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    expect(() => validateSave(legacyV2)).toThrow(/Unsupported save version 2/);
  });

  it.each([0, 1, 2, 3, 5, 6, 7, 20, 25])(
    'retains legacy progress %s without replaying milestones or rewards',
    (progress) => {
      const old = structuredClone(legacyV2);
      old.critters[1].berryKnowledge = progress;
      const migrated = readSave(old);
      const host = new LocalGameHost(migrated);
      expect(host.learning().progress).toBe(progress);
      expect(host.learning().label).toBe(
        progress >= 7
          ? 'Independent forager'
          : progress >= 3
            ? 'Harvests on cue'
            : progress > 0
              ? 'Learning by watching'
              : 'Curious companion',
      );
      expect(backpack(host.state).items).toEqual(old.inventory);
      expect(host.critter.history).toEqual(old.critters[1].history);
      expect(host.state.journal).toEqual(old.journal);
      expect(host.state.seed).toBe(old.seed);
    },
  );

  it('treats absent authored progress as unlearned and rejects malformed or unknown learning data', () => {
    const fresh = createInitialState();
    expect(new LocalGameHost(readSave(fresh)).learning().progress).toBe(0);
    for (const learned of [
      null,
      [],
      { 'sunberry-foraging': -1 },
      { 'sunberry-foraging': '7' },
      { 'sunberry-foraging': Infinity },
      { 'unknown-job': 7 },
    ]) {
      const invalid = { ...fresh, critters: [{ ...fresh.critters[0], learnedBehaviors: learned }] };
      const before = structuredClone(invalid);
      expect(() => readSave(invalid)).toThrow(/kept/);
      expect(invalid).toEqual(before);
    }
    expect(() =>
      readSave({ ...fresh, critters: [{ ...fresh.critters[0], berryKnowledge: 7 }] }),
    ).toThrow(/obsolete berryKnowledge/);
  });

  it('rejects corrupt or ambiguous v2 learning without mutating the old record', () => {
    for (const fields of [
      { berryKnowledge: -1 },
      { berryKnowledge: undefined },
      { learnedBehaviors: { 'sunberry-foraging': 9 } },
    ]) {
      const invalid = structuredClone(legacyV2);
      Object.assign(invalid.critters[1], fields);
      const before = structuredClone(invalid);
      expect(() => readSave(invalid)).toThrow(/kept/);
      expect(invalid).toEqual(before);
    }
  });
});

// M9 gate: every historical save shape reaches the current schema with nothing lost.
describe('every legacy save version', () => {
  const fixtures = [
    legacyV1,
    legacyV2,
    legacyV3,
    legacyV4,
    legacyV5,
    legacyV6,
    legacyV7,
    legacyV8,
    legacyV9,
    legacyV10,
    legacyV11,
  ];
  it.each(fixtures.map((fixture) => [fixture.version, fixture] as const))(
    'migrates a v%i save to v12 intact, idempotently, and ready to play',
    (_, fixture) => {
      const original = structuredClone(fixture) as Record<string, unknown> & typeof legacyV1;
      const migrated = readSave(structuredClone(fixture));
      expect(migrated.version).toBe(12);
      expect(() => validateSave(migrated)).not.toThrow();
      // Earlier companions were provisional Brindlekin; they are now Canine at ordinary size.
      for (const critter of kept(migrated.critters)) {
        expect(critter.speciesId).toBe('canine');
        expect(critter.visualTraits.size).toBe(1);
      }
      // Grandpa's Pip joins every household, beside any companion of the same name.
      expect(migrated.critters.at(-1)).toEqual(createPip(original.day));
      // The world, economy, clock and history carry over.
      for (const key of ['seed', 'day', 'minute', 'totalMinutes', 'shedLevel'] as const)
        expect(migrated[key], key).toBe(original[key]);
      expect(migrated.player.coins).toBe(original.player.coins);
      expect(migrated.journal.slice(0, original.journal.length)).toEqual(original.journal);
      // Every companion keeps its identity and everything it earned. A v1 save held one
      // companion without an id, so it is recognized by name.
      const companions = (original['critters'] ?? [
        original.critter,
      ]) as (typeof legacyV1.critter & {
        id?: string;
      })[];
      for (const companion of companions) {
        const kept = migrated.critters.find((critter) =>
          companion.id ? critter.id === companion.id : critter.name === companion.name,
        );
        expect(kept, companion.name).toBeDefined();
        expect(kept).toMatchObject({
          name: companion.name,
          ageDays: companion.ageDays,
          stats: companion.stats,
          competitions: companion.competitions,
          history: companion.history,
        });
      }
      if (original['activeCritterId'])
        expect(migrated.activeCritterId).toBe(original['activeCritterId']);
      // A second read changes nothing, and the result plays and saves cleanly.
      expect(readSave(structuredClone(migrated))).toEqual(migrated);
      const host = new LocalGameHost(migrated);
      host.update(1);
      expect(() => validateSave(JSON.parse(JSON.stringify(host.state)))).not.toThrow();
    },
  );
});
