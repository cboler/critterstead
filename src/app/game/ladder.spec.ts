import { describe, expect, it } from 'vitest';
import { upcomingEvents } from './calendar';
import { legacyV12 } from './fixtures/legacy-v12';
import { booth, perform } from './fixtures/play';
import { createInitialState, LocalGameHost } from './host';
import { CUP, CUP_DAYS, cupLegs, ordinal, placingOf, RANKS, RIVALS, rivalPoints } from './ladder';
import { activeCritter, Competition, GameState, Training } from './model';
import { readSave, validateSave } from './storage';

const enterCup = (host: LocalGameHost) =>
  host.dispatch({ type: 'interact', targetId: 'exhibition', action: 'cup' });

describe('the ladder’s ranked cups', () => {
  it('holds a cup for the companion’s rank on its days, beside the everyday showing', () => {
    const today = booth(3).interaction()!;
    expect(today.title).toBe('Today: the Fledgling Cup');
    expect(today.description).toContain('hurdle run and boulder lift against 6 Fledgling rivals');
    expect(today.actions.map((action) => action.label)).toEqual([
      'Enter the Fledgling Cup · 5 coins · 40 Mallow energy · 70 min',
      'Enter the exhibition · 40 Mallow energy · 5 yours · 60 min',
    ]);
    expect(
      booth(2)
        .interaction()!
        .actions.map((action) => action.id),
    ).toEqual(['exhibit']);
    const calendar = upcomingEvents(createInitialState()).filter((event) => event.kind === 'cup');
    expect(calendar.map((event) => event.day)).toEqual(CUP_DAYS);
    expect(calendar[0].label).toBe('Fledgling Cup · ranked · 5 coins to enter');
    // A Champion's contests are bouts, still to come: no cup, and the booth says why.
    const champion = booth(3, (state) => (activeCritter(state).ladder = { rank: 3, points: 0 }));
    expect(champion.interaction()!.actions.map((action) => action.id)).toEqual(['exhibit']);
    expect(champion.interaction()!.description).toContain(
      'a Champion; that rank’s contests are bouts',
    );
  });

  it('turns through every pairing of legs, cup by cup, season after season', () => {
    const days = [3, 7, 13, 17, 23, 27, 33, 37, 43];
    const legs = days.map((day) =>
      cupLegs(day)
        .map((leg) => leg.drill)
        .join('+'),
    );
    expect(legs.slice(0, 8)).toEqual([
      'run+lift',
      'toss+pace',
      'beam+rhythm',
      'chess+hoops',
      'hoops+toss',
      'pace+run',
      'rhythm+lift',
      'beam+chess',
    ]);
    expect(legs[8]).toBe(legs[0]);
    expect(cupLegs(5)).toEqual(cupLegs(3));
  });

  it('places the companion against its rank’s rivals and pays purse and points', () => {
    const play = (stats: number, playWell: boolean) => {
      const host = booth(3, (state) => {
        activeCritter(state).stats = {
          strength: stats,
          endurance: stats,
          speed: stats,
          intelligence: stats,
        };
      });
      const coins = host.state.player.coins;
      expect(enterCup(host)).toBe(true);
      expect(host.state.player.coins).toBe(coins - CUP.fee[0]);
      expect(host.state.training).toMatchObject({
        event: 'cup',
        cupDay: 3,
        kind: 'run',
        hard: true,
      });
      expect(() => validateSave(host.state)).not.toThrow();
      if (playWell) perform(host);
      else for (let second = 0; second < 120 && host.state.training; second++) host.update(1);
      expect(host.state.training).toBeNull();
      const entry = host.critter.competitions.at(-1)!;
      return { host, entry, coins: host.state.player.coins - coins + CUP.fee[0] };
    };
    const strong = play(15, true);
    expect(strong.entry).toMatchObject({ day: 3, event: 'cup', placing: 1, field: 7, rank: 0 });
    expect(strong.entry.medal).toBe('gold');
    expect(strong.coins).toBe(CUP.purse[0][0]);
    expect(strong.host.critter.ladder).toEqual({ rank: 0, points: 3 });
    expect(strong.host.state.journal[0]).toMatch(
      /^The crowd roars! Mallow places 1st of 7 in the Fledgling Cup with [\d.]+ points \(hurdles \d+%, pull \d+%\)\. \w+ was closest with [\d.]+\. 24 coins and 3 ladder points \(3 in all\)\.$/,
    );
    expect(strong.host.critter.history.at(-1)).toMatch(/^Day 3: 1st of 7 in the Fledgling Cup/);
    const idle = play(1, false);
    expect(idle.entry).toMatchObject({ placing: 7, medal: 'none' });
    expect(idle.coins).toBe(0);
    expect(idle.host.critter.ladder.points).toBe(0);
    expect(idle.host.state.journal[0]).toMatch(/won with [\d.]+\.$/);
    // Once a day.
    expect(strong.host.interaction()!.actions[0]).toMatchObject({
      disabled: true,
      reason: 'Mallow has had today’s Fledgling Cup.',
    });
  });

  it('scores rivals by the same measure, from their form and stats', () => {
    const steady = () => 0.5;
    const [pepper] = RIVALS[0];
    // Form 0.6 is 30 timing points; speed 7 and strength 3 at 2.5 each; care; half the luck.
    expect(rivalPoints(pepper, cupLegs(3), steady)).toBe(30 + 25 + 5.6 + 2);
    expect(placingOf(70, [71, 69, 80])).toBe(3);
    expect(placingOf(90, [71, 69, 80])).toBe(1);
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
    // Each athletic rank has six rivals, stronger rank by rank.
    const total = (rank: number) =>
      RIVALS[rank].reduce(
        (sum, rival) => sum + Object.values(rival.stats).reduce((a, b) => a + b, 0),
        0,
      );
    expect(RIVALS.map((field) => field.length)).toEqual([6, 6, 6]);
    expect(total(1)).toBeGreaterThan(total(0) * 1.4);
    expect(total(2)).toBeGreaterThan(total(1) * 1.4);
    expect(RANKS).toHaveLength(5);
  });

  it('keeps a cup’s legs if the day turns mid-cup, and resumes after a save', () => {
    const host = booth(3);
    enterCup(host);
    // Midnight passes during the cup.
    host.state.day = 4;
    host.state.totalMinutes += 1440;
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    const kinds: Training['kind'][] = [];
    perform(resumed, kinds);
    expect(kinds).toEqual(['run', 'lift']);
    expect(resumed.critter.competitions.at(-1)).toMatchObject({ event: 'cup', day: 4 });
  });
});

