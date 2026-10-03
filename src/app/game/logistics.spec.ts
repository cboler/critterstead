import { LocalGameHost } from './host';
import { backpack, satchel } from './model';
import { addItem, productionStatus, quantity, transfer } from './logistics';
import { readSave, validateSave } from './storage';
import { legacyV4 } from './fixtures/legacy-v4';

describe('localized storage and the first production chain', () => {
  it('preserves every v4 item, capability, ground pile and paid action', () => {
    const before = structuredClone(legacyV4);
    const state = readSave(before);
    expect(backpack(state).items).toEqual(before.inventory);
    expect(state.player).toEqual({
      ...before.player,
      skills: { ...before.player.skills, farming: 1 },
    });
    for (const key of ['seed', 'work', 'groundCargo', 'materialNodes', 'journal'] as const)
      expect(state[key]).toEqual(before[key]);
    expect(state.plots[0].crop).toMatchObject({ speciesId: 'feed', growthMinutes: 102 });
    expect(state.critters).toEqual(
      before.critters.map((critter) => ({
        ...critter,
        hauling: { enabled: false, phase: 'idle', cued: false },
        drills: { day: before.day, sessions: {} },
        speciesId: 'canine',
        visualTraits: { ...critter.visualTraits, size: 1 },
      })),
    );
    expect('inventory' in state).toBe(false);
    expect(state.containers.filter((item) => item.kind === 'satchel')).toHaveLength(2);
    expect(readSave(state)).toEqual(state);
    expect(before).toEqual(legacyV4);
    const host = new LocalGameHost(state);
    host.update(1);
    expect(host.state.work).toBeNull();
    expect(host.state.player.stamina).toBe(before.player.stamina);
  });

  it('preserves quantities and quality, rejects full or incompatible destinations atomically', () => {
    const host = new LocalGameHost();
    const bag = backpack(host.state);
    const input = host.state.containers.find((item) => item.kind === 'mill-input')!;
    addItem(bag, 'timber', 5, 2);
    expect(transfer(bag, input, 'timber', 4)).toBe(true);
    expect(input.items[0]).toMatchObject({ quantity: 4, quality: 2 });
    const before = structuredClone(host.state);
    expect(transfer(bag, input, 'timber')).toBe(false);
    expect(transfer(bag, input, 'feed')).toBe(false);
    expect(host.state).toEqual(before);
    expect(quantity(bag, 'timber') + quantity(input, 'timber')).toBe(5);
  });

  it('requires both rancher and companion at the actual container for physical transfers', () => {
    const host = new LocalGameHost();
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    addItem(output, 'lumber', 2);
    const action = `transfer:${output.id}:${satchel(host.state).id}:lumber`;
    expect(host.dispatch({ type: 'interact', targetId: output.id, action })).toBe(false);
    host.state.player.position = { x: 6.5, z: 1 };
    expect(host.dispatch({ type: 'interact', targetId: output.id, action })).toBe(false);
    host.critter.position = { x: 6, z: 1 };
    expect(host.dispatch({ type: 'interact', targetId: output.id, action })).toBe(true);
    expect(quantity(satchel(host.state), 'lumber')).toBe(1);
    const chest = host.state.containers.find((item) => item.kind === 'chest')!;
    const deposit = `transfer:${satchel(host.state).id}:${chest.id}:lumber`;
    expect(host.dispatch({ type: 'interact', targetId: chest.id, action: deposit })).toBe(false);
    host.state.player.position = { x: -1, z: 4 };
    host.critter.position = { x: -1, z: 3.5 };
    expect(host.dispatch({ type: 'interact', targetId: chest.id, action: deposit })).toBe(true);
    expect(quantity(chest, 'lumber')).toBe(1);
    expect(quantity(satchel(host.state))).toBe(0);
  });

  it('produces only from local input, halts at capacity, and resumes without duplicating output', () => {
    const host = new LocalGameHost();
    const input = host.state.containers.find((item) => item.kind === 'mill-input')!;
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    addItem(backpack(host.state), 'timber', 9);
    for (let i = 0; i < 20; i++) host.update(1);
    expect(quantity(output)).toBe(0);
    expect(productionStatus(host.state.containers)).toContain('no timber');
    transfer(backpack(host.state), input, 'timber', 3);
    for (let i = 0; i < 31; i++) host.update(1);
    expect(quantity(output, 'lumber')).toBe(4);
    expect(quantity(input, 'timber')).toBe(1);
    expect(productionStatus(host.state.containers)).toContain('output crate full');
    const resumed = new LocalGameHost(readSave(host.state));
    for (let i = 0; i < 50; i++) resumed.update(1);
    expect(quantity(resumed.state.containers.find((item) => item.kind === 'mill-output')!)).toBe(4);
    transfer(
      resumed.state.containers.find((item) => item.kind === 'mill-output')!,
      backpack(resumed.state),
      'lumber',
      2,
    );
    for (let i = 0; i < 16; i++) resumed.update(1);
    expect(quantity(resumed.state.containers.find((item) => item.kind === 'mill-input')!)).toBe(0);
    expect(quantity(resumed.state.containers.find((item) => item.kind === 'mill-output')!)).toBe(4);
    expect(() => validateSave(resumed.state)).not.toThrow();
  });

  it('rejects missing, overfull, misplaced, ambiguous or duplicate containers', () => {
    expect(() => readSave({ ...legacyV4, containers: [] })).toThrow(/ambiguous/);
    const host = new LocalGameHost();
    const input = host.state.containers.find((item) => item.kind === 'mill-input')!;
    addItem(input, 'timber', 5);
    expect(() => validateSave(host.state)).toThrow(/capacity/);
    input.items = [];
    input.location = { areaId: 'glade', position: { x: 5, z: 1 } };
    expect(() => validateSave(host.state)).toThrow(/position/);
  });
});
