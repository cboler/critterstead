import { kept } from './fixtures/household';
import { describe, expect, it } from 'vitest';
import { calendarDate, calendarView, nextDawn, upcomingEvents, weatherFor } from './calendar';
import { CROPS } from './content';
import { createInitialState, LocalGameHost } from './host';
import { addItem, quantity } from './logistics';
import { backpack, GameState, satchel } from './model';
import { readSave, validateSave } from './storage';
import { legacyV6 } from './fixtures/legacy-v6';

function act(host: LocalGameHost, targetId: string, action: string): boolean {
  return host.dispatch({ type: 'interact', targetId, action });
}
function atBed(modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.player.position = { x: -5, z: 2 };
  state.critters[0].position = { x: -4, z: 2.5 };
  addItem(backpack(state), 'turnip-seed', 2);
  addItem(backpack(state), 'wheat-seed', 1);
  addItem(backpack(state), 'sunberry-seed', 1);
  modify?.(state);
  return new LocalGameHost(state);
}
function action(host: LocalGameHost, id: string) {
  return host.interaction()?.actions.find((item) => item.id === id);
}
/** First day at or after start whose fixed forecast matches. */
function findDay(start: number, match: (day: number) => boolean): number {
  let day = start;
  while (!match(day)) day++;
  return day;
}

describe('120-day calendar and deterministic weather', () => {
  it('maps days onto four 30-day seasons and repeating years', () => {
    expect(calendarDate(1)).toEqual({ year: 1, season: 'spring', dayOfSeason: 1, dayOfYear: 1 });
    expect(calendarDate(30)).toMatchObject({ season: 'spring', dayOfSeason: 30 });
    expect(calendarDate(31)).toMatchObject({ season: 'summer', dayOfSeason: 1 });
    expect(calendarDate(120)).toMatchObject({ season: 'winter', dayOfSeason: 30, year: 1 });
    expect(calendarDate(121)).toMatchObject({ season: 'spring', dayOfSeason: 1, year: 2 });
    expect(nextDawn(480)).toBe(1800);
    expect(nextDawn(360)).toBe(1800);
    expect(nextDawn(359)).toBe(360);
  });

  it('forecasts fixed weather without consuming the save seed', () => {
    expect(weatherFor(1)).toBe('sunny');
    const forecast = Array.from({ length: 120 }, (_, day) => weatherFor(day + 1));
    expect(Array.from({ length: 120 }, (_, day) => weatherFor(day + 1))).toEqual(forecast);
    expect(forecast.slice(0, 90)).toContain('rain');
    expect(forecast.slice(0, 90)).not.toContain('snow');
    const host = new LocalGameHost();
    const seed = host.state.seed;
    calendarView(host.state);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(host.state.seed).toBe(seed);
  });

  it('lays out the whole year and lists upcoming household facts', () => {
    const state = createInitialState();
    state.critters[0].ageDays = 118;
    const view = calendarView(state);
    expect(view.seasons.map((season) => season.days.length)).toEqual([30, 30, 30, 30]);
    expect(view.seasons[0].days[0]).toMatchObject({ day: 1, today: true, past: false });
    expect(view.forecast.map((entry) => entry.label)).toEqual([
      'Today',
      'Tomorrow',
      'Spring 3, Year 1',
    ]);
    const events = upcomingEvents(state);
    expect(events.find((event) => event.kind === 'birthday')).toMatchObject({ day: 3 });
    expect(upcomingEvents(state, 40).find((event) => event.kind === 'season')).toMatchObject({
      day: 31,
      label: 'Summer begins',
    });
  });
});

