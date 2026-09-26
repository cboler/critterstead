import { describe, expect, it } from 'vitest';
import { GAME_CONFIG } from './content';
import { createInitialState, knowledgeStage, LocalGameHost } from './host';
import { activeCritter, GameState, Point } from './model';

function at(position: Point, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.player.position = { ...position };
  activeCritter(state).position = { ...position };
  modify?.(state);
  return new LocalGameHost(state);
}

function act(host: LocalGameHost, targetId: string, action: string): boolean {
  return host.dispatch({ type: 'interact', targetId, action });
}

function finishActivity(host: LocalGameHost): void {
  for (let hit = 0; hit < 3; hit++) {
    host.update(0.7);
    expect(host.dispatch({ type: 'training-hit' })).toBe(true);
  }
}

describe('LocalGameHost authority and care', () => {
  it('owns a separate snapshot and rejects remote, invented, and unaffordable actions', () => {
    const initial = createInitialState();
    const host = new LocalGameHost(initial);
    expect(act(host, 'market', 'buy-feed')).toBe(false);
    expect(act(host, 'critter-mallow', 'upgrade')).toBe(false);
    expect(act(host, 'critter-mallow', 'pet')).toBe(true);
    expect(activeCritter(initial).bond).toBe(20);
    const poor = at({ x: 4, z: -2 });
    expect(act(poor, 'shed', 'upgrade')).toBe(false);
    expect(poor.state.player.coins).toBe(6);
    expect(poor.state.shedLevel).toBe(0);
  });

  it('does not let repeated petting or feeding manufacture unlimited benefits', () => {
    const host = at({ x: 0, z: 0 });
    expect(act(host, 'critter-mallow', 'pet')).toBe(true);
    const bond = host.critter.bond;
    expect(act(host, 'critter-mallow', 'pet')).toBe(false);
    expect(host.critter.bond).toBe(bond);
    expect(act(host, 'critter-mallow', 'feed')).toBe(true);
    expect(act(host, 'critter-mallow', 'feed')).toBe(false);
    expect(host.state.inventory.find((item) => item.itemId === 'feed')?.quantity).toBe(3);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(act(host, 'critter-mallow', 'pet')).toBe(true);
  });

  it('normalizes movement, rejects invalid input, and blocks the cottage', () => {
    const host = at({ x: -5, z: -1.7 });
    expect(host.dispatch({ type: 'move', x: 0, z: -100, seconds: 10 })).toBe(false);
    expect(host.state.player.position).toEqual({ x: -5, z: -1.7 });
    expect(host.dispatch({ type: 'move', x: Number.NaN, z: 1, seconds: 0.1 })).toBe(false);
    expect(host.dispatch({ type: 'move', x: 100, z: 0, seconds: 10 })).toBe(true);
    expect(host.state.player.position.x).toBeCloseTo(-4.6);
  });

  it('prioritizes a nearby station over a following critter', () => {
    const host = at({ x: -5, z: 2 });
    expect(host.interaction()?.id).toBe('crop');
  });

  it('advances a full day in the configured thirty real minutes without negative needs', () => {
    const host = new LocalGameHost();
    for (let second = 0; second < GAME_CONFIG.realSecondsPerDay; second++) host.update(1);
    expect(host.state.day).toBe(2);
    expect(host.state.minute).toBeCloseTo(480, 6);
    expect(host.critter.ageDays).toBe(19);
    expect(host.critter.hunger).toBeGreaterThan(35);
    host.update(Number.POSITIVE_INFINITY);
    expect(Number.isFinite(host.state.totalMinutes)).toBe(true);
  });
});

