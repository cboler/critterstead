import { calendarDate, DAYS_PER_SEASON, DAYS_PER_YEAR, SEASONS, weatherFor } from './calendar';
import { activeCritter, AreaId, GameState, Point, Season, StoryState, Weather } from './model';
import { SceneStage } from './opening';

/**
 * The story of Bramblewick: the springs and summers with Grandpa, the school terms away and
 * his letters, his passing, the autumn and winter of keeping Pip's rounds, and the Midwinter
 * title. Everything here is a pure reading of the save; the host decides when a scene is
 * due and queues it, and the app plays the queue. The scenes' own words are in
 * story-scenes.ts, which the app loads apart from the game so they add nothing to its start.
 */
export const STORY = {
  // Grandpa's last summer is the summer of this year (provisional; D39 allows two or three).
  lastSummerYear: 3,
  // Days the household is carried through around the funeral.
  mourningDays: 3,
  // What is in the tea caddy. It is all there is.
  inheritance: 41,
  // What a term with Pip teaches a critter left at home.
  termLessons: 2,
} as const;

export const newStory = (): StoryState => ({ passedDay: null, queue: [], seen: [], keepsakes: [] });

export const grandpaAlive = (state: GameState) => state.story.passedDay === null;
/** The story has reached its end: the title is home, and play goes on. */
export const storyEnded = (state: GameState) => state.story.seen.includes('grand-champion');

/** Where a beat is set. A beat without one stays where the last beat was. */
export interface Staging {
  areaId: AreaId;
  minute: number;
  // The season and weather the scene is drawn in, whatever today is.
  season?: Season;
  weather?: Weather;
  player: Point;
  companion?: Point;
  grandpa?: Point;
  pip?: Point;
}
export interface StoryBeat {
  stage?: Staging;
  // Who speaks; narration has none.
  speaker?: string;
  line: string;
  // A full card over the world: a chapter title, or a letter to read.
  card?: 'title' | 'letter';
  heading?: string;
}
export interface StoryScene {
  id: string;
  title: string;
  beats: readonly StoryBeat[];
}

// Where the stands give out at the Colosseum's west end: his old place at the rail.
export const OLD_RAIL: Point = { x: -6.3, z: -1.1 };

export const CREDITS_SCENE = 'credits';

/** A line with the companion's name written in. */
export function storyLine(line: string, state: GameState): string {
  return line.replaceAll('{name}', activeCritter(state).name);
}

// ───────────────────────────── When scenes fall due ─────────────────────────────

/** Scenes with Grandpa that play on waking, once their day of the year has come. */
const DAWN_SCENES: readonly { id: string; year: number; dayOfYear: number }[] = [
  { id: 'porch-stars', year: 1, dayOfYear: 4 },
  { id: 'long-time-ago', year: 1, dayOfYear: 42 },
  { id: 'judge-the-turnips', year: 2, dayOfYear: 5 },
  { id: 'old-rail', year: 2, dayOfYear: 40 },
  { id: 'chess-book', year: 3, dayOfYear: 6 },
  { id: 'last-good-day', year: 3, dayOfYear: 57 },
];

const fresh = (state: GameState, id: string) =>
  !state.story.seen.includes(id) && !state.story.queue.includes(id);

/** What waking today means for the household, before any scene of the day itself. */
export function turnOfSeason(state: GameState): 'school' | 'passing' | null {
  if (!grandpaAlive(state)) return null;
  const date = calendarDate(state.day);
  // Home is spring and summer; a morning in autumn or winter is the cart, or the end.
  if (date.season === 'spring' || date.season === 'summer') return null;
  return date.year < STORY.lastSummerYear ? 'school' : 'passing';
}

/** The first day of the spring after a school year's autumn. */
export const nextSpring = (day: number) => calendarDate(day).year * DAYS_PER_YEAR + 1;

/** The scene of the school cart that leaves in a year's autumn. */
export const schoolScene = (year: number) => (year <= 1 ? 'school-cart-1' : 'school-cart-2');

