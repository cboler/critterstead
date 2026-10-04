import { describe, expect, it } from 'vitest';
import { BEAM_STATION, DRILLS, RUN_LANE } from './content';
import {
  BEAM_CROSSING,
  beamBand,
  beamZone,
  HURDLE_HEIGHT,
  runCourse,
  RUN_SECONDS,
  runJump,
} from './drills';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, GameState, Training } from './model';
import { readSave, validateSave } from './storage';

function at(station: { x: number; z: number }, modify?: (state: GameState) => void) {
  const state = createInitialState();
  state.areaId = 'glade';
  state.player.position = { x: station.x, z: station.z + 0.8 };
  activeCritter(state).position = { x: station.x + 0.6, z: station.z + 0.6 };
  modify?.(state);
  return new LocalGameHost(state);
}
const hit = (host: LocalGameHost) => host.dispatch({ type: 'training-hit' });
const steer = (host: LocalGameHost, direction: number) =>
  host.dispatch({ type: 'training-steer', direction });

/** Leans toward the zone's centre every tick, as a steady player would. */
function crossBeam(host: LocalGameHost, follow: boolean): void {
  for (let tick = 0; tick < 30 * 25 && host.state.training; tick++) {
    const training = host.state.training;
    const off = training.phase - (training.meter ?? 0);
    steer(host, follow && Math.abs(off) > 0.02 ? Math.sign(off) : 0);
    host.update(1 / 30);
  }
}

/** Jumps each hurdle on cue: once for a stump, twice near the top for a hedge. */
function runCourseWell(host: LocalGameHost, jumps = 2): void {
  for (let tick = 0; tick < 60 * 30 && host.state.training; tick++) {
    const training = host.state.training;
    const run = (training.progress ?? 0) * RUN_SECONDS;
    const next = runCourse(training.seed!)[training.hits.length];
    const lead = next ? next.at - run : Infinity;
    const used = training.stage ?? 0;
    if (used === 0 && lead < (next?.tall && jumps > 1 ? 0.62 : 0.32)) hit(host);
    else if (used === 1 && jumps > 1 && next?.tall && lead < 0.45 && (training.rise ?? 0) < 0.4)
      hit(host);
    host.update(1 / 60);
  }
}

