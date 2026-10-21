import { describe, expect, it } from 'vitest';
import { pace, PLAYERS, simulate } from './balance';
import { DAYS_PER_SEASON, DAYS_PER_YEAR } from './calendar';
import { FAMILIES } from './families';

const player = (name: string) => PLAYERS.find((kind) => kind.name === name)!;
const CONTENDER = 1;
const VETERAN = 2;

describe('the ladder’s pace', () => {
  const diligent = pace(player('diligent'), 2 * DAYS_PER_YEAR, 3);
  const casual = pace(player('casual'), 2 * DAYS_PER_YEAR, 3);

  it('brings a diligent player to Contender in the first season and Veteran by the second', () => {
    expect(diligent.reached[CONTENDER]).toBe(1);
    expect(diligent.medians[CONTENDER]).toBeLessThanOrEqual(DAYS_PER_SEASON);
    expect(diligent.medians[VETERAN]).toBeLessThanOrEqual(2 * DAYS_PER_SEASON);
  });

  it('takes a casual player about twice as long', () => {
    for (const rank of [CONTENDER, VETERAN]) {
      const ratio = casual.medians[rank]! / diligent.medians[rank]!;
      expect(ratio).toBeGreaterThanOrEqual(1.6);
      expect(ratio).toBeLessThanOrEqual(2.5);
    }
  });

  it('never promotes a critter that is not trained, however well the cups are played', () => {
    const idle = pace(player('idle'), DAYS_PER_YEAR, 3);
    expect(idle.reached.slice(1)).toEqual([0, 0, 0]);
  });

  it('is the same for the same seed', () => {
    expect(simulate('canine', player('casual'), 60, 9)).toEqual(
      simulate('canine', player('casual'), 60, 9),
    );
    // An untrained critter keeps its family's stats.
    expect(simulate('canine', player('idle'), 10, 9).stats).toEqual(FAMILIES.canine.stats);
  });
});
