import { describe, expect, it } from 'vitest';
import { DRILLS, ROUTINE } from './content';
import { kept } from './fixtures/household';
import { legacyV10 } from './fixtures/legacy-v10';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, GameState } from './model';
import { readSave, validateSave } from './storage';

/** At the boulder lift, optionally having lifted together before. */
function atLift(modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.player.position = { x: 5.2, z: 5.8 };
  activeCritter(state).position = { x: 5.7, z: 5.8 };
  modify?.(state);
  return new LocalGameHost(state);
}
const routine = (host: LocalGameHost) =>
  host.dispatch({ type: 'interact', targetId: 'lift', action: 'routine' });
/** Lets a routine play out, as the clock does. */
function watch(host: LocalGameHost): void {
  for (let tick = 0; tick < 50 && host.state.training; tick++) host.update(0.1);
}

describe('routines', () => {
  it('stay locked until the drill has been played together', () => {
    const host = atLift();
    const action = host.interaction()!.actions.find((item) => item.id === 'routine')!;
    expect(action).toMatchObject({
      disabled: true,
      reason: 'Play it together once first; then Mallow can run it alone.',
    });
    expect(routine(host)).toBe(false);
    expect(host.state.training).toBeNull();
  });

  it('cost more of the critter and none of you, play out alone, and pay from a drawn score', () => {
    const host = atLift((state) => (activeCritter(state).practised = { lift: 1 }));
    const before = structuredClone(host.state);
    const action = host.interaction()!.actions.find((item) => item.id === 'routine')!;
    const cost = DRILLS.lift.energy + ROUTINE.extraEnergy;
    expect(action).toMatchObject({
      disabled: false,
      label: `Run it as a routine · ${cost} Mallow energy · 30 min`,
    });
    expect(routine(host)).toBe(true);
    expect(host.critter.stamina).toBe(activeCritter(before).stamina - cost);
    expect(host.state.player.stamina).toBe(before.player.stamina);
    expect(host.state.training).toMatchObject({ kind: 'routine', drill: 'lift' });
    const score = host.state.training!.scores![0];
    expect(Object.values(ROUTINE.scores)).toContain(score);
    // There is nothing to press; the critter works through it alone.
    host.update(0.5);
    expect(host.dispatch({ type: 'training-hit' })).toBe(false);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    watch(host);
    expect(host.state.training).toBeNull();
    expect(host.critter.stats.strength).toBeGreaterThan(activeCritter(before).stats.strength);
    expect(host.state.journal[0]).toMatch(/Mallow ran it alone and gains/);
    expect(host.state.totalMinutes).toBeGreaterThanOrEqual(before.totalMinutes + 30);
    // It counts toward today's repeats, but not as practice together, and bonds a little.
    expect(host.critter.drills.sessions).toEqual({ lift: 1 });
    expect(host.critter.practised).toEqual({ lift: 1 });
    expect(host.critter.bond).toBe(activeCritter(before).bond + 1);
    // The resumed copy keeps the same drawn result.
    watch(resumed);
    expect(resumed.critter.stats).toEqual(host.critter.stats);
  });

  it('pays less than a drill played well together, and more on a great day than a flop', () => {
    const strength = (score: number | null) => {
      const host = atLift((state) => (activeCritter(state).practised = { lift: 1 }));
      const before = host.critter.stats.strength;
      if (score === null) {
        host.dispatch({ type: 'interact', targetId: 'lift', action: 'lift' });
        for (let tick = 0; tick < 400 && host.state.training; tick++) {
          host.update(0.05);
          if ((host.state.training?.meter ?? 1) < 0.62) host.dispatch({ type: 'training-hit' });
        }
      } else {
        routine(host);
        host.state.training!.scores = [score];
        watch(host);
      }
      return host.critter.stats.strength - before;
    };
    const together = strength(null);
    const { flop, fair, great } = ROUTINE.scores;
    expect(together).toBeGreaterThan(strength(fair));
    expect(strength(great)).toBeGreaterThan(strength(fair));
    expect(strength(fair)).toBeGreaterThan(strength(flop));
  });

  it('draws mostly fair sessions, with more great ones for a happy, fed, close companion', () => {
    const draws = (care: number) => {
      const counts = { flop: 0, fair: 0, great: 0 };
      for (let seed = 1; seed <= 300; seed++) {
        const host = atLift((state) => {
          // Spread the seeds: neighbouring small seeds give nearly the same first draw.
          state.seed = Math.imul(seed, 2654435761) >>> 0;
          const critter = activeCritter(state);
          critter.practised = { lift: 1 };
          critter.happiness = critter.bond = care;
          // Above 80 hunger no drill can start at all.
          critter.hunger = Math.min(80, 100 - care);
        });
        routine(host);
        const score = host.state.training!.scores![0];
        const outcome = (Object.keys(ROUTINE.scores) as (keyof typeof counts)[]).find(
          (key) => ROUTINE.scores[key] === score,
        )!;
        counts[outcome]++;
      }
      return counts;
    };
    const content = draws(100);
    const neglected = draws(0);
    expect(content.fair).toBeGreaterThan(150);
    expect(content.great).toBeGreaterThan(content.flop);
    expect(neglected.flop).toBeGreaterThan(neglected.great);
  });

  it('unlock when the drill is first played together', () => {
    const host = atLift();
    host.dispatch({ type: 'interact', targetId: 'lift', action: 'lift' });
    for (let tick = 0; tick < 400 && host.state.training; tick++) host.update(0.05);
    expect(host.critter.practised).toEqual({ lift: 1 });
    expect(host.interaction()!.actions.find((item) => item.id === 'routine')!.disabled).toBe(false);
  });
});

