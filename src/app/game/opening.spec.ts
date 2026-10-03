import { AREAS } from './content';
import { createInitialState } from './host';
import { OFFER_BEAT, OPENING, openingFarewell, stageOpening } from './opening';

describe('the walk to Oakhaven', () => {
  it('goes from the yard to town, meets Gemothy and Mallow, and ends on the choice', () => {
    const ids = OPENING.map((beat) => beat.id);
    expect(OPENING[0].areaId).toBe('homestead');
    expect(OPENING.at(-1)!.guests).toBe('offer');
    expect(OFFER_BEAT).toBe(OPENING.length - 1);
    expect(ids.indexOf('the-hedge')).toBeLessThan(ids.indexOf('gemothy'));
    expect(ids.indexOf('gemothy')).toBeLessThan(ids.indexOf('mallow'));
    expect(OPENING.find((beat) => beat.id === 'gemothy')!.line).toContain('Gemothy');
    expect(OPENING.find((beat) => beat.id === 'mallow')!.guests).toBe('mallow');
    // Grandpa names the ways people and critters find each other.
    const ways = OPENING.map((beat) => beat.line).join(' ');
    for (const way of ['raise', 'breeder', 'wild', 'take in', 'arrangement', 'growth labs'])
      expect(ways).toContain(way);
  });

  it('keeps everyone inside the area they are staged in, through the morning', () => {
    let minute = 0;
    for (const beat of OPENING) {
      expect(beat.minute).toBeGreaterThanOrEqual(minute);
      minute = beat.minute;
      const half = AREAS[beat.areaId].halfSize;
      for (const point of [beat.player, beat.stage.grandpa, beat.stage.pip, beat.stage.gemothy])
        if (point) {
          expect(Math.abs(point.x), beat.id).toBeLessThan(half);
          expect(Math.abs(point.z), beat.id).toBeLessThan(half);
        }
    }
  });

  it('places the rancher on arriving somewhere new, and leaves walking to the scene', () => {
    const state = createInitialState();
    stageOpening(state, OPENING[0]);
    expect(state.player.position).toEqual({ x: 0, z: 0 });
    const town = OPENING.find((beat) => beat.areaId === 'town')!;
    stageOpening(state, town);
    expect(state.areaId).toBe('town');
    expect(state.player.position).toEqual(town.player);
    expect(state.minute).toBe(town.minute);
  });

  it('sends the chosen critter home by name', () => {
    expect(openingFarewell('Nib')).toContain('Let’s get Nib home');
  });
});
