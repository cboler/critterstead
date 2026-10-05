import { kept } from './fixtures/household';
import { describe, expect, it } from 'vitest';
import { EXHIBITION } from './content';
import { liftScore, paceScore, startGauge, stepLift, stepPace, push } from './drills';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, GameState, Training } from './model';
import { readSave, validateSave } from './storage';
import { legacyV7 } from './fixtures/legacy-v7';

function act(host: LocalGameHost, targetId: string, action: string): boolean {
  return host.dispatch({ type: 'interact', targetId, action });
}
function at(x: number, z: number, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.player.position = { x, z };
  activeCritter(state).position = { x: x + 0.5, z };
  modify?.(state);
  return new LocalGameHost(state);
}
/** A patient player: tap whenever the gauge sits below the target. */
function playGauge(host: LocalGameHost, target: number, limit = 400): void {
  for (let tick = 0; tick < limit && host.state.training; tick++) {
    host.update(0.05);
    const training = host.state.training;
    if (training && (training.meter ?? 0) < target) host.dispatch({ type: 'training-hit' });
  }
}
function beats(host: LocalGameHost): void {
  for (let beat = 0; beat < 3; beat++) {
    // Wait for the marker near the center before each cue.
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
function gauge(kind: Training['kind']): Training {
  const training: Training = { critterId: 'c', phase: 0, hits: [], elapsed: 0, kind };
  startGauge(training);
  return training;
}

describe('gauge drill physics', () => {
  it('rewards holding the lift in the green, and strength makes the boulder easier', () => {
    const critter = createInitialState().critters[0];
    const idle = gauge('lift');
    for (let tick = 0; tick < 300 && !stepLift(idle, critter, 0.05); tick++) idle.elapsed += 0.05;
    expect(idle.progress).toBe(0);
    expect(liftScore(idle, critter)).toBe(0);

    const held = gauge('lift');
    let last = -1;
    for (let tick = 0; tick < 300; tick++) {
      held.elapsed += 0.05;
      if (stepLift(held, critter, 0.05)) break;
      if (held.meter! < 0.62 && held.elapsed - last >= 0.08) {
        push(held);
        last = held.elapsed;
      }
    }
    expect(held.progress).toBe(1);
    expect(liftScore(held, critter)).toBeGreaterThan(0.8);

    const weak = gauge('lift');
    const strong = gauge('lift');
    weak.meter = strong.meter = 0.8;
    stepLift(weak, critter, 1);
    stepLift(strong, { ...critter, stats: { ...critter.stats, strength: 15 } }, 1);
    expect(strong.meter).toBeGreaterThan(weak.meter!);
  });

  it('makes sprinting wind the runner while a steady pace finishes with a better score', () => {
    const critter = createInitialState().critters[0];
    const run = (target: number) => {
      const training = gauge('pace');
      let winded = false;
      let last = -1;
      for (let tick = 0; tick < 400; tick++) {
        training.elapsed += 0.05;
        if (stepPace(training, critter, 0.05)) break;
        winded ||= training.stage === 1;
        if (training.meter! < target && training.elapsed - last >= 0.08) {
          push(training);
          last = training.elapsed;
        }
      }
      return { score: paceScore(training), winded, training };
    };
    const sprint = run(1);
    const steady = run(0.64);
    expect(sprint.winded).toBe(true);
    expect(steady.winded).toBe(false);
    expect(steady.training.progress).toBe(1);
    expect(steady.score).toBeGreaterThan(sprint.score);
  });
});

describe('diminishing same-day training returns', () => {
  it('shrinks repeated hoops gains, shows it before commitment and resets tomorrow', () => {
    const host = at(3, 2);
    const gains: number[] = [];
    for (let session = 0; session < 3; session++) {
      host.critter.stamina = 100;
      host.state.player.stamina = 100;
      host.critter.hunger = 20;
      const label = host.interaction()!.actions[0].label;
      expect(label.endsWith(['', ' · 55% gains today', ' · 30% gains today'][session])).toBe(true);
      const before = host.critter.stats.speed;
      expect(act(host, 'training', 'train')).toBe(true);
      beats(host);
      gains.push(host.critter.stats.speed - before);
    }
    expect(gains[1] / gains[0]).toBeCloseTo(0.55, 1);
    expect(gains[2] / gains[0]).toBeCloseTo(0.3, 1);
    expect(host.critter.drills).toEqual({ day: 1, sessions: { hoops: 3 } });
    expect(host.state.journal[0]).toContain('30% gains, repeated today');
    host.dispatch({ type: 'debug', action: 'next-day' });
    host.state.player.position = { x: 3, z: 2 };
    expect(host.interaction()!.actions[0].label).not.toContain('gains today');
  });

  it('tracks each discipline separately, so a mixed day keeps full gains', () => {
    const host = at(5.2, 5.8);
    expect(host.interaction()!.id).toBe('lift');
    const before = structuredClone(host.critter);
    const minutes = host.state.totalMinutes;
    expect(act(host, 'lift', 'lift')).toBe(true);
    expect(host.critter.stamina).toBe(before.stamina - 25);
    expect(() => validateSave(host.state)).not.toThrow();
    // A mid-drill save resumes the same paid session without charging again.
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    playGauge(resumed, 0.62);
    expect(resumed.state.training).toBeNull();
    expect(resumed.critter.stamina).toBe(before.stamina - 25);
    expect(resumed.critter.stats.strength).toBeGreaterThan(before.stats.strength + 0.6);
    expect(resumed.state.totalMinutes).toBeGreaterThanOrEqual(minutes + 30);
    expect(resumed.critter.drills.sessions).toEqual({ lift: 1 });
    resumed.state.player.position = { x: 3, z: 2 };
    expect(resumed.interaction()!.actions[0].label).not.toContain('gains today');
  });

  it('runs the glade pacing loop and builds endurance', () => {
    const host = at(1.2, 6, (state) => (state.areaId = 'glade'));
    expect(host.interaction()!.id).toBe('pace');
    const before = host.critter.stats.endurance;
    expect(act(host, 'pace', 'pace')).toBe(true);
    playGauge(host, 0.64);
    expect(host.state.training).toBeNull();
    expect(host.critter.stats.endurance).toBeGreaterThan(before + 0.5);
    expect(host.state.flags).toContain('paced');
  });
});

describe('Colosseum exhibition', () => {
  it('opens through Oakhaven, scores sprint and stone pull, pays a medal once per day', () => {
    const host = at(-7.4, 1, (state) => (state.areaId = 'town'));
    expect(host.interaction()!.actions[0].label).toBe('Walk to the Colosseum · 10 min');
    const minutes = host.state.totalMinutes;
    expect(act(host, 'colosseum-gate', 'travel')).toBe(true);
    expect(host.state.areaId).toBe('colosseum');
    expect(host.state.totalMinutes).toBe(minutes + 10);
    host.state.player.position = { x: -3, z: 1.8 };
    const coins = host.state.player.coins;
    expect(act(host, 'exhibition', 'exhibit')).toBe(true);
    expect(host.critter.stamina).toBe(100 - EXHIBITION.energy);
    beats(host);
    expect(host.state.training).toMatchObject({
      kind: 'lift',
      event: 'exhibition',
      leg: 1,
      hard: true,
    });
    expect(() => validateSave(host.state)).not.toThrow();
    playGauge(host, 0.62);
    expect(host.state.training).toBeNull();
    const showing = host.critter.competitions.at(-1)!;
    expect(showing).toMatchObject({ day: 1, event: 'exhibition' });
    expect(showing.time).toBeGreaterThan(40);
    expect(host.state.player.coins - coins).toBe(EXHIBITION.coins[showing.medal as 'gold']);
    expect(host.state.journal[0]).toContain('The crowd roars');
    expect(act(host, 'exhibition', 'exhibit')).toBe(false);
    // The Clover Cup is a separate event.
    const home = at(2, 6, (state) => (state.critters[0].competitions = [showing]));
    expect(home.interaction()!.actions[0].disabled).toBe(false);
  });

  it('rewards trained speed and strength with more points', () => {
    const points = (stat: number) => {
      const host = at(-3, 1.8, (state) => {
        state.areaId = 'colosseum';
        state.critters[0].stats.speed = stat;
        state.critters[0].stats.strength = stat;
      });
      act(host, 'exhibition', 'exhibit');
      beats(host);
      playGauge(host, 0.62);
      return host.critter.competitions.at(-1)!.time;
    };
    expect(points(12) - points(4)).toBeGreaterThan(30);
  });
});

describe('save v8 training migration', () => {
  it('migrates frozen v7 with no remembered sessions and protects damaged training data', () => {
    const before = structuredClone(legacyV7);
    const state = readSave(before);
    expect(before).toEqual(legacyV7);
    expect(state.version).toBe(13);
    expect(kept(state.critters).map((critter) => critter.drills)).toEqual([
      { day: before.day, sessions: {} },
      { day: before.day, sessions: {} },
    ]);
    expect(state.plots).toEqual(before.plots);
    expect(state.training).toEqual(before.training);
    expect(readSave(state)).toEqual(state);

    const invalid: unknown[] = [
      { ...structuredClone(legacyV7), areaId: 'colosseum' },
      {
        ...structuredClone(legacyV7),
        critters: legacyV7.critters.map((critter) => ({ ...critter, drills: {} })),
      },
    ];
    const damage: ((state: GameState) => void)[] = [
      (value) => (value.critters[0].drills = { day: 1, sessions: { juggling: 2 } as never }),
      (value) => (value.critters[0].drills.sessions.lift = -1),
      (value) =>
        (value.training = {
          critterId: value.activeCritterId,
          phase: 0,
          hits: [],
          elapsed: 0,
          kind: 'lift',
        }),
      (value) =>
        (value.training = {
          critterId: value.activeCritterId,
          phase: 0,
          hits: [],
          elapsed: 0,
          kind: 'pace',
          meter: 2,
          progress: 0,
        }),
      (value) =>
        value.critters[0].competitions.push({
          day: 1,
          time: 50,
          medal: 'gold',
          event: 'rodeo' as never,
        }),
    ];
    for (const change of damage) {
      const value = createInitialState();
      change(value);
      invalid.push(value);
    }
    for (const value of invalid) {
      const copy = structuredClone(value);
      expect(() => readSave(value)).toThrow(/kept/);
      expect(value).toEqual(copy);
    }
  });
});
