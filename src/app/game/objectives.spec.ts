import { describe, expect, it } from 'vitest';
import { CROPS } from './content';
import { createInitialState, forageYield, haulingPace, LocalGameHost } from './host';
import { addItem } from './logistics';
import { activeCritter } from './model';
import { nextObjective, objectives } from './objectives';

const ids = (state = createInitialState(), group?: 'today' | 'journey') =>
  objectives(state)
    .filter((item) => !group || item.group === group)
    .map((item) => item.id);

describe('journal objectives', () => {
  it('starts with a short day and the whole journey ahead', () => {
    const state = createInitialState();
    expect(ids(state, 'today')).toEqual(['scritch']);
    expect(objectives(state).filter((item) => item.group === 'journey' && item.done)).toEqual([]);
    expect(nextObjective(state)?.id).toBe('care');
  });

  it('follows real progress: care, practice, lessons and the nook', () => {
    const host = new LocalGameHost();
    host.dispatch({ type: 'interact', targetId: host.critter.id, action: 'pet' });
    expect(nextObjective(host.state)?.id).toBe('practice');
    expect(ids(host.state, 'today')).not.toContain('scritch');
    const state = host.state;
    state.flags.push('trained', 'gathered');
    activeCritter(state).learnedBehaviors['sunberry-foraging'] = 3;
    const foraging = objectives(state).find((item) => item.id === 'foraging')!;
    expect(foraging).toMatchObject({ done: false, progress: { value: 3, goal: 7 } });
    expect(foraging.detail).toContain('gather a nearby sunberry bush');
    expect(nextObjective(state)?.id).toBe('foraging');
    activeCritter(state).learnedBehaviors['sunberry-foraging'] = 20;
    expect(objectives(state).find((item) => item.id === 'foraging')).toMatchObject({
      done: true,
      progress: { value: 7, goal: 7 },
    });
    state.shedLevel = 1;
    expect(objectives(state).find((item) => item.id === 'nook')!.done).toBe(true);
  });

  it('lists what today needs: a meal, water, a harvest, the trough and open events', () => {
    const state = createInitialState();
    const critter = activeCritter(state);
    critter.hunger = 72;
    critter.hauling.enabled = true;
    state.flags.push('trained', 'exhibited');
    state.plots[0].crop = {
      speciesId: 'feed',
      plantedAt: 0,
      growthMinutes: CROPS.feed.growthMinutes,
      withered: false,
    };
    state.plots[1].tilled = true;
    state.plots[1].crop = { speciesId: 'turnip', plantedAt: 0, growthMinutes: 5, withered: false };
    addItem(
      state.containers.find((item) => item.kind === 'mill-output')!,
      'lumber',
      4,
    );
    expect(ids(state, 'today')).toEqual([
      'hungry',
      'scritch',
      'harvest',
      'water',
      'trough',
      'crate',
      'drills',
      'cup',
      'exhibition',
    ]);
    critter.competitions.push({ day: state.day, time: 40, medal: 'silver' });
    critter.drills = { day: state.day, sessions: { hoops: 1 } };
    expect(ids(state, 'today')).not.toContain('cup');
    expect(ids(state, 'today')).not.toContain('drills');
  });
});

describe('what a companion’s growth earns', () => {
  it('makes practiced, clever, bonded foragers bring more and finer berries', () => {
    const novice = activeCritter(createInitialState());
    const veteran = structuredClone(novice);
    veteran.skills.harvesting = 12;
    veteran.stats.intelligence = 12;
    veteran.bond = 80;
    expect(forageYield(veteran).bonusChance).toBeGreaterThan(forageYield(novice).bonusChance);
    expect(forageYield(veteran).quality).toBeGreaterThan(forageYield(novice).quality);
    expect(forageYield({ ...veteran, skills: { ...veteran.skills, harvesting: 99 } })).toEqual({
      bonusChance: 0.75,
      quality: 3,
    });
  });

  it('quickens hauling with speed and practice, never below the starting pace', () => {
    const novice = activeCritter(createInitialState());
    expect(haulingPace(novice)).toBe(1);
    expect(haulingPace({ ...novice, stats: { ...novice.stats, speed: 2 } })).toBe(1);
    const practiced = { ...novice, skills: { ...novice.skills, hauling: 5 } };
    expect(haulingPace(practiced)).toBeCloseTo(1.1);
    const quick = { ...practiced, stats: { ...novice.stats, speed: 8 } };
    expect(haulingPace(quick)).toBeCloseTo(1.22);
    expect(haulingPace({ ...quick, skills: { ...quick.skills, hauling: 99 } })).toBe(1.5);
  });

  it('says so in the learning summaries the HUD shows', () => {
    const host = new LocalGameHost();
    expect(host.learning().effect).toContain('Once Mallow gathers');
    expect(host.haulingLearning().effect).toContain('Once Mallow hauls');
    host.critter.learnedBehaviors['sunberry-foraging'] = 3;
    host.critter.learnedBehaviors['lumber-hauling'] = 2;
    host.critter.skills['hauling'] = 5;
    expect(host.learning().effect).toMatch(/third berry \d+% of the time; berry quality \d of 3/);
    expect(host.haulingLearning().effect).toContain('Hauls 10% faster');
  });
});