describe('save v11 practice', () => {
  it('migrates frozen v10, unlocking what each companion had already played together', () => {
    const before = structuredClone(legacyV10);
    const migrated = readSave(before);
    expect(before).toEqual(legacyV10);
    expect(migrated.version).toBe(11);
    // Two lifts were counted as a skill; the household's hoops flag is the companion's.
    expect(activeCritter(migrated).practised).toEqual({ hoops: 1, lift: 2 });
    expect(migrated.critters.find((critter) => critter.ownerId === 'grandpa')!.practised).toEqual(
      {},
    );
    expect(kept(migrated.critters)).toEqual(kept(legacyV10.critters as never));
    expect({ ...migrated, critters: [] }).toEqual({ ...legacyV10, version: 11, critters: [] });
    expect(readSave(migrated)).toEqual(migrated);
  });

  it('protects saves with damaged practice or routines', () => {
    const damage: ((state: GameState) => void)[] = [
      (state) => (activeCritter(state).practised = { juggling: 1 } as never),
      (state) => (activeCritter(state).practised = { lift: 0 }),
      (state) => delete (activeCritter(state) as Partial<GameState['critters'][0]>).practised,
      (state) =>
        (state.training = {
          critterId: state.activeCritterId,
          phase: 0,
          hits: [],
          elapsed: 0,
          kind: 'routine',
          scores: [0.5],
        }),
      (state) =>
        (state.training = {
          critterId: state.activeCritterId,
          phase: 0,
          hits: [],
          elapsed: 0,
          kind: 'routine',
          drill: 'lift',
        }),
    ];
    const invalid: unknown[] = damage.map((change) => {
      const state = createInitialState();
      change(state);
      return state;
    });
    invalid.push({
      ...structuredClone(legacyV10),
      critters: legacyV10.critters.map((critter) => ({ ...critter, practised: {} })),
    });
    for (const value of invalid) {
      const copy = structuredClone(value);
      expect(() => readSave(value)).toThrow(/kept/);
      expect(value).toEqual(copy);
    }
  });
});
