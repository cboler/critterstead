import { StarterCandidate } from './families';
import { PIP_ID } from './household';
import { Critter, GameState, Point } from './model';

/**
 * The barn, where the critters you own sleep. One of them follows you; the others rest here
 * and go about the jobs they have learned (D54). Stalls limit how many you can keep.
 */
export const BARN = {
  // Where a critter that is not following you settles, in front of the barn.
  spot: { x: 4, z: -1.6 },
  // Building a stall beyond the mended barn's two.
  stall: { lumber: 4, coins: 20, minutes: 90 },
  maxStalls: 4,
  // A shelter adoption: a donation to Wren's shelter.
  adoptionFee: 10,
} as const;

/** One stall in the old barn; mending it makes two; each stall built adds one. */
export const barnStalls = (state: GameState) => Math.min(BARN.maxStalls, 1 + state.shedLevel);

export const ownedCritters = (state: GameState) =>
  state.critters.filter((critter) => critter.ownerId === state.player.id);

export const freeStalls = (state: GameState) => barnStalls(state) - ownedCritters(state).length;

/** Your critters that are not following you: at home in the barn. */
export function barnCritters(state: GameState): Critter[] {
  return state.critters.filter(
    (critter) =>
      critter.ownerId === state.player.id &&
      critter.id !== state.activeCritterId &&
      critter.id !== PIP_ID,
  );
}

/** Where each barn critter idles: side by side before the barn, ambling a little. */
export function barnSpot(state: GameState, index: number): Point {
  const angle = state.totalMinutes / (45 + index * 11) + index * 2.1;
  return {
    x: BARN.spot.x - 1.6 + index * 1.4 + Math.cos(angle) * 0.3,
    z: BARN.spot.z + 0.3 + Math.sin(angle) * 0.2,
  };
}

/** A new critter of the household from an offered candidate: a starter or an adoptee. */
export function critterFromCandidate(
  candidate: StarterCandidate,
  ownerId: string,
  day: number,
  extras: Partial<Critter> = {},
): Critter {
  return {
    id: candidate.id,
    name: candidate.name,
    ownerId,
    lastPettedDay: null,
    speciesId: candidate.speciesId,
    ageDays: 18,
    sex: candidate.sex,
    personality: candidate.personality,
    position: { x: -1, z: 0.6 },
    stats: { ...candidate.stats },
    stamina: 100,
    health: 100,
    happiness: 70,
    bond: 20,
    hunger: 35,
    learnedBehaviors: {},
    hauling: { enabled: false, phase: 'idle', cued: false },
    drills: { day, sessions: {} },
    practised: {},
    skills: { harvesting: 0, racing: 0 },
    visualTraits: { ...candidate.visualTraits },
    pedigree: { parentIds: [] },
    genetics: { ...candidate.genetics },
    history: [],
    competitions: [],
    ladder: { rank: 0, points: 0 },
    ...extras,
  };
}
