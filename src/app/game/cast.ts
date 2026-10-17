import { weatherFor } from './calendar';
import { Appearance, FAMILIES, FAMILY_IDS, FamilyId } from './families';
import { AreaId, GameState, Point } from './model';

/**
 * Everyone in the world besides the household: wild critters on the roads, and later the
 * townsfolk. Like Grandpa's routine, where each is and what they are doing is a pure
 * function of the save (the day, the clock, the weather and flags), so nothing about them
 * is stored except what the player has done with them.
 */

/** Colours of a person's clothes and looks; presentation decides the exact shapes. */
export interface PersonLook {
  coat: string;
  trim: string;
  legs: string;
  skin: string;
  hair: string;
  hat?: string;
  apron?: string;
}

export type CastFigure =
  | { kind: 'critter'; speciesId: string; visualTraits: Appearance }
  | { kind: 'person'; look: PersonLook };

export interface CastMember {
  id: string;
  areaId: AreaId;
  position: Point;
  name: string;
  // One line on what they are doing right now.
  activity: string;
  figure: CastFigure;
}

/** Deterministic noise in [0, 1) from whole numbers, so the same day always looks the same. */
export function noise(...values: number[]): number {
  let h = 2166136261;
  for (const value of values) {
    h ^= Math.floor(value) >>> 0;
    h = Math.imul(h, 16777619) >>> 0;
    h ^= h >>> 13;
    h = Math.imul(h, 2246822507) >>> 0;
  }
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const ROAD_SEEDS: Partial<Record<AreaId, number>> = { lane: 11, road: 23 };
// Wild critters are about from early morning until dusk, and shelter at night.
const WILD_HOURS = { start: 360, end: 1200 } as const;
const WILD_HALF_LENGTH = 14;

const WILD_DOINGS: Record<FamilyId, string> = {
  avian: 'hops along the fence rail, tilting its head at you',
  reptile: 'basks on a warm stone at the verge',
  canine: 'noses along the verge after some interesting smell',
  feline: 'watches you from the long grass, tail twitching',
  bovine: 'grazes the verge, unbothered by anyone',
  ursine: 'roots under the hedge for something tasty',
  equine: 'trots along the edge of the field, mane flying',
  slime: 'wobbles slowly through the dew',
  insect: 'clicks softly among the flowers',
};

/** The wild critters on a road today, where they are now, and what they are up to. */
export function wildCritters(state: GameState, areaId: AreaId = state.areaId): CastMember[] {
  const seed = ROAD_SEEDS[areaId];
  if (seed === undefined) return [];
  if (state.minute < WILD_HOURS.start || state.minute >= WILD_HOURS.end) return [];
  const weather = weatherFor(state.day);
  const count =
    weather === 'rain' || weather === 'snow' ? 1 : 2 + (noise(seed, state.day) < 0.5 ? 1 : 0);
  const members: CastMember[] = [];
  for (let index = 0; index < count; index++) {
    const roll = (salt: number) => noise(seed, state.day, index, salt);
    const family = FAMILY_IDS[Math.floor(roll(1) * FAMILY_IDS.length)];
    const definition = FAMILIES[family];
    // Spread along the road's length, each on its own side, clear of the walking line.
    const along =
      -WILD_HALF_LENGTH + ((index + roll(2) * 0.8 + 0.1) / count) * WILD_HALF_LENGTH * 2;
    const side = roll(3) < 0.5 ? -1 : 1;
    const home = { x: along, z: side * (2 + roll(4) * 1.6) };
    // A slow amble around home, a loop every hour or two of game time.
    const angle = state.totalMinutes / (50 + roll(5) * 60) + roll(6) * Math.PI * 2;
    members.push({
      id: `wild-${areaId}-${index}`,
      areaId,
      position: { x: home.x + Math.cos(angle) * 1.3, z: home.z + Math.sin(angle) * 0.6 },
      name: `Wild ${definition.name.toLowerCase()}`,
      activity: `A wild ${definition.name.toLowerCase()} ${WILD_DOINGS[family]}.`,
      figure: {
        kind: 'critter',
        speciesId: family,
        visualTraits: {
          coat: definition.coats[Math.floor(roll(7) * definition.coats.length)],
          accent: definition.accents[Math.floor(roll(8) * definition.accents.length)],
          size: Math.round((0.8 + roll(9) * 0.3) * 100) / 100,
        },
      },
    });
  }
  return members;
}

/** Families the player has met, in the order of the family table. */
export function familiesMet(state: GameState): FamilyId[] {
  return FAMILY_IDS.filter((family) => state.flags.includes(`met:${family}`));
}

/** Everyone besides the household in the current area. */
export function castFor(state: GameState): CastMember[] {
  return wildCritters(state);
}