describe('four-plot seasonal garden', () => {
  it('grows only while moist, pauses when dry and needs water again each day', () => {
    // Start on a spring day whose next morning is dry, so no rain waters the bed for us.
    const day = findDay(1, (candidate) => weatherFor(candidate + 1) !== 'rain');
    const host = atBed((state) => {
      state.day = day;
      state.totalMinutes = (day - 1) * 1440 + 480;
    });
    const plot = host.state.plots[0];
    expect(act(host, 'plot-1', 'plant:wheat')).toBe(true);
    host.update(1);
    expect(plot.crop!.growthMinutes).toBe(0);
    expect(act(host, 'plot-1', 'water')).toBe(true);
    expect(plot.moistUntil).toBe(day * 1440 + 360);
    host.dispatch({ type: 'debug', action: 'next-day' });
    // Watered at 08:15:48 (after one idle tick); growth stops at the 06:00 dawn.
    const grown = plot.crop!.growthMinutes;
    expect(grown).toBeCloseTo(1440 + 360 - 495.8);
    host.state.player.position = { x: -5.4, z: 2 };
    expect(host.interaction()?.title).toBe('Thirsty grain wheat');
    for (let second = 0; second < 60; second++) host.update(1);
    expect(plot.crop!.growthMinutes).toBe(grown);
    expect(act(host, 'plot-1', 'water')).toBe(true);
    expect(host.interaction()?.description).toMatch(/Ready in about \d+ game minutes/);
    host.dispatch({ type: 'debug', action: 'next-day' });
    host.state.player.position = { x: -5.4, z: 2 };
    expect(host.interaction()?.title).toBe('Grain wheat are ready!');
    expect(host.state.journal[0]).toContain('1 garden bed is ready');
    expect(act(host, 'plot-1', 'harvest')).toBe(true);
    expect(quantity(backpack(host.state), 'wheat')).toBe(4);
    expect(host.state.plots[0]).toMatchObject({ tilled: true, crop: null });
    expect(host.state.player.skills['farming']).toBeGreaterThan(1);
    expect(() => validateSave(host.state)).not.toThrow();
  });

  it('finishes crisp turnips on a single morning watering', () => {
    const host = atBed();
    expect(act(host, 'plot-1', 'plant:turnip')).toBe(true);
    expect(act(host, 'plot-1', 'water')).toBe(true);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(host.state.plots[0].crop!.growthMinutes).toBe(CROPS.turnip.growthMinutes);
  });

  it('requires tilling through the rancher check before a new bed can be sown', () => {
    const host = atBed((state) => {
      state.player.position = { ...state.plots[1].position };
    });
    expect(host.interaction()?.id).toBe('plot-2');
    expect(act(host, 'plot-2', 'plant:feed')).toBe(false);
    const till = action(host, 'till')!;
    expect(till.label).toMatch(/Till the soil · \d+ energy · \d+ min/);
    const before = structuredClone(host.state.player);
    expect(act(host, 'plot-2', 'till')).toBe(true);
    expect(host.state.plots[1].tilled).toBe(true);
    expect(host.state.player.stamina).toBeLessThan(before.stamina);
    expect(host.state.player.skills['farming']).toBeCloseTo(before.skills['farming'] + 0.35);
    expect(host.state.player.stats.strength).toBeGreaterThan(before.stats.strength);
    expect(act(host, 'plot-2', 'plant:wheat')).toBe(true);
    expect(host.state.plots[1].crop).toMatchObject({ speciesId: 'wheat', growthMinutes: 0 });
  });

  it('refuses out-of-season seed and withers unharvested crops when the season turns', () => {
    const host = atBed();
    const sunberry = action(host, 'plant:sunberry')!;
    expect(sunberry.disabled).toBe(true);
    expect(sunberry.reason).toBe('Garden sunberries grow in summer and autumn.');
    expect(act(host, 'plot-1', 'plant:sunberry')).toBe(false);
    expect(quantity(backpack(host.state), 'sunberry-seed')).toBe(1);

    const late = atBed((state) => {
      state.totalMinutes = 29 * 1440 + 480;
      state.day = 30;
    });
    expect(act(late, 'plot-1', 'plant:turnip')).toBe(true);
    expect(late.interaction()?.description).toContain('Summer begins in 1 day');
    late.dispatch({ type: 'debug', action: 'next-day' });
    late.state.player.position = { x: -5.4, z: 2 };
    expect(calendarDate(late.state.day).season).toBe('summer');
    expect(late.state.plots[0].crop).toMatchObject({ speciesId: 'turnip', withered: true });
    expect(late.state.journal.join(' ')).toContain('wither out of season');
    expect(act(late, 'plot-1', 'harvest')).toBe(false);
    expect(act(late, 'plot-1', 'clear')).toBe(true);
    expect(late.state.plots[0]).toMatchObject({ tilled: true, crop: null });
    expect(act(late, 'plot-1', 'plant:sunberry')).toBe(true);
  });

  it('lets morning rain water every tilled bed', () => {
    const rainDay = findDay(2, (day) => weatherFor(day) === 'rain' && day <= 30);
    const host = atBed((state) => {
      state.totalMinutes = (rainDay - 2) * 1440 + 480;
      state.day = rainDay - 1;
      state.plots[2].tilled = true;
    });
    expect(act(host, 'plot-1', 'plant:feed')).toBe(true);
    host.dispatch({ type: 'debug', action: 'next-day' });
    host.state.player.position = { x: -5.4, z: 2 };
    const dawn = (rainDay - 1) * 1440 + 360;
    expect(host.state.plots.filter((plot) => plot.moistUntil === dawn + 1440)).toHaveLength(2);
    expect(host.state.plots[0].crop!.growthMinutes).toBe(120);
    expect(host.state.journal.join(' ')).toContain('Morning rain soaks the tilled garden beds');
  });

  it('buys seasonal seed and sells harvested produce at the stall', () => {
    const host = atBed((state) => {
      state.player.position = { x: -6, z: 5 };
      state.player.coins = 5;
      addItem(backpack(state), 'turnip', 3);
      addItem(satchel(state), 'wheat', 2);
      state.critters[0].position = { x: -6, z: 4.5 };
    });
    expect(action(host, 'buy-crop:wheat')?.label).toBe(
      'Buy wheat seeds · 2 coins · spring & summer',
    );
    expect(act(host, 'market', 'buy-crop:wheat')).toBe(true);
    expect(host.state.player.coins).toBe(3);
    expect(action(host, 'sell-produce')?.label).toContain('10 coins');
    expect(act(host, 'market', 'sell-produce')).toBe(true);
    expect(host.state.player.coins).toBe(13);
    expect(quantity(backpack(host.state), 'turnip')).toBe(0);
    expect(quantity(satchel(host.state), 'wheat')).toBe(0);
    expect(quantity(backpack(host.state), 'wheat-seed')).toBe(2);
    expect(act(host, 'market', 'sell-produce')).toBe(false);
  });
});

