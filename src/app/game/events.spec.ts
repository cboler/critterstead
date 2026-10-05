import { describe, expect, it } from 'vitest';
import { upcomingEvents, nextExhibition } from './calendar';
import { EXHIBITIONS, legKind, scheduledExhibition } from './content';
import {
  activeMoment,
  beamBand,
  hurdleHalf,
  momentWindow,
  rhythmSong,
  rhythmWindow,
  runCourse,
  RUN_SECONDS,
  stepPace,
  TOSS_PEAK,
  tossBand,
} from './drills';
import { legacyV11 } from './fixtures/legacy-v11';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, ExhibitionId, GameState, Training } from './model';
import { readSave, validateSave } from './storage';

/** At the booth on a day of spring, with a fed, rested companion and coins to spare. */
function booth(day: number, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.day = day;
  state.totalMinutes = (day - 1) * 1440 + state.minute;
  state.areaId = 'colosseum';
  state.areaInstanceId = 'local-colosseum';
  state.player.position = { x: -3, z: 1.8 };
  state.player.coins = 50;
  activeCritter(state).position = { x: -2.5, z: 1.8 };
  modify?.(state);
  return new LocalGameHost(state);
}
const hit = (host: LocalGameHost, lane?: number) => host.dispatch({ type: 'training-hit', lane });

/** A capable player: whatever the leg, it is played well until the event ends. */
function perform(host: LocalGameHost, legs: Training['kind'][] = []): void {
  for (let tick = 0; tick < 60 * 200 && host.state.training; tick++) {
    const training = host.state.training;
    if (legs.at(-1) !== training.kind || legs.length <= (training.leg ?? 0))
      legs.push(training.kind);
    const since = training.elapsed - (training.lastHitAt ?? 0);
    switch (training.kind) {
      case 'training':
        if (since > 0.3 && Math.abs(training.phase - 0.5) < 0.03) hit(host);
        break;
      case 'lift':
        if ((training.meter ?? 0) < 0.64) hit(host);
        break;
      case 'pace':
        if ((training.meter ?? 0) < 0.56) hit(host);
        break;
      case 'toss':
        if (training.stage !== 1) {
          if (since > 0.1) hit(host);
        } else if ((training.meter ?? 0) >= TOSS_PEAK - 0.005) hit(host);
        break;
      case 'beam': {
        const off = training.phase - (training.meter ?? 0);
        host.dispatch({
          type: 'training-steer',
          direction: Math.abs(off) > 0.02 ? Math.sign(off) : 0,
        });
        break;
      }
      case 'run': {
        const run = (training.progress ?? 0) * RUN_SECONDS;
        const next = runCourse(training.seed!)[training.hits.length];
        const lead = next ? next.at - run : Infinity;
        if ((training.stage ?? 0) === 0 && lead < (next?.tall ? 0.62 : 0.3)) hit(host);
        else if (training.stage === 1 && next?.tall && lead < 0.45 && (training.rise ?? 0) < 0.4)
          hit(host);
        break;
      }
      case 'rhythm': {
        const note = rhythmSong(training.seed!)[training.hits.length];
        if (note && training.elapsed >= note.at) hit(host, note.lane);
        break;
      }
      case 'chess': {
        const moment = activeMoment(training);
        if (moment && training.elapsed >= moment.at + 0.3)
          host.dispatch({ type: moment.kind === 'idea' ? 'training-hit' : 'training-shoo' });
        break;
      }
    }
    host.update(1 / 60);
  }
}

