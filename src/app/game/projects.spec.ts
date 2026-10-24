import { createInitialState, LocalGameHost } from './host';
import { addItem, quantity } from './logistics';
import { activeCritter, backpack, Container, GameState } from './model';
import { CHORE, DUTIES, PROJECTS, STOVE } from './projects';
import { readSave, validateSave } from './storage';
import { withDormantExpert } from './fixtures/household';

const store = (state: GameState, kind: Container['kind']) =>
  state.containers.find((container) => container.kind === kind)!;

/** The yard on a fair spring morning, with Bramble at home in the barn, able to haul. */
function yard(modify: (state: GameState) => void = () => undefined): LocalGameHost {
  const state = withDormantExpert(createInitialState());
  state.shedLevel = 1;
  state.player.coins = 100;
  state.player.position = { x: 0, z: 0 };
  activeCritter(state).position = { x: 0.6, z: 0.4 };
  const bramble = state.critters.find((critter) => critter.id === 'critter-dormant')!;
  bramble.learnedBehaviors = { 'sunberry-foraging': 8, 'lumber-hauling': 6 };
  modify(state);
  return new LocalGameHost(state);
}
const act = (host: LocalGameHost, targetId: string, action: string) =>
  host.dispatch({ type: 'interact', targetId, action });
const bramble = (host: LocalGameHost) =>
  host.state.critters.find((critter) => critter.id === 'critter-dormant')!;
/** Runs the clock to a minute of today, as the game does, a little at a time. */
function until(host: LocalGameHost, minute: number): void {
  while (host.state.minute < minute) host.update(1);
}

describe('the chore board', () => {
  it('switches a learned duty off and on, and refuses one not yet learned', () => {
    const host = yard();
    host.state.player.position = { x: 3, z: -1.8 };
    expect(host.interaction()?.title).toMatch(/barn/);
    expect(act(host, 'shed', 'duty:critter-dormant:stock')).toBe(true);
    expect(bramble(host).duties.stock).toBe(false);
    expect(act(host, 'shed', 'duty:critter-dormant:stock')).toBe(true);
    expect(bramble(host).duties.stock).toBe(true);
    // Mallow has learned nothing yet, and the board is read at the barn only.
    expect(act(host, 'shed', 'duty:critter-mallow:haul')).toBe(false);
    host.state.player.position = { x: -6, z: 5 };
    expect(act(host, 'shed', 'duty:critter-dormant:stock')).toBe(false);
    host.state.player.position = { x: 3, z: -1.8 };
    expect(act(host, 'shed', 'read-chores')).toBe(true);
    expect(host.state.flags).toContain('read-chores');
  });

  it('runs each duty at its hour: stocking, delivering and shipping from the stores', () => {
    const host = yard((state) => {
      addItem(store(state, 'chest'), 'feed', 5);
      addItem(store(state, 'chest'), 'lumber', 5);
      addItem(store(state, 'box'), 'turnip', 6);
      state.project = { id: 'stall', delivered: { lumber: 0, stone: 0 } };
    });
    const energy = bramble(host).stamina;
    until(host, DUTIES.find((duty) => duty.id === 'ship')!.at + 1);
    const state = host.state;
    expect(quantity(store(state, 'trough'), 'feed')).toBe(5);
    expect(state.project!.delivered.lumber).toBe(CHORE.deliver);
    expect(quantity(store(state, 'chest'), 'lumber')).toBe(5 - CHORE.deliver);
    expect(quantity(store(state, 'pickup'), 'turnip')).toBe(CHORE.ship);
    expect(quantity(store(state, 'box'), 'turnip')).toBe(6 - CHORE.ship);
    expect(bramble(host).stamina).toBe(energy - 4 * CHORE.energy);
    expect(state.journal.some((line) => line.startsWith('Bramble tops up the feed trough'))).toBe(
      true,
    );
  });

  it('skips duties switched off, and keeps a tired critter’s reserve', () => {
    const off = yard((state) => {
      addItem(store(state, 'chest'), 'feed', 5);
      state.critters.find((critter) => critter.id === 'critter-dormant')!.duties.stock = false;
    });
    until(off, 1021);
    expect(quantity(store(off.state, 'trough'), 'feed')).toBe(0);
    const tired = yard((state) => {
      addItem(store(state, 'chest'), 'feed', 5);
      state.critters.find((critter) => critter.id === 'critter-dormant')!.stamina = CHORE.reserve;
    });
    until(tired, 1021);
    expect(quantity(store(tired.state, 'trough'), 'feed')).toBe(0);
  });

  it('has a companion at home in the yard do its chores too, but not one out in town', () => {
    const setup = (state: GameState) => {
      state.critters = state.critters.filter((critter) => critter.id !== 'critter-dormant');
      state.containers = state.containers.filter((item) => item.id !== 'satchel-critter-dormant');
      activeCritter(state).learnedBehaviors = { 'lumber-hauling': 6 };
      addItem(store(state, 'chest'), 'feed', 3);
    };
    const home = yard(setup);
    until(home, 1021);
    expect(quantity(store(home.state, 'trough'), 'feed')).toBe(3);
    const away = yard((state) => {
      setup(state);
      state.areaId = 'town';
      state.player.position = { x: -10.1, z: 1.3 };
    });
    until(away, 1021);
    expect(quantity(store(away.state, 'trough'), 'feed')).toBe(0);
  });
});

