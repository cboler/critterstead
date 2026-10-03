import { describe, expect, it } from 'vitest';
import { drillMultiplier } from './drills';
import { createInitialState, LocalGameHost } from './host';
import { quantity } from './logistics';
import { activeCritter, backpack } from './model';
import { readSave } from './storage';

// M9: the First Living Stead as one household over three days, through the same commands a
// player's controls send, reloading from a save every night.

function act(host: LocalGameHost, targetId: string, action: string): boolean {
  return host.dispatch({ type: 'interact', targetId, action });
}
/** Stand somewhere with the companion alongside, as a following companion would be. */
function go(host: LocalGameHost, x: number, z: number): void {
  host.state.player.position = { x, z };
  host.critter.position = { x: x + 0.5, z: z + 0.3 };
}
function must(host: LocalGameHost, targetId: string, action: string): void {
  const offered = host.interaction()?.actions.find((entry) => entry.id === action);
  expect(act(host, targetId, action), `${targetId} · ${action}: ${offered?.reason ?? ''}`).toBe(
    true,
  );
}
function travel(host: LocalGameHost, gateId: string, x: number, z: number): void {
  go(host, x, z);
  must(host, gateId, 'travel');
}
/** Real seconds of play; the clock runs at 1440 game minutes per 30 real minutes. */
function play(host: LocalGameHost, seconds: number): void {
  for (let second = 0; second < seconds; second++) host.update(1);
}
function finishWork(host: LocalGameHost): void {
  for (let second = 0; second < 120 && host.state.work; second++) host.update(1);
  expect(host.state.work).toBeNull();
}
function beats(host: LocalGameHost): void {
  for (let beat = 0; beat < 3; beat++) {
    for (let tick = 0; tick < 200; tick++) {
      host.update(0.02);
      const training = host.state.training!;
      if (
        training.elapsed - (training.lastHitAt ?? 0) > 0.3 &&
        Math.abs(training.phase - 0.5) < 0.05
      )
        break;
    }
    expect(host.dispatch({ type: 'training-hit' })).toBe(true);
  }
}
function holdGauge(host: LocalGameHost, target: number): void {
  for (let tick = 0; tick < 400 && host.state.training; tick++) {
    host.update(0.05);
    const training = host.state.training;
    if (training && (training.meter ?? 0) < target) host.dispatch({ type: 'training-hit' });
  }
  expect(host.state.training).toBeNull();
}
function items(host: LocalGameHost, itemId: string): number {
  return quantity(backpack(host.state), itemId as never);
}
function transfer(host: LocalGameHost, from: string, to: string, itemId: string): void {
  must(host, from === backpack(host.state).id ? to : from, `transfer:${from}:${to}:${itemId}`);
}
/** Turn in at the cottage, then reload tomorrow from the saved record. */
function sleepAndReload(host: LocalGameHost): LocalGameHost {
  travelHome(host);
  go(host, -4, -2);
  must(host, 'house', 'sleep');
  return new LocalGameHost(readSave(JSON.parse(JSON.stringify(host.state))));
}
function travelHome(host: LocalGameHost): void {
  if (host.state.areaId === 'colosseum') travel(host, 'gate', -7.4, 4);
  if (host.state.areaId === 'glade') travel(host, 'gate', -7.4, 0);
}

