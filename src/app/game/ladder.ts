import { DRILLS, EXHIBITIONS, ExhibitionLeg } from './content';
import { FamilyId } from './families';
import { Drill, EventId, Stats } from './model';

// Plan 005 ladder tuning, set with the balancing simulator (`balance.ts`, `npm run balance`).

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

/** Six rivals for each athletic rank, each rank's stats about a season of training above the last. */
export const RIVALS: readonly (readonly Rival[])[] = [
  [
    rival('pepper', 'Pepper', 'Hollis Tamm', 'avian', [27, 36, 63, 45], 0.6),
    rival('biscuit', 'Biscuit', 'Nell Dory', 'canine', [45, 54, 45, 36], 0.55),
    rival('moss', 'Moss', 'Rowan Pike', 'reptile', [54, 54, 27, 45], 0.5),
    rival('tumble', 'Tumble', 'Ada Fenn', 'slime', [36, 63, 27, 45], 0.45),
    rival('clove', 'Clove', 'Jory Vale', 'feline', [36, 36, 54, 54], 0.65),
    rival('barley', 'Barley', 'Mae Kettle', 'bovine', [63, 54, 27, 27], 0.5),
  ],
  [
    rival('flint', 'Flint', 'Oren Thatch', 'equine', [104, 117, 143, 78], 0.65),
    rival('juniper', 'Juniper', 'Lise Mardle', 'feline', [91, 91, 130, 130], 0.7),
    rival('thistle', 'Thistle', 'Tobin Reed', 'ursine', [156, 130, 78, 78], 0.6),
    rival('wisp', 'Wisp', 'Ilsa Brook', 'insect', [78, 104, 130, 143], 0.65),
    rival('saffron', 'Saffron', 'Pell Quarry', 'avian', [78, 91, 156, 117], 0.6),
    rival('rook', 'Rook', 'Dara Lune', 'canine', [117, 130, 117, 104], 0.7),
  ],
  [
    rival('ironbark', 'Ironbark', 'Gideon Hale', 'ursine', [306, 255, 153, 170], 0.75),
    rival('comet', 'Comet', 'Sable Ward', 'equine', [204, 238, 306, 170], 0.75),
    rival('quill', 'Quill', 'Marta Oakes', 'reptile', [238, 238, 170, 255], 0.7),
    rival('gale', 'Gale', 'Fen Ashby', 'avian', [153, 187, 306, 238], 0.8),
    rival('marrow', 'Marrow', 'Bram Holt', 'bovine', [289, 272, 153, 153], 0.7),
    rival('vesper', 'Vesper', 'Corin Hask', 'feline', [187, 204, 255, 255], 0.85),
  ],
];

/** Promotion cups fall on these days, for critters with enough ladder points. */
export const PROMOTION_DAYS: readonly number[] = [15, 29];
export const PROMOTION = {
  energy: 50,
  minutes: 90,
  fee: [10, 16, 24],
  purse: [
    [60, 30, 15],
    [100, 50, 25],
    [160, 80, 40],
  ],
  // Ladder points that qualify a critter for its rank's promotion cup.
  qualify: 6,
  // How many of the rank's strongest rivals stand in a promotion cup.
  field: 4,
} as const;

/** Each promotion cup's three legs, in turn through the season's promotion cups. */
const PROMOTION_TRIOS: readonly (readonly [Drill, Drill, Drill])[] = [
  ['run', 'lift', 'chess'],
  ['pace', 'toss', 'rhythm'],
  ['beam', 'hoops', 'lift'],
  ['toss', 'run', 'chess'],
];

export const isPromotionDay = (dayOfSeason: number) => PROMOTION_DAYS.includes(dayOfSeason);

/** A critter with enough ladder points to enter its rank's promotion cup. */
export const qualifiedForPromotion = (ladder: { rank: number; points: number }) =>
  ladder.rank < ATHLETIC_RANKS && ladder.points >= PROMOTION.qualify;

export function promotionLegs(day: number): ExhibitionLeg[] {
  const season = Math.floor((day - 1) / 30);
  const dayOfSeason = ((day - 1) % 30) + 1;
  const held =
    season * PROMOTION_DAYS.length + PROMOTION_DAYS.filter((cup) => cup <= dayOfSeason).length;
  return PROMOTION_TRIOS[(held - 1 + PROMOTION_TRIOS.length) % PROMOTION_TRIOS.length].map(
    (drill) => ({ drill }),
  );
}

/** The rank's strongest rivals: the best stats played with the best form. */
export function promotionField(rank: number): Rival[] {
  const strength = (rival: Rival) =>
    (rival.stats.strength + rival.stats.endurance + rival.stats.speed + rival.stats.intelligence) *
    rival.form;
  return [...RIVALS[Math.min(rank, RIVALS.length - 1)]]
    .sort((a, b) => strength(b) - strength(a))
    .slice(0, PROMOTION.field);
}

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

/** An event's or cup's points: timing (50), the favoured stats, care (8) and luck (4). */
export function showingPoints(
  timing: number,
  stats: Stats,
  weights: Partial<Record<keyof Stats, number>>,
  care: number,
  luck: number,
): number {
  return Math.round((timing * 50 + statPoints(stats, weights) + care * 8 + luck * 4) * 10) / 10;
}

/** A rival's showing: its form give or take, its stats, steady care and a little luck. */
export function rivalPoints(
  rival: Rival,
  legs: readonly ExhibitionLeg[],
  random: () => number,
): number {
  const timing = Math.max(0, Math.min(1, rival.form + (random() - 0.5) * 0.3));
  return showingPoints(timing, rival.stats, legWeights(legs), 0.7, random());
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
  if (event === 'promotion') {
    const legs = promotionLegs(cupDay ?? 1);
    return {
      name: `${RANKS[rank]} Promotion Cup`,
      legs,
      stats: legWeights(legs),
      energy: PROMOTION.energy,
      minutes: PROMOTION.minutes,
      fee: PROMOTION.fee[Math.min(rank, PROMOTION.fee.length - 1)],
    };
  }
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
