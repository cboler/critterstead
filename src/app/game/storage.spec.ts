import { createInitialState, LocalGameHost } from './host';
import { readSave, validateSave } from './storage';
import { activeCritter } from './model';
import { legacyV1 } from './fixtures/legacy-v1';

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
    value.inventory[0].quantity = 1.5;
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
  it('preserves the entire populated legacy save without mutating it or inventing narrative Pip', () => {
    const original = structuredClone(legacyV1);
    const { critter, ...world } = original;
    const migrated = readSave(original);
    expect(migrated).toEqual({
      ...world,
      version: 2,
      critters: [{ ...critter, ownerId: original.player.id, lastPettedDay: original.day }],
      activeCritterId: critter.id,
      training: { ...original.training, critterId: critter.id },
    });
    expect(original).toEqual(legacyV1);
    expect(readSave(migrated)).toEqual(migrated);
    expect(readSave(JSON.parse(JSON.stringify(migrated)))).toEqual(migrated);
    expect(migrated.critters).toHaveLength(1);
    expect(migrated.critters[0]).toMatchObject({ id: 'critter-pip', name: 'Pip', ageDays: 24 });
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
