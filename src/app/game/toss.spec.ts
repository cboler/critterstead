import { describe, expect, it } from 'vitest';
import { DRILLS, TOSS_STATION } from './content';
import { liftBand, sweepAccuracy, sweepBand, TOSS_PEAK, tossBand } from './drills';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, GameState, Training } from './model';
import { readSave, validateSave } from './storage';

function inGlade(modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.areaId = 'glade';
  state.player.position = { x: TOSS_STATION.x, z: TOSS_STATION.z + 0.8 };
  activeCritter(state).position = { x: TOSS_STATION.x + 0.6, z: TOSS_STATION.z };
  modify?.(state);
  return new LocalGameHost(state);
}
const hit = (host: LocalGameHost) => host.dispatch({ type: 'training-hit' });
const release = (host: LocalGameHost) => host.dispatch({ type: 'training-release' });

/** Charges and lets go (tap, tap) once the rising power reaches the target. */
function throwAt(host: LocalGameHost, target: number): void {
  host.update(0.1);
  expect(hit(host)).toBe(true);
  for (let tick = 0; tick < 300 && (host.state.training?.meter ?? 0) < target; tick++)
    host.update(0.01);
  expect(hit(host)).toBe(true);
}

describe('log toss', () => {
  it('pays for throws let go at the peak, notes the best throw, and counts the session', () => {
    const play = (target: number) => {
      const host = inGlade();
      expect(host.interaction()!.id).toBe('toss');
      expect(host.interaction()!.actions[0].label).toBe(
        `Log toss · 25 Mallow energy · 5 yours · 30 min`,
      );
      const before = structuredClone(host.critter);
      expect(host.dispatch({ type: 'interact', targetId: 'toss', action: 'toss' })).toBe(true);
      expect(host.critter.stamina).toBe(before.stamina - DRILLS.toss.energy);
      for (let round = 0; round < 3; round++) throwAt(host, target);
      expect(host.state.training).toBeNull();
      expect(host.critter.drills.sessions).toEqual({ toss: 1 });
      expect(host.critter.skills['tossing']).toBe(1);
      expect(host.state.flags).toContain('tossed');
      return { host, gain: host.critter.stats.strength - before.stats.strength };
    };
    const peak = play(TOSS_PEAK);
    const early = play(0.3);
    expect(peak.gain).toBeGreaterThan(0.75);
    expect(peak.gain - early.gain).toBeGreaterThan(0.4);
    expect(peak.host.state.journal[0]).toMatch(/^What a throw!.*Best throw \d+(\.\d)? m\./);
    expect(peak.host.critter.stats.speed).toBeGreaterThan(early.host.critter.stats.speed - 0.5);
  });

  it('throws on release after a hold, while a quick tap keeps the charge running', () => {
    const host = inGlade();
    host.dispatch({ type: 'interact', targetId: 'toss', action: 'toss' });
    host.update(0.1);
    expect(hit(host)).toBe(true);
    host.update(0.1);
    expect(release(host)).toBe(false);
    expect(host.state.training).toMatchObject({ stage: 1, hits: [] });
    host.update(0.6);
    expect(release(host)).toBe(true);
    expect(host.state.training).toMatchObject({ stage: 0 });
    expect(host.state.training!.hits).toHaveLength(1);
    // Releasing without a charge does nothing.
    expect(release(host)).toBe(false);
  });

  it('ends when time runs out, scoring unthrown logs as misses', () => {
    const host = inGlade();
    const before = host.critter.stats.strength;
    host.dispatch({ type: 'interact', targetId: 'toss', action: 'toss' });
    for (let second = 0; second < 30 && host.state.training; second++) host.update(1);
    expect(host.state.training).toBeNull();
    expect(host.state.journal[0]).toMatch(/^A brave try\./);
    expect(host.critter.stats.strength - before).toBeLessThan(0.5);
  });

  it('saves mid-throw and resumes the same charge', () => {
    const host = inGlade();
    host.dispatch({ type: 'interact', targetId: 'toss', action: 'toss' });
    throwAt(host, TOSS_PEAK);
    host.update(0.1);
    hit(host);
    host.update(0.3);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    expect(resumed.state.training).toMatchObject({ kind: 'toss', stage: 1 });
    const corrupt = structuredClone(host.state);
    delete (corrupt.training as Partial<Training>).meter;
    expect(() => readSave(corrupt)).toThrow(/kept/);
  });

  it('widens the sweet spot with strength', () => {
    const training = { assist: false } as Training;
    const width = (strength: number) => {
      const critter = createInitialState().critters[0];
      critter.stats.strength = strength;
      const [low, high] = tossBand(training, critter);
      return high - low;
    };
    expect(width(12)).toBeGreaterThan(width(2) * 1.5);
    expect(width(40)).toBeCloseTo(0.24);
  });
});

describe('wider timing windows', () => {
  it('widens every green zone and is fixed into the activity when it starts', () => {
    const plain = { assist: false } as Training;
    const wide = { assist: true } as Training;
    const critter = createInitialState().critters[0];
    for (const band of [liftBand, sweepBand, (training: Training) => tossBand(training, critter)]) {
      const [low, high] = band(plain);
      const [wideLow, wideHigh] = band(wide);
      expect(wideLow).toBeLessThan(low);
      expect(wideHigh).toBeGreaterThan(high);
    }
    expect(sweepAccuracy(0.56, true)).toBeCloseTo(1);
    expect(sweepAccuracy(0.56)).toBeCloseTo(0.88);

    const host = inGlade();
    host.assist = true;
    host.dispatch({ type: 'interact', targetId: 'toss', action: 'toss' });
    host.assist = false;
    expect(host.state.training).toMatchObject({ assist: true });
  });
});