describe('cottage interior and household calendar', () => {
  it('enters and leaves with the clock, state and a following companion intact', () => {
    const host = new LocalGameHost();
    host.state.player.position = { x: -4.45, z: -1.5 };
    const before = structuredClone(host.state);
    expect(host.interaction()?.actions.map((item) => item.id)).toEqual(['enter', 'sleep']);
    expect(act(host, 'house', 'enter')).toBe(true);
    expect(host.state.areaId).toBe('cottage');
    expect(host.state.companionIndoors).toBe(true);
    expect(host.state.totalMinutes).toBe(before.totalMinutes + 1);
    expect(host.interaction()?.id).toBe('door');
    expect(() => validateSave(host.state)).not.toThrow();
    const loaded = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(loaded.state).toEqual(host.state);

    host.state.player.position = { x: 0.2, z: -2.2 };
    expect(host.interaction()?.id).toBe('calendar');
    expect(host.interaction()?.description).toContain('Today is Spring 1, Year 1');
    expect(act(host, 'calendar', 'read-calendar')).toBe(true);
    expect(host.state.flags).toContain('checked-calendar');
    expect(host.state.totalMinutes).toBe(before.totalMinutes + 1);
    // Solid furniture blocks walking through the bed.
    host.state.player.position = { x: -3, z: -0.8 };
    host.dispatch({ type: 'move', x: 0, z: -1, seconds: 1 });
    expect(host.state.player.position.z).toBeGreaterThan(-1.3);

    host.state.player.position = { x: 1.6, z: 3.4 };
    expect(act(host, 'door', 'leave')).toBe(true);
    expect(host.state).toMatchObject({ areaId: 'homestead', companionIndoors: false });
    expect(host.state.totalMinutes).toBe(before.totalMinutes + 2);
    expect(host.state.containers).toEqual(before.containers);
    expect(host.state.plots).toEqual(before.plots);
    expect(host.interaction()?.id).toBe('house');
  });

  it('keeps a working hauler working in the yard while the rancher is indoors', () => {
    const host = new LocalGameHost();
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    const chest = host.state.containers.find((item) => item.kind === 'chest')!;
    host.critter.learnedBehaviors['lumber-hauling'] = 6;
    host.critter.hauling.enabled = true;
    host.critter.position = { x: 6, z: 1 };
    addItem(output, 'lumber', 2);
    host.state.player.position = { x: -4.45, z: -1.5 };
    expect(act(host, 'house', 'enter')).toBe(true);
    const yard = structuredClone(host.critter.position);
    expect(host.state.companionIndoors).toBe(false);
    expect(host.critter.position).toEqual(yard);
    host.state.player.position = { ...host.critter.position };
    expect(host.interaction()?.id).not.toBe(host.critter.id);
    for (let second = 0; second < 40; second++) host.update(1);
    expect(quantity(chest, 'lumber')).toBe(2);
    expect(host.state.areaId).toBe('cottage');
    expect(host.haulingLearning().status).not.toContain('explore');
    expect(() => validateSave(host.state)).not.toThrow();
    // Pausing work outdoors brings the companion along next time.
    host.state.player.position = { x: 1.6, z: 3.4 };
    act(host, 'door', 'leave');
    expect(host.critter.position).not.toEqual({ x: -3.6, z: -1.2 });
  });

  it('brings a companion inside after a cued errand finishes', () => {
    const host = new LocalGameHost();
    host.critter.learnedBehaviors['lumber-hauling'] = 2;
    host.critter.hauling = { enabled: false, phase: 'collect', cued: true };
    const output = host.state.containers.find((item) => item.kind === 'mill-output')!;
    addItem(output, 'lumber', 1);
    host.critter.position = { x: 6, z: 1 };
    host.state.player.position = { x: -4.45, z: -1.5 };
    act(host, 'house', 'enter');
    expect(host.state.companionIndoors).toBe(false);
    for (let second = 0; second < 30 && !host.state.companionIndoors; second++) host.update(1);
    expect(host.state.companionIndoors).toBe(true);
    expect(host.critter.position).toEqual({ x: 0.5, z: 3.4 });
    expect(host.state.journal[0]).toContain('joins you indoors');
  });
});