describe('the first living stead across three days', () => {
  it('connects care, garden, gathering, logistics, learning, drills and competitions', () => {
    let host = new LocalGameHost(createInitialState());
    const container = (kind: string) => host.state.containers.find((item) => item.kind === kind)!;
    const start = structuredClone(activeCritter(host.state));

    // Day 1: care, the garden, a first drill, berries with Mallow watching, then timber.
    go(host, 0.6, 0.3);
    must(host, host.critter.id, 'pet');
    must(host, host.critter.id, 'feed');
    go(host, -5.6, 1.4);
    must(host, 'plot-1', 'plant:feed');
    must(host, 'plot-1', 'water');
    go(host, 3, 1);
    must(host, 'training', 'train');
    beats(host);
    travel(host, 'gate', 7.4, 0);
    expect(host.state.areaId).toBe('glade');
    for (const [x, z] of [
      [-3, -2],
      [-1, 2.5],
      [1, -4],
    ]) {
      go(host, x, z);
      must(host, host.interaction()!.id, 'gather');
    }
    expect(host.learning().label).toBe('Harvests on cue');
    travel(host, 'gate', -7.4, 0);
    go(host, -6, 5);
    must(host, 'market', 'sell');
    must(host, 'market', 'buy-crop:turnip');
    go(host, -2.9, 1.3);
    must(host, 'plot-2', 'till');
    must(host, 'plot-2', 'plant:turnip');
    must(host, 'plot-2', 'water');
    go(host, -1, -4);
    for (let swing = 0; swing < 3; swing++) {
      must(host, 'yard-timber', 'work-material');
      finishWork(host);
    }
    expect(items(host, 'timber')).toBeGreaterThanOrEqual(2);
    go(host, 4.9, 0.9);
    transfer(host, backpack(host.state).id, container('mill-input').id, 'timber');
    transfer(host, backpack(host.state).id, container('mill-input').id, 'timber');
    go(host, 5.2, 7.4);
    must(host, 'lift', 'lift');
    holdGauge(host, 0.62);
    expect(drillMultiplier(host.critter, 'lift', host.state.day)).toBeLessThan(1);
    go(host, 2.5, -2.9);
    must(host, 'shed', 'rest');
    host = sleepAndReload(host);

    // Day 2: a fresh morning with a harvest, the sawmill's lumber and a hauling lesson.
    expect(host.state.day).toBe(2);
    expect([host.state.player.stamina, host.critter.stamina]).toEqual([100, 100]);
    expect(drillMultiplier(host.critter, 'lift', 2)).toBe(1);
    expect(host.state.journal[0]).toContain('Day 2');
    go(host, -5.6, 1.4);
    must(host, 'plot-1', 'harvest');
    expect(items(host, 'feed')).toBeGreaterThan(0);
    go(host, -2.9, 1.3);
    if (host.interaction()?.actions.some((entry) => entry.id === 'water' && !entry.disabled))
      must(host, 'plot-2', 'water');
    expect(quantity(container('mill-output'), 'lumber')).toBeGreaterThanOrEqual(2);
    for (let lesson = 0; lesson < 2; lesson++) {
      go(host, 6.6, 1.2);
      transfer(host, container('mill-output').id, backpack(host.state).id, 'lumber');
      go(host, -1, 4);
      transfer(host, backpack(host.state).id, container('chest').id, 'lumber');
    }
    expect(host.haulingLearning().label).toBe('Hauls on cue');
    // Then an exhibition at the Colosseum, through Oakhaven, and a lap of the glade's loop.
    travel(host, 'town-gate', -7.4, 1.2);
    expect(host.state.areaId).toBe('town');
    travel(host, 'colosseum-gate', -7.4, 1);
    expect(host.state.areaId).toBe('colosseum');
    go(host, -3, 1.9);
    must(host, 'exhibition', 'exhibit');
    beats(host);
    holdGauge(host, 0.62);
    expect(host.critter.competitions.at(-1)).toMatchObject({ day: 2, event: 'exhibition' });
    expect(act(host, 'exhibition', 'exhibit')).toBe(false);
    travel(host, 'gate', -7.4, 4);
    travel(host, 'gate', 7.4, 1);
    travel(host, 'gate', 7.4, 0);
    go(host, 1.2, 6);
    must(host, 'pace', 'pace');
    holdGauge(host, 0.6);
    host = sleepAndReload(host);

    // Day 3: Mallow forages and hauls on cue, and the Clover Cup closes the loop.
    expect(host.state.day).toBe(3);
    expect(host.critter.competitions.some((result) => result.event === 'exhibition')).toBe(true);
    travel(host, 'gate', 7.4, 0);
    for (const [x, z] of [
      [2, 0],
      [5, -1.5],
    ]) {
      go(host, x, z);
      must(host, host.interaction()!.id, 'critter-gather');
      play(host, 30);
    }
    expect(host.learning().label).toBe('Independent forager');
    travel(host, 'gate', -7.4, 0);
    // The turnips planted on day one are ready to sell, and the calendar shows what is next.
    go(host, -2.9, 1.3);
    must(host, 'plot-2', 'harvest');
    expect(items(host, 'turnip')).toBeGreaterThan(0);
    go(host, -6, 5);
    const coins = host.state.player.coins;
    must(host, 'market', 'sell-produce');
    expect(host.state.player.coins).toBeGreaterThan(coins);
    go(host, -4, -2);
    must(host, 'house', 'enter');
    go(host, 0.2, -2.4);
    must(host, 'calendar', 'read-calendar');
    go(host, 1.6, 3.8);
    must(host, 'door', 'leave');
    expect(host.state.areaId).toBe('homestead');
    // A hungry worker eats at the trough before hauling, so stock it and feed Mallow first.
    go(host, 0.6, 0.3);
    must(host, host.critter.id, 'feed');
    go(host, 6.5, -1.2);
    transfer(host, backpack(host.state).id, container('trough').id, 'feed');
    for (let cue = 0; cue < 2; cue++) {
      go(host, -1, 4);
      must(host, container('chest').id, 'cue-haul');
      play(host, 20);
    }
    expect(host.haulingLearning().label).toBe('Independent hauler');
    go(host, 2, 6);
    must(host, 'race', 'race');
    beats(host);
    expect(host.critter.competitions.filter((result) => result.day === 3)).toHaveLength(1);
    host = sleepAndReload(host);

    // Three days later: one continuous individual, grown in every direction it practiced.
    const mallow = activeCritter(host.state);
    expect(host.state.day).toBe(4);
    expect(mallow.id).toBe(start.id);
    expect(mallow.ageDays).toBe(start.ageDays + 3);
    for (const stat of ['strength', 'endurance', 'speed'] as const)
      expect(mallow.stats[stat], stat).toBeGreaterThan(start.stats[stat]);
    expect(mallow.bond).toBeGreaterThan(start.bond);
    expect(mallow.competitions.map((result) => result.event ?? 'race')).toEqual([
      'exhibition',
      'race',
    ]);
    expect(quantity(container('chest'), 'lumber')).toBeGreaterThanOrEqual(2);
    expect(host.state.shedLevel + host.state.player.coins).toBeGreaterThan(0);
  });
});