describe('the Colosseum calendar', () => {
  it('holds each event on its days of every season, and posts the next one', () => {
    expect([1, 4, 6, 8, 10, 14, 20, 28, 30].map(scheduledExhibition)).toEqual([
      null,
      'hedgerow',
      'strongpaw',
      'clever',
      'meadow',
      'hedgerow',
      'meadow',
      'clever',
      'grand',
    ]);
    expect(nextExhibition(1)).toEqual({
      id: 'hedgerow',
      day: 4,
      when: 'in 3 days (Spring 4, Year 1)',
    });
    expect(nextExhibition(5)).toMatchObject({ id: 'strongpaw', when: 'tomorrow' });
    // Summer 4 is day 34: the schedule repeats each season.
    expect(nextExhibition(31)).toMatchObject({ id: 'hedgerow', day: 34 });
    const calendar = upcomingEvents(createInitialState()).filter(
      (event) => event.kind === 'exhibition',
    );
    expect(calendar.map((event) => event.day)).toEqual([
      4, 6, 8, 10, 14, 16, 18, 20, 24, 26, 28, 30,
    ]);
    expect(calendar[0].label).toBe('Hedgerow Dash · Colosseum · 6 coins to enter');
    const board = booth(2, (state) => {
      state.areaId = 'town';
      state.player.position = { x: 2.4, z: 3.2 };
    });
    expect(board.interaction()?.description).toContain('A poster for the Hedgerow Dash, in 2 days');
  });

  it('offers the day’s event beside the everyday showing, for its fee', () => {
    const quiet = booth(2);
    expect(quiet.interaction()!.actions.map((action) => action.id)).toEqual(['exhibit']);
    expect(quiet.interaction()!.description).toContain('Next on the calendar: the Hedgerow Dash');
    const host = booth(4);
    expect(host.interaction()!.title).toBe('Today: the Hedgerow Dash');
    expect(host.interaction()!.actions.map((action) => action.label)).toEqual([
      'Enter the Hedgerow Dash · 6 coins · 50 Mallow energy · 70 min',
      'Enter the exhibition · 40 Mallow energy · 5 yours · 60 min',
    ]);
    const poor = booth(4, (state) => (state.player.coins = 5));
    expect(poor.interaction()!.actions[0]).toMatchObject({
      disabled: true,
      reason: 'The entry fee is 6 coins.',
    });
    // An event not held today cannot be entered by name.
    expect(host.dispatch({ type: 'interact', targetId: 'exhibition', action: 'grand' })).toBe(
      false,
    );
  });
});