/** Evening scenes that follow something the household did, shown before the night passes. */
export function eveningScenes(state: GameState): string[] {
  if (!grandpaAlive(state)) return [];
  const owned = state.critters.filter((critter) => critter.ownerId === state.player.id);
  const scenes: string[] = [];
  if (
    fresh(state, 'first-ribbon') &&
    owned.some((critter) =>
      critter.competitions.some((result) => result.event === 'cup' && (result.placing ?? 9) <= 3),
    )
  )
    scenes.push('first-ribbon');
  if (fresh(state, 'champion-ribbon') && owned.some((critter) => critter.ladder.rank >= 3))
    scenes.push('champion-ribbon');
  return scenes;
}

/** At most one scene of the years with Grandpa, on the first waking on or after its day. */
export function dawnScene(state: GameState): string | null {
  if (!grandpaAlive(state)) return null;
  const date = calendarDate(state.day);
  if (date.season !== 'spring' && date.season !== 'summer') return null;
  return (
    DAWN_SCENES.find(
      (scene) =>
        scene.year === date.year && date.dayOfYear >= scene.dayOfYear && fresh(state, scene.id),
    )?.id ?? null
  );
}

// ───────────────────────────── Keeping Pip’s rounds ─────────────────────────────

export type VigilSpot = 'pots' | 'forage' | 'stone' | 'fence' | 'porch' | 'hearth' | 'rail';

export interface Keepsake {
  id: string;
  scene: string;
  name: string;
  // Where and when Pip keeps this part of the round, and how long after the passing.
  spot: VigilSpot;
  afterDays: number;
  hint: string;
  // What the journal keeps.
  memory: string;
}

export const KEEPSAKES: readonly Keepsake[] = [
  {
    id: 'pots',
    scene: 'keepsake-pots',
    name: 'The flowerpots',
    spot: 'pots',
    afterDays: STORY.mourningDays,
    hint: 'First thing each fair morning, Pip sits by the flowerpots at the cottage door.',
    memory:
      'A name under every pot but the last: every Brindlekin he ever raised, still watered each morning. The empty one has no name.',
  },
  {
    id: 'fence',
    scene: 'keepsake-fence',
    name: 'The field fence',
    spot: 'fence',
    afterDays: 9,
    hint: 'On fair afternoons Pip waits at the farm field fence, at the hour for judging turnips.',
    memory:
      'Two pairs of elbow-dips worn into the top rail. The smaller pair is yours. You always had a place there.',
  },
  {
    id: 'tin',
    scene: 'keepsake-tin',
    name: 'The biscuit tin',
    spot: 'porch',
    afterDays: 16,
    hint: 'Toward evening, at the hour for tea, Pip goes to the porch bench.',
    memory:
      'His ribbons, and a clipping: GRAND CHAMPION WALKS AWAY. “Something better had come along, and it wanted feeding every four hours.”',
  },
  {
    id: 'berry',
    scene: 'keepsake-berry',
    name: 'The best berry',
    spot: 'stone',
    afterDays: 23,
    hint: 'After his morning berry round, Pip goes up the glade to where the path gives out.',
    memory:
      'Pip leaves the best berry on the stone every morning. Now there are two. Nobody taught the second.',
  },
  {
    id: 'letter',
    scene: 'keepsake-letter',
    name: 'The letter in the chess book',
    spot: 'hearth',
    afterDays: 30,
    hint: 'In the evenings Pip lies by Grandpa’s chair at the hearth. Winter has come.',
    memory:
      'He bought Pip’s years so there would always be somebody who remembered how things are done. “Shoes on, sleepyhead.”',
  },
];

/** The next keepsake Pip is waiting to show, once enough days have gone by. */
export function keepsakeDue(state: GameState): Keepsake | null {
  const passed = state.story.passedDay;
  const next = KEEPSAKES[state.story.keepsakes.length];
  if (passed === null || !next) return null;
  return state.day >= passed + next.afterDays ? next : null;
}

// ───────────────────────────── The title ─────────────────────────────

/** The first Midwinter, the last day of winter, on or after a day. */
export const midwinterAfter = (day: number) => calendarDate(day).year * DAYS_PER_YEAR;

/**
 * Whether the Grand Championship is held today. It is a Midwinter tradition for those who
 * hold their own stead; after a household's first, the title may be challenged again at the
 * turn of any season.
 */
