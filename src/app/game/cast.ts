import { weatherFor } from './calendar';
import {
  Appearance,
  FAMILIES,
  FAMILY_IDS,
  FamilyId,
  ShelterCandidate,
  shelterCandidate,
} from './families';
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

/** A townsperson with a post, hours there, and a few things to say. */
export interface Resident {
  id: string;
  name: string;
  role: string;
  areaId: AreaId;
  post: Point;
  // Minutes after midnight when they are at their post.
  hours: { start: number; end: number };
  look: PersonLook;
  doing: string;
  intro: string;
  lines: readonly string[];
}

// Working names, like every place name (see DECISIONS, open questions).
export const RESIDENTS: readonly Resident[] = [
  {
    id: 'resident-store',
    name: 'Marigold Hale',
    role: 'Keeps the general store',
    areaId: 'town',
    post: { x: -5.2, z: -3.75 },
    hours: { start: 480, end: 1080 },
    look: {
      coat: '#c98c63',
      trim: '#efe0b7',
      legs: '#5d6670',
      skin: '#e0ae88',
      hair: '#7a4a32',
      apron: '#f3ead2',
    },
    doing: 'Marigold is behind the counter, weighing out seed by the scoop.',
    intro:
      '“You must be the young one from Bramblewick. Your grandfather has bought his seed off this counter since before I could see over it. Feed, seed, and I pay fair for good berries and garden produce. Better than the pickup cart ever will.”',
    lines: [
      '“Turnips like a cool start; wheat does not mind the heat. Plant to the season and you will not go far wrong.”',
      '“The pickup cart is handy, I grant you. But bring the good stuff here yourself and you will see the difference.”',
      '“Quality tells. A basket of fine berries pays better than twice as many bruised ones.”',
      '“Feed keeps. Berries do not. Sell what you will not use.”',
    ],
  },
  {
    id: 'resident-shelter',
    name: 'Wren Ashby',
    role: 'Runs the critter shelter',
    areaId: 'town',
    post: { x: -8.6, z: 0.9 },
    hours: { start: 420, end: 1140 },
    look: {
      coat: '#6f8ea0',
      trim: '#d8bd8a',
      legs: '#6b6f5e',
      skin: '#c99272',
      hair: '#2f2a26',
      hat: '#8a7660',
    },
    doing: 'Wren leans on the pen gate, keeping an eye on everyone inside.',
    intro:
      '“Hello there. These ones are waiting for homes: some lost, some given up, one or two who just turned up. Every one of them has a story. Come and meet them whenever you like.”',
    lines: [
      '“A critter who has been let down needs time more than treats. Though treats help.”',
      '“When your place has room for another, come and see me. Not before. A crowded barn helps nobody.”',
      '“Your grandfather brought me a stray once, years ago. Wrapped in his own coat, it was.”',
      '“They know when someone is just looking and when someone is choosing. You can see it in the ears.”',
    ],
  },
  {
    id: 'resident-tavern',
    name: 'Bertram Cobb',
    role: 'Keeps the tavern',
    areaId: 'town',
    post: { x: 6.6, z: -3.5 },
    hours: { start: 600, end: 1320 },
    look: {
      coat: '#8a5e45',
      trim: '#e9dcc0',
      legs: '#4f4438',
      skin: '#e3b48d',
      hair: '#d8d2c4',
      apron: '#e9dcc0',
    },
    doing: 'Bertram is sweeping the tavern step and eyeing the bin.',
    intro:
      '“Afternoon! If you see a ringed tail round my bin, that is Gemothy. Belongs to nobody. I have stopped chasing him; it only encourages him.”',
    lines: [
      '“Bin day is the worst. Every week I tie the lid down, and every week he gets in anyway.”',
      '“The Colosseum crowd comes through here after every cup. Loud, thirsty, happy. Good for trade.”',
      '“Your grandfather? Grand Champion, back when the stands were wood all the way round. Did he never tell you? Ha. That is like him.”',
      '“Gemothy is not bad, you know. Just hungry and too clever by half.”',
    ],
  },
  {
    id: 'resident-clinic',
    name: 'Dr. Isolde Fenn',
    role: 'Tends critters at the clinic',
    areaId: 'town',
    post: { x: 1.2, z: -4.2 },
    hours: { start: 480, end: 1020 },
    look: {
      coat: '#f3ece0',
      trim: '#5e9186',
      legs: '#5d6670',
      skin: '#d8a580',
      hair: '#b76e54',
    },
    doing: 'Dr. Fenn is taking the air on the clinic step between patients.',
    intro:
      '“Welcome. If a critter of yours is ever hurt or poorly, bring it here first and ask questions after. I would rather see ten false alarms than miss one.”',
    lines: [
      '“Rest is half of any cure. Your nook at home matters more than you think.”',
      '“Training hard is fine. Training hungry is not. Feed first.”',
      '“Wild critters on the roads are mostly harmless, but give the big ones room.”',
    ],
  },
];

/** Residents at their posts right now. */
export function residentsAbout(state: GameState, areaId: AreaId = state.areaId): Resident[] {
  return RESIDENTS.filter(
    (resident) =>
      resident.areaId === areaId &&
      state.minute >= resident.hours.start &&
      state.minute < resident.hours.end,
  );
}

export function residentAbout(state: GameState, id: string): Resident | undefined {
  return residentsAbout(state).find((resident) => resident.id === id);
}

// Where the shelter's critters wait in the pen, and how many it keeps at once.
const PEN_SPOTS: Point[] = [
  { x: -12.5, z: 2.6 },
  { x: -11.1, z: 3.7 },
  { x: -10.1, z: 2.5 },
];
export const SHELTER_HOURS = { start: 420, end: 1140 } as const;

/** The critters waiting at the shelter, in arrival order; adopted ones have gone home. */
export function shelterWaiting(state: GameState): ShelterCandidate[] {
  const waiting: ShelterCandidate[] = [];
  for (let index = 0; waiting.length < PEN_SPOTS.length && index < 200; index++)
    if (!state.flags.includes(`adopted:shelter-${index}`))
      waiting.push(shelterCandidate(state.origin, index));
  return waiting;
}

function shelterCritters(state: GameState): CastMember[] {
  if (state.areaId !== 'town') return [];
  if (state.minute < SHELTER_HOURS.start || state.minute >= SHELTER_HOURS.end) return [];
  return shelterWaiting(state).map((critter, slot) => {
    const spot = PEN_SPOTS[slot];
    const angle = state.totalMinutes / (40 + slot * 13) + slot * 2;
    return {
      id: critter.id,
      areaId: 'town',
      position: { x: spot.x + Math.cos(angle) * 0.35, z: spot.z + Math.sin(angle) * 0.25 },
      name: critter.name,
      activity: `${critter.name}, a ${FAMILIES[critter.speciesId].name.toLowerCase()}, waits in the shelter pen. ${critter.story}`,
      figure: { kind: 'critter', speciesId: critter.speciesId, visualTraits: critter.visualTraits },
    };
  });
}

function townsfolk(state: GameState): CastMember[] {
  return residentsAbout(state).map((resident) => ({
    id: resident.id,
    areaId: resident.areaId,
    position: resident.post,
    name: resident.name,
    activity: resident.doing,
    figure: { kind: 'person', look: resident.look },
  }));
}

/** Everyone besides the household in the current area. */
export function castFor(state: GameState): CastMember[] {
  return [...wildCritters(state), ...townsfolk(state), ...shelterCritters(state)];
}
