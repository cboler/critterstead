import { backpack } from './model';
import { createInitialState, LocalGameHost } from './host';
import { decodeSave, encodeSave, readSave, validateSave } from './storage';
import { desk, perform } from './fixtures/play';
import { activeCritter } from './model';

describe('versioned homestead save validation', () => {
  it('accepts the initial state and an ordinary day transition', () => {
    const host = new LocalGameHost();
    expect(() => validateSave(host.state)).not.toThrow();
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('retires saves from earlier builds without touching them (D55)', () => {
    const value = { ...createInitialState(), version: 13 };
    const before = structuredClone(value);
    expect(() => readSave(value)).toThrow(/earlier build of Critterstead \(save v13\)/);
    expect(value).toEqual(before);
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

describe('individual references', () => {
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
});

describe('learning data', () => {
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
  });
});

describe('backup files', () => {
  it('carry a played homestead, mid-event and after it, through JSON intact', () => {
    const host = desk(3, 'ladder');
    expect(host.dispatch({ type: 'interact', targetId: 'ladder', action: 'cup' })).toBe(true);
    host.update(0.5);
    const midway = decodeSave(encodeSave(host.state));
    expect(midway).toEqual(host.state);
    perform(host);
    host.dispatch({ type: 'debug', action: 'next-day' });
    const later = decodeSave(encodeSave(host.state));
    expect(later).toEqual(host.state);
    expect(activeCritter(later).competitions.length).toBe(1);
  });

  it('refuse files that are not saves, or saves that fail their checks', () => {
    expect(() => decodeSave('not json')).toThrow(/not a Critterstead backup/);
    expect(() => decodeSave('[]')).toThrow();
    expect(() => decodeSave(encodeSave({ ...createInitialState(), version: 13 }))).toThrow(
      /earlier build/,
    );
  });
});
