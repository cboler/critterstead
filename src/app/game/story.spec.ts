import { describe, expect, it } from 'vitest';
import { calendarDate, upcomingEvents, weatherFor } from './calendar';
import { RESIDENTS } from './cast';
import { AREAS } from './content';
import { desk, perform } from './fixtures/play';
import { createInitialState, LocalGameHost } from './host';
import { grandpaSays, grandpaWhereabouts, PIP_ID, pipWhereabouts } from './household';
import { TITLE, TITLE_FIELD } from './ladder';
import { activeCritter, GameState } from './model';
import { objectives } from './objectives';
import { readSave, validateSave } from './storage';
import {
  credits,
  KEEPSAKES,
  keepsakeDue,
  nextTitleDay,
  stageBeat,
  STORY,
  storyEnded,
  storyLine,
  titleDay,
} from './story';
import { sceneById, SCENES } from './story-scenes';

const SUMMER_30 = (year: number) => (year - 1) * 120 + 60;

/** A household on a day at an hour, in the yard. */
function household(day: number, minute = 1200, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.day = day;
  state.minute = minute;
  state.totalMinutes = (day - 1) * 1440 + minute;
  state.critters.forEach((critter) => (critter.drills.day = day));
  modify?.(state);
  return new LocalGameHost(state);
}
const sleep = (host: LocalGameHost) => host.dispatch({ type: 'debug', action: 'next-day' });
/** Shows every queued scene, as the app does. */
function watch(host: LocalGameHost): string[] {
  const shown = [...host.state.story.queue];
  for (const id of shown) expect(host.dispatch({ type: 'story-seen', id })).toBe(true);
  return shown;
}
/** A household after Grandpa, on a fair day at least `after` days past his passing. */
function afterGrandpa(after: number, minute: number): LocalGameHost {
  const host = household(SUMMER_30(STORY.lastSummerYear));
  sleep(host);
  watch(host);
  const state = host.state;
  let day = state.story.passedDay! + after;
  while (['rain', 'snow'].includes(weatherFor(day))) day++;
  state.day = day;
  state.minute = minute;
  state.totalMinutes = (day - 1) * 1440 + minute;
  return host;
}
const standBy = (host: LocalGameHost) => {
  const pip = pipWhereabouts(host.state, activeCritter(host.state).position)!;
  host.state.areaId = pip.areaId;
  host.state.areaInstanceId = `local-${pip.areaId}`;
  host.state.player.position = { x: pip.position.x + 0.5, z: pip.position.z };
  return pip;
};

describe('the story as written', () => {
  it('stages every scene inside its area and can name the companion in every line', () => {
    const state = createInitialState();
    for (const scene of SCENES) {
      expect(scene.beats.length, scene.id).toBeGreaterThan(0);
      // A scene opens on a place, so there is always something behind the first line.
      expect(scene.beats[0].stage, scene.id).toBeDefined();
      for (const beat of scene.beats) {
        expect(storyLine(beat.line, state), scene.id).not.toContain('{');
        if (beat.card) expect(beat.heading, scene.id).toBeTruthy();
        if (!beat.stage) continue;
        const half = AREAS[beat.stage.areaId].half;
        for (const point of [
          beat.stage.player,
          beat.stage.companion,
          beat.stage.grandpa,
          beat.stage.pip,
        ])
          if (point) {
            expect(Math.abs(point.x), scene.id).toBeLessThan(half.x);
            expect(Math.abs(point.z), scene.id).toBeLessThan(half.z);
          }
      }
    }
    expect(new Set(SCENES.map((scene) => scene.id)).size).toBe(SCENES.length);
    for (const keepsake of KEEPSAKES) expect(sceneById(keepsake.scene)).toBeDefined();
  });

  it('opens and closes on the same words', () => {
    const letter = sceneById('keepsake-letter')!.beats.map((beat) => beat.line);
    expect(letter.join(' ')).toContain('Shoes on, sleepyhead.');
    const ending = sceneById('grand-champion')!.beats.map((beat) => beat.line);
    expect(ending.join(' ')).toContain(
      'Pip falls in at your heel, unhurried as ever, and the three of you take the east road home.',
    );
  });

  it('draws a scene on a copy, in its own season, without touching the game', () => {
    const state = createInitialState();
    const before = structuredClone(state);
    const view = structuredClone(state);
    const stage = stageBeat(view, sceneById('midwinter-morning')!.beats[0].stage!);
    expect(calendarDate(view.day).season).toBe('winter');
    expect(view.day).toBe(Math.floor(view.totalMinutes / 1440) + 1);
    expect(stage).toMatchObject({ grandpa: null, companion: true });
    expect(stage.pip).not.toBeNull();
    expect(state).toEqual(before);
  });
});

