import { backpack } from './model';
import { resolveCheck, encumbrance } from './checks';
import { createInitialState, LocalGameHost } from './host';
import { readSave, validateSave } from './storage';
import { legacyV3 } from './fixtures/legacy-v3';

describe('physical work and rancher capabilities', () => {
  it('resolves deterministic degrees and realizes tool quality through proficiency', () => {
    const actor = createInitialState().player;
    const before = structuredClone(actor);
    const novice = resolveCheck(actor, 'woodcutting', { strength: 1 }, 1, 10);
    expect(resolveCheck(actor, 'woodcutting', { strength: 1 }, 1, 10)).toEqual(novice);
    expect(actor).toEqual(before);
    expect(
      resolveCheck(actor, 'woodcutting', { strength: 1 }, 9, 10).degree - novice.degree,
    ).toBeLessThan(0.1);
    actor.skills['woodcutting'] = 25;
    actor.stats.strength = 20;
    const expert = resolveCheck(actor, 'woodcutting', { strength: 1 }, 9, 10);
    expect(expert.damage).toBeGreaterThan(novice.damage);
    expect(expert.staminaCost).toBeLessThan(novice.staminaCost);
    expect(expert.durationSeconds).toBeLessThan(novice.durationSeconds);
  });

  it('finishes paid work exactly once after reload and preserves individual identity', () => {
    const state = createInitialState();
    state.player.position = { x: -1, z: -4 };
    const host = new LocalGameHost(state);
    const companion = structuredClone(host.critter);
    expect(
      host.dispatch({ type: 'interact', targetId: 'yard-timber', action: 'work-material' }),
    ).toBe(true);
    const paid = host.state.player.stamina;
    const restored = new LocalGameHost(readSave(host.state));
    expect(
      restored.dispatch({ type: 'interact', targetId: 'yard-timber', action: 'work-material' }),
    ).toBe(false);
    for (let i = 0; i < 5; i++) restored.update(1);
    expect(restored.state.work).toBeNull();
    expect(restored.state.player.stamina).toBe(paid);
    expect(restored.state.player.skills['woodcutting']).toBe(1.35);
    expect(restored.critter.stats).toEqual(companion.stats);
    expect(restored.state.materialNodes[0].remaining).toBe(4);
    expect(() => validateSave(restored.state)).not.toThrow();
  });

  it('rejects remote and exhausted work without any mutation', () => {
    const host = new LocalGameHost();
    const before = structuredClone(host.state);
    expect(
      host.dispatch({ type: 'interact', targetId: 'yard-stone', action: 'work-material' }),
    ).toBe(false);
    expect(host.state).toEqual(before);
    host.state.player.position = { x: 6, z: 4 };
    host.state.player.stamina = 0;
    const tired = structuredClone(host.state);
    expect(
      host.dispatch({ type: 'interact', targetId: 'yard-stone', action: 'work-material' }),
    ).toBe(false);
    expect(host.state).toEqual(tired);
  });

  it('slows loaded steps, charges only distance moved, and allows free overload recovery', () => {
    const light = new LocalGameHost();
    const loaded = new LocalGameHost();
    backpack(loaded.state).items.push({
      id: 'test-stone',
      itemId: 'stone',
      quantity: 3,
      quality: 1,
    });
    expect(encumbrance(loaded.state.player, backpack(loaded.state).items).band).toBe('Heavy');
    light.dispatch({ type: 'move', x: 1, z: 0, seconds: 0.1 });
    loaded.dispatch({ type: 'move', x: 1, z: 0, seconds: 0.1 });
    expect(loaded.state.player.position.x).toBeLessThan(light.state.player.position.x);
    expect(loaded.state.player.stamina).toBeLessThan(100);
    backpack(loaded.state).items.find((item) => item.itemId === 'stone')!.quantity = 5;
    expect(loaded.dispatch({ type: 'move', x: 1, z: 0, seconds: 0.1 })).toBe(false);
    expect(loaded.dispatch({ type: 'drop-cargo' })).toBe(true);
    expect(loaded.state.groundCargo[0].items[0].quantity).toBe(5);
    expect(loaded.dispatch({ type: 'move', x: 1, z: 0, seconds: 0.1 })).toBe(true);
    const restored = new LocalGameHost(readSave(loaded.state));
    expect(
      restored.dispatch({
        type: 'interact',
        targetId: restored.state.groundCargo[0].id,
        action: 'pickup-cargo',
      }),
    ).toBe(true);
    expect(backpack(restored.state).items.find((item) => item.itemId === 'stone')!.quantity).toBe(
      5,
    );
    expect(restored.state.groundCargo).toHaveLength(0);
  });

  it('migrates frozen v3 without changing any existing player or critter progress', () => {
    const old = structuredClone(legacyV3);
    const migrated = readSave(old);
    expect(migrated.player).toMatchObject(old.player);
    expect(migrated.critters).toEqual(old.critters);
    expect(backpack(migrated).items).toEqual(old.inventory);
    expect(migrated.training).toEqual(old.training);
    expect(migrated.seed).toBe(old.seed);
    expect(old).toEqual(legacyV3);
    expect(readSave(migrated)).toEqual(migrated);
  });

  it('protects malformed and ambiguous new schema data', () => {
    expect(() => readSave({ ...legacyV3, work: {} })).toThrow(/ambiguous work/);
    const state = createInitialState();
    state.materialNodes[0].remaining = -1;
    expect(() => validateSave(state)).toThrow(/materialNode.remaining/);
    state.materialNodes[0].remaining = 6;
    state.player.skills['mining'] = Number.NaN;
    expect(() => validateSave(state)).toThrow(/non-finite/);
  });
});
