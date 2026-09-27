import { describe, expect, it } from 'vitest';
import { BEHAVIORS, GAME_CONFIG } from './content';
import { createInitialState, learnedStage, LocalGameHost } from './host';
import { activeCritter, GameState, Point } from './model';
import { readSave } from './storage';
import { legacyV2 } from './fixtures/legacy-v2';

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
    expect(host.learning().label).toBe('Curious companion');
    for (let index = 0; index < 3; index++) {
      expect(act(host, host.state.resources[index].id, 'gather')).toBe(true);
      expect(host.learning().progress).toBe(index + 1);
      expect(host.learning().label).toBe(index < 2 ? 'Learning by watching' : 'Harvests on cue');
    }
    expect(learnedStage(host.critter, BEHAVIORS['sunberry-foraging']).label).toBe(
      'Harvests on cue',
    );
    expect(act(host, host.state.resources[0].id, 'gather')).toBe(false);
    for (let index = 3; index < 5; index++)
      expect(act(host, host.state.resources[index].id, 'critter-gather')).toBe(true);
    expect(learnedStage(host.critter, BEHAVIORS['sunberry-foraging']).label).toBe(
      'Independent forager',
    );
    expect(host.state.resources[5].available).toBe(true);
    host.update(0.1);
    expect(host.state.resources[5].available).toBe(false);
    expect(host.state.flags).toContain('assisted');
    expect(host.critter.stamina).toBe(64);
    const saved = readSave(host.state);
    const loaded = new LocalGameHost(saved);
    loaded.update(0.1);
    expect(loaded.state.inventory).toEqual(saved.inventory);
    expect(loaded.state.seed).toBe(saved.seed);
    expect(loaded.critter.history).toEqual(saved.critters[0].history);
  });

  it('requires stamina and food for work and never depletes a bush on a rejected command', () => {
    const host = at({ x: -3, z: -2 }, (state) => {
      state.areaId = 'glade';
      state.player.stamina = 0;
      activeCritter(state).stamina = 7;
      activeCritter(state).learnedBehaviors['sunberry-foraging'] = 7;
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
      activeCritter(state).learnedBehaviors['sunberry-foraging'] = 3;
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

describe('learning conditions and continuity', () => {
  it.each(['gather', 'critter-gather', 'autonomous'] as const)(
    'retains M1 %s rewards, progression and seeds with M3 effort costs',
    (actor) => {
      const state = readSave(legacyV2);
      state.training = null;
      state.areaId = 'glade';
      state.areaInstanceId = 'local-glade';
      state.player.position = { x: -3, z: -2 };
      activeCritter(state).position = { x: -3, z: -2 };
      activeCritter(state).learnedBehaviors['sunberry-foraging'] =
        actor === 'gather' ? 2 : actor === 'critter-gather' ? 5 : 7;
      state.resources[0].available = true;
      const host = new LocalGameHost(state);
      if (actor === 'autonomous') host.update(0.1);
      else expect(act(host, 'berries-west', actor)).toBe(true);
      // M1 golden rewards/progress/seeds are retained; M3 deliberately changes companion effort from 8 to 12.
      const player = actor === 'gather';
      expect(host.state.seed).toBe(player ? 777197 : 1892584552);
      expect(host.learning().progress).toBe(player ? 3 : actor === 'critter-gather' ? 7 : 8);
      expect(host.critter.stamina).toBe(player ? 63 : 51);
      expect(host.state.player.stamina).toBe(player ? 51 : actor === 'critter-gather' ? 55 : 57);
      expect(host.state.totalMinutes).toBe(
        player ? 9487 : actor === 'critter-gather' ? 9492 : 9472.08,
      );
      expect(host.critter.skills).toEqual({ harvesting: player ? 4 : 5, racing: 6 });
      expect(host.state.inventory.filter((item) => item.itemId === 'berry')).toEqual(
        player
          ? [
              { id: 'stack-berry-2', itemId: 'berry', quantity: 7, quality: 2 },
              { id: 'stack-berry-1', itemId: 'berry', quantity: 2, quality: 1 },
            ]
          : [{ id: 'stack-berry-2', itemId: 'berry', quantity: 10, quality: 2 }],
      );
      expect(host.critter.history).toEqual([
        ...legacyV2.critters[1].history,
        ...(actor === 'autonomous'
          ? []
          : [player ? 'Day 7: Harvests on cue.' : 'Day 7: Independent forager.']),
      ]);
      expect(host.state.critters[0]).toEqual(state.critters[0]);
    },
  );

  function berries(progress = 7): GameState {
    const state = createInitialState();
    state.areaId = 'glade';
    state.areaInstanceId = 'local-glade';
    state.player.position = { x: -3, z: -2 };
    activeCritter(state).position = { x: -3, z: -2 };
    activeCritter(state).learnedBehaviors['sunberry-foraging'] = progress;
    return state;
  }

  it.each([19, 20, 25])('caps practice without reducing already-saved progress %s', (progress) => {
    const host = new LocalGameHost(berries(progress));
    const history = [...host.critter.history];
    expect(act(host, 'berries-west', 'critter-gather')).toBe(true);
    expect(host.learning().progress).toBe(Math.max(progress, 20));
    expect(host.critter.history).toEqual(history);
  });

  it.each([
    [
      'observation',
      (state: GameState) => {
        activeCritter(state).learnedBehaviors = {};
      },
      /watch/,
    ],
    [
      'hunger',
      (state: GameState) => {
        activeCritter(state).hunger = 81;
      },
      /Feed Mallow/,
    ],
    [
      'companion energy',
      (state: GameState) => {
        activeCritter(state).stamina = 7;
      },
      /needs some rest/,
    ],
    [
      'player energy',
      (state: GameState) => {
        state.player.stamina = 1;
      },
      /You need some rest/,
    ],
    [
      'companion distance',
      (state: GameState) => {
        activeCritter(state).position = { x: 9, z: 9 };
      },
      /catch up/,
    ],
    [
      'depleted bush',
      (state: GameState) => {
        state.resources[0].available = false;
        state.resources[0].respawnAt = 600;
      },
      /growing back/,
    ],
  ] as const)('explains rejected cues for %s and changes no state', (_name, modify, reason) => {
    const state = berries(3);
    modify(state);
    const host = new LocalGameHost(state);
    expect(
      host.interaction()?.actions.find((action) => action.id === 'critter-gather')?.reason,
    ).toMatch(reason);
    const before = structuredClone(host.state);
    expect(act(host, 'berries-west', 'critter-gather')).toBe(false);
    expect(host.state).toEqual(before);
  });

  it('only learns from a nearby successful harvest; rejected remote or wrong-area requests grant nothing', () => {
    const state = berries(0);
    activeCritter(state).position = { x: 2, z: -2 }; // Observation range is strictly less than five.
    const host = new LocalGameHost(state);
    expect(host.interaction()?.description).toContain('catch up to watch');
    expect(act(host, 'berries-west', 'gather')).toBe(true);
    expect(host.learning().progress).toBe(0);
    expect(host.state.journal[0]).toContain('too far away');
    const depleted = structuredClone(host.state);
    expect(act(host, 'berries-west', 'gather')).toBe(false);
    expect(host.state).toEqual(depleted);
    expect(act(host, 'berries-east', 'gather')).toBe(false);
    const wrongArea = berries();
    wrongArea.areaId = 'homestead';
    const wrong = new LocalGameHost(wrongArea);
    expect(act(wrong, 'berries-west', 'critter-gather')).toBe(false);
    expect(wrong.state).toEqual(wrongArea);
  });

  it.each([
    [
      'unlearned',
      (state: GameState) => {
        activeCritter(state).learnedBehaviors = {};
      },
      /watch/,
    ],
    [
      'still cued',
      (state: GameState) => {
        activeCritter(state).learnedBehaviors['sunberry-foraging'] = 6;
      },
      /cue/,
    ],
    [
      'hungry',
      (state: GameState) => {
        activeCritter(state).hunger = 81;
      },
      /Feed/,
    ],
    [
      'tired',
      (state: GameState) => {
        activeCritter(state).stamina = 7;
      },
      /rest/,
    ],
    [
      'low bond',
      (state: GameState) => {
        activeCritter(state).bond = 19;
      },
      /20 bond/,
    ],
    [
      'busy',
      (state: GameState) => {
        state.training = {
          critterId: state.activeCritterId,
          kind: 'training',
          phase: 0,
          hits: [],
          elapsed: 0,
        };
      },
      /busy/,
    ],
    [
      'other area',
      (state: GameState) => {
        state.areaId = 'homestead';
      },
      /Clover Glade/,
    ],
    [
      'no ripe bush',
      (state: GameState) => {
        state.resources.forEach((node) => {
          node.available = false;
          node.respawnAt = 600;
        });
      },
      /No ripe bush/,
    ],
    [
      'distant opportunity',
      (state: GameState) => {
        state.player.position = { x: -9, z: -9 };
      },
      /No ripe bush/,
    ],
  ] as const)('explains %s autonomy and performs no work', (_name, modify, reason) => {
    const state = berries();
    modify(state);
    const host = new LocalGameHost(state);
    expect(host.learning().status).toMatch(reason);
    host.update(0.1);
    expect(host.state.inventory).toEqual(state.inventory);
    expect(host.state.resources).toEqual(state.resources);
    expect(host.critter.stamina).toBe(activeCritter(state).stamina);
    expect(host.critter.learnedBehaviors).toEqual(activeCritter(state).learnedBehaviors);
    expect(host.state.seed).toBe(state.seed);
  });

  it('recognizes a ripe opportunity, approaches it, and resumes the same seeded harvest after reload', () => {
    const state = berries();
    activeCritter(state).position = { x: -6, z: -2 };
    const host = new LocalGameHost(state);
    expect(host.learning().status).toContain('spots ripe sunberries');
    host.update(0.1);
    expect(host.state.resources[0].available).toBe(true);
    expect(host.critter.position.x).toBeGreaterThan(-6);
    const loaded = new LocalGameHost(readSave(host.state));
    for (const game of [host, loaded]) for (let tick = 0; tick < 10; tick++) game.update(0.1);
    expect(loaded.state).toEqual(host.state);
    expect(host.state.resources[0].available).toBe(false);
    expect(host.critter.stamina).toBe(88);
    expect(host.learning().progress).toBe(8);
  });

  it('isolates observation, cued and autonomous learning from a dormant expert across migration/reload', () => {
    const state = readSave(legacyV2);
    state.training = null;
    state.areaId = 'glade';
    state.player.position = { x: 0, z: 0 };
    activeCritter(state).position = { x: 0, z: 0 };
    activeCritter(state).learnedBehaviors = {};
    state.resources.forEach((node, index) => {
      node.available = true;
      node.position = { x: index * 0.1, z: 0 };
    });
    const dormant = structuredClone(state.critters[0]);
    let host = new LocalGameHost(state);
    for (let index = 0; index < 5; index++) {
      expect(act(host, state.resources[index].id, index < 3 ? 'gather' : 'critter-gather')).toBe(
        true,
      );
      host = new LocalGameHost(readSave(host.state));
      expect(host.state.critters[0]).toEqual(dormant);
    }
    host.update(0.1);
    expect(host.state.flags).toContain('assisted');
    expect(host.state.critters[0]).toEqual(dormant);
    expect(host.learning().progress).toBe(8);
  });
});

describe('training and competitions', () => {
  it('takes three real timed cues, blocks spamming, and pays energy up front', () => {
    const host = at({ x: 3, z: 2 });
    expect(act(host, 'training', 'train')).toBe(true);
    expect(host.critter.stamina).toBe(70);
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

describe('daily effort and recovery', () => {
  it.each([
    ['training', 'train', 30, { x: 3, z: 2 }],
    ['race', 'race', 35, { x: 2, z: 6 }],
  ] as const)(
    'requires the full M3 effort for %s without charging rejected starts',
    (target, action, cost, position) => {
      const host = at(position, (state) => {
        activeCritter(state).stamina = cost - 0.01;
      });
      const before = structuredClone(host.state);
      expect(act(host, target, action)).toBe(false);
      expect(host.state).toEqual(before);
      host.critter.stamina = cost;
      expect(act(host, target, action)).toBe(true);
      expect(host.critter.stamina).toBe(0);
      expect(host.state.player.stamina).toBe(95);
      const loaded = new LocalGameHost(readSave(host.state));
      finishActivity(loaded);
      expect(loaded.critter.stamina).toBe(0);
      expect(loaded.state.player.stamina).toBe(95);
    },
  );

  it('rest preserves daily care and trial limits, age and earned progress', () => {
    const host = at({ x: 2, z: 6 });
    expect(act(host, host.critter.id, 'pet')).toBe(true);
    expect(act(host, 'race', 'race')).toBe(true);
    finishActivity(host);
    host.state.player.position = { x: 4, z: -2 };
    const before = structuredClone(host.critter);
    expect(act(host, 'shed', 'rest')).toBe(true);
    expect(host.critter.stamina).toBe(100);
    expect(host.critter.hunger).toBeCloseTo(before.hunger + 3);
    expect(host.critter.ageDays).toBe(before.ageDays);
    expect(host.critter.lastPettedDay).toBe(before.lastPettedDay);
    expect(host.critter.competitions).toEqual(before.competitions);
    expect(host.critter.skills).toEqual(before.skills);
    expect(host.critter.bond).toBe(before.bond);
    expect(host.critter.happiness).toBe(before.happiness);
    host.state.player.position = { x: 2, z: 6 };
    expect(act(host, 'race', 'race')).toBe(false);
    expect(act(host, host.critter.id, 'pet')).toBe(false);
  });

  it('trades two hours for capped energy, grows crops, and persists without replaying recovery', () => {
    const host = at({ x: 4, z: -2 }, (state) => {
      state.player.stamina = 90;
      activeCritter(state).stamina = 0;
      state.inventory = [];
      state.player.coins = 0;
      state.crop = { id: 'crop-feed', plantedAt: 300, watered: true, readyAt: 530 };
      state.resources[0].available = false;
      state.resources[0].respawnAt = 530;
      state.critters.unshift({
        ...structuredClone(activeCritter(state)),
        id: 'grandpa-pip',
        ownerId: 'grandpa',
        name: 'Pip',
      });
    });
    const before = structuredClone(host.state);
    expect(host.interaction()?.actions.find((action) => action.id === 'rest')?.label).toContain(
      '+10 your energy · +35 Mallow',
    );
    expect(act(host, 'shed', 'rest')).toBe(true);
    expect(host.state.player.stamina).toBe(100);
    expect(host.critter.stamina).toBe(35);
    expect(host.critter.hunger).toBe(38);
    expect(host.state.totalMinutes).toBe(600);
    expect(host.state.day).toBe(1);
    expect(host.state.crop.readyAt).toBeLessThanOrEqual(host.state.totalMinutes);
    expect(host.state.resources[0].available).toBe(true);
    expect(host.state.inventory).toEqual([]);
    expect(host.state.player.coins).toBe(0);
    expect(host.state.critters[0]).toEqual(before.critters[0]);
    expect(host.state.seed).toBe(before.seed);
    expect(host.state.journal[0]).toContain('You regain 10 energy; Mallow regains 35');
    const loaded = new LocalGameHost(readSave(readSave(host.state)));
    expect(loaded.state).toEqual(host.state);
    expect(act(loaded, 'shed', 'rest')).toBe(true);
    expect(loaded.critter.stamina).toBe(70);
    expect(loaded.state.totalMinutes).toBe(720);
  });

  it('rejects remote, unnecessary, busy and midnight-crossing breaks without changing state', () => {
    const fresh = new LocalGameHost();
    expect(act(fresh, 'shed', 'rest')).toBe(false);
    for (const modify of [
      () => undefined,
      (state: GameState) => {
        state.player.stamina = 0;
        state.minute = state.totalMinutes = 1320;
      },
      (state: GameState) => {
        state.player.stamina = 0;
        state.training = {
          critterId: state.activeCritterId,
          kind: 'training',
          phase: 0,
          hits: [],
          elapsed: 0,
        };
      },
    ]) {
      const host = at({ x: 4, z: -2 }, modify);
      const before = structuredClone(host.state);
      expect(act(host, 'shed', 'rest')).toBe(false);
      expect(host.state).toEqual(before);
    }
    const evening = at({ x: 4, z: -2 }, (state) => {
      state.player.stamina = 0;
      state.minute = state.totalMinutes = 1319;
    });
    expect(act(evening, 'shed', 'rest')).toBe(true);
    expect(evening.state.day).toBe(1);
    expect(evening.state.minute).toBe(1439);
    evening.state.player.position = { x: -4, z: -2 };
    expect(act(evening, 'house', 'sleep')).toBe(true);
    expect(evening.state.day).toBe(2);
    expect(evening.state.minute).toBe(480);
  });

  it('recovers an empty, exhausted and hungry household into useful work without buying or resetting', () => {
    let host = at({ x: 4, z: -2 }, (state) => {
      state.player.stamina = 0;
      state.player.coins = 0;
      state.inventory = [];
      activeCritter(state).stamina = 0;
      activeCritter(state).hunger = 100;
    });
    expect(act(host, 'shed', 'rest')).toBe(true);
    host = new LocalGameHost(readSave(host.state));
    // Travel is free even when exhausted; only work consumes energy.
    host.state.player.position = { x: 8, z: 0 };
    expect(act(host, 'gate', 'travel')).toBe(true);
    host.state.player.position = { x: -3, z: -2 };
    host.critter.position = { x: -3, z: -2 };
    expect(act(host, 'berries-west', 'gather')).toBe(true);
    expect(act(host, host.critter.id, 'treat')).toBe(true);
    expect(act(host, host.critter.id, 'treat')).toBe(true);
    expect(host.critter.hunger).toBeLessThan(80);
    host.state.player.position = { x: -8, z: 0 };
    expect(act(host, 'gate', 'travel')).toBe(true);
    host.state.player.position = { x: 3, z: 2 };
    expect(act(host, 'training', 'train')).toBe(true);
    finishActivity(host);
    expect(host.critter.stats.speed).toBeGreaterThan(4);
    expect(host.critter.health).toBe(100);
    expect(host.state.player.coins).toBe(0);
    expect(host.state.journal.some((entry) => entry.startsWith('Developer:'))).toBe(false);
  });

  it.each([31.99, 32])('protects an autonomous reserve at %s energy across reload', (energy) => {
    const host = at({ x: -3, z: -2 }, (state) => {
      state.areaId = 'glade';
      state.areaInstanceId = 'local-glade';
      activeCritter(state).stamina = energy;
      activeCritter(state).learnedBehaviors['sunberry-foraging'] = 7;
    });
    host.update(0.1);
    expect(host.state.resources[0].available).toBe(energy < 32);
    expect(host.critter.stamina).toBe(energy < 32 ? energy : 20);
    expect(host.learning().status).toContain('keeping 20 energy in reserve');
    if (energy === 32) expect(host.state.journal[0]).toContain('Spent 12 energy; 20 left');
    const loaded = new LocalGameHost(readSave(host.state));
    const before = structuredClone(loaded.state);
    for (let tick = 0; tick < 10; tick++) loaded.update(1);
    expect(loaded.state.inventory).toEqual(before.inventory);
    expect(loaded.state.resources).toEqual(before.resources);
    expect(loaded.state.seed).toBe(before.seed);
    expect(loaded.critter.stamina).toBe(before.critters[0].stamina);
    expect(loaded.state.journal).toEqual(before.journal);
  });

  it('lets a deliberate cue use the reserve, then resumes autonomous work after recovery', () => {
    const host = at({ x: -3, z: -2 }, (state) => {
      state.areaId = 'glade';
      state.areaInstanceId = 'local-glade';
      activeCritter(state).stamina = 20;
      activeCritter(state).learnedBehaviors['sunberry-foraging'] = 7;
    });
    expect(act(host, 'berries-west', 'critter-gather')).toBe(true);
    expect(host.critter.stamina).toBe(8);
    expect(host.state.player.stamina).toBe(98);
    host.state.player.position = { x: -8, z: 0 };
    expect(act(host, 'gate', 'travel')).toBe(true);
    host.state.player.position = { x: 4, z: -2 };
    expect(act(host, 'shed', 'rest')).toBe(true);
    host.state.player.position = { x: 8, z: 0 };
    expect(act(host, 'gate', 'travel')).toBe(true);
    host.state.player.position = { x: -1, z: 2.5 };
    host.critter.position = { ...host.state.player.position };
    host.update(0.1);
    expect(host.state.resources[1].available).toBe(false);
    expect(host.critter.stamina).toBe(31);
    expect(host.state.journal[0]).toContain('Spent 12 energy; 31 left');
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
      learnedBehaviors: { 'sunberry-foraging': 20 },
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
    expect(host.critter.learnedBehaviors['sunberry-foraging']).toBe(1);
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