describe('the years with Grandpa', () => {
  it('remembers an evening on the porch, once', () => {
    const host = household(3);
    sleep(host);
    expect(host.state.story.queue).toEqual(['porch-stars']);
    expect(watch(host)).toEqual(['porch-stars']);
    expect(host.state.story.seen).toEqual(['porch-stars']);
    sleep(host);
    expect(host.state.story.queue).toEqual([]);
    // A scene that was never queued cannot be marked seen.
    expect(host.dispatch({ type: 'story-seen', id: 'the-passing' })).toBe(false);
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('hangs the first ribbon on the mantel the evening it is won', () => {
    const host = household(8, 1200, (state) => {
      activeCritter(state).competitions.push({
        day: 7,
        time: 90,
        medal: 'bronze',
        event: 'cup',
        placing: 3,
        field: 7,
        rank: 0,
      });
      state.story.seen.push('porch-stars');
    });
    sleep(host);
    expect(host.state.story.queue).toEqual(['first-ribbon']);
  });

  it('sends you to school for autumn and winter, and brings you home in spring', () => {
    const host = household(SUMMER_30(1), 1200, (state) => {
      state.plots[0].tilled = true;
      state.plots[0].crop = {
        speciesId: 'feed',
        plantedAt: 0,
        growthMinutes: 99999,
        withered: false,
      };
    });
    const critter = activeCritter(host.state);
    const age = critter.ageDays;
    const stats = { ...critter.stats };
    sleep(host);
    const state = host.state;
    expect(calendarDate(state.day)).toMatchObject({ year: 2, season: 'spring', dayOfSeason: 1 });
    expect(state.minute).toBe(480);
    expect(state.story.passedDay).toBeNull();
    expect(state.story.queue).toContain('school-cart-1');
    expect(activeCritter(state).ageDays).toBe(age + 61);
    expect(activeCritter(state).stats.endurance).toBe(stats.endurance + 1);
    // The ripe bed came in to the yard chest, and the beds are resting.
    expect(state.plots.every((plot) => !plot.crop && !plot.tilled)).toBe(true);
    const chest = state.containers.find((container) => container.kind === 'chest')!;
    expect(chest.items.some((item) => item.itemId === 'feed')).toBe(true);
    expect(state.journal[0]).toContain('Home.');
    expect(() => validateSave(state)).not.toThrow();
    // The calendar had warned of the cart.
    expect(
      upcomingEvents(household(SUMMER_30(1) - 3).state).some((event) =>
        event.label.startsWith('The school cart'),
      ),
    ).toBe(true);
    // The second year's cart is a different goodbye.
    const second = household(SUMMER_30(2));
    sleep(second);
    expect(second.state.story.queue).toContain('school-cart-2');
    expect(calendarDate(second.state.day)).toMatchObject({ year: 3, season: 'spring' });
  });

  it('keeps Grandpa a little closer to the house each year', () => {
    const afternoon = (year: number) => {
      let day = (year - 1) * 120 + 2;
      while (weatherFor(day) === 'rain') day++;
      return grandpaWhereabouts(household(day, 900).state)!;
    };
    expect(afternoon(1).activity).toContain('leaning on the farm field fence');
    expect(afternoon(2).activity).toContain('judging the turnips from here');
    expect(afternoon(3).areaId).toBe('cottage');
    const third = household(245, 900, (state) => state.flags.push('talked-grandpa'));
    expect(grandpaSays(third.state)).not.toContain('{name}');
  });
});

describe('the first morning of autumn', () => {
  it('is fixed: Grandpa dies in his third autumn, and the stead becomes yours', () => {
    const host = household(SUMMER_30(STORY.lastSummerYear));
    const coins = host.state.player.coins;
    sleep(host);
    const state = host.state;
    expect(state.story.passedDay).toBe(SUMMER_30(3) + 1);
    expect(state.day).toBe(SUMMER_30(3) + 1 + STORY.mourningDays);
    expect(state.story.queue).toEqual(['the-passing']);
    expect(state.player.coins).toBe(coins + STORY.inheritance);
    expect(grandpaWhereabouts(state)).toBeNull();
    expect(host.residents().map((resident) => resident.id)).toEqual([PIP_ID]);
    // Pip is still Grandpa's, and still here.
    const pip = state.critters.find((critter) => critter.id === PIP_ID)!;
    expect(pip.ownerId).toBe('grandpa');
    expect(pip.history.at(-1)).toMatch(/Stayed\.$/);
    expect(() => validateSave(state)).not.toThrow();
    // Autumn and winter are played now; no cart comes.
    watch(host);
    sleep(host);
    expect(host.state.day).toBe(state.day);
    expect(calendarDate(host.state.day).season).toBe('autumn');
    expect(host.state.story.queue).toEqual([]);
  });

  it('has Pip keep the old round at the old hours, alone', () => {
    const spots = [400, 700, 900, 1080, 1200].map((minute) => {
      const host = afterGrandpa(STORY.mourningDays, minute);
      return pipWhereabouts(host.state, activeCritter(host.state).position)!.spot;
    });
    expect(spots).toEqual(['pots', 'stone', 'fence', 'porch', 'hearth']);
    const forage = afterGrandpa(STORY.mourningDays, 560);
    expect(pipWhereabouts(forage.state, activeCritter(forage.state).position)!.areaId).toBe(
      'glade',
    );
  });

  it('lets you sit with Pip for each keepsake in turn, as the days allow', () => {
    const minutes = {
      pots: 400,
      forage: 560,
      fence: 900,
      porch: 1080,
      stone: 700,
      hearth: 1200,
      rail: 600,
    };
    let found = 0;
    for (const keepsake of KEEPSAKES) {
      // A day too early, Pip has nothing new to show.
      const early = afterGrandpa(keepsake.afterDays, minutes[keepsake.spot]);
      early.state.story.keepsakes = KEEPSAKES.slice(0, found).map((item) => item.id);
      const host = early;
      expect(keepsakeDue(host.state)?.id).toBe(keepsake.id);
      standBy(host);
      const dock = host.interaction()!;
      expect(dock.title).toBe('Pip');
      expect(dock.actions[0].id).toBe('sit-with-pip');
      expect(host.dispatch({ type: 'interact', targetId: PIP_ID, action: 'sit-with-pip' })).toBe(
        true,
      );
      found += 1;
      expect(host.state.story.keepsakes).toHaveLength(found);
      expect(host.state.story.queue).toEqual([keepsake.scene]);
      expect(host.state.journal[0]).toContain(keepsake.name);
      expect(() => validateSave(host.state)).not.toThrow();
      // Nothing more today.
      expect(
        host.interaction()?.actions.some((action) => action.id === 'sit-with-pip') ?? false,
      ).toBe(false);
    }
    const first = afterGrandpa(STORY.mourningDays, 400);
    expect(objectives(first.state).find((quest) => quest.id === 'keepsake')).toMatchObject({
      group: 'today',
      title: 'Sit with Pip',
    });
    expect(objectives(first.state).find((quest) => quest.id === 'rounds')!.progress).toEqual({
      value: 0,
      goal: KEEPSAKES.length,
    });
    // Out of order, or before Grandpa has gone, a save is refused.
    const wrong = structuredClone(first.state);
    wrong.story.keepsakes = ['fence'];
    expect(() => validateSave(wrong)).toThrow(/story/);
    const alive = createInitialState();
    alive.story.keepsakes = ['pots'];
    expect(() => validateSave(alive)).toThrow(/story/);
  });

  it('has each townsperson say their piece once', () => {
    const host = afterGrandpa(STORY.mourningDays, 600);
    const state = host.state;
    state.areaId = 'town';
    state.areaInstanceId = 'local-town';
    const marigold = RESIDENTS.find((resident) => resident.id === 'resident-store')!;
    state.player.position = { x: marigold.post.x, z: marigold.post.z + 1.2 };
    state.flags.push(`introduced:${marigold.id}`);
    const chat = () =>
      host.dispatch({ type: 'interact', targetId: 'store', action: `chat:${marigold.id}` });
    expect(chat()).toBe(true);
    expect(state.journal[0]).toContain('I have put his seed order by');
    state.flags = state.flags.filter((flag) => !flag.startsWith('chatted:'));
    expect(chat()).toBe(true);
    expect(state.journal[0]).not.toContain('seed order');
    for (const resident of RESIDENTS) expect(resident.after, resident.id).toBeTruthy();
  });
});

describe('the title', () => {
  const champion = (state: GameState, strong = true) => {
    const critter = activeCritter(state);
    critter.ladder = { rank: TITLE.rank, points: 0 };
    if (strong) critter.stats = { strength: 700, endurance: 700, speed: 700, intelligence: 700 };
    critter.hunger = 0;
    critter.stamina = 100;
    state.player.coins = 100;
  };
  const midwinter = STORY.lastSummerYear * 120;
  const atDesk = (day: number, passed: number | null, strong = true) =>
    desk(day, 'promotion', (state) => {
      state.story.passedDay = passed;
      champion(state, strong);
    });

  it('is a Midwinter tradition for those who hold their own stead', () => {
    // While Grandpa lives the desk has nothing for a Champion, even on the last day of winter.
    const before = atDesk(120, null);
    expect(titleDay(before.state)).toBe(false);
    expect(before.interaction()!.actions.map((action) => action.id)).toEqual([
      'chat:resident-promotion',
    ]);
    expect(before.interaction()!.description).toContain('Bramblewick is your grandfather’s');
    const passed = SUMMER_30(3) + 1;
    expect(titleDay(atDesk(midwinter - 30, passed).state)).toBe(false);
    expect(nextTitleDay(atDesk(midwinter - 30, passed).state)).toBe(midwinter);
    const day = atDesk(midwinter, passed);
    expect(titleDay(day.state)).toBe(true);
    expect(day.interaction()!.title).toBe('Promotion desk · today: the Grand Championship');
    expect(day.interaction()!.description).toContain('Hetty Larkspur’s Lantern');
    expect(day.interaction()!.actions[0].label).toBe(
      'Enter the Grand Championship · 40 coins · 60 Mallow energy · 120 min',
    );
    // After the first Midwinter, the turn of any season.
    expect(titleDay(atDesk(midwinter + 30, passed).state)).toBe(true);
    expect(titleDay(atDesk(midwinter + 29, passed).state)).toBe(false);
    expect(
      upcomingEvents(atDesk(midwinter - 5, passed).state).some((event) =>
        event.label.startsWith('Grand Championship'),
      ),
    ).toBe(true);
    // Pip has gone on ahead to the rail.
    expect(pipWhereabouts(day.state, activeCritter(day.state).position)).toMatchObject({
      areaId: 'colosseum',
      spot: 'rail',
    });
  });

  it('is won over five legs, rolls the credits, and leaves the stead to go on', () => {
    const host = atDesk(midwinter, SUMMER_30(3) + 1);
    expect(host.dispatch({ type: 'interact', targetId: 'promotion', action: 'promotion' })).toBe(
      true,
    );
    expect(host.state.story.queue).toEqual(['midwinter-desk']);
    expect(host.state.training).toMatchObject({ event: 'promotion', cupDay: midwinter, leg: 0 });
    expect(() => validateSave(host.state)).not.toThrow();
    watch(host);
    const legs: string[] = [];
    perform(host, legs as never);
    expect(legs).toHaveLength(TITLE.legs.length);
    const critter = activeCritter(host.state);
    expect(critter.ladder.rank).toBe(4);
    expect(critter.competitions.at(-1)).toMatchObject({
      event: 'promotion',
      placing: 1,
      field: TITLE_FIELD.length + 1,
      rank: TITLE.rank,
    });
    expect(host.state.story.queue).toEqual(['grand-champion', 'credits']);
    expect(host.state.journal[0]).toContain('Grand Champion');
    expect(() => validateSave(host.state)).not.toThrow();
    watch(host);
    expect(storyEnded(host.state)).toBe(true);
    // The credits name this household's own.
    const roll = credits(host.state, RESIDENTS);
    expect(roll[0].lines).toContain('Mallow · Grand Champion');
    expect(roll.flatMap((section) => section.lines)).toContain('Grandpa');
    // Play goes on: a new morning, and Pip at your heel in the yard.
    sleep(host);
    expect(host.state.day).toBe(midwinter + 1);
    expect(host.state.story.queue).toEqual([]);
    host.state.minute = 700 + 300;
    const pip = pipWhereabouts(host.state, critter.position)!;
    expect(pip.areaId).toBe('homestead');
    expect(
      Math.hypot(
        pip.position.x - host.state.player.position.x,
        pip.position.z - host.state.player.position.z,
      ),
    ).toBeLessThan(1.5);
    expect(objectives(host.state).find((quest) => quest.id === 'title')!.done).toBe(true);
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('keeps the title with Lantern when a Champion falls short, to try again', () => {
    const host = atDesk(midwinter, SUMMER_30(3) + 1, false);
    host.dispatch({ type: 'interact', targetId: 'promotion', action: 'promotion' });
    watch(host);
    perform(host);
    expect(activeCritter(host.state).ladder.rank).toBe(TITLE.rank);
    expect(host.state.journal[0]).toContain('may challenge again at the turn of any season');
    expect(host.state.story.queue).toEqual([]);
  });
});

describe('saves from before the story', () => {
  it('carries a v15 household forward with Grandpa alive and nothing yet shown', () => {
    const old = structuredClone(createInitialState()) as unknown as Record<string, unknown>;
    delete old['story'];
    old['version'] = 15;
    const loaded = readSave(old);
    expect(loaded.version).toBe(16);
    expect(loaded.story).toEqual({ passedDay: null, queue: [], seen: [], keepsakes: [] });
    const broken = structuredClone(createInitialState()) as unknown as Record<string, unknown>;
    delete broken['story'];
    expect(() => validateSave(broken)).toThrow();
  });
});