describe('Colosseum events', () => {
  const days: Record<Exclude<ExhibitionId, 'exhibition'>, number> = {
    hedgerow: 4,
    strongpaw: 6,
    clever: 8,
    meadow: 10,
    grand: 30,
  };

  it.each(Object.entries(days))(
    'plays the %s’s legs on harder settings and pays a medal once',
    (id, day) => {
      const event = EXHIBITIONS[id as ExhibitionId];
      const host = booth(day);
      const before = structuredClone(host.state);
      expect(host.dispatch({ type: 'interact', targetId: 'exhibition', action: id })).toBe(true);
      expect(host.state.player.coins).toBe(before.player.coins - event.fee);
      expect(host.critter.stamina).toBe(100 - event.energy);
      expect(host.state.training).toMatchObject({ event: id, leg: 0, hard: true, scores: [] });
      expect(() => validateSave(host.state)).not.toThrow();
      const legs: Training['kind'][] = [];
      perform(host, legs);
      expect(host.state.training).toBeNull();
      expect(legs).toEqual(event.legs.map((leg) => legKind(leg.drill)));
      const showing = host.critter.competitions.at(-1)!;
      expect(showing).toMatchObject({ day, event: id });
      expect(showing.medal).not.toBe('bronze');
      expect(host.state.player.coins).toBe(
        before.player.coins - event.fee + event.coins[showing.medal as 'gold'],
      );
      expect(host.state.journal[0]).toMatch(/^The crowd roars! Mallow scores [\d.]+ points \(/);
      expect(host.state.flags).toContain('exhibited');
      // Events pay medals and coins, not drill sessions.
      expect(host.critter.drills.sessions).toEqual({});
      expect(host.interaction()!.actions[0]).toMatchObject({
        disabled: true,
        reason: `Mallow has had today’s ${event.name}.`,
      });
    },
  );

  it('counts the stats each event favours', () => {
    const points = (id: ExhibitionId, stat: keyof GameState['player']['stats'], value: number) => {
      const host = booth(days[id as keyof typeof days], (state) => {
        activeCritter(state).stats[stat] = value;
      });
      host.dispatch({ type: 'interact', targetId: 'exhibition', action: id });
      perform(host);
      return host.critter.competitions.at(-1)!.time;
    };
    expect(points('hedgerow', 'speed', 14) - points('hedgerow', 'speed', 3)).toBeGreaterThan(40);
    expect(
      points('strongpaw', 'strength', 14) - points('strongpaw', 'strength', 3),
    ).toBeGreaterThan(40);
    expect(
      points('clever', 'intelligence', 14) - points('clever', 'intelligence', 3),
    ).toBeGreaterThan(40);
    expect(points('meadow', 'endurance', 14) - points('meadow', 'endurance', 3)).toBeGreaterThan(
      35,
    );
    // The finale weighs everything a little; one stat moves it less.
    expect(points('grand', 'speed', 14) - points('grand', 'speed', 3)).toBeLessThan(20);
  });

  it('narrows every window on harder settings', () => {
    const critter = createInitialState().critters[0];
    const easy = { phase: 0.5 } as Training;
    const hard = { phase: 0.5, hard: true } as Training;
    const width = ([low, high]: [number, number]) => high - low;
    expect(width(tossBand(hard, critter))).toBeLessThan(width(tossBand(easy, critter)));
    expect(width(beamBand(hard, critter))).toBeLessThan(width(beamBand(easy, critter)));
    expect(hurdleHalf(hard)).toBeLessThan(hurdleHalf(easy));
    expect(rhythmWindow(hard, critter).good).toBeLessThan(rhythmWindow(easy, critter).good);
    expect(momentWindow(hard, critter, 'idea')).toBeLessThan(momentWindow(easy, critter, 'idea'));
    const breath = (training: Training) => {
      const pace = { ...training, kind: 'pace', meter: 0.9, reserve: 1, progress: 0, elapsed: 0 };
      stepPace(pace as Training, critter, 0.5);
      return pace.reserve;
    };
    expect(breath(hard)).toBeLessThan(breath(easy));
  });

  it('saves mid-event and resumes the same leg', () => {
    const host = booth(6);
    host.dispatch({ type: 'interact', targetId: 'exhibition', action: 'strongpaw' });
    // Through the throw, into the stone.
    for (let tick = 0; tick < 60 * 60 && host.state.training?.leg === 0; tick++) {
      const training = host.state.training;
      if (training.stage !== 1) {
        if (training.elapsed - (training.lastHitAt ?? 0) > 0.1) hit(host);
      } else if ((training.meter ?? 0) >= TOSS_PEAK - 0.005) hit(host);
      host.update(1 / 60);
    }
    host.update(0.4);
    expect(host.state.training).toMatchObject({ kind: 'lift', leg: 1, hard: true });
    expect(host.state.training!.scores).toHaveLength(1);
    expect(host.state.journal[0]).toMatch(/throw! Now the stone pull/);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    perform(resumed);
    expect(resumed.critter.competitions.at(-1)).toMatchObject({ event: 'strongpaw' });

    const damage: ((state: GameState) => void)[] = [
      (state) => (state.training!.kind = 'toss'),
      (state) => (state.training!.leg = 2),
      (state) => (state.training!.scores = []),
      (state) => delete state.training!.hard,
      (state) => ((state.training as unknown as Record<string, unknown>)['event'] = 'derby'),
      (state) =>
        (activeCritter(state).competitions = [
          { day: 1, time: 1, medal: 'gold', event: 'derby' as ExhibitionId },
        ]),
    ];
    for (const harm of damage) {
      const save = structuredClone(host.state);
      harm(save);
      expect(() => readSave(save)).toThrow(/kept/);
    }
  });
});

describe('save v12 Colosseum events', () => {
  it('migrates frozen v11, carrying a showing in progress on as the athletic event', () => {
    const before = structuredClone(legacyV11);
    const migrated = readSave(before);
    expect(before).toEqual(legacyV11);
    expect(migrated.version).toBe(12);
    expect(migrated.training).toEqual({
      critterId: legacyV11.activeCritterId,
      phase: 0,
      hits: [],
      elapsed: 1.4,
      lastHitAt: 1.2,
      kind: 'lift',
      event: 'exhibition',
      leg: 1,
      hard: true,
      meter: 0.6,
      progress: 0.35,
      scores: [0.9],
    });
    expect({ ...migrated, training: null }).toEqual({
      ...legacyV11,
      version: 12,
      training: null,
    });
    expect(readSave(migrated)).toEqual(migrated);
    // The pull finishes and pays as the showing always did.
    const host = new LocalGameHost(migrated);
    perform(host);
    // After the earlier Clover Cup and silver, the finished pull's showing.
    expect(activeCritter(host.state).competitions.map((result) => result.event)).toEqual([
      undefined,
      'exhibition',
      'exhibition',
    ]);
    // A sprint still in progress carries on as the first leg.
    const sprint = structuredClone(legacyV11) as unknown as { training: Record<string, unknown> };
    sprint.training = { ...sprint.training, stage: 0, hits: [0.8], scores: undefined };
    delete sprint.training['meter'];
    delete sprint.training['progress'];
    delete sprint.training['scores'];
    expect(readSave(sprint).training).toMatchObject({
      kind: 'training',
      event: 'exhibition',
      leg: 0,
      hits: [0.8],
      scores: [],
    });
  });

  it('protects v11 saves that already claim v12 events', () => {
    const early = structuredClone(legacyV11) as unknown as { training: Record<string, unknown> };
    early.training['event'] = 'exhibition';
    expect(() => readSave(early)).toThrow(/kept/);
    const medal = structuredClone(legacyV11);
    medal.critters[0].competitions = [{ day: 1, time: 50, medal: 'gold', event: 'hedgerow' }];
    expect(() => readSave(medal)).toThrow(/kept/);
  });
});
