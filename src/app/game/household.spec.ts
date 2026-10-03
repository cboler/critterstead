import { calendarDate, weatherFor } from './calendar';
import { createInitialState, LocalGameHost } from './host';
import { grandpaWhereabouts, PIP_ID, pipWhereabouts } from './household';
import { activeCritter, GameState } from './model';
import { validateSave } from './storage';

/** A day whose weather lets Grandpa and Pip be outdoors, starting at the given minute. */
function morning(minute: number, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  let day = 1;
  while (['rain', 'snow'].includes(weatherFor(day)) || calendarDate(day).season === 'winter') day++;
  state.day = day;
  state.totalMinutes = (day - 1) * 1440 + minute;
  state.minute = minute;
  activeCritter(state).drills.day = day;
  state.critters.forEach((critter) => (critter.drills.day = day));
  modify?.(state);
  return new LocalGameHost(state);
}
const chestBerries = (host: LocalGameHost) =>
  host.state.containers
    .find((container) => container.kind === 'chest')!
    .items.filter((item) => item.itemId === 'berry')
    .reduce((sum, item) => sum + item.quantity, 0);

describe('Grandpa and Pip', () => {
  it('every household has Grandpa’s Pip, separate from the player’s companion', () => {
    const state = createInitialState();
    const pip = state.critters.find((critter) => critter.id === PIP_ID)!;
    expect(pip).toMatchObject({ name: 'Pip', ownerId: 'grandpa', speciesId: 'brindlekin' });
    expect(state.activeCritterId).not.toBe(PIP_ID);
    expect(() => validateSave(state)).not.toThrow();
    const without = structuredClone(state);
    without.critters = without.critters.filter((critter) => critter.id !== PIP_ID);
    expect(() => validateSave(without)).toThrow(/household/);
    const stranger = structuredClone(state);
    stranger.critters.find((critter) => critter.id === PIP_ID)!.ownerId = 'someone-else';
    expect(() => validateSave(stranger)).toThrow(/ownerId/);
  });

  it('follows Grandpa’s day from the garden to the porch, lunch, the stall and the hearth', () => {
    const host = morning(400);
    const at = (minute: number) => {
      host.state.minute = minute;
      return grandpaWhereabouts(host.state)?.areaId ?? 'asleep';
    };
    expect([300, 400, 600, 750, 900, 1100, 1200, 1400].map(at)).toEqual([
      'asleep',
      'homestead',
      'homestead',
      'cottage',
      'homestead',
      'homestead',
      'cottage',
      'asleep',
    ]);
  });

  it('talks with you, and ends with whatever you are working toward', () => {
    const host = morning(400, (state) => {
      state.player.position = { x: -6.2, z: -1 };
    });
    expect(host.interaction()?.title).toBe('Grandpa');
    expect(host.dispatch({ type: 'interact', targetId: 'grandpa', action: 'talk' })).toBe(true);
    expect(host.state.journal[0]).toContain('There you are');
    expect(host.dispatch({ type: 'interact', targetId: 'grandpa', action: 'talk' })).toBe(true);
    expect(host.state.journal[0]).toContain('with a nod');
  });

  it('sends Pip to the glade each fair morning to pick twice, for the yard chest', () => {
    const host = morning(500);
    expect(pipWhereabouts(host.state, host.critter.position)?.areaId).toBe('homestead');
    host.state.minute = 520;
    expect(pipWhereabouts(host.state, host.critter.position)?.areaId).toBe('glade');
    host.state.minute = 500;
    for (let second = 0; second < 140; second++) host.update(1);
    expect(host.state.minute).toBeGreaterThan(600);
    expect(host.state.minute).toBeLessThan(720);
    expect(host.state.flags.filter((flag) => flag.startsWith('pip-'))).toHaveLength(2);
    expect(host.state.resources.filter((node) => !node.available)).toHaveLength(2);
    expect(chestBerries(host)).toBe(4);
    // A new day clears his picks.
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(host.state.flags.some((flag) => flag.startsWith('pip-'))).toBe(false);
  });

  it('teaches a young companion who is close enough to watch him work', () => {
    const host = morning(530, (state) => {
      state.areaId = 'glade';
      state.player.position = { x: 2, z: 0.6 };
      activeCritter(state).position = { x: 2, z: 0.8 };
    });
    for (let second = 0; second < 30; second++) host.update(1);
    expect(host.state.flags.some((flag) => flag.startsWith('pip-1:berries-center'))).toBe(true);
    expect(host.critter.learnedBehaviors['sunberry-foraging']).toBe(1);
    expect(host.state.journal.some((line) => line.includes('watches every move'))).toBe(true);
  });

  it('stays in on foul days, and takes one fuss a day', () => {
    const state = createInitialState();
    let day = 1;
    while (weatherFor(day) !== 'rain') day++;
    state.day = day;
    state.totalMinutes = (day - 1) * 1440 + 530;
    state.minute = 530;
    const host = new LocalGameHost(state);
    expect(grandpaWhereabouts(host.state)?.areaId).toBe('cottage');
    for (let second = 0; second < 120; second++) host.update(1);
    expect(host.state.flags.some((flag) => flag.startsWith('pip-'))).toBe(false);
    host.state.areaId = 'cottage';
    host.state.player.position = { ...pipWhereabouts(host.state, host.critter.position)!.position };
    expect(host.dispatch({ type: 'interact', targetId: PIP_ID, action: 'greet-pip' })).toBe(true);
    expect(host.dispatch({ type: 'interact', targetId: PIP_ID, action: 'greet-pip' })).toBe(false);
  });
});