describe('building projects', () => {
  it('plans one project at a time, takes delivered materials, and builds for coins', () => {
    const host = yard();
    host.state.player.position = { x: -1, z: 3.2 };
    expect(act(host, 'yard-chest', 'plan:chest')).toBe(true);
    expect(act(host, 'yard-chest', 'plan:chest')).toBe(false);
    host.state.player.position = { x: 6.5, z: -1.2 };
    const trough = host.interaction()!.actions.find((action) => action.id === 'plan:trough')!;
    expect(trough.disabled).toBe(true);
    expect(trough.reason).toMatch(/Finish or set aside/);

    host.state.player.position = { ...PROJECTS.chest.site };
    expect(host.interaction()?.title).toBe('Building site · A bigger yard chest');
    addItem(backpack(host.state), 'lumber', 5);
    expect(act(host, 'site', 'build')).toBe(false);
    expect(act(host, 'site', 'deliver-lumber')).toBe(true);
    expect(quantity(backpack(host.state), 'lumber')).toBe(5 - PROJECTS.chest.lumber);
    expect(() => validateSave(host.state)).not.toThrow();
    expect(act(host, 'site', 'build')).toBe(true);
    expect(host.state.built).toEqual(['chest']);
    expect(store(host.state, 'chest').capacity).toBe(96);
    expect(host.state.flags).toContain('built');
    const loaded = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(store(loaded.state, 'chest').capacity).toBe(96);
  });

  it('returns delivered materials when plans are set aside', () => {
    const host = yard((state) => {
      state.project = { id: 'mill', delivered: { lumber: 2, stone: 1 } };
      state.player.position = { ...PROJECTS.mill.site };
    });
    expect(act(host, 'site', 'set-aside')).toBe(true);
    expect(host.state.project).toBeNull();
    expect(quantity(backpack(host.state), 'lumber')).toBe(2);
    expect(quantity(backpack(host.state), 'stone')).toBe(1);
  });

  it('builds the stove in the cottage, which cooks feed from wheat and turnips', () => {
    const host = yard((state) => {
      state.areaId = 'cottage';
      state.areaInstanceId = 'local-cottage';
      state.player.position = { x: 2.6, z: -2.6 };
      state.project = {
        id: 'stove',
        delivered: { lumber: PROJECTS.stove.lumber, stone: PROJECTS.stove.stone },
      };
    });
    host.state.player.position = { ...PROJECTS.stove.site };
    expect(act(host, 'site', 'build')).toBe(true);
    host.state.player.position = { x: 2.6, z: -2.6 };
    expect(host.interaction()?.title).toBe('Kitchen stove');
    expect(act(host, 'hearth', 'cook')).toBe(false);
    addItem(backpack(host.state), 'wheat', 1);
    addItem(backpack(host.state), 'turnip', 1);
    const feed = quantity(backpack(host.state), 'feed');
    expect(act(host, 'hearth', 'cook')).toBe(true);
    expect(quantity(backpack(host.state), 'feed')).toBe(feed + STOVE.feed);
    expect(quantity(backpack(host.state), 'wheat')).toBe(0);
  });
});

describe('saves with chores and projects', () => {
  it('carries a v14 save forward with every duty on and nothing planned', () => {
    const v14 = structuredClone(createInitialState()) as unknown as Record<string, unknown>;
    v14['version'] = 14;
    delete v14['project'];
    delete v14['built'];
    for (const critter of v14['critters'] as Record<string, unknown>[]) delete critter['duties'];
    const before = structuredClone(v14);
    const loaded = readSave(v14);
    expect(v14).toEqual(before);
    expect(loaded.version).toBe(15);
    expect(loaded.project).toBeNull();
    expect(loaded.built).toEqual([]);
    expect(activeCritter(loaded).duties).toEqual({
      forage: true,
      haul: true,
      deliver: true,
      stock: true,
      ship: true,
    });
  });

  it('rejects damaged duties, projects and upgrades', () => {
    for (const damage of [
      (state: GameState) =>
        delete (activeCritter(state).duties as Partial<object>)['ship' as never],
      (state: GameState) => (state.project = { id: 'chest', delivered: { lumber: 9, stone: 0 } }),
      (state: GameState) => (state.built = ['chest', 'chest']),
      (state: GameState) => (state.built = ['stall']),
      (state: GameState) => (store(state, 'chest').capacity = 96),
      (state: GameState) => {
        state.built = ['chest'];
        state.project = { id: 'chest', delivered: { lumber: 0, stone: 0 } };
      },
    ]) {
      const state = createInitialState();
      damage(state);
      expect(() => validateSave(state)).toThrow(/damaged/);
    }
  });
});
