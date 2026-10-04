import { weatherFor } from './calendar';
import { AreaId, Critter, GameState, Point, ResourceNode } from './model';

/**
 * Grandpa and his Pip. Their whereabouts are a pure function of the clock, the weather and
 * Pip's two daily berry picks, so nothing about where they are needs to be saved.
 */
export const GRANDPA = { id: 'grandpa', name: 'Grandpa' } as const;
export const PIP_ID = 'critter-grandpa-pip';
// Pip's morning picks in the glade, as minutes after midnight.
export const PIP_PICKS = [540, 600] as const;
const FORAGE = { start: 510, end: 660 } as const;
const GLADE_ENTRY: Point = { x: -6, z: 0 };

export interface Whereabouts {
  areaId: AreaId;
  position: Point;
  activity: string;
  // Where Pip settles while Grandpa is here.
  beside?: Point;
}

/** Pip as he is when the household begins: old, unhurried, and very good at this. */
export function createPip(day: number): Critter {
  return {
    id: PIP_ID,
    name: 'Pip',
    ownerId: GRANDPA.id,
    lastPettedDay: null,
    speciesId: 'brindlekin',
    // Provisional: a very long life, never taken from a generic lifecycle table.
    ageDays: 4800,
    sex: 'male',
    personality: 'Patient · unhurried · knows every bush by name',
    position: { x: -5.5, z: -1.1 },
    stats: { strength: 30, endurance: 42, speed: 18, intelligence: 64 },
    stamina: 100,
    health: 100,
    happiness: 90,
    bond: 100,
    hunger: 20,
    learnedBehaviors: { 'sunberry-foraging': 60, 'lumber-hauling': 30 },
    hauling: { enabled: false, phase: 'idle', cued: false },
    drills: { day, sessions: {} },
    practised: {},
    skills: { harvesting: 40, racing: 12 },
    visualTraits: { coat: 'chestnut', accent: 'fern', size: 0.95 },
    pedigree: { parentIds: [] },
    genetics: {},
    history: [],
    competitions: [],
  };
}

const outdoorWeather = (state: GameState) => {
  const weather = weatherFor(state.day);
  return weather !== 'rain' && weather !== 'snow';
};

/** Grandpa's ordinary day. Bad weather sends the outdoor parts of it inside. */
export function grandpaWhereabouts(state: GameState): Whereabouts | null {
  const minute = state.minute;
  const hearth: Whereabouts = {
    areaId: 'cottage',
    position: { x: 2, z: -2.3 },
    beside: { x: 3, z: -2 },
    activity: outdoorWeather(state)
      ? 'Grandpa is dozing in his chair by the hearth.'
      : 'Grandpa is reading by the hearth while the weather passes.',
  };
  if (minute < 360 || minute >= 1320) return null;
  if (minute >= 1140) return hearth;
  if (minute >= 720 && minute < 780)
    return {
      areaId: 'cottage',
      position: { x: -2.4, z: 0.4 },
      beside: { x: -1.6, z: 1.2 },
      activity: 'Grandpa is making lunch at the counter, humming something old.',
    };
  if (!outdoorWeather(state)) return hearth;
  if (minute < 510)
    return {
      areaId: 'homestead',
      position: { x: -6.7, z: -1.2 },
      beside: { x: -7.4, z: -0.4 },
      activity: 'Grandpa is watering the flowerpots by the door, one slow can at a time.',
    };
  if (minute >= 780 && minute < 1020)
    return {
      areaId: 'homestead',
      position: { x: -6, z: 6.4 },
      beside: { x: -7.2, z: 6 },
      activity: 'Grandpa is tidying the honesty stall and counting nothing in particular.',
    };
  return {
    areaId: 'homestead',
    position: { x: -6.4, z: -1.6 },
    beside: { x: -7.2, z: -0.8 },
    activity: 'Grandpa is resting on the porch bench with a cup of tea.',
  };
}

