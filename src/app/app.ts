import { backpack, satchel } from './game/model';
import {
  AfterViewInit,
  Component,
  ElementRef,
  NgZone,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { AREAS, DRILLS, EXHIBITIONS, ROUTINE } from './game/content';
import { calendarDate, calendarView, capitalize, formatDate, weatherFor } from './game/calendar';
import { createInitialState, LocalGameHost } from './game/host';
import { OFFER_BEAT, OPENING, openingFarewell, stageOpening } from './game/opening';
import {
  FAMILIES,
  kindName,
  MALLOW,
  starterName,
  starterOffer,
  type StarterCandidate,
} from './game/families';
import {
  activeCritter,
  GameCommand,
  GameState,
  Interaction,
  InteractionAction,
  ExhibitionId,
  Point,
  Training,
} from './game/model';
import { nextObjective, objectives } from './game/objectives';
import { IndexedDbStorage } from './game/storage';
import { encumbrance } from './game/checks';
import {
  activeMoment,
  beamBand,
  chessMoments,
  HURDLE_HEIGHT,
  momentWindow,
  liftBand,
  paceBand,
  rhythmSong,
  runCourse,
  RUN_SECONDS,
  sweepBand,
  throwDistance,
  tossBand,
} from './game/drills';
import { GameWorld } from './game/world';
import {
  storedQualityChoice,
  storeQualityChoice,
  type Quality,
  type QualityChoice,
} from './game/render/quality';

// Wider timing windows are a device preference, like the visual quality.
const ASSIST_KEY = 'critterstead-wide-timing';
function storedAssist(): boolean {
  try {
    return localStorage.getItem(ASSIST_KEY) === 'on';
  } catch {
    return false;
  }
}
function storeAssist(on: boolean): void {
  try {
    if (on) localStorage.setItem(ASSIST_KEY, 'on');
    else localStorage.removeItem(ASSIST_KEY);
  } catch {
    // Private browsing: the choice lasts for this visit.
  }
}

type Panel = 'journal' | 'help' | 'developer' | 'calendar';
type JournalTab = 'quests' | 'history' | 'supplies';

/** Whether the details panel sits beside the world rather than over it. */
function sidePanelLayout(): boolean {
  return window.matchMedia?.('(min-width: 900px) and (min-height: 561px)').matches ?? true;
}

// Feedback timing: how long a fresh result stays readable above the actions, and how long a
// drill's result card holds the actions back (taps meant for the finished drill land on it).
const NOTE_MS = 6500;
const RESULT_MS = 2800;
const MILESTONE_MS = 5200;
// The hurdle run's side view, in SVG units: where the runner stands and the ground lies.
const RUNNER_X = 56;
const GROUND_Y = 74;
const RUN_PIXELS = 64;
const HEIGHT_PIXELS = 58;
// Rhythm steps: lane centres, the line notes are stepped on, and how fast notes fall.
const LANE_X = [60, 150, 240];
const STEP_LINE = 112;
const NOTE_PIXELS = 70;
// Controller buttons for the rhythm lanes: d-pad left, down, right and X, A, B.
const PAD_LANES = [
  [14, 0],
  [2, 0],
  [13, 1],
  [0, 1],
  [15, 2],
  [1, 2],
] as const;
const RHYTHM_KEYS: Record<string, number> = {
  a: 0,
  arrowleft: 0,
  j: 0,
  s: 1,
  arrowdown: 1,
  k: 1,
  d: 2,
  arrowright: 2,
  l: 2,
};
const ACTIVITY_NAMES: Record<string, string> = {
  training: 'PRACTICE HOOPS',
  race: 'THE CLOVER CUP',
  lift: 'BOULDER LIFT',
  pace: 'DISTANCE PACING',
  toss: 'LOG TOSS',
  beam: 'BALANCE BEAM',
  run: 'HURDLE RUN',
  rhythm: 'RHYTHM STEPS',
  chess: 'CHESS PUZZLES',
  routine: 'A ROUTINE',
  // Colosseum events: the athletic showing by its old name, the others by their own.
  exhibition: 'THE EXHIBITION',
};
const ITEM_NAMES: Record<string, [string, string]> = {
  berry: ['berry', 'berries'],
  seed: ['feed seed', 'feed seeds'],
  'turnip-seed': ['turnip seed', 'turnip seeds'],
  'wheat-seed': ['wheat seed', 'wheat seeds'],
  'sunberry-seed': ['sunberry seed', 'sunberry seeds'],
  turnip: ['turnip', 'turnips'],
};

/** What an action can visibly change; compared before and after to show its results. */
interface Snapshot {
  day: number;
  area: string;
  coins: number;
  playerEnergy: number;
  items: Record<string, number>;
  critterEnergy: number;
  bond: number;
  hunger: number;
  stats: Record<string, number>;
  skills: Record<string, number>;
}
type Tone = 'gain' | 'cost' | 'note';

/** One item's moves between the backpack, the place at hand and the companion's satchel. */
interface CargoRow {
  itemId: string;
  name: string;
  mine: number;
  here: number;
  store?: InteractionAction;
  take?: InteractionAction;
  carry?: InteractionAction;
  deposit?: InteractionAction;
}

interface InstallPrompt extends Event {
  prompt(): Promise<void>;
}

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements AfterViewInit, OnDestroy {
  @ViewChild('world', { static: true }) private worldElement!: ElementRef<HTMLElement>;
  private readonly zone = inject(NgZone);
  private readonly element: ElementRef<HTMLElement> = inject(ElementRef);
  private host = new LocalGameHost();
  private readonly storage = new IndexedDbStorage();
  private world?: GameWorld;
  private frame = 0;
  private previousTime = 0;
  private refreshElapsed = 0;
  private saveElapsed = 0;
  // State when the current drill or work began, so its results can be shown when it ends.
  private activityBaseline: Snapshot | null = null;
  private activityKind = '';
  private workBaseline: Snapshot | null = null;
  // State as of the last announcement, so work the companion does alone is announced too.
  private baseline: Snapshot | null = null;
  private lessonLabels: string[] = [];
  private layoutKey = '';
  private milestoneTimer = 0;
  private lastNote: string | null = null;
  private noteTimer = 0;
  private changedTimer = 0;
  private readonly keys = new Set<string>();
  private gamepadButtons: boolean[] = [];
  // Balance beam leaning from the controller and the card's held buttons, -1 to 1.
  private padLean = 0;
  private touchLean = 0;
  private walkTo: Point | null = null;
  private destroyed = false;
  private saveBlocked = false;
  private releaseOwnership?: () => void;
  private audio?: AudioContext;
  private installPrompt?: InstallPrompt;
  protected readonly state = signal<GameState>(structuredClone(this.host.state));
  protected readonly nearby = signal<Interaction | null>(null);
  protected readonly companion = computed(() => activeCritter(this.state()));
  protected readonly ready = signal(false);
  protected readonly paused = signal(false);
  protected readonly panel = signal<Panel | null>(null);
  protected readonly saveStatus = signal('Opening your homestead…');
  protected readonly error = signal('');
  protected readonly sound = signal(false);
  protected readonly canInstall = signal(false);
  protected readonly resetArmed = signal(false);
  // A fresh game begins by choosing a first companion; nothing is saved until then.
  protected readonly offer = signal<StarterCandidate[] | null>(null);
  protected readonly offerFocus = signal<string>(MALLOW.id);
  protected readonly starterDraft = signal(MALLOW.name);
  protected readonly starterError = signal('');
  protected readonly focusedCandidate = computed(
    () => this.offer()?.find((candidate) => candidate.id === this.offerFocus()) ?? null,
  );
  protected readonly families = FAMILIES;
  protected readonly kindName = kindName;
  protected readonly offerStats = [
    { key: 'strength', label: 'STR' },
    { key: 'endurance', label: 'END' },
    { key: 'speed', label: 'SPD' },
    { key: 'intelligence', label: 'INT' },
  ] as const;
  private offerSeed = 0;
  // The walk to Oakhaven: the current beat, or null once the household has begun.
  protected readonly beat = signal<number | null>(null);
  protected readonly openingBeat = computed(() => {
    const beat = this.beat();
    return beat === null ? null : OPENING[beat];
  });
  protected readonly farewell = signal<string | null>(null);
  private offerCandidates: StarterCandidate[] = [];
  private farewellTimer = 0;
  protected readonly sessionBusy = signal(false);
  protected readonly controllerConnected = signal(false);
  protected readonly gamepadAction = signal<string | null>(null);
  protected readonly learning = signal(this.host.learning());
  protected readonly hauling = signal(this.host.haulingLearning());
  protected readonly learningSteps = Array.from({ length: this.learning().goal }, (_, i) => i + 1);
  protected readonly haulingSteps = Array.from({ length: this.hauling().goal }, (_, i) => i + 1);
  protected readonly journalTabs: { id: JournalTab; label: string }[] = [
    { id: 'quests', label: 'Quests' },
    { id: 'history', label: 'History' },
    { id: 'supplies', label: 'Supplies' },
  ];
  protected readonly bag = computed(() => backpack(this.state()));
  protected readonly companionBag = computed(() => satchel(this.state()));
  protected readonly load = computed(() =>
    encumbrance(this.state().player, backpack(this.state()).items),
  );
  protected readonly rancherSkills = [
    'woodcutting',
    'mining',
    'hauling',
    'foraging',
    'farming',
  ] as const;
  protected readonly calendar = computed(() => calendarView(this.state()));
  protected readonly date = computed(() => calendarDate(this.state().day));
  protected readonly weatherIcons = { sunny: '☀', cloudy: '☁', rain: '☂', snow: '❄' } as const;
  protected readonly capitalize = capitalize;
  /** The current activity's green zone, as left and right edges from 0 to 1. */
  protected readonly activityBand = computed((): [number, number] => {
    const activity = this.state().training;
    if (!activity) return [0.4, 0.6];
    if (activity.kind === 'lift') return liftBand(activity);
    if (activity.kind === 'pace') return paceBand(activity);
    if (activity.kind === 'toss') return tossBand(activity, this.companion());
    if (activity.kind === 'beam') return beamBand(activity, this.companion());
    return sweepBand(activity);
  });
  /**
   * The hurdle run seen from the side: the runner stands at RUNNER_X and hurdles slide in
   * from the right, RUN_PIXELS to a second of running.
   */
  protected readonly runView = computed(() => {
    const activity = this.state().training;
    if (activity?.kind !== 'run') return null;
    const course = runCourse(activity.seed ?? 0);
    const run = (activity.progress ?? 0) * RUN_SECONDS;
    return {
      height: GROUND_Y - (activity.meter ?? 0) * HEIGHT_PIXELS,
      hurdles: course
        .map((hurdle, index) => ({
          at: hurdle.at,
          x: RUNNER_X + (hurdle.at - run) * RUN_PIXELS,
          tall: hurdle.tall,
          top: GROUND_Y - HURDLE_HEIGHT[hurdle.tall ? 'tall' : 'low'] * HEIGHT_PIXELS,
          result: activity.hits[index],
        }))
        .filter((hurdle) => hurdle.x > -20 && hurdle.x < 320),
      // A bump on the last hurdle shows for a moment after it.
      bumped: activity.hits.at(-1) === 0 && run - (course[activity.hits.length - 1]?.at ?? 0) < 0.5,
      cleared: activity.hits.filter((hit) => hit > 0).length,
      total: course.length,
    };
  });
  /** How far through a routine the critter is, from 0 to 1. */
  protected readonly routineProgress = computed(() =>
    Math.min(1, (this.state().training?.elapsed ?? 0) / ROUTINE.seconds),
  );
  protected readonly throwsSoFar = computed(() => {
    const activity = this.state().training;
    if (activity?.kind !== 'toss') return '';
    return activity.hits.map((hit) => throwDistance(hit, this.companion()) + ' m').join(' · ');
  });
  /** Rhythm steps from above: notes fall down three lanes to the line they are stepped on. */
  protected readonly rhythmView = computed(() => {
    const activity = this.state().training;
    if (activity?.kind !== 'rhythm') return null;
    const song = rhythmSong(activity.seed ?? 0);
    const last = activity.hits.at(-1);
    return {
      notes: song
        .map((note) => ({
          at: note.at,
          x: LANE_X[note.lane],
          y: STEP_LINE - (note.at - activity.elapsed) * NOTE_PIXELS,
          lane: note.lane,
        }))
        .filter((note, index) => index >= activity.hits.length && note.y > -12),
      // The last judgement shows briefly after it lands.
      judged:
        last === undefined || activity.elapsed - this.judgedAt(activity) > 0.5
          ? ''
          : last === 1
            ? 'Perfect!'
            : last > 0
              ? 'Good'
              : 'Miss',
      played: activity.hits.length,
      total: song.length,
    };
  });
  /** When the last note was judged: on its step, or as it slipped past the line. */
  private judgedAt(activity: Training): number {
    const note = rhythmSong(activity.seed ?? 0)[activity.hits.length - 1];
    return activity.hits.at(-1) === 0 ? (note?.at ?? 0) + 0.15 : (activity.lastHitAt ?? 0);
  }
  /** The chess sitting: what needs answering now, how long it waits, and the tally so far. */
  protected readonly chessView = computed(() => {
    const activity = this.state().training;
    if (activity?.kind !== 'chess') return null;
    const moments = chessMoments(activity.seed ?? 0);
    const moment = activeMoment(activity);
    const window = moment ? momentWindow(activity, this.companion(), moment.kind) : 0;
    const count = (kind: string, answered: boolean) =>
      moments.filter((item, index) => item.kind === kind && (!answered || activity.hits[index] > 0))
        .length;
    return {
      moment,
      left: moment ? Math.max(0, 1 - (activity.elapsed - moment.at) / window) : 0,
      ideas: `${count('idea', true)} / ${count('idea', false)}`,
      moths: `${count('moth', true)} / ${count('moth', false)}`,
      focus: activity.reserve ?? 1,
    };
  });
  protected readonly laneKeys = ['A', 'S', 'D'];
  protected readonly laneX = LANE_X;
  protected readonly exhibitions = EXHIBITIONS;
  protected readonly assist = signal(storedAssist());
  protected setAssist(on: boolean): void {
    this.assist.set(on);
    storeAssist(on);
  }
  private readonly drillCopy = computed(() => {
    const activity = this.state().training;
    const name = this.companion().name;
    const beats = 'when the marker reaches the green patch.';
    if (!activity)
      return { eyebrow: '', heading: '', instructions: '', button: '', status: '', gauge: null };
    if (activity.kind === 'lift')
      return {
        eyebrow: 'BOULDER LIFT',
        heading: 'Steady strength',
        instructions: 'to push the gauge up. Keep it in the green until the hold fills.',
        button: 'Push, ' + name + '!',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'lift' as const,
      };
    if (activity.kind === 'routine')
      return {
        eyebrow: DRILLS[activity.drill!].name.toUpperCase() + ' · ROUTINE',
        heading: name + ' runs it alone',
        instructions: '',
        button: '',
        status: 'You watch; there is nothing to press.',
        gauge: 'routine' as const,
      };
    if (activity.kind === 'toss')
      return {
        eyebrow: 'LOG TOSS',
        heading: 'Charge, and let go at the peak',
        instructions:
          'and hold to charge the throw; let go in the green. Or tap once to start and again to throw.',
        button: 'Throw, ' + name + '!',
        status: activity.hits.length + ' / 3 throws',
        gauge: 'toss' as const,
      };
    if (activity.kind === 'beam')
      return {
        eyebrow: 'BALANCE BEAM',
        heading: activity.stage === 1 ? 'Wobbling! Lean back to the green' : 'Steady across',
        instructions: '',
        button: '',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'beam' as const,
      };
    if (activity.kind === 'run') {
      const view = this.runView();
      return {
        eyebrow: 'HURDLE RUN',
        heading: view?.bumped ? 'Bump! Keep going' : 'Jump, ' + name + ', jump!',
        instructions: 'to jump a stump; press again in the air to clear a tall hedge.',
        button: 'Jump!',
        status: (view?.cleared ?? 0) + ' / ' + (view?.total ?? 0) + ' cleared',
        gauge: 'run' as const,
      };
    }
    if (activity.kind === 'rhythm') {
      const view = this.rhythmView();
      return {
        eyebrow: 'RHYTHM STEPS',
        heading: view?.judged || 'Step in time with ' + name,
        instructions: '',
        button: '',
        status: (view?.played ?? 0) + ' / ' + (view?.total ?? 0) + ' notes',
        gauge: 'rhythm' as const,
      };
    }
    if (activity.kind === 'chess') {
      const moment = this.chessView()?.moment;
      return {
        eyebrow: 'CHESS PUZZLES',
        heading: !moment
          ? name + ' is thinking…'
          : moment.kind === 'idea'
            ? name + ' sees a move!'
            : 'A moth flutters in from the ' + (moment.side < 0 ? 'left' : 'right') + '!',
        instructions: '',
        button: 'Cheer!',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'chess' as const,
      };
    }
    if (activity.kind === 'pace')
      return {
        eyebrow: 'DISTANCE PACING',
        heading: 'Find a pace you can keep',
        instructions: 'to speed up. Above the green you spend breath; run dry and you are winded.',
        button: 'Pace!',
        status: Math.round(activity.elapsed) + 's',
        gauge: 'pace' as const,
      };
    return {
      eyebrow: activity.kind === 'race' ? 'THE CLOVER CUP' : 'A LITTLE PRACTICE',
      heading:
        activity.kind === 'race'
          ? 'Cheer ' + name + ' across the line!'
          : 'Find your rhythm together',
      instructions: beats,
      button: activity.kind === 'race' ? 'Cheer!' : 'Hop, ' + name + '!',
      status: '',
      gauge: null,
    };
  });
  /** The card's words, with a Colosseum event's name, leg and calls over the drill's own. */
  protected readonly activityCopy = computed(() => {
    const copy = this.drillCopy();
    const activity = this.state().training;
    if (!activity?.event) return copy;
    const event = EXHIBITIONS[activity.event];
    const leg = event.legs[activity.leg ?? 0];
    const name = this.companion().name;
    return {
      ...copy,
      eyebrow:
        `${event.name} · ${(activity.leg ?? 0) + 1} of ${event.legs.length} · ${DRILLS[leg.drill].name}`.toUpperCase(),
      heading: leg.heading?.replace('{name}', name) ?? copy.heading,
      button: leg.button?.replace('{name}', name) ?? copy.button,
    };
  });
  protected weather() {
    return weatherFor(this.state().day);
  }
  protected dropCargo(): void {
    this.command({ type: 'drop-cargo' });
  }
  protected readonly areas = AREAS;
  // Wide screens open the details panel beside the world; phones start with a compact chip.
  protected readonly railOpen = signal(sidePanelLayout());
  protected readonly railTab = signal<'companion' | 'learning' | 'rancher'>('companion');
  protected readonly qualityChoice = signal<QualityChoice>(storedQualityChoice());
  protected readonly quality = signal<Quality>('balanced');
  protected readonly rendererName = signal('');
  protected readonly night = signal(false);
  // Presentation moments: a titled fade between areas and a title card each new morning.
  protected readonly fades = signal<{ serial: number; name: string; subtitle: string }[]>([]);
  protected readonly morning = signal<{
    serial: number;
    title: string;
    date: string;
    weather: keyof App['weatherIcons'];
  } | null>(null);
  // Where to look: a drill's result replaces its card; other results appear above the
  // actions for a moment and float over whoever they changed; changed stats light up.
  protected readonly result = signal<{
    serial: number;
    eyebrow: string;
    heading: string;
    detail: string;
    gains: string[];
  } | null>(null);
  // A learning stage reached: a brief banner, separate from results, that blocks nothing.
  protected readonly milestone = signal<{ lesson: string; stage: string; detail: string } | null>(
    null,
  );
  protected readonly journalTab = signal<JournalTab>('quests');
  protected readonly quests = computed(() => objectives(this.state()));
  protected readonly todayQuests = computed(() =>
    this.quests().filter((quest) => quest.group === 'today'),
  );
  protected readonly journeyQuests = computed(() =>
    this.quests().filter((quest) => quest.group === 'journey'),
  );
  protected readonly nextQuest = computed(() => nextObjective(this.state()));
  /** The journal's entries, newest first, gathered under the morning that began each day. */
  protected readonly history = computed(() => {
    const days: { title: string; entries: string[] }[] = [];
    let entries: string[] = [];
    for (const entry of this.state().journal) {
      const morning = /^Day (\d+) · /.exec(entry);
      entries.push(entry);
      if (morning) {
        days.push({ title: `Day ${morning[1]}`, entries });
        entries = [];
      }
    }
    if (entries.length) days.push({ title: 'Day 1', entries });
    return days;
  });
  /** Storage moves grouped by item, so a full chest reads as rows rather than a wall of buttons. */
  protected readonly cargo = computed<CargoRow[]>(() => {
    const target = this.nearby();
    if (!target) return [];
    const state = this.state();
    const bag = backpack(state);
    const helper = satchel(state);
    const place = state.containers.find((item) => item.id === target.id) ?? helper;
    const count = (items: { itemId: string; quantity: number }[], itemId: string) =>
      items.filter((item) => item.itemId === itemId).reduce((sum, item) => sum + item.quantity, 0);
    const rows = new Map<string, CargoRow>();
    for (const action of target.actions) {
      const [kind, source, destination, itemId] = action.id.split(':');
      if (kind !== 'transfer') continue;
      const row =
        rows.get(itemId) ??
        rows
          .set(itemId, {
            itemId,
            name: (ITEM_NAMES[itemId]?.[1] ?? itemId).replace(/^./, (letter) =>
              letter.toUpperCase(),
            ),
            mine: count(bag.items, itemId),
            here: count(place.items, itemId),
          })
          .get(itemId)!;
      if (source === bag.id) row.store = action;
      else if (destination === bag.id) row.take = action;
      else if (destination === helper.id) row.carry = action;
      else row.deposit = action;
    }
    return [...rows.values()];
  });
  /** Dock actions that are not storage moves keep their full buttons. */
  protected readonly plainActions = computed(
    () => this.nearby()?.actions.filter((action) => !action.id.startsWith('transfer:')) ?? [],
  );
  protected readonly placeName = computed(() => {
    const target = this.nearby();
    return target?.id === this.companion().id ? this.companion().name : 'Here';
  });
  protected readonly companionSkills = computed(() =>
    Object.entries(this.companion().skills)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value: Number.isInteger(value) ? `${value}` : value.toFixed(1),
      })),
  );
  protected readonly noteFresh = signal(true);
  protected readonly changed = signal<ReadonlySet<string>>(new Set());
  private momentSerial = 0;
  private lastArea = '';
  private lastDay = 0;
  protected readonly qualityOptions: { id: QualityChoice; label: string }[] = [
    { id: 'auto', label: 'Auto' },
    { id: 'cinematic', label: 'Cinematic' },
    { id: 'balanced', label: 'Balanced' },
    { id: 'light', label: 'Light' },
  ];
  private insetElapsed = 1;
  protected readonly statNames = ['strength', 'endurance', 'speed', 'intelligence'] as const;
  protected readonly goals = [
    {
      flag: 'cared',
      title: 'A little care',
      description: 'Spend a moment caring for your companion.',
    },
    { flag: 'trained', title: 'Find your rhythm', description: 'Try the training hoop together.' },
    {
      flag: 'gathered',
      title: 'Beyond the garden gate',
      description: 'Pick sunberries in the glade.',
    },
    {
      flag: 'improved',
      title: 'Room to grow',
      description: 'Sell berries and mend the companion nook.',
    },
  ];

  async ngAfterViewInit(): Promise<void> {
    // Only one local authority may write the same homestead at a time.
    if (navigator.locks) {
      const ownsSave = await new Promise<boolean>((resolve, reject) => {
        void navigator.locks
          .request('critterstead-active-game', { ifAvailable: true }, (lock) => {
            resolve(!!lock);
            if (!lock) return;
            return new Promise<void>((release) => {
              this.releaseOwnership = release;
            });
          })
          .catch(reject);
      });
      if (this.destroyed) {
        this.releaseOwnership?.();
        return;
      }
      if (!ownsSave) {
        this.saveBlocked = true;
        this.sessionBusy.set(true);
        this.error.set(
          'Your homestead is open in another tab. Close that tab and reload this one to continue.',
        );
        this.saveStatus.set('Open in another tab');
        return;
      }
    }
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.blur);
    window.addEventListener('pagehide', this.pageHide);
    document.addEventListener('visibilitychange', this.visibility);
    window.addEventListener('beforeinstallprompt', this.beforeInstall);
    window.addEventListener('gamepadconnected', this.controllerChange);
    window.addEventListener('gamepaddisconnected', this.controllerChange);
    try {
      const saved = await this.storage.load();
      if (this.destroyed) return;
      if (saved) this.host = new LocalGameHost(saved);
      else this.beginOpening();
      this.saveStatus.set(saved ? 'Your homestead is saved' : 'A new beginning');
    } catch (error) {
      this.saveBlocked = true;
      this.error.set(
        `${error instanceof Error ? error.message : 'Could not open your save.'} Your existing save has been kept. Saving is paused until you reset it in developer tools.`,
      );
      this.saveStatus.set('Save needs attention');
    }
    if (this.destroyed) return;
    this.refresh();
    try {
      this.zone.runOutsideAngular(() => {
        this.world = new GameWorld(
          this.worldElement.nativeElement,
          (point) => {
            // A tap or a held pointer sets the destination; releasing a hold stops (null).
            if (!this.paused() && !this.panel() && !this.host.state.training) this.walkTo = point;
          },
          this.qualityChoice(),
        );
        this.stageWorld();
        this.frame = requestAnimationFrame(this.animate);
      });
      this.quality.set(this.world!.quality);
      this.rendererName.set(this.world!.gpu);
      this.ready.set(true);
      if (!this.saveBlocked) await this.save();
    } catch (error) {
      this.error.set(
        `The world could not start. Please use a browser with WebGL enabled. ${error instanceof Error ? error.message : ''}`,
      );
    }
  }

  private readonly animate = (time: number): void => {
    if (this.destroyed) return;
    const dt = this.previousTime ? Math.min((time - this.previousTime) / 1000, 0.1) : 0;
    this.previousTime = time;
    const stick = document.hidden ? { x: 0, z: 0 } : this.pollGamepad();
    if (this.beat() !== null) this.walkOpening(dt);
    else if (!this.paused() && !this.panel() && !document.hidden) {
      let x = 0;
      let z = 0;
      if (this.keys.has('w') || this.keys.has('arrowup')) {
        x -= 0.6;
        z -= 0.8;
      }
      if (this.keys.has('s') || this.keys.has('arrowdown')) {
        x += 0.6;
        z += 0.8;
      }
      if (this.keys.has('a') || this.keys.has('arrowleft')) {
        x -= 0.8;
        z += 0.6;
      }
      if (this.keys.has('d') || this.keys.has('arrowright')) {
        x += 0.8;
        z -= 0.6;
      }
      x += stick.x;
      z += stick.z;
      if (x || z) this.walkTo = null;
      else if (this.walkTo) {
        x = this.walkTo.x - this.host.state.player.position.x;
        z = this.walkTo.z - this.host.state.player.position.z;
        if (Math.hypot(x, z) < 0.18) {
          this.walkTo = null;
          x = 0;
          z = 0;
        }
      }
      if (x || z) this.host.dispatch({ type: 'move', x, z, seconds: dt });
      const previousJournal = this.host.state.journal;
      const previousDay = this.host.state.day;
      const training = !!this.host.state.training;
      const working = !!this.host.state.work;
      if (this.host.state.training?.kind === 'beam')
        this.host.dispatch({ type: 'training-steer', direction: this.lean() });
      // A held lean button removed with its card never sees its pointer come up.
      else this.touchLean = 0;
      this.host.update(dt);
      if (training && !this.host.state.training) this.zone.run(() => this.finishActivity());
      if (working && !this.host.state.work) this.zone.run(() => this.finishWork());
      this.saveElapsed += dt;
      if (
        this.saveElapsed > 8 ||
        previousJournal !== this.host.state.journal ||
        previousDay !== this.host.state.day
      ) {
        this.saveElapsed = 0;
        void this.save();
      }
    }
    this.insetElapsed += dt;
    if (this.insetElapsed >= 0.2) {
      this.insetElapsed = 0;
      this.measureInsets();
    }
    this.world?.render(this.host.state, dt);
    if (this.world && this.world.night !== this.night()) {
      const night = this.world.night;
      this.zone.run(() => this.night.set(night));
    }
    this.refreshElapsed += dt;
    if (this.refreshElapsed >= (this.host.state.training ? 1 / 60 : 0.1)) {
      this.refreshElapsed = 0;
      this.zone.run(() => this.refresh());
    }
    this.frame = requestAnimationFrame(this.animate);
  };

  private refresh(): void {
    this.learning.set(this.host.learning());
    this.hauling.set(this.host.haulingLearning());
    this.state.set(structuredClone(this.host.state));
    const current = this.host.state;
    if (this.lastArea && current.areaId !== this.lastArea) {
      const { name, subtitle } = AREAS[current.areaId];
      this.fades.update((list) => [...list, { serial: ++this.momentSerial, name, subtitle }]);
    }
    if (this.lastDay && current.day > this.lastDay) {
      const serial = ++this.momentSerial;
      this.morning.set({
        serial,
        title: `Day ${current.day}`,
        date: formatDate(current.day),
        weather: weatherFor(current.day),
      });
      setTimeout(() => {
        if (this.morning()?.serial === serial) this.morning.set(null);
      }, 3600);
    }
    this.lastArea = current.areaId;
    this.lastDay = current.day;
    const note = current.journal[0] ?? '';
    if (note !== this.lastNote) {
      this.lastNote = note;
      this.noteFresh.set(true);
      clearTimeout(this.noteTimer);
      this.noteTimer = window.setTimeout(() => this.noteFresh.set(false), NOTE_MS);
      // Commands announce their own results; this catches what happens without one.
      if (this.baseline) this.announce(this.baseline);
    }
    this.baseline ??= this.snapshot();
    const lessons = [this.learning(), this.hauling()];
    lessons.forEach((lesson, index) => {
      const known = this.lessonLabels[index];
      if (known !== undefined && known !== lesson.label && lesson.progress > 0) {
        this.milestone.set({ lesson: lesson.name, stage: lesson.label, detail: lesson.effect });
        this.world?.react('learned');
        clearTimeout(this.milestoneTimer);
        this.milestoneTimer = window.setTimeout(() => this.milestone.set(null), MILESTONE_MS);
      }
    });
    this.lessonLabels = lessons.map((lesson) => lesson.label);
    const interaction = this.host.interaction();
    this.nearby.set(interaction);
    this.world?.setTarget(this.host.state.training ? null : (interaction?.id ?? null));
    // Whatever sits above the bottom panel is placed from its measured height, so measure as
    // soon as the panel or the note changes instead of waiting for the periodic check.
    const layout = [
      interaction?.id,
      interaction?.actions.length,
      current.training?.kind,
      this.result()?.serial,
      this.lastNote,
    ].join('|');
    if (layout !== this.layoutKey) {
      this.layoutKey = layout;
      window.setTimeout(() => this.measureInsets());
    }
    if (
      !interaction?.actions.some((action) => action.id === this.gamepadAction() && !action.disabled)
    )
      this.gamepadAction.set(null);
  }

  private readonly controllerChange = (): void => {
    this.zone.run(() =>
      this.controllerConnected.set(!!navigator.getGamepads?.().find((pad) => pad?.connected)),
    );
  };

  private pollGamepad(): Point {
    const pad = navigator.getGamepads?.().find((candidate) => candidate?.connected);
    if (this.controllerConnected() !== !!pad)
      this.zone.run(() => this.controllerConnected.set(!!pad));
    if (!pad) {
      this.gamepadButtons = [];
      this.padLean = 0;
      return { x: 0, z: 0 };
    }
    const pressed = pad.buttons.map((button) => button.pressed);
    const newlyPressed = pressed.map((value, index) => value && !this.gamepadButtons[index]);
    const edge = (index: number) => newlyPressed[index];
    const letGo = !pressed[0] && this.gamepadButtons[0];
    this.gamepadButtons = pressed;
    if (letGo && this.host.state.training?.kind === 'toss')
      this.zone.run(() => this.releaseDrill());
    const beam = this.host.state.training?.kind === 'beam';
    const stick = pad.axes[0] ?? 0;
    this.padLean = beam
      ? (Math.abs(stick) > 0.18 ? stick : 0) + (pressed[15] ? 1 : 0) - (pressed[14] ? 1 : 0)
      : 0;
    if (this.offer()) {
      if (edge(12) || edge(14)) this.zone.run(() => this.moveOfferFocus(-1));
      if (edge(13) || edge(15)) this.zone.run(() => this.moveOfferFocus(1));
      if (edge(0)) this.zone.run(() => this.chooseStarter());
      return { x: 0, z: 0 };
    }
    if (this.beat() !== null) {
      // A continues the walk; Start skips to the choice.
      if (edge(0)) this.zone.run(() => this.continueOpening());
      if (edge(9)) this.zone.run(() => this.skipOpening());
      return { x: 0, z: 0 };
    }
    if (edge(9))
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else this.togglePause();
      });
    // The thinking drills own the face buttons and the d-pad: lanes X/A/B and ◀ ▼ ▶ for
    // rhythm steps; A cheers and B shoos at the chessboard.
    const thinking = this.host.state.training?.kind;
    if ((thinking === 'rhythm' || thinking === 'chess') && !this.panel() && !this.paused()) {
      if (thinking === 'rhythm') {
        const lane = PAD_LANES.find(([button]) => edge(button))?.[1];
        if (lane !== undefined) this.zone.run(() => this.stepLane(lane));
      } else {
        if (edge(0)) this.zone.run(() => this.act());
        if (edge(1)) this.zone.run(() => this.shooDrill());
      }
      return { x: 0, z: 0 };
    }
    if (edge(1))
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else if (this.paused()) this.togglePause();
        else this.clearGamepadSelection();
      });
    if (edge(2)) this.zone.run(() => this.openPanel(this.panel() === 'help' ? null : 'help'));
    if (edge(3)) this.zone.run(() => this.openPanel(this.panel() === 'journal' ? null : 'journal'));
    // On the beam the d-pad leans instead of moving focus.
    if (!beam && (edge(12) || edge(14))) this.zone.run(() => this.navigateGamepad(-1));
    if (!beam && (edge(13) || edge(15))) this.zone.run(() => this.navigateGamepad(1));
    if (edge(0)) this.zone.run(() => this.activateGamepad());
    if (this.paused() || this.panel() || this.host.state.training) return { x: 0, z: 0 };
    const horizontal = pad.axes[0] ?? 0;
    const vertical = pad.axes[1] ?? 0;
    if (Math.hypot(horizontal, vertical) < 0.18) return { x: 0, z: 0 };
    return { x: horizontal * 0.8 + vertical * 0.6, z: vertical * 0.8 - horizontal * 0.6 };
  }

  private clearGamepadSelection(): void {
    this.gamepadAction.set(null);
    this.element.nativeElement
      .querySelectorAll('.pad-selected')
      .forEach((button) => button.classList.remove('pad-selected'));
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  }

  private navigateGamepad(step: number): void {
    if (this.panel()) {
      const buttons = Array.from(
        this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
          '.journal-modal button:not(:disabled)',
        ),
      );
      if (!buttons.length) return;
      const selected = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = buttons[(selected + step + buttons.length) % buttons.length];
      buttons.forEach((button) => button.classList.remove('pad-selected'));
      next.classList.add('pad-selected');
      next.focus();
      return;
    }
    if (this.paused()) {
      this.element.nativeElement.querySelector<HTMLButtonElement>('.pause-message button')?.focus();
      return;
    }
    if (this.host.state.training) {
      this.element.nativeElement.querySelector<HTMLButtonElement>('.training-card button')?.focus();
      return;
    }
    const actions = this.host.interaction()?.actions.filter((action) => !action.disabled) ?? [];
    if (!actions.length) return;
    const selected = actions.findIndex((action) => action.id === this.gamepadAction());
    const next =
      actions[
        selected < 0
          ? step < 0
            ? actions.length - 1
            : 0
          : (selected + step + actions.length) % actions.length
      ];
    this.gamepadAction.set(next.id);
    this.element.nativeElement
      .querySelector<HTMLButtonElement>(`.interaction-dock button[data-action="${next.id}"]`)
      ?.focus();
  }

  private activateGamepad(): void {
    if (this.panel()) {
      const focused = document.activeElement;
      if (
        focused instanceof HTMLButtonElement &&
        this.element.nativeElement.querySelector('.journal-modal')?.contains(focused)
      )
        focused.click();
      return;
    }
    if (this.paused()) {
      this.togglePause();
      return;
    }
    if (this.host.state.training) {
      this.act();
      return;
    }
    if (this.holdAfterDrill()) return;
    const action = this.host
      .interaction()
      ?.actions.find((item) => item.id === this.gamepadAction() && !item.disabled);
    this.act(action?.id);
  }
  /**
   * While a drill's result shows, action taps are held back, so taps meant for the drill
   * cannot start the next (paid) one. It clears by itself; there is nothing to dismiss,
   * because a dismissal would let the next tap through.
   */
  private holdAfterDrill(): boolean {
    return !!this.result();
  }
  /** A drill just ended: its result replaces its card, and its gains float over the pair. */
  private finishActivity(): void {
    const baseline = this.activityBaseline;
    this.activityBaseline = null;
    const note = this.host.state.journal[0] ?? '';
    const [heading, ...detail] = note.split(/(?<=[.!?])\s+/);
    // The card shows this note, so it need not appear above the actions afterward.
    this.lastNote = note;
    this.noteFresh.set(false);
    clearTimeout(this.noteTimer);
    const changes = baseline ? this.announce(baseline) : [];
    this.world?.react(/brave try|every little/i.test(heading) ? 'try' : 'cheer');
    const serial = ++this.momentSerial;
    this.result.set({
      serial,
      eyebrow:
        ACTIVITY_NAMES[this.activityKind] ??
        EXHIBITIONS[this.activityKind as ExhibitionId]?.name.toUpperCase() ??
        'WELL DONE',
      heading,
      detail: detail.join(' '),
      gains: changes
        .filter((change) => change.tone === 'gain' && !change.text.endsWith('energy'))
        .map((change) => change.text),
    });
    window.setTimeout(() => {
      if (this.result()?.serial === serial) this.result.set(null);
    }, RESULT_MS);
  }
  private finishWork(): void {
    if (this.workBaseline) this.announce(this.workBaseline);
    this.workBaseline = null;
  }
  private snapshot(): Snapshot {
    const state = this.host.state;
    const critter = activeCritter(state);
    const items: Record<string, number> = {};
    for (const item of backpack(state).items)
      items[item.itemId] = (items[item.itemId] ?? 0) + item.quantity;
    return {
      day: state.day,
      area: state.areaId,
      coins: state.player.coins,
      playerEnergy: state.player.stamina,
      items,
      critterEnergy: critter.stamina,
      bond: critter.bond,
      hunger: critter.hunger,
      stats: { ...critter.stats },
      skills: { ...critter.skills },
    };
  }
  /** Floats what changed since a snapshot over whoever changed, and lights up those stats. */
  private announce(before: Snapshot): { text: string; tone: Tone }[] {
    const after = this.snapshot();
    this.baseline = after;
    // A new morning or another area has its own title card instead.
    if (after.day !== before.day || after.area !== before.area) return [];
    const critter: { text: string; tone: Tone }[] = [];
    const player: { text: string; tone: Tone }[] = [];
    const keys = new Set<string>();
    const signed = (value: number, digits = 0) =>
      `${value > 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;
    const add = (list: typeof critter, key: string, text: string, tone: Tone) => {
      list.push({ text, tone });
      keys.add(key);
    };
    for (const stat of this.statNames) {
      const change = after.stats[stat] - before.stats[stat];
      if (change >= 0.005) add(critter, stat, `${signed(change, 2)} ${stat}`, 'gain');
    }
    for (const [skill, value] of Object.entries(after.skills)) {
      const change = value - (before.skills[skill] ?? 0);
      if (change >= 0.05)
        add(critter, `skill:${skill}`, `${signed(change, change % 1 ? 1 : 0)} ${skill}`, 'gain');
    }
    const bond = Math.round(after.bond - before.bond);
    if (bond) add(critter, 'bond', `${signed(bond)} ♥`, bond > 0 ? 'gain' : 'cost');
    const fed = Math.round(before.hunger - after.hunger);
    if (fed > 0) add(critter, 'hunger', `−${fed} hunger`, 'gain');
    const energy = Math.round(after.critterEnergy - before.critterEnergy);
    if (energy)
      add(critter, 'critter-energy', `${signed(energy)} energy`, energy > 0 ? 'gain' : 'cost');
    const coins = after.coins - before.coins;
    if (coins) add(player, 'coins', `${signed(coins)} coins`, coins > 0 ? 'gain' : 'cost');
    for (const id of new Set([...Object.keys(before.items), ...Object.keys(after.items)])) {
      const change = (after.items[id] ?? 0) - (before.items[id] ?? 0);
      if (!change) continue;
      const [one, many] = ITEM_NAMES[id] ?? [id, id];
      add(
        player,
        'items',
        `${signed(change)} ${Math.abs(change) === 1 ? one : many}`,
        change > 0 ? 'gain' : 'note',
      );
    }
    const stamina = Math.round(after.playerEnergy - before.playerEnergy);
    if (stamina)
      add(player, 'player-energy', `${signed(stamina)} energy`, stamina > 0 ? 'gain' : 'cost');
    for (const change of critter.slice(0, 3))
      this.world?.float(change.text, 'critter', change.tone);
    for (const change of player.slice(0, 3)) this.world?.float(change.text, 'player', change.tone);
    if (keys.size) {
      this.changed.set(keys);
      clearTimeout(this.changedTimer);
      this.changedTimer = window.setTimeout(() => this.changed.set(new Set()), 4000);
    }
    return [...critter, ...player];
  }
  /** The storage moves offered for one item, in a fixed order with short visible labels. */
  protected moves(row: CargoRow): { action: InteractionAction; text: string }[] {
    const name = this.companion().name;
    // Handing things to the companion reads as giving, not storing.
    const holding = this.nearby()?.id === this.companion().id;
    return [
      { action: row.store, text: holding ? 'Give' : 'Store' },
      { action: row.take, text: holding ? 'Take back' : 'Take' },
      { action: row.carry, text: `${name} carries` },
      { action: row.deposit, text: `${name} stores` },
    ].filter((move): move is { action: InteractionAction; text: string } => !!move.action);
  }
  protected act(action?: string): void {
    if (!this.ready() || this.paused() || this.panel()) return;
    if (this.host.state.training) {
      this.command({ type: 'training-hit' });
      return;
    }
    const interaction = this.host.interaction();
    const selected = action ?? interaction?.actions.find((entry) => !entry.disabled)?.id;
    if (interaction && selected) {
      const done = this.command({ type: 'interact', targetId: interaction.id, action: selected });
      if (done && selected === 'read-calendar') this.openPanel('calendar');
    }
  }
  /** The log toss charges while held: press on pointer down, throw on release. */
  protected pressDrill(event: PointerEvent): void {
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.act();
  }
  protected releaseDrill(): void {
    if (this.host.state.training?.kind === 'toss') this.command({ type: 'training-release' });
  }
  /** A step in one of the rhythm lanes, from a key, a controller button or the card. */
  protected stepLane(lane: number, event?: PointerEvent): void {
    event?.preventDefault();
    if (!this.ready() || this.paused() || this.panel()) return;
    this.command({ type: 'training-hit', lane });
  }
  /** Shooing a moth off the chessboard. */
  protected shooDrill(event?: PointerEvent): void {
    event?.preventDefault();
    if (!this.ready() || this.paused() || this.panel()) return;
    this.command({ type: 'training-shoo' });
  }
  /** The card's lean buttons steer the beam while held. */
  protected leanDrill(direction: number, event?: PointerEvent): void {
    if (event) (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.touchLean = direction;
  }
  /** Balance beam steering from every input: keys, controller and held buttons together. */
  private lean(): number {
    const right = this.keys.has('d') || this.keys.has('arrowright') ? 1 : 0;
    const left = this.keys.has('a') || this.keys.has('arrowleft') ? 1 : 0;
    return Math.max(-1, Math.min(1, right - left + this.padLean + this.touchLean));
  }
  /** Pointer clicks already pressed on pointer down; only a keyboard click (detail 0) acts. */
  protected clickDrill(event: MouseEvent): void {
    if (event.detail === 0) this.act();
  }
  private command(command: GameCommand): boolean {
    this.walkTo = null;
    this.host.assist = this.assist();
    const before = this.snapshot();
    const training = !!this.host.state.training;
    const working = !!this.host.state.work;
    const done = this.host.dispatch(command);
    const activity = this.host.state.training;
    if (!training && activity) {
      this.activityBaseline = this.snapshot();
      this.activityKind = activity.event ?? activity.kind;
    }
    if (!working && this.host.state.work) this.workBaseline = this.snapshot();
    if (training && !activity) this.finishActivity();
    else if (done) this.announce(before);
    if (done && command.type === 'interact') {
      if (command.action === 'pet') this.world?.react('pet');
      else if (command.action === 'feed' || command.action === 'treat') this.world?.react('eat');
    }
    if (done) this.chime();
    if (this.host.state.training) this.keys.clear();
    this.refresh();
    void this.save();
    return done;
  }
  private readonly keyDown = (event: KeyboardEvent): void => {
    if (this.panel() && event.key === 'Tab') {
      const buttons = Array.from(
        this.element.nativeElement.querySelectorAll<HTMLButtonElement>(
          '.journal-modal button:not(:disabled)',
        ),
      );
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    }
    const target = event.target as HTMLElement;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const key = event.key.toLowerCase();
    if (this.offer()) {
      const step = { arrowleft: -1, a: -1, arrowright: 1, d: 1 }[key];
      if (step) {
        event.preventDefault();
        this.zone.run(() => this.moveOfferFocus(step));
      }
      return;
    }
    if (this.beat() !== null) {
      if (target.tagName === 'BUTTON') return;
      if (!event.repeat && ['enter', ' ', 'e'].includes(key)) {
        event.preventDefault();
        this.zone.run(() => this.continueOpening());
      }
      if (!event.repeat && key === 'escape') this.zone.run(() => this.skipOpening());
      return;
    }
    // The log toss and the hurdle run own their keys, even on a focused button, so a held key
    // can charge a throw and a jump lands on the key going down.
    const held = this.host.state.training?.kind;
    // Rhythm steps take A/S/D, the arrows and J/K/L as lanes; chess takes S to shoo.
    const lane = held === 'rhythm' ? RHYTHM_KEYS[key] : undefined;
    if (lane !== undefined || (held === 'chess' && key === 's')) {
      event.preventDefault();
      if (!event.repeat)
        this.zone.run(() => (lane !== undefined ? this.stepLane(lane) : this.shooDrill()));
      return;
    }
    if (
      (held === 'toss' && [' ', 'e', 'enter'].includes(key)) ||
      (held === 'run' && [' ', 'e', 'enter', 'w', 'arrowup'].includes(key)) ||
      // Space cheers even on a focused Shoo button, and steps in the middle rhythm lane.
      ((held === 'chess' || held === 'rhythm') && [' ', 'e', 'enter'].includes(key))
    ) {
      event.preventDefault();
      if (!event.repeat) this.zone.run(() => this.act());
      return;
    }
    if (
      ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'e'].includes(
        key,
      )
    ) {
      if (target.tagName === 'BUTTON' && key === ' ') return;
      event.preventDefault();
      this.keys.add(key);
      if (!event.repeat && (key === 'e' || key === ' '))
        this.zone.run(() => {
          if (!this.holdAfterDrill()) this.act();
        });
    }
    if (!event.repeat && key === 'escape')
      this.zone.run(() => {
        if (this.panel()) this.openPanel(null);
        else this.togglePause();
      });
    if (!event.repeat && key === 'j')
      this.zone.run(() => this.openPanel(this.panel() === 'journal' ? null : 'journal'));
    if (!event.repeat && key === '`')
      this.zone.run(() => this.openPanel(this.panel() === 'developer' ? null : 'developer'));
    if (!this.panel() && ['=', '+', '-', '_'].includes(key)) {
      event.preventDefault();
      this.zoom(key === '=' || key === '+' ? -1 : 1);
    }
  };
  private readonly keyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase();
    this.keys.delete(key);
    if (this.host.state.training?.kind === 'toss' && [' ', 'e', 'enter'].includes(key)) {
      event.preventDefault();
      this.zone.run(() => this.releaseDrill());
    }
  };
  private readonly blur = (): void => {
    this.keys.clear();
    this.walkTo = null;
  };
  private readonly pageHide = (): void => {
    void this.save();
  };
  private readonly visibility = (): void => {
    this.blur();
    if (document.hidden) void this.save();
  };
  private readonly beforeInstall = (event: Event): void => {
    event.preventDefault();
    this.installPrompt = event as InstallPrompt;
    this.canInstall.set(true);
  };
  protected async install(): Promise<void> {
    await this.installPrompt?.prompt();
    this.canInstall.set(false);
  }
  protected endFade(serial: number, event: AnimationEvent): void {
    // The veil clears first; the area's title lingers a little longer.
    if (event.animationName !== 'area-title') return;
    this.fades.update((list) => list.filter((item) => item.serial !== serial));
  }
  protected toggleRail(): void {
    this.railOpen.update((open) => !open);
  }
  /** Negative steps zoom in, positive steps zoom out. */
  protected zoom(step: number): void {
    this.world?.zoomBy(step < 0 ? 0.82 : 1.22);
  }
  protected setQuality(choice: QualityChoice): void {
    this.qualityChoice.set(choice);
    storeQualityChoice(choice);
    this.world?.setQuality(choice);
    if (this.world) this.quality.set(this.world.quality);
  }
  /** Tells the camera which screen edges HUD panels cover, so the rancher stays in view. */
  private measureInsets(): void {
    const shell = this.element.nativeElement.querySelector<HTMLElement>('.game-shell');
    if (!shell || !this.world) return;
    const box = (selector: string) => shell.querySelector(selector)?.getBoundingClientRect();
    const height = window.innerHeight;
    const width = window.innerWidth;
    const top = Math.max(box('.masthead')?.bottom ?? 0, box('.day-bar')?.bottom ?? 0);
    const panels = ['.interaction-dock', '.training-card', '.result-card']
      .map((selector) => box(selector))
      .filter((rect): rect is DOMRect => !!rect && rect.height > 0);
    const covering = [box('.satchel-bar'), ...panels]
      .filter((rect): rect is DOMRect => !!rect && rect.height > 0)
      .map((rect) => rect.top);
    const bottom = height - Math.min(height, ...covering);
    const rail = box('.side-rail');
    const right =
      this.railOpen() && sidePanelLayout() && rail && rail.width > 0 ? width - rail.left : 0;
    // Results and floating controls sit just above whichever bottom panel is showing.
    const dock = Math.max(0, ...panels.map((rect) => rect.height));
    shell.style.setProperty('--dock-h', `${Math.round(dock)}px`);
    this.world.setInsets({ top, right, bottom, left: 0 });
  }
  protected togglePause(): void {
    this.paused.update((value) => !value);
    this.blur();
    void this.save();
  }
  protected openPanel(panel: Panel | null): void {
    this.panel.set(panel);
    if (panel === 'journal') this.journalTab.set('quests');
    this.resetArmed.set(false);
    this.blur();
    this.clearGamepadSelection();
    if (panel)
      setTimeout(() =>
        this.element.nativeElement
          .querySelector<HTMLButtonElement>('.journal-modal button')
          ?.focus(),
      );
  }
  protected toggleSound(): void {
    this.sound.update((value) => !value);
    if (this.sound()) this.chime();
  }
  private chime(): void {
    if (!this.sound()) return;
    this.audio ??= new AudioContext();
    void this.audio.resume();
    const oscillator = this.audio.createOscillator();
    const volume = this.audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(660, this.audio.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(880, this.audio.currentTime + 0.1);
    volume.gain.setValueAtTime(0.05, this.audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, this.audio.currentTime + 0.25);
    oscillator.connect(volume);
    volume.connect(this.audio.destination);
    oscillator.start();
    oscillator.stop(this.audio.currentTime + 0.25);
  }
  protected clock(): string {
    const minute = Math.floor(this.state().minute);
    return `${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`;
  }
  protected count(itemId: string): number {
    return backpack(this.state())
      .items.filter((item) => item.itemId === itemId)
      .reduce((total, item) => total + item.quantity, 0);
  }
  protected round(value: number): number {
    return Math.round(value);
  }
  protected completed(flag: string): boolean {
    return this.state().flags.includes(flag);
  }
  protected primaryAction(id: string): boolean {
    return this.nearby()?.actions.find((action) => !action.disabled)?.id === id;
  }
  protected blockedReason(): string {
    const actions = this.nearby()?.actions ?? [];
    return actions.every((action) => action.disabled) ? (actions[0]?.reason ?? '') : '';
  }
  protected async save(): Promise<void> {
    if (this.saveBlocked || this.beat() !== null) return;
    try {
      await this.storage.save(this.host.state);
      if (!this.destroyed) this.saveStatus.set('Your homestead is saved');
    } catch {
      this.saveStatus.set('Could not save — keep this tab open');
    }
  }
  /** A fresh game: draw its seed once, then walk to Oakhaven with Grandpa and Pip. */
  private beginOpening(): void {
    this.offerSeed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.offerCandidates = starterOffer(this.offerSeed);
    // A throwaway state to draw the scene; nothing is saved until a critter is chosen.
    this.host = new LocalGameHost();
    this.showBeat(0);
  }
  private showBeat(index: number): void {
    const beat = OPENING[index];
    this.beat.set(index);
    stageOpening(this.host.state, beat);
    if (beat.guests === 'offer') {
      this.offer.set(this.offerCandidates);
      this.focusCandidate(this.offerFocus() || this.offerCandidates[0].id);
    } else this.offer.set(null);
    this.stageWorld();
    this.refresh();
  }
  /** Shows the current beat's staging and candidates in the world, if the walk is on. */
  private stageWorld(): void {
    const beat = this.openingBeat();
    const offer = this.offerCandidates;
    this.world?.setScene(beat?.stage ?? null);
    this.world?.setGuests(
      beat?.guests === 'offer' ? offer : beat?.guests === 'mallow' ? [offer[0]] : null,
    );
    this.world?.setGuestFocus(beat?.guests === 'offer' ? this.offerFocus() : null);
  }
  protected continueOpening(): void {
    const beat = this.beat();
    if (beat !== null && beat < OFFER_BEAT) this.showBeat(beat + 1);
  }
  protected skipOpening(): void {
    if (this.beat() !== null && this.beat()! < OFFER_BEAT) this.showBeat(OFFER_BEAT);
  }
  /** Walks the rancher toward where the current beat stands them. */
  private walkOpening(dt: number): void {
    const target = OPENING[this.beat()!].player;
    const at = this.host.state.player.position;
    const gap = Math.hypot(target.x - at.x, target.z - at.z);
    if (gap < 0.02) return;
    const step = Math.min(gap, dt * 2.8);
    at.x += ((target.x - at.x) / gap) * step;
    at.z += ((target.z - at.z) / gap) * step;
  }
  protected focusCandidate(id: string): void {
    const candidate = this.offer()?.find((item) => item.id === id);
    if (!candidate) return;
    this.offerFocus.set(id);
    this.starterDraft.set(candidate.name);
    this.starterError.set('');
    this.world?.setGuestFocus(id);
  }
  private moveOfferFocus(step: number): void {
    const offer = this.offer() ?? [];
    const index = offer.findIndex((candidate) => candidate.id === this.offerFocus());
    const next = offer[(index + step + offer.length) % offer.length];
    if (!next) return;
    this.focusCandidate(next.id);
    this.element.nativeElement
      .querySelector<HTMLButtonElement>(`.offer-card[data-candidate="${next.id}"]`)
      ?.focus();
  }
  /** Takes the focused candidate home under the chosen name and starts the household. */
  protected async chooseStarter(): Promise<void> {
    const candidate = this.focusedCandidate();
    if (!candidate) return;
    const name = starterName(this.starterDraft());
    if (!name) {
      this.starterError.set('Names use letters, spaces, hyphens or apostrophes (up to 16).');
      return;
    }
    this.host = new LocalGameHost(createInitialState({ ...candidate, name }, this.offerSeed));
    this.offer.set(null);
    this.beat.set(null);
    this.world?.setScene(null);
    this.world?.setGuests(null);
    this.world?.setGuestFocus(null);
    this.farewell.set(openingFarewell(name));
    clearTimeout(this.farewellTimer);
    this.farewellTimer = window.setTimeout(() => this.farewell.set(null), 9000);
    this.baseline = null;
    this.refresh();
    await this.save();
  }
  protected debug(action: 'next-day' | 'restore'): void {
    this.command({ type: 'debug', action });
  }
  protected async reset(): Promise<void> {
    if (this.sessionBusy()) return;
    if (!this.resetArmed()) {
      this.resetArmed.set(true);
      return;
    }
    try {
      await this.storage.clear();
      this.host = new LocalGameHost();
      this.saveBlocked = false;
      this.error.set('');
      this.openPanel(null);
      this.beginOpening();
      this.refresh();
    } catch {
      this.error.set('Could not reset the save. Please check browser storage permissions.');
    }
  }
  ngOnDestroy(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.frame);
    this.world?.dispose();
    this.releaseOwnership?.();
    void this.audio?.close();
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.blur);
    window.removeEventListener('pagehide', this.pageHide);
    document.removeEventListener('visibilitychange', this.visibility);
    window.removeEventListener('beforeinstallprompt', this.beforeInstall);
    window.removeEventListener('gamepadconnected', this.controllerChange);
    window.removeEventListener('gamepaddisconnected', this.controllerChange);
  }
}
