import { barnCritters, barnStalls, BARN, ownedCritters } from './barn';
import { castFor, shelterWaiting } from './cast';
import { createInitialState, LocalGameHost } from './host';
import { addItem, quantity } from './logistics';
import { activeCritter, backpack, GameState } from './model';
import { readSave, validateSave } from './storage';
import { PROJECTS } from './projects';
import { weatherFor } from './calendar';

function inTown(modify: (state: GameState) => void = () => undefined): LocalGameHost {
  const state = createInitialState();
  state.areaId = 'town';
  state.minute = state.totalMinutes = 600;
  state.player.coins = 50;
  state.player.position = { x: -10.1, z: 1.3 };
  modify(state);
  return new LocalGameHost(state);
}
const adopt = (host: LocalGameHost, id: string) =>
  host.dispatch({ type: 'interact', targetId: id, action: 'adopt' });

describe('the barn and its stalls', () => {
  it('has one stall in the old barn and two once mended, with more built from lumber', () => {
    const state = createInitialState();
    expect(barnStalls(state)).toBe(1);
    state.shedLevel = 1;
    expect(barnStalls(state)).toBe(2);
    const host = new LocalGameHost(state);
    host.state.player.position = { x: 4, z: -2 };
    host.state.player.coins = 40;
    const act = (targetId: string, action: string) =>
      host.dispatch({ type: 'interact', targetId, action });
    expect(act('shed', 'plan:stall')).toBe(true);
    host.state.player.position = { ...PROJECTS.stall.site };
    expect(act('site', 'build')).toBe(false);
    addItem(backpack(host.state), 'lumber', PROJECTS.stall.lumber);
    expect(act('site', 'deliver-lumber')).toBe(true);
    expect(act('site', 'build')).toBe(true);
    expect(barnStalls(host.state)).toBe(3);
    expect(host.state.player.coins).toBe(20);
    expect(host.state.project).toBeNull();
    expect(quantity(backpack(host.state), 'lumber')).toBe(0);
  });
});

describe('adopting from the shelter', () => {
  it('needs a free stall, then brings the critter home to the barn for good', () => {
    const full = inTown();
    const first = shelterWaiting(full.state)[2];
    expect(adopt(full, first.id)).toBe(false);
    const host = inTown((state) => (state.shedLevel = 1));
    const waiting = shelterWaiting(host.state)[2];
    expect(adopt(host, waiting.id)).toBe(true);
    expect(host.state.player.coins).toBe(50 - BARN.adoptionFee);
    const adoptee = host.state.critters.find((critter) => critter.id === waiting.id)!;
    expect(adoptee).toMatchObject({
      name: waiting.name,
      speciesId: waiting.speciesId,
      ownerId: host.state.player.id,
      ageDays: waiting.ageDays,
    });
    expect(ownedCritters(host.state)).toHaveLength(2);
    expect(shelterWaiting(host.state).map((critter) => critter.id)).not.toContain(waiting.id);
    expect(() => validateSave(host.state)).not.toThrow();
    const loaded = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(barnCritters(loaded.state).map((critter) => critter.id)).toEqual([waiting.id]);
    loaded.state.areaId = 'homestead';
    expect(castFor(loaded.state).some((member) => member.id === waiting.id)).toBe(true);
  });
});

describe('who follows you', () => {
  function withTwo(): LocalGameHost {
    const host = inTown((state) => (state.shedLevel = 1));
    expect(adopt(host, shelterWaiting(host.state)[2].id)).toBe(true);
    host.state.areaId = 'homestead';
    host.state.player.position = { x: 4, z: -2 };
    return host;
  }

  it('swaps your companion for a barn critter at the barn', () => {
    const host = withTwo();
    const first = activeCritter(host.state);
    const [other] = barnCritters(host.state);
    expect(host.interaction()!.actions.map((action) => action.id)).toContain(`follow:${other.id}`);
    expect(
      host.dispatch({ type: 'interact', targetId: 'shed', action: `follow:${other.id}` }),
    ).toBe(true);
    expect(activeCritter(host.state).id).toBe(other.id);
    expect(barnCritters(host.state).map((critter) => critter.id)).toEqual([first.id]);
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('feeds barn critters from the trough at dawn, and lets them do learned jobs', () => {
    const host = withTwo();
    const [other] = barnCritters(host.state);
    other.hunger = 60;
    other.learnedBehaviors['sunberry-foraging'] = 8;
    const trough = host.state.containers.find((container) => container.kind === 'trough')!;
    addItem(trough, 'feed', 1);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(other.hunger).toBe(25);
    expect(quantity(trough, 'feed')).toBe(0);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(other.hunger).toBe(45);
    expect(host.state.journal.join(' ')).toContain('found the feed trough empty');
  });
  it('sends a barn critter that forages on its own to the glade before lunch', () => {
    const host = withTwo();
    const [other] = barnCritters(host.state);
    other.learnedBehaviors['sunberry-foraging'] = 8;
    let day = 1;
    while (['rain', 'snow'].includes(weatherFor(day))) day++;
    host.state.day = day;
    host.state.minute = 640;
    host.state.totalMinutes = (day - 1) * 1440 + 640;
    const chest = host.state.containers.find((container) => container.kind === 'chest')!;
    const berries = quantity(chest, 'berry');
    for (let tick = 0; tick < 60 && host.state.minute < 670; tick++) host.update(1);
    expect(quantity(chest, 'berry')).toBe(berries + 2);
    expect(host.state.journal.join(' ')).toContain(`${other.name} comes back from the glade`);
  });
});
