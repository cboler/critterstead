import { DRILLS, EXHIBITIONS, ExhibitionLeg } from './content';
import { FamilyId } from './families';
import { Drill, EventId, Stats } from './model';

// Plan 005 provisional ladder tuning; the balancing simulator (M3) sets the final numbers.

/** The ladder's ranks. The first three are athletic; the last two wait for bouts. */
export const RANKS = ['Fledgling', 'Contender', 'Veteran', 'Champion', 'Grand Champion'] as const;
export const ATHLETIC_RANKS = 3;

/** Ranked cups fall on these days of every season. */
export const CUP_DAYS: readonly number[] = [3, 7, 13, 17, 23, 27];
export const CUP = {
  energy: 40,
  minutes: 70,
  // Entry and purses by rank; purses for first, second and third place.
  fee: [5, 8, 12],
  purse: [
    [24, 14, 8],
    [40, 24, 14],
    [64, 38, 22],
  ],
  // Ladder points for first, second and third place.
  points: [3, 2, 1],
} as const;

/** Each cup's two legs, in turn through the season's cups. */
const CUP_PAIRS: readonly (readonly [Drill, Drill])[] = [
  ['run', 'lift'],
  ['toss', 'pace'],
  ['beam', 'rhythm'],
  ['chess', 'hoops'],
  ['hoops', 'toss'],
  ['pace', 'run'],
  ['rhythm', 'lift'],
  ['beam', 'chess'],
];

export interface Rival {
  id: string;
  // The critter, its rancher and its family.
  name: string;
  rancher: string;
  family: FamilyId;
  stats: Stats;
  // How well this rival usually plays its drills, from 0 to 1.
  form: number;
}

const rival = (
  id: string,
  name: string,
  rancher: string,
  family: FamilyId,
  [strength, endurance, speed, intelligence]: [number, number, number, number],
  form: number,
): Rival => ({
  id,
  name,
  rancher,
  family,
  stats: { strength, endurance, speed, intelligence },
  form,
});

/** Six rivals for each athletic rank. */
export const RIVALS: readonly (readonly Rival[])[] = [
  [
    rival('pepper', 'Pepper', 'Hollis Tamm', 'avian', [3, 4, 7, 5], 0.6),
    rival('biscuit', 'Biscuit', 'Nell Dory', 'canine', [5, 6, 5, 4], 0.55),
    rival('moss', 'Moss', 'Rowan Pike', 'reptile', [6, 6, 3, 5], 0.5),
    rival('tumble', 'Tumble', 'Ada Fenn', 'slime', [4, 7, 3, 5], 0.45),
    rival('clove', 'Clove', 'Jory Vale', 'feline', [4, 4, 6, 6], 0.65),
    rival('barley', 'Barley', 'Mae Kettle', 'bovine', [7, 6, 3, 3], 0.5),
  ],
  [
    rival('flint', 'Flint', 'Oren Thatch', 'equine', [8, 9, 11, 6], 0.65),
    rival('juniper', 'Juniper', 'Lise Mardle', 'feline', [7, 7, 10, 10], 0.7),
    rival('thistle', 'Thistle', 'Tobin Reed', 'ursine', [12, 10, 6, 6], 0.6),
    rival('wisp', 'Wisp', 'Ilsa Brook', 'insect', [6, 8, 10, 11], 0.65),
    rival('saffron', 'Saffron', 'Pell Quarry', 'avian', [6, 7, 12, 9], 0.6),
    rival('rook', 'Rook', 'Dara Lune', 'canine', [9, 10, 9, 8], 0.7),
  ],
  [
    rival('ironbark', 'Ironbark', 'Gideon Hale', 'ursine', [18, 15, 9, 10], 0.75),
    rival('comet', 'Comet', 'Sable Ward', 'equine', [12, 14, 18, 10], 0.75),
    rival('quill', 'Quill', 'Marta Oakes', 'reptile', [14, 14, 10, 15], 0.7),
    rival('gale', 'Gale', 'Fen Ashby', 'avian', [9, 11, 18, 14], 0.8),
    rival('marrow', 'Marrow', 'Bram Holt', 'bovine', [17, 16, 9, 9], 0.7),
    rival('vesper', 'Vesper', 'Corin Hask', 'feline', [11, 12, 15, 15], 0.85),
  ],
];

/** True on the days a ranked cup is held. */
export const isCupDay = (dayOfSeason: number) => CUP_DAYS.includes(dayOfSeason);

/** A cup's two legs, chosen in turn across every cup since the first. */
export function cupLegs(day: number): ExhibitionLeg[] {
  const season = Math.floor((day - 1) / 30);
  const dayOfSeason = ((day - 1) % 30) + 1;
  const held = season * CUP_DAYS.length + CUP_DAYS.filter((cup) => cup <= dayOfSeason).length;
  return CUP_PAIRS[(held - 1 + CUP_PAIRS.length) % CUP_PAIRS.length].map((drill) => ({
    drill,
  }));
}

/** Points per point of a stat: each leg favours its drill's stat equally. */
export function legWeights(legs: readonly ExhibitionLeg[]): Partial<Record<keyof Stats, number>> {
  const weights: Partial<Record<keyof Stats, number>> = {};
  for (const { drill } of legs) {
    const stat = DRILLS[drill].stat;
    weights[stat] = (weights[stat] ?? 0) + 5 / legs.length;
  }
  return weights;
}

/** Points from stats under a set of weights, as events and cups count them. */
export function statPoints(stats: Stats, weights: Partial<Record<keyof Stats, number>>): number {
  return Object.entries(weights).reduce(
    (sum, [stat, weight]) => sum + stats[stat as keyof Stats] * weight,
    0,
  );
}

/** A rival's showing: its form give or take, its stats, steady care and a little luck. */
export function rivalPoints(
  rival: Rival,
  legs: readonly ExhibitionLeg[],
  random: () => number,
): number {
  const timing = Math.max(0, Math.min(1, rival.form + (random() - 0.5) * 0.3));
  const points = timing * 50 + statPoints(rival.stats, legWeights(legs)) + 0.7 * 8 + random() * 4;
  return Math.round(points * 10) / 10;
}

/** First, second, third… among the field: one more than the rivals who scored higher. */
export const placingOf = (points: number, field: readonly number[]) =>
  1 + field.filter((rivalScore) => rivalScore > points).length;

export const ordinal = (placing: number) =>
  placing +
  (['th', 'st', 'nd', 'rd'][placing % 100 > 10 && placing % 100 < 14 ? 0 : placing % 10] ?? 'th');

export interface EventInfo {
  name: string;
  legs: readonly ExhibitionLeg[];
  stats: Partial<Record<keyof Stats, number>>;
  energy: number;
  minutes: number;
  fee: number;
}

/** What an event or a ranked cup asks of a critter at a rank, from its id and cup day. */
export function eventInfo(event: EventId, cupDay: number | undefined, rank: number): EventInfo {
  if (event === 'cup') {
    const legs = cupLegs(cupDay ?? 1);
    return {
      name: `${RANKS[rank]} Cup`,
      legs,
      stats: legWeights(legs),
      energy: CUP.energy,
      minutes: CUP.minutes,
      fee: CUP.fee[Math.min(rank, CUP.fee.length - 1)],
    };
  }
  const { name, legs, stats, energy, minutes, fee } = EXHIBITIONS[event];
  return { name, legs, stats, energy, minutes, fee };
}
