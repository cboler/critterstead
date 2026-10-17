import { residentsAbout, shelterWaiting } from './cast';
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
    expect(go('colosseum-gate', -14.4, 1)).toBe('road');
    expect(go('colosseum-gate', -16.4, 0)).toBe('colosseum');
    expect(host.state.flags).toContain('visited-colosseum');
    host.state.player.position = { x: -7.4, z: 4 };
    expect(host.interaction()!.actions[0].label).toBe('Take the Colosseum road · 5 min');
    expect(go('gate', -7.4, 4)).toBe('road');
    expect(go('gate', 16.4, 0)).toBe('town');
    expect(go('gate', 14.4, 1)).toBe('lane');
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

describe('Oakhaven residents and the shelter', () => {
  const inTown = (minute: number, x: number, z: number) => {
    const host = at('town', x, z);
    host.state.minute = minute;
    host.state.totalMinutes = minute;
    return host;
  };

  it('keeps residents at their posts in their hours, each introducing themselves first', () => {
    const host = inTown(600, -8.6, 1.6);
    expect(residentsAbout(host.state).map((resident) => resident.name)).toContain('Wren Ashby');
    expect(residentsAbout(inTown(1300, 0, 0).state).map((resident) => resident.id)).toEqual([
      'resident-tavern',
    ]);
    const dock = host.interaction()!;
    expect(dock.title).toBe('Wren Ashby · Runs the critter shelter');
    const chat = dock.actions[0];
    expect(host.dispatch({ type: 'interact', targetId: dock.id, action: chat.id })).toBe(true);
    expect(host.state.journal[0]).toContain('waiting for homes');
    expect(host.dispatch({ type: 'interact', targetId: dock.id, action: chat.id })).toBe(false);
    host.dispatch({ type: 'debug', action: 'next-day' });
    host.state.minute = 600;
    host.state.totalMinutes = Math.floor(host.state.totalMinutes / 1440) * 1440 + 600;
    host.state.areaId = 'town';
    host.state.player.position = { x: -8.6, z: 1.6 };
    expect(host.dispatch({ type: 'interact', targetId: dock.id, action: chat.id })).toBe(true);
    expect(host.state.journal[0]).not.toContain('waiting for homes');
  });

  it('lets you chat with Marigold across her counter', () => {
    const host = inTown(600, -5.2, -2.2);
    expect(host.interaction()!.actions.at(-1)!.id).toBe('chat:resident-store');
    expect(
      host.dispatch({ type: 'interact', targetId: 'store', action: 'chat:resident-store' }),
    ).toBe(true);
    expect(host.state.journal[0]).toContain('Marigold Hale');
  });

  it('keeps the same critters waiting for the same household, until they find homes', () => {
    const first = at('town', 0, 0).state;
    const again = at('town', 0, 0).state;
    expect(shelterWaiting(first)).toEqual(shelterWaiting(again));
    expect(shelterWaiting(first)).toHaveLength(3);
    const other = { ...first, origin: first.origin + 1 };
    expect(shelterWaiting(other).map((critter) => critter.name)).not.toEqual(
      shelterWaiting(first).map((critter) => critter.name),
    );
    const adopted = { ...first, flags: ['adopted:shelter-0'] };
    expect(shelterWaiting(adopted)[0].id).toBe(shelterWaiting(first)[1].id);
    expect(shelterWaiting(adopted)).toHaveLength(3);
  });

  it('lets you visit a waiting critter once a day, and shuts the shelter at night', () => {
    const host = inTown(600, -10.1, 1.3);
    const waiting = shelterWaiting(host.state)[2];
    const dock = host.interaction()!;
    expect(dock.title).toContain(waiting.name);
    expect(host.dispatch({ type: 'interact', targetId: waiting.id, action: 'visit' })).toBe(true);
    expect(host.dispatch({ type: 'interact', targetId: waiting.id, action: 'visit' })).toBe(false);
    const night = inTown(1200, -9.2, -0.1);
    expect(night.interaction()!.description).toContain('shut for the night');
  });
});