describe('balance beam', () => {
  it('pays for keeping steady in the drifting zone and notes the crossing time', () => {
    const play = (follow: boolean) => {
      const host = at(BEAM_STATION);
      expect(host.interaction()!.id).toBe('beam');
      expect(host.interaction()!.actions[0].label).toBe(
        'Balance beam · 25 Mallow energy · 5 yours · 30 min',
      );
      const before = structuredClone(host.critter);
      expect(host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' })).toBe(true);
      expect(host.critter.stamina).toBe(before.stamina - DRILLS.beam.energy);
      crossBeam(host, follow);
      expect(host.state.training).toBeNull();
      expect(host.critter.drills.sessions).toEqual({ beam: 1 });
      expect(host.critter.skills['balancing']).toBe(1);
      expect(host.state.flags).toContain('balanced');
      return { host, gain: host.critter.stats.endurance - before.stats.endurance };
    };
    const steady = play(true);
    const still = play(false);
    expect(steady.gain).toBeGreaterThan(0.8);
    expect(steady.gain - still.gain).toBeGreaterThan(0.25);
    expect(steady.host.state.journal[0]).toMatch(/^Steady as a stone!.*Across in 1\d\.\d s\./);
    expect(steady.host.critter.stats.strength).toBeGreaterThan(still.host.critter.stats.strength);
  });

  it('is steered, not pressed, and only while on the beam', () => {
    const host = at(BEAM_STATION);
    expect(steer(host, 1)).toBe(false);
    host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' });
    host.update(0.2);
    expect(hit(host)).toBe(false);
    const start = host.state.training!.meter!;
    expect(steer(host, 5)).toBe(true);
    host.update(0.5);
    // Clamped to a full lean: 0.6 a second.
    expect(host.state.training!.meter! - start).toBeCloseTo(0.3, 2);
    expect(steer(host, Number.NaN)).toBe(false);
  });

  it('wobbles and slows outside the zone, and a crossing never left alone runs out of time', () => {
    const host = at(BEAM_STATION);
    host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' });
    for (let tick = 0; tick < 30 * 22 && host.state.training; tick++) {
      steer(host, -1);
      host.update(1 / 30);
      if (host.state.training && host.state.training.elapsed > 3)
        expect(host.state.training.stage).toBe(1);
    }
    expect(host.state.training).toBeNull();
    expect(host.state.journal[0]).toMatch(/^A wobbly try\./);
    expect(host.state.journal[0]).not.toMatch(/Across in/);
  });

  it('draws the drift from the seed and widens the zone with endurance and the assist', () => {
    const training = { elapsed: 3, seed: 0.25 } as Training;
    expect(beamZone(training)).toBe(beamZone({ ...training }));
    expect(beamZone(training)).not.toBe(beamZone({ ...training, seed: 0.75 }));
    const critter = createInitialState().critters[0];
    const width = (endurance: number, assist = false) => {
      critter.stats.endurance = endurance;
      const [low, high] = beamBand({ phase: 0.5, assist } as Training, critter);
      return high - low;
    };
    expect(width(15)).toBeGreaterThan(width(2) * 1.4);
    expect(width(40)).toBeCloseTo(0.32);
    expect(width(5, true)).toBeGreaterThan(width(5));
    // Two sessions in a row draw different drifts.
    const host = at(BEAM_STATION);
    host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' });
    const first = host.state.training!.seed;
    crossBeam(host, true);
    host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' });
    expect(host.state.training!.seed).not.toBe(first);
    expect(BEAM_CROSSING).toBe(10);
  });

  it('saves mid-crossing and resumes the same drift', () => {
    const host = at(BEAM_STATION);
    host.dispatch({ type: 'interact', targetId: 'beam', action: 'beam' });
    steer(host, 1);
    host.update(1.5);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    host.update(0.5);
    resumed.update(0.5);
    expect(resumed.state.training!.phase).toBe(host.state.training!.phase);
    const corrupt = structuredClone(host.state);
    delete (corrupt.training as Partial<Training>).seed;
    expect(() => readSave(corrupt)).toThrow(/kept/);
  });
});

describe('hurdle run', () => {
  it('lays out a fair course from its seed', () => {
    for (const seed of [0, 0.1, 0.37, 0.5, 0.82, 0.999]) {
      const course = runCourse(seed);
      expect(course).toEqual(runCourse(seed));
      expect(course.length).toBeGreaterThanOrEqual(9);
      expect(course.length).toBeLessThanOrEqual(15);
      expect(course.slice(0, 2).every((hurdle) => !hurdle.tall)).toBe(true);
      expect(course.at(-1)!.at).toBeLessThan(RUN_SECONDS - 1.4);
      course.slice(1).forEach((hurdle, index) => {
        expect(hurdle.at - course[index].at).toBeGreaterThan(hurdle.tall ? 1.59 : 1.29);
      });
    }
    expect(runCourse(0.1)).not.toEqual(runCourse(0.37));
    expect([0.1, 0.37, 0.5, 0.82].some((seed) => runCourse(seed).some((h) => h.tall))).toBe(true);
  });

  it('pays for clean jumps and notes the hurdles cleared', () => {
    const play = (jumps: number) => {
      const host = at(RUN_LANE);
      expect(host.interaction()!.id).toBe('run');
      expect(host.interaction()!.actions[0].label).toBe(
        'Hurdle run · 30 Mallow energy · 5 yours · 35 min',
      );
      const before = structuredClone(host.critter);
      expect(host.dispatch({ type: 'interact', targetId: 'run', action: 'run' })).toBe(true);
      const course = runCourse(host.state.training!.seed!);
      if (jumps > 0) runCourseWell(host, jumps);
      else for (let second = 0; second < 30 && host.state.training; second++) host.update(1);
      expect(host.state.training).toBeNull();
      expect(host.critter.drills.sessions).toEqual({ run: 1 });
      expect(host.critter.skills['running']).toBe(1);
      expect(host.state.flags).toContain('ran');
      return { host, course, gain: host.critter.stats.speed - before.stats.speed };
    };
    const clean = play(2);
    expect(clean.host.state.journal[0]).toMatch(
      new RegExp(`^A clean run!.*Cleared ${clean.course.length} of ${clean.course.length} hurdles`),
    );
    const none = play(0);
    expect(none.host.state.journal[0]).toMatch(/^A tumbly try\..*Cleared 0 of \d+ hurdles/);
    expect(clean.gain).toBeGreaterThan(0.9);
    expect(clean.gain - none.gain).toBeGreaterThan(0.6);
  });

  it('clears a stump with one jump but needs a second for a hedge', () => {
    // A seed whose course has a hedge: single jumps clear every stump and no hedge.
    const seed = [0.1, 0.37, 0.5, 0.82].find((value) => runCourse(value).some((h) => h.tall))!;
    const host = at(RUN_LANE);
    host.dispatch({ type: 'interact', targetId: 'run', action: 'run' });
    host.state.training!.seed = seed;
    runCourseWell(host, 1);
    // Score is lost only on the hedges.
    const course = runCourse(seed);
    const stumps = course.filter((hurdle) => !hurdle.tall).length;
    expect(host.state.journal[0]).toContain(`Cleared ${stumps} of ${course.length} hurdles`);
    // A single jump's peak stays under a hedge; a double jump's tops it.
    const critter = createInitialState().critters[0];
    const peak = runJump(critter) ** 2 / (2 * 5.2);
    expect(peak).toBeGreaterThan(HURDLE_HEIGHT.low + 0.15);
    expect(peak).toBeLessThan(HURDLE_HEIGHT.tall);
    expect(peak * 2).toBeGreaterThan(HURDLE_HEIGHT.tall + 0.15);
  });

  it('jumps twice at most before landing', () => {
    const host = at(RUN_LANE);
    host.dispatch({ type: 'interact', targetId: 'run', action: 'run' });
    host.update(0.1);
    expect(hit(host)).toBe(true);
    host.update(0.1);
    expect(hit(host)).toBe(true);
    host.update(0.1);
    expect(hit(host)).toBe(false);
    expect(host.state.training).toMatchObject({ stage: 2 });
    for (let tick = 0; tick < 120 && host.state.training!.meter! > 0; tick++) host.update(1 / 60);
    expect(host.state.training).toMatchObject({ stage: 0, meter: 0, rise: 0 });
    expect(hit(host)).toBe(true);
  });

  it('saves mid-jump and resumes the same course', () => {
    const host = at(RUN_LANE);
    host.dispatch({ type: 'interact', targetId: 'run', action: 'run' });
    runCourseWell(host);
    // Finished: start another and stop partway through it.
    host.dispatch({ type: 'interact', targetId: 'run', action: 'run' });
    for (let tick = 0; tick < 60 * 8; tick++) {
      const training = host.state.training!;
      if (tick === 60 * 7) hit(host);
      expect(training.hits.length).toBeLessThanOrEqual(runCourse(training.seed!).length);
      host.update(1 / 60);
    }
    expect(host.state.training!.hits.length).toBeGreaterThan(2);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    const corrupt = structuredClone(host.state);
    corrupt.training!.hits = Array<number>(runCourse(corrupt.training!.seed!).length + 1).fill(1);
    expect(() => readSave(corrupt)).toThrow(/kept/);
    const stage = structuredClone(host.state);
    stage.training!.stage = 3;
    expect(() => readSave(stage)).toThrow(/kept/);
  });

  it('runs alone as a routine once played together', () => {
    const host = at(RUN_LANE);
    const routine = () => host.interaction()!.actions.find((action) => action.id === 'routine')!;
    expect(routine().disabled).toBe(true);
    host.dispatch({ type: 'interact', targetId: 'run', action: 'run' });
    runCourseWell(host);
    host.critter.stamina = 100;
    expect(routine().disabled).toBe(false);
    expect(host.dispatch({ type: 'interact', targetId: 'run', action: 'routine' })).toBe(true);
    expect(host.state.training).toMatchObject({ kind: 'routine', drill: 'run' });
    for (let second = 0; second < 5 && host.state.training; second++) host.update(1);
    expect(host.state.journal[0]).toMatch(/ran it alone and gains/);
    expect(host.critter.drills.sessions).toEqual({ run: 2 });
  });
});