/** Where Pip's picks were made today, by pick number. */
export function pipPicks(state: GameState): (Point | null)[] {
  return PIP_PICKS.map((_, index) => {
    const flag = state.flags.find((item) => item.startsWith(`pip-${index + 1}:`));
    const node = flag && state.resources.find((item) => item.id === flag.split(':')[1]);
    return node ? node.position : null;
  });
}

/**
 * The bush Pip goes for next: the ripe one nearest your companion when you are in the glade
 * (so the young can watch), otherwise the farthest ripe one, leaving the near bushes for you.
 */
export function pipNextPick(state: GameState, companion: Point): ResourceNode | undefined {
  const ripe = state.resources.filter((node) => node.areaId === 'glade' && node.available);
  if (state.areaId !== 'glade') return ripe.at(-1);
  return ripe.sort(
    (a, b) =>
      Math.hypot(a.position.x - companion.x, a.position.z - companion.z) -
      Math.hypot(b.position.x - companion.x, b.position.z - companion.z),
  )[0];
}

export function pipForaging(state: GameState): boolean {
  return (
    !!grandpaWhereabouts(state) &&
    state.minute >= FORAGE.start &&
    state.minute < FORAGE.end &&
    outdoorWeather(state)
  );
}

/** Pip forages the glade in the morning and otherwise keeps close to Grandpa. */
export function pipWhereabouts(state: GameState, companion: Point): Whereabouts | null {
  const grandpa = grandpaWhereabouts(state);
  if (!grandpa) return null;
  if (!pipForaging(state)) {
    return {
      areaId: grandpa.areaId,
      position: grandpa.beside ?? grandpa.position,
      activity: 'Pip keeps a few unhurried steps from Grandpa, as he always has.',
    };
  }
  const beside = (point: Point | undefined | null): Point =>
    point ? { x: point.x + 0.7, z: point.z + 0.3 } : { x: 0, z: -1 };
  const [first, second] = pipPicks(state);
  const next = pipNextPick(state, companion)?.position;
  const one = beside(first ?? next);
  const two = beside(second ?? (first ? next : undefined) ?? first ?? next);
  const minute = state.minute;
  const lerp = (from: Point, to: Point, start: number) => {
    const t = Math.min(1, Math.max(0, (minute - start) / 30));
    return { x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t };
  };
  const position =
    minute < 540
      ? lerp(GLADE_ENTRY, one, 510)
      : minute < 570
        ? one
        : minute < 600
          ? lerp(one, two, 570)
          : minute < 630
            ? two
            : lerp(two, GLADE_ENTRY, 630);
  return {
    areaId: 'glade',
    position,
    activity: 'Pip works the glade bushes on his own, choosing only the ripest berries.',
  };
}

const GRANDPA_LINES = [
  'Critters learn the way children do: mostly by watching what you actually do, not what you say.',
  'Pip and I have an understanding. I keep the kettle warm; he keeps the berries honest.',
  'Feed them before you ask anything of them. A hungry worker is a worried one.',
  'Show the whole job, start to finish, and let them work out the rest. That is how Pip learned.',
  'A tired critter will still try for you. That is exactly why you have to notice first.',
  'The garden does not care how clever you are, only whether you came back with the water.',
  'Being useful and being loved are different things. Pip was loved long before he was useful.',
  'Oakhaven is a fine town. Folk there will tell you stories about this old place, if you let them.',
];

/** What Grandpa says today, ending with whatever you are working toward. */
export function grandpaSays(state: GameState, next?: { title: string; detail: string }): string {
  if (!state.flags.includes('talked-grandpa'))
    return '“There you are. Pip has been up since dawn, so I suppose we ought to be too. Come and find me whenever you need a hand.”';
  const line = GRANDPA_LINES[(state.day - 1) % GRANDPA_LINES.length];
  return next ? `“${line}” Then, with a nod: “${next.title}? ${next.detail}”` : `“${line}”`;
}