describe('progression, resources, and persistence', () => {
  it('requires observation before commands, then learns independent foraging from real harvests', () => {
    const host = at({ x: 0, z: 0 }, (state) => {
      state.areaId = 'glade';
      state.areaInstanceId = 'local-glade';
      state.resources.forEach((node, index) => {
        node.position = { x: index * 0.1, z: 0 };
      });
    });
    expect(act(host, host.state.resources[0].id, 'critter-gather')).toBe(false);
    for (let index = 0; index < 3; index++)
      expect(act(host, host.state.resources[index].id, 'gather')).toBe(true);
    expect(knowledgeStage(host.critter.berryKnowledge)).toBe('Harvests on cue');
    expect(act(host, host.state.resources[0].id, 'gather')).toBe(false);
    for (let index = 3; index < 5; index++)
      expect(act(host, host.state.resources[index].id, 'critter-gather')).toBe(true);
    expect(knowledgeStage(host.critter.berryKnowledge)).toBe('Independent forager');
    expect(host.state.resources[5].available).toBe(true);
    host.update(0.1);
    expect(host.state.resources[5].available).toBe(false);
    expect(host.state.flags).toContain('assisted');
    expect(host.critter.stamina).toBe(76);
  });

  it('requires stamina and food for work and never depletes a bush on a rejected command', () => {
    const host = at({ x: -3, z: -2 }, (state) => {
      state.areaId = 'glade';
      state.player.stamina = 0;
      activeCritter(state).stamina = 7;
      activeCritter(state).berryKnowledge = 7;
    });
    expect(act(host, 'berries-west', 'gather')).toBe(false);
    expect(act(host, 'berries-west', 'critter-gather')).toBe(false);
    host.update(1);
    expect(host.state.resources[0].available).toBe(true);
    expect(host.state.player.stamina).toBe(0);
    expect(host.critter.stamina).toBe(7);
  });

  it('grows useful feed only after planting, watering, and enough time', () => {
    const host = at({ x: -5, z: 2 });
    expect(act(host, 'crop', 'harvest')).toBe(false);
    expect(act(host, 'crop', 'plant')).toBe(true);
    expect(act(host, 'crop', 'water')).toBe(true);
    expect(act(host, 'crop', 'water')).toBe(false);
    expect(act(host, 'crop', 'harvest')).toBe(false);
    for (let second = 0; second < 225; second++) host.update(1);
    expect(act(host, 'crop', 'harvest')).toBe(true);
    expect(host.state.inventory.find((item) => item.itemId === 'feed')?.quantity).toBe(7);
    expect(host.state.inventory.find((item) => item.itemId === 'seed')?.quantity).toBe(3);
    expect(act(host, 'crop', 'harvest')).toBe(false);
  });

  it('prices quality, consumes sold berries, and makes the shed improvement permanent', () => {
    const host = at({ x: -6, z: 5 }, (state) => {
      state.inventory.push({ id: 'stack-berry-2', itemId: 'berry', quality: 2, quantity: 3 });
    });
    expect(act(host, 'market', 'sell')).toBe(true);
    expect(host.state.player.coins).toBe(12);
    expect(act(host, 'market', 'sell')).toBe(false);
    const saved = structuredClone(host.state);
    saved.player.position = { x: 4, z: -2 };
    const atShed = new LocalGameHost(saved);
    expect(act(atShed, 'shed', 'upgrade')).toBe(true);
    expect(atShed.state.shedLevel).toBe(1);
    expect(atShed.state.player.coins).toBe(0);
    expect(act(atShed, 'shed', 'upgrade')).toBe(false);
    atShed.dispatch({ type: 'debug', action: 'next-day' });
    expect(atShed.state.shedLevel).toBe(1);
  });

  it('continues identical seeded outcomes after a save and load', () => {
    const host = at({ x: -3, z: -2 }, (state) => {
      state.areaId = 'glade';
      activeCritter(state).berryKnowledge = 3;
    });
    const loaded = new LocalGameHost(JSON.parse(JSON.stringify(host.state)) as GameState);
    expect(act(host, 'berries-west', 'critter-gather')).toBe(true);
    expect(act(loaded, 'berries-west', 'critter-gather')).toBe(true);
    expect(loaded.state).toEqual(host.state);
    expect(host.state.seed).not.toBe(240921);
  });

  it('sleeps into a new morning, renews berries, and preserves creature identity', () => {
    const host = at({ x: -5, z: -1.5 }, (state) => {
      state.player.stamina = 10;
      activeCritter(state).stamina = 5;
      state.resources[0].available = false;
      state.resources[0].respawnAt = 600;
    });
    expect(act(host, 'house', 'sleep')).toBe(true);
    expect(host.state.day).toBe(2);
    expect(host.state.minute).toBe(480);
    expect(host.critter.id).toBe('critter-mallow');
    expect(host.critter.ageDays).toBe(19);
    expect(host.critter.stamina).toBe(100);
    expect(host.state.resources[0].available).toBe(true);
  });
});

