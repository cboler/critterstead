import { castFor, familiesMet, wildCritters } from './cast';
import { createInitialState, LocalGameHost } from './host';
import { GameState } from './model';
import { readSave } from './storage';

function onRoad(areaId: 'lane' | 'road', day = 3, minute = 600): GameState {
  const state = createInitialState();
  state.day = day;
  state.minute = minute;
  state.totalMinutes = (day - 1) * 1440 + minute;
  state.areaId = areaId;
  state.areaInstanceId = `local-${areaId}`;
  return state;
}

describe('wild critters on the roads', () => {
  it('are the same critters for the same day, and different on another', () => {
    const first = wildCritters(onRoad('lane'));
    expect(first.length).toBeGreaterThan(0);
    expect(wildCritters(onRoad('lane'))).toEqual(first);
    const days = Array.from({ length: 12 }, (_, day) =>
      JSON.stringify(wildCritters(onRoad('lane', day + 1)).map((member) => member.figure)),
    );
    expect(new Set(days).size).toBeGreaterThan(6);
  });

  it('keep to the roads, off the walking line, and are away at night', () => {
    for (let day = 1; day <= 30; day++)
      for (const areaId of ['lane', 'road'] as const)
        for (const member of wildCritters(onRoad(areaId, day))) {
          expect(Math.abs(member.position.x)).toBeLessThan(16);
          expect(Math.abs(member.position.z)).toBeGreaterThan(0.6);
          expect(Math.abs(member.position.z)).toBeLessThan(5);
        }
    expect(wildCritters(onRoad('lane', 3, 1300))).toEqual([]);
    expect(wildCritters(onRoad('lane', 3, 200))).toEqual([]);
    expect(castFor({ ...onRoad('lane'), areaId: 'homestead' })).toEqual([]);
  });

  it('can be greeted once a day, and you remember each family you meet', () => {
    const state = onRoad('lane');
    const [member] = wildCritters(state);
    state.player.position = { ...member.position };
    const host = new LocalGameHost(state);
    const dock = host.interaction()!;
    expect(dock.title).toBe(member.name);
    expect(dock.description).toContain('never met');
    expect(host.dispatch({ type: 'interact', targetId: member.id, action: 'greet-wild' })).toBe(
      true,
    );
    expect(familiesMet(host.state)).toHaveLength(1);
    expect(host.state.journal[0]).toContain('1 of the nine families');
    expect(host.dispatch({ type: 'interact', targetId: member.id, action: 'greet-wild' })).toBe(
      false,
    );
    // The family is remembered across a save; the greeting is free again tomorrow.
    const loaded = new LocalGameHost(readSave(structuredClone(host.state)));
    loaded.dispatch({ type: 'debug', action: 'next-day' });
    expect(familiesMet(loaded.state)).toHaveLength(1);
    expect(loaded.state.flags.some((flag) => flag.startsWith('greeted:'))).toBe(false);
  });
});
