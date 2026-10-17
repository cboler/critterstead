import { createInitialState } from './host';
import { MAP_SIZE, minimap, worldMap } from './map';
import { GameState } from './model';

function at(modify: (state: GameState) => void = () => undefined): GameState {
  const state = createInitialState();
  modify(state);
  return state;
}

describe('Grandpa’s map', () => {
  it('lays the places out west to east, inside the map, with the yard as home', () => {
    const places = worldMap(at());
    expect(places.map((place) => place.id)).toEqual([
      'colosseum',
      'road',
      'town',
      'lane',
      'homestead',
      'glade',
    ]);
    for (const place of places) {
      expect(place.x).toBeGreaterThanOrEqual(0);
      expect(place.x + place.width).toBeLessThanOrEqual(MAP_SIZE.width);
      expect(place.y).toBeGreaterThan(0);
    }
    const home = places.find((place) => place.id === 'homestead')!;
    expect(home.here).toBe(true);
    expect(home.who).toEqual(expect.arrayContaining(['You', 'Mallow', 'Grandpa', 'Pip']));
  });

  it('counts the cottage as the yard, and says what matters today', () => {
    const inside = worldMap(at((state) => (state.areaId = 'cottage')));
    expect(inside.find((place) => place.here)!.id).toBe('homestead');
    const night = worldMap(at((state) => (state.minute = 1200)));
    expect(night.find((place) => place.id === 'town')!.notes).toContain('Store opens at 8:00');
    const cupDay = worldMap(
      at((state) => {
        state.day = 3;
        state.totalMinutes = 2 * 1440 + state.minute;
      }),
    );
    expect(cupDay.find((place) => place.id === 'colosseum')!.notes).toContain(
      'Today: the Fledgling Cup',
    );
    const ready = worldMap(
      at((state) => {
        state.plots[0].crop = {
          speciesId: 'feed',
          plantedAt: 0,
          growthMinutes: 10000,
          withered: false,
        };
      }),
    );
    expect(ready.find((place) => place.id === 'homestead')!.notes).toContain(
      '1 bed ready to harvest',
    );
  });

  it('draws the current area on the minimap with its exits and who is about', () => {
    const state = at();
    const view = minimap(state);
    expect(view.half).toEqual({ x: 14, z: 10 });
    expect(view.marks.filter((mark) => mark.kind === 'gate')).toHaveLength(2);
    expect(view.marks.at(-1)).toEqual({ kind: 'you', point: state.player.position });
    expect(view.marks.some((mark) => mark.kind === 'companion')).toBe(true);
  });
});