export function titleDay(state: GameState): boolean {
  const passed = state.story.passedDay;
  if (passed === null || state.day % DAYS_PER_SEASON !== 0) return false;
  return state.day >= midwinterAfter(passed);
}

/** The next day the title can be challenged, for the calendar; null while Grandpa lives. */
export function nextTitleDay(state: GameState): number | null {
  const passed = state.story.passedDay;
  if (passed === null) return null;
  const first = midwinterAfter(passed);
  if (state.day <= first) return first;
  return Math.ceil(state.day / DAYS_PER_SEASON) * DAYS_PER_SEASON;
}

// ───────────────────────────── Staging ─────────────────────────────

/** A day in the wanted season with the wanted weather (fair unless asked), near a day. */
function dayLike(day: number, season: Season, weather?: Weather): number {
  const first =
    (calendarDate(day).year - 1) * DAYS_PER_YEAR + SEASONS.indexOf(season) * DAYS_PER_SEASON + 1;
  for (let offset = 0; offset < DAYS_PER_SEASON; offset++) {
    const today = weatherFor(first + offset);
    if (weather ? today === weather : today !== 'rain' && today !== 'snow') return first + offset;
  }
  return first;
}

/**
 * Sets a copy of the game up as a beat's scene: the place, the hour and the season, with the
 * rancher and companion on their marks. Returns where Grandpa and Pip stand. Nothing here
 * touches the real game; the copy is only drawn.
 */
export function stageBeat(view: GameState, stage: Staging): SceneStage {
  const arriving = view.areaId !== stage.areaId;
  view.areaId = stage.areaId;
  view.areaInstanceId = `local-${stage.areaId}`;
  view.day = dayLike(view.day, stage.season ?? calendarDate(view.day).season, stage.weather);
  view.minute = stage.minute;
  view.totalMinutes = (view.day - 1) * 1440 + stage.minute;
  view.training = null;
  view.work = null;
  view.companionIndoors = stage.areaId === 'cottage';
  if (arriving) view.player.position = { ...stage.player };
  activeCritter(view).position = {
    ...(stage.companion ?? { x: stage.player.x + 0.8, z: stage.player.z + 0.6 }),
  };
  return {
    grandpa: stage.grandpa ?? null,
    pip: stage.pip ?? null,
    gemothy: null,
    binTipped: false,
    berriesPicked: false,
    companion: true,
  };
}

// ───────────────────────────── Credits ─────────────────────────────

export interface CreditsSection {
  heading: string;
  lines: string[];
}

/** The closing roll: everyone who was part of it, by the names this household gave them. */
export function credits(
  state: GameState,
  townsfolk: readonly { name: string; role: string }[],
): CreditsSection[] {
  const owned = state.critters.filter((critter) => critter.ownerId === state.player.id);
  const champion = owned.find((critter) => critter.ladder.rank >= 4) ?? activeCritter(state);
  return [
    {
      heading: 'At Bramblewick',
      lines: [
        'You',
        `${champion.name} · Grand Champion`,
        ...owned.filter((critter) => critter !== champion).map((critter) => critter.name),
        'Pip · the one Brindlekin',
      ],
    },
    {
      heading: 'In Oakhaven',
      lines: [
        ...townsfolk
          .filter((person) => person.name !== 'Hetty Larkspur')
          .map((person) => `${person.name} · ${person.role.toLowerCase()}`),
        'Gemothy · belongs to nobody',
      ],
    },
    {
      heading: 'On the sand',
      lines: [
        'Hetty Larkspur & Lantern · who kept it warm',
        `and every rival who made ${champion.name} better`,
      ],
    },
    {
      heading: 'Under the flowerpots',
      lines: ['Bracken', 'Thimble', 'Old Dot', 'Hazel-and-a-half', 'and one read only by thumb'],
    },
    { heading: 'Where the path gives out', lines: ['Grandpa'] },
    {
      heading: '',
      lines: ['For everyone who was taught something', 'by someone they still turn round to tell.'],
    },
    {
      heading: 'The stead is yours',
      lines: [
        'The shelter still has critters waiting.',
        'The turnips still want judging.',
        'Pip will be at the gate.',
      ],
    },
  ];
}
