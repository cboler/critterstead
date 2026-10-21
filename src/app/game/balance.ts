import { DAYS_PER_SEASON } from './calendar';
import { DRILL_GAIN_STEPS, DRILL_IDS, DRILLS, GAME_CONFIG, ROUTINE } from './content';
import { applyGain, drillGain } from './drills';
import { FAMILIES, FAMILY_IDS, FamilyId } from './families';
import {
  ATHLETIC_RANKS,
  CUP,
  cupLegs,
  isCupDay,
  isPromotionDay,
  legWeights,
  placingOf,
  PROMOTION,
  promotionField,
  promotionLegs,
  qualifiedForPromotion,
  RIVALS,
  rivalPoints,
  showingPoints,
} from './ladder';
import { Drill, Stats } from './model';

// Plan 005 M3: a pure simulation of days of play, to set how quickly a critter climbs the
// ladder. It uses the game's own drill table, cup calendar and scoring.

/** A way of playing: how well, how much and how often. */
export interface PlayerKind {
  name: string;
  // How well drills and cup legs are played, from 0 to 1.
  timing: number;
  // Happiness, bond and fullness as a share, as drills and cups count care.
  care: number;
  // Drills played together, or run alone as routines from the menu.
  training: 'together' | 'routines' | 'none';
  // Most drills a day; rests at the barn between them when they run out of energy.
  sessions: number;
  rests: boolean;
  // Plays one day in this many; cups are entered only on days played.
  every: number;
}

export const PLAYERS: readonly PlayerKind[] = [
  {
    name: 'diligent',
    timing: 0.85,
    care: 0.85,
    training: 'together',
    sessions: 8,
    rests: true,
    every: 1,
  },
  {
    name: 'casual',
    timing: 0.65,
    care: 0.7,
    training: 'together',
    sessions: 8,
    rests: false,
    every: 1,
  },
  {
    name: 'routines',
    timing: 0.6,
    care: 0.75,
    training: 'routines',
    sessions: 2,
    rests: false,
    every: 1,
  },
  // Never trains, but plays every cup perfectly.
  { name: 'idle', timing: 1, care: 0.9, training: 'none', sessions: 0, rests: false, every: 1 },
];

// The waking day, and the walk to the Colosseum and back on a cup day.
const DAY_START = 8 * 60;
const DAY_END = 22 * 60;
const TRAVEL_MINUTES = 60;
// Walking to a drill's station and playing it, beyond the minutes the drill itself takes.
const SESSION_MINUTES = 30;
// How far a drill or leg strays from the player's usual timing, either way.
const TIMING_SPREAD = 0.15;

/** The day each rank above Fledgling was reached, by index; undefined if not reached. */
export interface Climb {
  promotions: (number | undefined)[];
  cups: number;
  wins: number;
  coins: number;
  stats: Stats;
}

