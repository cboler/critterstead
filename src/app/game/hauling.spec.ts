import { kept } from './fixtures/household';
import { createInitialState, LocalGameHost } from './host';
import { addItem, ITEM_IDS, quantity } from './logistics';
import { backpack, satchel } from './model';
import { readSave, validateSave } from './storage';
import { legacyV5 } from './fixtures/legacy-v5';

function tick(host: LocalGameHost, seconds: number) {
  for (let i = 0; i < seconds; i++) host.update(1);
}
function teach(host: LocalGameHost) {
  const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
  const chest = host.state.containers.find((item) => item.kind === 'chest')!;
  host.state.player.position = { x: 6.5, z: 1 };
  host.critter.position = { x: 6, z: 1 };
  host.dispatch({
    type: 'interact',
    targetId: output.id,
    action: `transfer:${output.id}:${backpack(host.state).id}:lumber`,
  });
  host.state.player.position = { x: -1, z: 4 };
  host.critter.position = { x: -1, z: 3.5 };
  host.dispatch({
    type: 'interact',
    targetId: chest.id,
    action: `transfer:${backpack(host.state).id}:${chest.id}:lumber`,
  });
}

describe('compositional learned hauling', () => {
  it('learns only complete watched routes, then cues and independently reduces chores', () => {
    const host = new LocalGameHost();
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    const chest = host.state.containers.find((item) => item.kind === 'chest')!;
    addItem(output, 'lumber', 4);
    expect(host.dispatch({ type: 'interact', targetId: host.critter.id, action: 'cue-haul' })).toBe(
      false,
    );
    teach(host);
    teach(host);
    expect(host.haulingLearning().label).toBe('Hauls on cue');
    for (let i = 0; i < 2; i++) {
      expect(host.dispatch({ type: 'interact', targetId: chest.id, action: 'cue-haul' })).toBe(
        true,
      );
      tick(host, 12);
    }
    expect(host.haulingLearning().label).toBe('Independent hauler');
    expect(host.critter.hauling.enabled).toBe(true);
    expect(quantity(chest, 'lumber')).toBe(4);
    const player = structuredClone(host.state.player);
    addItem(output, 'lumber', 2);
    tick(host, 20);
    expect(quantity(chest, 'lumber')).toBe(6);
    expect(host.state.player).toEqual(player);
    expect(quantity(satchel(host.state), 'lumber')).toBe(0);
    expect(host.critter.skills['hauling']).toBe(2);
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('does not grant lessons for chest shuffling, unobserved pickups, or dropped demonstration cargo', () => {
    const host = new LocalGameHost();
    addItem(backpack(host.state), 'lumber', 1);
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    addItem(output, 'lumber', 1);
    host.state.player.position = { x: 6.5, z: 1 };
    host.critter.position = { x: -5, z: -2 };
    host.dispatch({
      type: 'interact',
      targetId: output.id,
      action: `transfer:${output.id}:${backpack(host.state).id}:lumber`,
    });
    expect(host.state.haulLesson).toBeNull();
    host.state.player.position = { x: -1, z: 4 };
    host.critter.position = { x: -1, z: 4 };
    host.dispatch({
      type: 'interact',
      targetId: 'yard-chest',
      action: `transfer:${backpack(host.state).id}:yard-chest:lumber`,
    });
    expect(host.haulingLearning().progress).toBe(0);
    host.state.haulLesson = { critterId: host.critter.id, lumber: 1 };
    host.dispatch({ type: 'drop-cargo' });
    expect(host.state.haulLesson).toBeNull();
  });

  it('saves a board mid-route, keeps it during a full-chest stoppage, and deposits exactly once', () => {
    const host = new LocalGameHost();
    host.critter.learnedBehaviors['lumber-hauling'] = 2;
    host.state.player.position = { x: 6.5, z: 1 };
    host.critter.position = { x: 6, z: 1 };
    addItem(
      host.state.containers.find((item) => item.kind === 'mill-output')!,
      'lumber',
      1,
    );
    host.dispatch({ type: 'interact', targetId: 'mill-output', action: 'cue-haul' });
    host.update(0.1);
    expect(host.critter.hauling.phase).toBe('deliver');
    const restored = new LocalGameHost(readSave(host.state));
    const chest = restored.state.containers.find((item) => item.kind === 'chest')!;
    addItem(chest, 'stone', 64);
    tick(restored, 15);
    expect(quantity(satchel(restored.state), 'lumber')).toBe(1);
    expect(restored.haulingLearning().status).toContain('full');
    chest.items = [];
    tick(restored, 8);
    expect(quantity(chest, 'lumber')).toBe(1);
    expect(restored.haulingLearning().progress).toBe(4);
    tick(restored, 15);
    expect(quantity(chest, 'lumber')).toBe(1);
    expect(() => validateSave(restored.state)).not.toThrow();
  });

  it('seeks a local meal, waits for an empty trough, rests at the nook, then resumes', () => {
    const host = new LocalGameHost();
    host.critter.learnedBehaviors['lumber-hauling'] = 6;
    host.critter.hauling.enabled = true;
    host.critter.hunger = 85;
    host.critter.stamina = 1;
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    const trough = host.state.containers.find((item) => item.kind === 'trough')!;
    addItem(output, 'lumber', 1);
    tick(host, 8);
    expect(host.haulingLearning().status).toContain('trough is empty');
    // The wait is announced once in the journal, not on every tick.
    expect(host.state.journal.filter((note) => note.includes('trough is empty'))).toHaveLength(1);
    expect(quantity(output)).toBe(1);
    addItem(trough, 'feed', 1);
    tick(host, 8);
    expect(host.critter.hauling.phase).toBe('rest');
    expect(
      Math.hypot(host.critter.position.x - 4, host.critter.position.z + 2),
    ).toBeLessThanOrEqual(0.75);
    tick(host, 190);
    expect(
      quantity(
        host.state.containers.find((item) => item.kind === 'chest')!,
        'lumber',
      ),
    ).toBe(1);
    expect(host.critter.stamina).toBeGreaterThan(20);
    expect(quantity(trough)).toBe(0);
  });

  it('pauses work outside the yard and during training without losing cargo or mutating dormant critters', () => {
    const state = readSave(legacyV5);
    state.work = null;
    const host = new LocalGameHost(state);
    host.critter.learnedBehaviors['lumber-hauling'] = 6;
    host.critter.hauling.enabled = true;
    host.critter.hunger = 20;
    host.critter.stamina = 100;
    const dormant = structuredClone(host.state.critters[0]);
    addItem(
      host.state.containers.find((item) => item.kind === 'mill-output')!,
      'lumber',
      1,
    );
    host.state.areaId = 'glade';
    tick(host, 10);
    expect(host.haulingLearning().status).toContain('explore');
    expect(host.critter.hauling.phase).toBe('idle');
    host.state.areaId = 'homestead';
    tick(host, 15);
    expect(host.state.critters[0]).toEqual(dormant);
    expect(
      quantity(
        host.state.containers.find((item) => item.kind === 'chest')!,
        'lumber',
      ),
    ).toBe(1);
  });

  it('migrates frozen v5 without moving goods or rerolling the seed and rejects invalid tasks', () => {
    const before = structuredClone(legacyV5);
    const state = readSave(before);
    // Contents and places are unchanged; general containers also accept v7 garden goods.
    expect(kept(state.containers).map((item) => ({ ...item, allowed: [] }))).toEqual(
      before.containers.map((item) => ({ ...item, allowed: [] })),
    );
    for (const container of state.containers)
      expect(container.allowed).toEqual(
        ['mill-input', 'mill-output', 'trough'].includes(container.kind)
          ? before.containers.find((item) => item.id === container.id)!.allowed
          : ITEM_IDS,
      );
    expect(state.production).toEqual(before.production);
    expect(state.seed).toBe(before.seed);
    expect(readSave(state)).toEqual(state);
    expect(before).toEqual(legacyV5);
    expect(() => readSave({ ...before, haulLesson: {} })).toThrow(/ambiguous/);
    const fresh = createInitialState();
    fresh.critters[0].hauling.enabled = true;
    expect(() => validateSave(fresh)).toThrow(/assignment/);
  });
});