describe('save v7 garden and cottage migration', () => {
  it('migrates frozen v6 into four plots without losing growth, goods or seed', () => {
    const before = structuredClone(legacyV6);
    const state = readSave(before);
    expect(state.version).toBe(11);
    expect(before).toEqual(legacyV6);
    expect(state.plots.map((plot) => plot.id)).toEqual(['plot-1', 'plot-2', 'plot-3', 'plot-4']);
    expect(state.plots[0]).toMatchObject({
      tilled: true,
      crop: { speciesId: 'feed', plantedAt: 9300, growthMinutes: 102 },
    });
    expect(state.plots.slice(1).every((plot) => !plot.tilled && !plot.crop)).toBe(true);
    expect(state.companionIndoors).toBe(false);
    expect(state.seed).toBe(before.seed);
    expect(kept(state.containers).map((item) => item.items)).toEqual(
      before.containers.map((item) => item.items),
    );
    expect(readSave(state)).toEqual(state);
    // The old promise holds: remaining growth finishes before the soil dries.
    const host = new LocalGameHost(state);
    for (let second = 0; second < 100; second++) host.update(1);
    expect(host.state.plots[0].crop!.growthMinutes).toBe(CROPS.feed.growthMinutes);

    for (const crop of [
      { id: 'crop-feed', plantedAt: null, watered: false, readyAt: null },
      { id: 'crop-feed', plantedAt: 9400, watered: false, readyAt: null },
    ]) {
      const migrated = readSave({ ...structuredClone(legacyV6), crop });
      expect(migrated.plots[0].tilled).toBe(true);
      expect(migrated.plots[0].moistUntil).toBe(0);
      expect(migrated.plots[0].crop?.growthMinutes ?? 0).toBe(0);
    }
  });

  it('rejects ambiguous, damaged or impossible garden and cottage data without mutating it', () => {
    const invalid: unknown[] = [
      { ...structuredClone(legacyV6), plots: [] },
      { ...structuredClone(legacyV6), areaId: 'cottage' },
    ];
    const damage: ((state: GameState) => void)[] = [
      (state) => (state.plots[1].position = { x: 0, z: 0 }),
      (state) => state.plots.pop(),
      (state) =>
        (state.plots[1].crop = {
          speciesId: 'feed',
          plantedAt: 0,
          growthMinutes: 0,
          withered: false,
        }),
      (state) =>
        (state.plots[0].crop = {
          speciesId: 'feed',
          plantedAt: 0,
          growthMinutes: 999,
          withered: false,
        }),
      (state) => ((state.plots[0] as unknown as { crop: object }).crop = { speciesId: 'rose' }),
      (state) => (state.companionIndoors = true),
      (state) => ((state as unknown as { crop: object }).crop = {}),
    ];
    for (const change of damage) {
      const state = createInitialState();
      change(state);
      invalid.push(state);
    }
    for (const value of invalid) {
      const before = structuredClone(value);
      expect(() => readSave(value)).toThrow(/kept/);
      expect(value).toEqual(before);
    }
  });
});
