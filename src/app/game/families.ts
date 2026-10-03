import { Point, Stats } from './model';

/** The nine root families. Individuals vary within a family's spectrum. */
export const FAMILY_IDS = [
  'avian',
  'reptile',
  'canine',
  'feline',
  'bovine',
  'ursine',
  'equine',
  'slime',
  'insect',
] as const;
export type FamilyId = (typeof FAMILY_IDS)[number];
// Stabilized lineages are not root families; Brindlekin is reserved (see DECISIONS, Pip's kind).
export const LINEAGE_IDS = ['brindlekin'] as const;
export const CRITTER_KINDS: readonly string[] = [...FAMILY_IDS, ...LINEAGE_IDS];

export interface FamilyDefinition {
  name: string;
  description: string;
  // Provisional starting tendencies for a young critter; every family totals 18.
  stats: Stats;
  coats: readonly string[];
  accents: readonly string[];
  names: readonly string[];
}

export const FAMILIES: Record<FamilyId, FamilyDefinition> = {
  avian: {
    name: 'Avian',
    description: 'Light, quick and keen-eyed; happiest with a breeze under its wings.',
    stats: { strength: 2, endurance: 4, speed: 7, intelligence: 5 },
    coats: ['sky', 'sunflower', 'rose'],
    accents: ['cream', 'ember', 'teal'],
    names: ['Tansy', 'Quill', 'Juniper', 'Sorrel'],
  },
  reptile: {
    name: 'Reptile',
    description: 'Patient and sturdy, with dense scales that shrug off the weather.',
    stats: { strength: 5, endurance: 6, speed: 2, intelligence: 5 },
    coats: ['fern', 'sand', 'slate'],
    accents: ['gold', 'coral', 'cream'],
    names: ['Cobble', 'Sage', 'Pebble', 'Thistle'],
  },
  canine: {
    name: 'Canine',
    description: 'Loyal and tireless, with a nose for anything worth finding.',
    stats: { strength: 4, endurance: 6, speed: 4, intelligence: 4 },
    coats: ['peach', 'cocoa', 'cream'],
    accents: ['moss', 'teal', 'plum'],
    names: ['Biscuit', 'Hazel', 'Pepper', 'Rowan'],
  },
  feline: {
    name: 'Feline',
    description: 'Nimble and sure-footed, quick to react and quicker to wander off.',
    stats: { strength: 3, endurance: 3, speed: 7, intelligence: 5 },
    coats: ['ginger', 'smoke', 'cream'],
    accents: ['cocoa', 'moss', 'rose'],
    names: ['Clove', 'Nettle', 'Saffron', 'Mote'],
  },
  bovine: {
    name: 'Bovine',
    description: 'Calm and immensely strong; nothing pushes or pulls quite like it.',
    stats: { strength: 7, endurance: 6, speed: 2, intelligence: 3 },
    coats: ['cream', 'cocoa', 'sand'],
    accents: ['cocoa', 'slate', 'rose'],
    names: ['Barley', 'Dumpling', 'Rhubarb', 'Hollyhock'],
  },
  ursine: {
    name: 'Ursine',
    description: 'Broad, tough and a born forager, with a nose for honey and roots.',
    stats: { strength: 6, endurance: 5, speed: 3, intelligence: 4 },
    coats: ['cocoa', 'honey', 'slate'],
    accents: ['cream', 'honey', 'moss'],
    names: ['Burdock', 'Bracken', 'Acorn', 'Hob'],
  },
  equine: {
    name: 'Equine',
    description: 'Long-legged and steady over distance, built to carry and to run.',
    stats: { strength: 4, endurance: 6, speed: 6, intelligence: 2 },
    coats: ['chestnut', 'sand', 'smoke'],
    accents: ['cream', 'cocoa', 'slate'],
    names: ['Briar', 'Tamsin', 'Dash', 'Fable'],
  },
  slime: {
    name: 'Slime',
    description: 'Soft, adaptable and surprisingly clever; it fits wherever it is needed.',
    stats: { strength: 2, endurance: 7, speed: 3, intelligence: 6 },
    coats: ['mint', 'lilac', 'sky'],
    accents: ['teal', 'plum', 'sunflower'],
    names: ['Puddle', 'Wobble', 'Dew', 'Marmalade'],
  },
  insect: {
    name: 'Insect',
    description: 'Armoured and deft, far stronger than its size suggests.',
    stats: { strength: 6, endurance: 3, speed: 5, intelligence: 4 },
    coats: ['beetle', 'sunflower', 'ember'],
    accents: ['slate', 'teal', 'cocoa'],
    names: ['Button', 'Bristle', 'Fennel', 'Chitter'],
  },
};

