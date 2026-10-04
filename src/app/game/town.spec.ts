import { createInitialState, LocalGameHost } from './host';
import { GameState } from './model';
import { readSave, validateSave } from './storage';
import { legacyV9 } from './fixtures/legacy-v9';
import { kept } from './fixtures/household';

function at(areaId: GameState['areaId'], x: number, z: number): LocalGameHost {
  const state = createInitialState();
  state.areaId = areaId;
  state.player.position = { x, z };
  state.critters[0].position = { x, z: z + 1 };
  return new LocalGameHost(state);
}

describe('Oakhaven', () => {
  it('is a longer walk west of the yard, with the Colosseum at its edge', () => {
    const host = at('homestead', -7.4, 1.2);
    expect(host.interaction()!.actions[0].label).toBe('Walk to Oakhaven · 20 min');
    const minutes = host.state.totalMinutes;
    expect(host.dispatch({ type: 'interact', targetId: 'town-gate', action: 'travel' })).toBe(true);
    expect(host.state.areaId).toBe('town');
    expect(host.state.totalMinutes).toBe(minutes + 20);
    expect(host.state.flags).toContain('visited-town');

    host.state.player.position = { x: -7.4, z: 1 };
    expect(host.dispatch({ type: 'interact', targetId: 'colosseum-gate', action: 'travel' })).toBe(
      true,
    );
    expect(host.state.areaId).toBe('colosseum');
    host.state.player.position = { x: -7.4, z: 4 };
    expect(host.interaction()!.actions[0].label).toBe('Back to Oakhaven · 10 min');
    expect(host.dispatch({ type: 'interact', targetId: 'gate', action: 'travel' })).toBe(true);
    expect(host.state.areaId).toBe('town');

    host.state.player.position = { x: 7.4, z: 1 };
    expect(host.dispatch({ type: 'interact', targetId: 'gate', action: 'travel' })).toBe(true);
    expect(host.state.areaId).toBe('homestead');
    expect(host.state.player.position).toEqual({ x: -6.4, z: 1.2 });
  });

  it('posts the day and the exhibition on its notice board', () => {
    const host = at('town', 2.6, 1.8);
    const board = host.interaction()!;
    expect(board.title).toBe('Oakhaven notice board');
    expect(board.description).toContain('exhibition every day');
    expect(board.actions).toEqual([]);
  });

  it('no longer opens the Colosseum straight from the glade', () => {
    const host = at('glade', 7.2, -4);
    expect(host.dispatch({ type: 'interact', targetId: 'colosseum-gate', action: 'travel' })).toBe(
      false,
    );
  });

  it('saves in town only from v10, where v9 saves gain only Grandpa’s Pip', () => {
    const state = createInitialState();
    state.areaId = 'town';
    expect(() => validateSave(state)).not.toThrow();
    const old = structuredClone(legacyV9) as unknown as Record<string, unknown>;
    old['areaId'] = 'town';
    expect(() => readSave(old)).toThrow(/areaId/);
    const migrated = readSave(structuredClone(legacyV9));
    expect(kept(migrated.critters)).toEqual(legacyV9.critters);
    expect(kept(migrated.containers)).toEqual(legacyV9.containers);
    expect({ ...migrated, critters: [], containers: [] }).toEqual({
      ...legacyV9,
      version: 11,
      critters: [],
      containers: [],
    });
  });
});
