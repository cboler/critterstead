import { calendarDate, weatherFor } from './calendar';
import { MEMORIAL } from './content';
import { allDuties } from './projects';
import { activeCritter, AreaId, Critter, GameState, Point, ResourceNode } from './model';
import { grandpaAlive, OLD_RAIL, storyEnded, titleDay, VigilSpot } from './story';

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
  // After Grandpa: which part of his old round Pip is keeping.
  spot?: VigilSpot;
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
    duties: allDuties(),
    drills: { day, sessions: {} },
    practised: {},
    skills: { harvesting: 40, racing: 12 },
    visualTraits: { coat: 'chestnut', accent: 'fern', size: 0.95 },
    pedigree: { parentIds: [] },
    genetics: {},
    history: [],
    competitions: [],
    ladder: { rank: 0, points: 0 },
  };
}

const outdoorWeather = (state: GameState) => {
  const weather = weatherFor(state.day);
  return weather !== 'rain' && weather !== 'snow';
};

const HEARTH_CHAIR = { position: { x: 2, z: -2.3 }, beside: { x: 3, z: -2 } } as const;
const PORCH_BENCH = { position: { x: -6.4, z: -1.6 }, beside: { x: -7.2, z: -0.8 } } as const;
const FLOWERPOTS = { position: { x: -6.7, z: -1.2 }, beside: { x: -7.4, z: -0.4 } } as const;
const FIELD_FENCE = { position: { x: -13.2, z: -5.6 }, beside: { x: -13.4, z: -4.4 } } as const;
const AWAKE = { start: 360, end: 1320 } as const;

/**
 * Grandpa's ordinary day. Bad weather sends the outdoor parts of it inside, and each year
 * he keeps a little closer to the house: the fence in his first year with you, the porch in
 * the second, his chair by the window in the third. After his passing he is nowhere.
 */
