import { createInitialState, LocalGameHost } from './host';
import { validateSave } from './storage';

describe('versioned homestead save validation', () => {
  it('accepts the initial state and an ordinary day transition', () => {
    const host = new LocalGameHost();
    expect(() => validateSave(host.state)).not.toThrow();
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('rejects a future schema rather than silently starting over', () => {
    const value = { ...createInitialState(), version: 2 };
    expect(() => validateSave(value)).toThrow(/Unsupported save version 2.*kept/);
  });

  it('rejects a missing nested field before simulation can consume it', () => {
    const value = { ...createInitialState(), critter: { name: 'Pip' } };
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
    value.critter.stamina = -1;
    expect(() => validateSave(value)).toThrow(/critter.stamina/);
    value.critter.stamina = 100;
    value.inventory[0].quantity = 1.5;
    expect(() => validateSave(value)).toThrow(/inventory.quantity/);
  });

  it('rejects duplicate persistent IDs', () => {
    const value = createInitialState();
    value.resources[0].id = value.critter.id;
    expect(() => validateSave(value)).toThrow(/duplicate entity IDs/);
  });

  it('accepts a saved training activity and rejects invalid cue timing', () => {
    const value = createInitialState();
    value.training = { phase: 0.5, hits: [0.8], elapsed: 1.2, kind: 'training' };
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