export function mulberry(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const clamp01 = (value: number) => Math.max(0, Math.min(1, value));
const stray = (timing: number, random: () => number) =>
  clamp01(timing + (random() * 2 - 1) * TIMING_SPREAD);

/** A routine's score, as the game draws it from care. */
function routineScore(care: number, random: () => number): number {
  const roll = random();
  const { flop, fair, great } = ROUTINE.scores;
  if (roll < 0.2 - care * 0.15) return flop;
  return roll > 0.9 - care * 0.15 ? great : fair;
}

/** The next drill: the least repeated today, then the one for the weakest stat. */
function nextDrill(stats: Stats, sessions: Partial<Record<Drill, number>>): Drill {
  return [...DRILL_IDS].sort(
    (a, b) =>
      (sessions[a] ?? 0) - (sessions[b] ?? 0) ||
      stats[DRILLS[a].stat] - stats[DRILLS[b].stat] ||
      DRILLS[a].energy - DRILLS[b].energy,
  )[0];
}

/** One drill's gain, as the game pays it. */
function train(stats: Stats, drill: Drill, score: number, care: number, repeats: number): void {
  const multiplier = DRILL_GAIN_STEPS[Math.min(repeats, DRILL_GAIN_STEPS.length - 1)];
  applyGain(stats, drill, drillGain(stats, drill, score, care, multiplier));
}

/** A cup or promotion cup: the critter's points against the field's, for a placing. */
function compete(
  stats: Stats,
  player: PlayerKind,
  promotion: boolean,
  rank: number,
  day: number,
  random: () => number,
): number {
  const legs = promotion ? promotionLegs(day) : cupLegs(day);
  const timing =
    legs.reduce((sum) => sum + stray(player.timing, random), 0) / Math.max(1, legs.length);
  const points = showingPoints(timing, stats, legWeights(legs), player.care, random());
  const field = (promotion ? promotionField(rank) : RIVALS[rank]).map((rival) =>
    rivalPoints(rival, legs, random),
  );
  return placingOf(points, field);
}

/** A critter of a family raised by one kind of player for some days. */
export function simulate(family: FamilyId, player: PlayerKind, days: number, seed: number): Climb {
  const random = mulberry(seed);
  const stats = { ...FAMILIES[family].stats };
  const ladder = { rank: 0, points: 0 };
  const climb: Climb = { promotions: [], cups: 0, wins: 0, coins: 0, stats };
  for (let day = 1; day <= days; day++) {
    if ((day - 1) % player.every) continue;
    let minute = DAY_START;
    let energy = 100;
    const dayOfSeason = ((day - 1) % DAYS_PER_SEASON) + 1;
    const promotion = isPromotionDay(dayOfSeason) && qualifiedForPromotion(ladder);
    if (ladder.rank < ATHLETIC_RANKS && (promotion || isCupDay(dayOfSeason))) {
      const rules = promotion ? PROMOTION : CUP;
      const rank = ladder.rank;
      const placing = compete(stats, player, promotion, rank, day, random);
      climb.cups++;
      climb.coins += (rules.purse[rank][placing - 1] ?? 0) - rules.fee[rank];
      if (placing === 1) climb.wins++;
      if (promotion && placing === 1) {
        ladder.rank++;
        ladder.points = 0;
        climb.promotions[ladder.rank] = day;
      } else if (!promotion) ladder.points += CUP.points[placing - 1] ?? 0;
      energy -= rules.energy;
      minute += rules.minutes + TRAVEL_MINUTES;
    }
    if (player.training === 'none') continue;
    const sessions: Partial<Record<Drill, number>> = {};
    for (let session = 0; session < player.sessions; session++) {
      const drill = nextDrill(stats, sessions);
      const definition = DRILLS[drill];
      const cost = definition.energy + (player.training === 'routines' ? ROUTINE.extraEnergy : 0);
      if (energy < cost) {
        if (!player.rests || minute + GAME_CONFIG.restMinutes > DAY_END) break;
        minute += GAME_CONFIG.restMinutes;
        energy = Math.min(100, energy + GAME_CONFIG.restCritterEnergy);
        session--;
        continue;
      }
      if (minute + definition.minutes + SESSION_MINUTES > DAY_END) break;
      const score =
        player.training === 'routines'
          ? routineScore(player.care, random)
          : stray(player.timing, random);
      train(stats, drill, score, player.care, sessions[drill] ?? 0);
      sessions[drill] = (sessions[drill] ?? 0) + 1;
      energy -= cost;
      minute += definition.minutes + SESSION_MINUTES;
    }
  }
  return climb;
}

export interface Pace {
  player: string;
  // The median day each rank was reached over every family and seed; undefined if fewer
  // than half reached it.
  medians: (number | undefined)[];
  // The share of runs that reached each rank.
  reached: number[];
  // The median stats total at the end.
  stats: number;
  coins: number;
}

const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)];
};

/** How a kind of player climbs, over every family and a few seeds each. */
export function pace(player: PlayerKind, days: number, seeds = 8): Pace {
  const climbs = FAMILY_IDS.flatMap((family, index) =>
    Array.from({ length: seeds }, (_, seed) =>
      simulate(family, player, days, 1 + index * 1000 + seed),
    ),
  );
  const medians: (number | undefined)[] = [];
  const reached: number[] = [];
  for (let rank = 1; rank <= ATHLETIC_RANKS; rank++) {
    const days = climbs.map((climb) => climb.promotions[rank] ?? Infinity);
    reached[rank] = days.filter(Number.isFinite).length / climbs.length;
    const middle = median(days);
    medians[rank] = Number.isFinite(middle) ? middle : undefined;
  }
  const total = (stats: Stats) =>
    stats.strength + stats.endurance + stats.speed + stats.intelligence;
  return {
    player: player.name,
    medians,
    reached,
    stats: Math.round(median(climbs.map((climb) => total(climb.stats)))),
    coins: Math.round(median(climbs.map((climb) => climb.coins))),
  };
}