const PERSONALITIES = [
  'Bold · restless · loves an audience',
  'Gentle · patient · a little shy',
  'Stubborn · steady · fiercely loyal',
  'Playful · easily distracted · warm',
  'Watchful · clever · slow to trust',
  'Sunny · eager · always hungry',
];

export interface Appearance {
  coat: string;
  accent: string;
  // An individual's size relative to its family's typical build.
  size: number;
}

/** A critter offered as a first companion, before anyone has taken it home. */
export interface StarterCandidate {
  id: string;
  name: string;
  speciesId: FamilyId;
  sex: 'female' | 'male';
  personality: string;
  stats: Stats;
  visualTraits: Appearance;
  genetics: Record<string, string>;
  position: Point;
}

// Mallow is always offered (D40): the provisional companion, recast as Canine.
export const MALLOW: StarterCandidate = {
  id: 'critter-mallow',
  name: 'Mallow',
  speciesId: 'canine',
  sex: 'female',
  personality: 'Curious · food-motivated · quietly brave',
  stats: { strength: 3, endurance: 5, speed: 4, intelligence: 6 },
  visualTraits: { coat: 'peach', accent: 'moss', size: 1 },
  genetics: { coat: 'peach/peach', crest: 'fern/fern' },
  position: { x: -1.9, z: 1.5 },
};

// The three wait in a row in Oakhaven's square, up-screen of the rancher and the offer sheet.
const OFFER_POSITIONS: Point[] = [
  { x: 0, z: 2 },
  { x: 1.9, z: 1.5 },
];

/** Mallow plus two other families, drawn from the new game's seed without duplicates. */
export function starterOffer(seed: number): StarterCandidate[] {
  let state = seed >>> 0;
  const roll = () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
  const pick = <T>(items: readonly T[]) => items[Math.floor(roll() * items.length)];
  const pool = FAMILY_IDS.filter((id) => id !== MALLOW.speciesId);
  const personalities = PERSONALITIES.slice();
  const offer = [MALLOW];
  for (const position of OFFER_POSITIONS) {
    const family = pool.splice(Math.floor(roll() * pool.length), 1)[0];
    const definition = FAMILIES[family];
    const personality = personalities.splice(Math.floor(roll() * personalities.length), 1)[0];
    const coat = pick(definition.coats);
    const accent = pick(definition.accents);
    offer.push({
      id: `critter-${family}-1`,
      name: pick(definition.names),
      speciesId: family,
      sex: roll() < 0.5 ? 'female' : 'male',
      personality,
      stats: { ...definition.stats },
      visualTraits: { coat, accent, size: Math.round((0.9 + roll() * 0.2) * 100) / 100 },
      genetics: { coat: `${coat}/${pick(definition.coats)}` },
      position,
    });
  }
  return offer;
}

/** A tidy name for a new companion, or null when it cannot be used. */
export function starterName(raw: string): string | null {
  const name = raw.trim().replace(/\s+/g, ' ');
  return /^[\p{L}][\p{L}' -]{0,15}$/u.test(name) ? name : null;
}

export function kindName(speciesId: string): string {
  return speciesId === 'brindlekin'
    ? 'Brindlekin'
    : (FAMILIES[speciesId as FamilyId]?.name ?? speciesId);
}
