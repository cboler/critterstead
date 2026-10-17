import { createInitialState, LocalGameHost } from './host';
import { GameState } from './model';

function at(areaId: GameState['areaId'], x: number, z: number): LocalGameHost {
  const state = createInitialState();
  state.areaId = areaId;
  state.player.position = { x, z };
  state.critters[0].position = { x, z: z + 1 };
  return new LocalGameHost(state);
}

describe('Oakhaven', () => {
  it('is down the hedgerow lane west of the yard, with the Colosseum road beyond', () => {
    const host = at('homestead', -7.4, 1.2);
    const go = (gate: string, x: number, z: number) => {
      host.state.player.position = { x, z };
      expect(host.dispatch({ type: 'interact', targetId: gate, action: 'travel' })).toBe(true);
      return host.state.areaId;
    };
    expect(host.interaction()!.actions[0].label).toBe('Take the hedgerow lane · 5 min');
    const minutes = host.state.totalMinutes;
    expect(go('town-gate', -7.4, 1.2)).toBe('lane');
    expect(go('town-gate', -16.4, 0)).toBe('town');
    expect(host.state.totalMinutes).toBe(minutes + 10);
    expect(host.state.flags).toContain('visited-town');
    expect(go('colosseum-gate', -7.4, 1)).toBe('road');
    expect(go('colosseum-gate', -16.4, 0)).toBe('colosseum');
    expect(host.state.flags).toContain('visited-colosseum');
    host.state.player.position = { x: -7.4, z: 4 };
    expect(host.interaction()!.actions[0].label).toBe('Take the Colosseum road · 5 min');
    expect(go('gate', -7.4, 4)).toBe('road');
    expect(go('gate', 16.4, 0)).toBe('town');
    expect(go('gate', 7.4, 1)).toBe('lane');
    expect(go('gate', 16.4, 0.4)).toBe('homestead');
    expect(host.state.player.position).toEqual({ x: -6.4, z: 1.2 });
  });

  it('keeps the rancher inside a road, which is longer than it is wide', () => {
    const host = at('lane', 15, 0);
    host.dispatch({ type: 'move', x: 0, z: 1, seconds: 30 });
    for (let step = 0; step < 200; step++)
      host.dispatch({ type: 'move', x: 0, z: 1, seconds: 0.1 });
    expect(host.state.player.position.z).toBeLessThanOrEqual(5.5);
    for (let step = 0; step < 400; step++)
      host.dispatch({ type: 'move', x: 1, z: 0, seconds: 0.1 });
    expect(host.state.player.position.x).toBeGreaterThan(16);
    expect(host.state.player.position.x).toBeLessThanOrEqual(17.5);
  });

  it('has a signpost on the lane and a milestone on the road', () => {
    const lane = at('lane', 2.2, -1.2);
    expect(lane.interaction()!.description).toContain('Oakhaven, west');
    const road = at('road', 1.6, 1.4);
    expect(road.interaction()!.title).toBe('Milestone');
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
});