describe('save v13 ladder', () => {
  it('migrates frozen v12 with every critter at the first rank', () => {
    const before = structuredClone(legacyV12);
    const migrated = readSave(before);
    expect(before).toEqual(legacyV12);
    expect(migrated.version).toBe(13);
    expect(migrated.critters.map((critter) => critter.ladder)).toEqual(
      legacyV12.critters.map(() => ({ rank: 0, points: 0 })),
    );
    expect({ ...migrated, critters: [] }).toEqual({ ...legacyV12, version: 13, critters: [] });
    expect(
      migrated.critters.map((critter) => {
        const rest: Partial<typeof critter> = { ...critter };
        delete rest.ladder;
        return rest;
      }),
    ).toEqual(legacyV12.critters);
    expect(readSave(migrated)).toEqual(migrated);
  });

  it('protects damaged ladders, cup results and cups in progress', () => {
    const early = structuredClone(legacyV12) as unknown as GameState;
    activeCritter(early).ladder = { rank: 0, points: 0 };
    expect(() => readSave(early)).toThrow(/kept/);
    const host = booth(3);
    enterCup(host);
    const result = (entry: Competition) => (state: GameState) =>
      activeCritter(state).competitions.push(entry);
    const damage: ((state: GameState) => void)[] = [
      (state) => (activeCritter(state).ladder = { rank: 9, points: 0 }),
      (state) => (activeCritter(state).ladder = { rank: 0, points: -1 }),
      (state) => delete (activeCritter(state) as Partial<GameState['critters'][0]>).ladder,
      (state) => delete state.training!.cupDay,
      (state) => (state.training!.kind = 'toss'),
      result({ day: 1, time: 50, medal: 'none', event: 'cup' }),
      result({ day: 1, time: 50, medal: 'gold', event: 'cup', placing: 8, field: 7, rank: 0 }),
      result({ day: 1, time: 50, medal: 'gold', placing: 1 }),
    ];
    for (const harm of damage) {
      const save = structuredClone(host.state);
      harm(save);
      expect(() => readSave(save)).toThrow(/kept/);
    }
  });
});