describe('training and competitions', () => {
  it('takes three real timed cues, blocks spamming, and pays energy up front', () => {
    const host = at({ x: 3, z: 2 });
    expect(act(host, 'training', 'train')).toBe(true);
    expect(host.critter.stamina).toBe(85);
    expect(host.dispatch({ type: 'training-hit' })).toBe(false);
    host.update(0.7);
    expect(host.dispatch({ type: 'training-hit' })).toBe(true);
    expect(host.dispatch({ type: 'training-hit' })).toBe(false);
    expect(act(host, 'market', 'sell')).toBe(false);
    const loaded = new LocalGameHost(structuredClone(host.state));
    for (let hit = 0; hit < 2; hit++) {
      loaded.update(0.7);
      expect(loaded.dispatch({ type: 'training-hit' })).toBe(true);
    }
    expect(loaded.state.training).toBeNull();
    expect(loaded.critter.stats.speed).toBeGreaterThan(4);
    expect(loaded.state.flags).toContain('trained');
  });

  it('makes care influence practice results with identical timing', () => {
    const happy = at({ x: 3, z: 2 }, (state) => {
      activeCritter(state).happiness = 100;
      activeCritter(state).bond = 100;
      activeCritter(state).hunger = 0;
    });
    const tired = at({ x: 3, z: 2 }, (state) => {
      activeCritter(state).happiness = 20;
      activeCritter(state).bond = 10;
      activeCritter(state).hunger = 70;
    });
    expect(act(happy, 'training', 'train')).toBe(true);
    expect(act(tired, 'training', 'train')).toBe(true);
    finishActivity(happy);
    finishActivity(tired);
    expect(happy.critter.stats.speed).toBeGreaterThan(tired.critter.stats.speed);
  });

  it('records one rewarded competition per day and cannot create repeat race money', () => {
    const host = at({ x: 2, z: 6 });
    expect(act(host, 'race', 'race')).toBe(true);
    finishActivity(host);
    expect(host.critter.competitions).toHaveLength(1);
    const coins = host.state.player.coins;
    expect(coins).toBeGreaterThan(6);
    expect(act(host, 'race', 'race')).toBe(false);
    expect(host.state.player.coins).toBe(coins);
  });
});

describe('individual identity and ownership', () => {
  function household(): GameState {
    const state = createInitialState();
    const starter = activeCritter(state);
    const pip = {
      ...structuredClone(starter),
      id: 'grandpa-pip',
      name: 'Pip',
      ownerId: 'grandpa',
      ageDays: 900,
      berryKnowledge: 20,
      bond: 100,
    };
    // Put Pip first to catch code that assumes the active individual is array element zero.
    state.critters.unshift(pip);
    return state;
  }

  it('cares for the selected player individual, never the nearby Grandpa-owned Pip', () => {
    const state = household();
    const before = structuredClone(state.critters[0]);
    const host = new LocalGameHost(state);
    expect(host.interaction()?.title).toContain('Mallow');
    expect(act(host, 'grandpa-pip', 'pet')).toBe(false);
    expect(act(host, host.critter.id, 'pet')).toBe(true);
    expect(host.critter.lastPettedDay).toBe(1);
    expect(host.critter.bond).toBe(25);
    expect(host.state.critters[0]).toEqual(before);
    expect(host.state.journal[0]).toContain('Mallow');
  });

  it.each(['train', 'race'] as const)(
    'routes %s effort, progress, and rewards only to the selected companion',
    (action) => {
      const state = household();
      state.player.position = action === 'train' ? { x: 3, z: 2 } : { x: 2, z: 6 };
      const before = structuredClone(state.critters[0]);
      const host = new LocalGameHost(state);
      expect(act(host, action === 'train' ? 'training' : 'race', action)).toBe(true);
      expect(host.state.training?.critterId).toBe('critter-mallow');
      finishActivity(host);
      expect(host.state.critters[0]).toEqual(before);
      expect(host.critter.skills.racing).toBeGreaterThan(0);
      expect(host.state.journal[0]).toContain('Mallow');
    },
  );

  it('does not borrow Pip’s knowledge and only advances the active individual through work and sleep', () => {
    const state = household();
    state.areaId = 'glade';
    state.player.position = { x: -3, z: -2 };
    activeCritter(state).position = { ...state.player.position };
    const before = structuredClone(state.critters[0]);
    const host = new LocalGameHost(state);
    expect(act(host, 'berries-west', 'critter-gather')).toBe(false);
    expect(act(host, 'berries-west', 'gather')).toBe(true);
    expect(host.critter.berryKnowledge).toBe(1);
    host.dispatch({ type: 'debug', action: 'next-day' });
    expect(host.critter.ageDays).toBe(19);
    expect(host.state.critters[0]).toEqual(before);
  });

  it('keeps daily petting individual when a different owned companion is selected in saved state', () => {
    const first = new LocalGameHost();
    expect(act(first, first.critter.id, 'pet')).toBe(true);
    const state = structuredClone(first.state);
    state.critters.push({
      ...structuredClone(first.critter),
      id: 'second-owned',
      name: 'Fern',
      lastPettedDay: null,
    });
    state.activeCritterId = 'second-owned';
    const second = new LocalGameHost(state);
    expect(act(second, second.critter.id, 'pet')).toBe(true);
    expect(second.critter.name).toBe('Fern');
    expect(second.state.critters[0]).toEqual(first.critter);
  });
});