export function grandpaWhereabouts(state: GameState): Whereabouts | null {
  if (!grandpaAlive(state)) return null;
  const minute = state.minute;
  const year = calendarDate(state.day).year;
  const fair = outdoorWeather(state);
  const hearth: Whereabouts = {
    areaId: 'cottage',
    ...HEARTH_CHAIR,
    activity:
      year >= 3
        ? 'Grandpa is in his chair by the window, a blanket over his knees and the chess book on the arm.'
        : fair
          ? 'Grandpa is dozing in his chair by the hearth.'
          : 'Grandpa is reading by the hearth while the weather passes.',
  };
  if (minute < AWAKE.start || minute >= AWAKE.end) return null;
  if (minute >= 1140) return hearth;
  if (year >= 3) {
    // His last year: the chair, and the porch for the warm middle of a fair day.
    if (fair && minute >= 600 && minute < 720)
      return {
        areaId: 'homestead',
        ...PORCH_BENCH,
        activity: 'Grandpa is on the porch bench in his blanket, taking the sun.',
      };
    return hearth;
  }
  if (minute >= 720 && minute < 780)
    return {
      areaId: 'cottage',
      position: { x: -2.4, z: 0.4 },
      beside: { x: -1.6, z: 1.2 },
      activity: 'Grandpa is making lunch at the counter, humming something old.',
    };
  if (!fair) return hearth;
  if (minute < 510)
    return {
      areaId: 'homestead',
      ...FLOWERPOTS,
      activity: 'Grandpa is watering the flowerpots by the door, one slow can at a time.',
    };
  if (minute >= 780 && minute < 1020)
    return year >= 2
      ? {
          areaId: 'homestead',
          ...PORCH_BENCH,
          activity:
            'Grandpa is on the porch bench with his stick across his knees, judging the turnips from here.',
        }
      : {
          areaId: 'homestead',
          ...FIELD_FENCE,
          activity: 'Grandpa is leaning on the farm field fence, judging the turnips.',
        };
  return {
    areaId: 'homestead',
    ...PORCH_BENCH,
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
  return state.minute >= FORAGE.start && state.minute < FORAGE.end && outdoorWeather(state);
}

/** Pip forages the glade in the morning and otherwise keeps close to Grandpa. */
export function pipWhereabouts(state: GameState, companion: Point): Whereabouts | null {
  if (state.minute < AWAKE.start || state.minute >= AWAKE.end) return null;
  if (!grandpaAlive(state)) {
    const vigil = pipVigil(state);
    if (vigil) return vigil;
  } else if (!pipForaging(state)) {
    const grandpa = grandpaWhereabouts(state);
    if (!grandpa) return null;
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

/** Whether Pip has gone to the Colosseum rail today: a title day with a Champion to watch. */
export const pipAtTheRail = (state: GameState) =>
  titleDay(state) &&
  state.critters.some(
    (critter) => critter.ownerId === state.player.id && critter.ladder.rank === 3,
  );

/**
 * Pip after Grandpa: he keeps the old round at the old hours, alone, and on a title day goes
 * to the rail. Once the title is home he keeps his few unhurried steps from you instead.
 * Returns null while he forages, which he does as he always did.
 */
function pipVigil(state: GameState): Whereabouts | null {
  const minute = state.minute;
  const fair = outdoorWeather(state);
  if (pipAtTheRail(state) && minute >= 480 && minute < 1140)
    return {
      areaId: 'colosseum',
      position: { x: OLD_RAIL.x - 0.4, z: OLD_RAIL.z + 0.8 },
      spot: 'rail',
      activity:
        'Pip lies on a pale patch of boards at the west end of the stands, chin on his paws, facing the sand.',
    };
  if (pipForaging(state)) return null;
  const at = (areaId: AreaId, position: Point, spot: VigilSpot, activity: string): Whereabouts => ({
    areaId,
    position,
    spot,
    activity,
  });
  const hearth = at(
    'cottage',
    HEARTH_CHAIR.beside,
    'hearth',
    'Pip lies by the empty chair at the hearth, where he can see the door.',
  );
  // With the title home, Pip walks the yard at your heel and keeps the hearth of an evening.
  if (storyEnded(state) && state.areaId === 'homestead' && minute < 1140) {
    const you = state.player.position;
    return at(
      'homestead',
      { x: you.x - 0.9, z: you.z + 0.7 },
      'porch',
      'Pip keeps a few unhurried steps from you, as he always has from somebody.',
    );
  }
  if (minute >= 1140 || !fair) return hearth;
  if (minute < FORAGE.start)
    return at(
      'homestead',
      FLOWERPOTS.beside,
      'pots',
      'Pip sits by the flowerpots at the hour for watering them, looking at the can.',
    );
  if (minute < 750)
    return at(
      'glade',
      { x: MEMORIAL.x - 0.6, z: MEMORIAL.z + 0.7 },
      'stone',
      'Pip sits where the path gives out under the tree, a few unhurried steps from the stone.',
    );
  if (minute < 1020)
    return at(
      'homestead',
      FIELD_FENCE.beside,
      'fence',
      'Pip waits at the farm field fence at the hour for judging turnips.',
    );
  return at(
    'homestead',
    PORCH_BENCH.beside,
    'porch',
    'Pip lies by the porch bench at the hour for tea, a few unhurried steps from where Grandpa would be.',
  );
}

// What Grandpa has to say in his second and third years with you.
const LATER_LINES: readonly (readonly string[])[] = [
  [
    'I used to say a stead is never finished. Now I think it is only never the same person finishing it.',
    'Don’t fuss about my stick. It is a perfectly good stick, and it has opinions about the weather.',
    'You have stopped asking me what to do next. I noticed. I wasn’t going to mention it.',
    'Pip has started checking the bushes twice. He never used to. I think he is showing somebody how.',
    'A critter remembers who fed it when it had done nothing to earn it. So do people, come to that.',
    'The trick with the Colosseum is to come home the same person, whichever ribbon you are holding.',
  ],
  [
    'I am not ill. I am old. There is a difference, and the difference is that I am not complaining.',
    'Tell me what the turnips are doing. Slowly. I like to picture it.',
    'You will do things differently when it is yours. Good. If I had wanted it kept the same I would have left it to Pip.',
    'Listen to that. {name} is bossing the barn about. I never taught that. That one is all yours.',
    'Sit a minute. No, nothing is wrong. I just like it when you sit.',
    'I have had every single thing I wanted. Remember I said so, on a day when you doubt it.',
  ],
];

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
  const year = calendarDate(state.day).year;
  const pool = year >= 2 ? LATER_LINES[Math.min(year, 3) - 2] : GRANDPA_LINES;
  const line = pool[(state.day - 1) % pool.length].replaceAll('{name}', activeCritter(state).name);
  return next ? `“${line}” Then, with a nod: “${next.title}? ${next.detail}”` : `“${line}”`;
}
