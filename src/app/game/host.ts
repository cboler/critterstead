import {
  addItem,
  initialContainers,
  ITEM_IDS,
  MILL_MINUTES,
  productionStatus,
  quantity as containerQuantity,
  room,
  transfer,
} from './logistics';
import { backpack, satchel } from './model';
import {
  AREAS,
  BEHAVIORS,
  BERRY_NODES,
  CROP_IDS,
  CROPS,
  DRILLS,
  EXHIBITION,
  ROUTINE,
  GAME_CONFIG,
  PRODUCE_PRICES,
  initialMaterialNodes,
  initialPlots,
} from './content';
import { applyExperience, encumbrance, resolveCheck } from './checks';
import {
  calendarDate,
  capitalize,
  DAYS_PER_SEASON,
  formatDate,
  nextDawn,
  SEASONS,
  upcomingEvents,
  weatherFor,
} from './calendar';
import { advanceGarden, plotReady } from './garden';
import { MALLOW, StarterCandidate } from './families';
import {
  createPip,
  GRANDPA,
  grandpaSays,
  grandpaWhereabouts,
  PIP_ID,
  PIP_PICKS,
  pipNextPick,
  pipWhereabouts,
  Whereabouts,
} from './household';
import { nextObjective } from './objectives';
import {
  drillMultiplier,
  liftScore,
  paceScore,
  push,
  recordDrill,
  startGauge,
  startToss,
  stepLift,
  stepPace,
  stepToss,
  sweepAccuracy,
  throwDistance,
  throwLog,
  TOSS_HOLD,
} from './drills';
import {
  activeCritter,
  BehaviorDefinition,
  BehaviorStage,
  Blocker,
  CropId,
  Critter,
  Drill,
  Container,
  GameCommand,
  GameState,
  Interaction,
  InteractionAction,
  InventoryItem,
  Point,
  ResourceNode,
  SoilPlot,
  Training,
} from './model';

const RESIDENT_REACH = 1.4;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const COTTAGE_COMPANION_SPOT: Point = { x: 0.5, z: 3.4 };
// The rancher keeps this much space from anything solid.
const BODY_RADIUS = 0.3;

/** Distance from a point to a blocker's edge; negative inside it. */
function clearance(point: Point, blocker: Blocker): number {
  if ('r' in blocker) return distance(point, blocker) - blocker.r;
  const dx = Math.abs(point.x - blocker.x) - blocker.hx;
  const dz = Math.abs(point.z - blocker.z) - blocker.hz;
  return dx > 0 || dz > 0 ? Math.hypot(Math.max(dx, 0), Math.max(dz, 0)) : Math.max(dx, dz);
}

/** The drill an activity belongs to; the Clover Cup and the exhibition are events. */
export function drillOf({ kind, drill }: Pick<Training, 'kind' | 'drill'>): Drill | null {
  if (kind === 'routine') return drill ?? null;
  return kind === 'training' ? 'hoops' : kind === 'race' || kind === 'exhibition' ? null : kind;
}
const ROUTES: Record<GameState['areaId'], { label: string; description: string; arrival: string }> =
  {
    homestead: {
      label: 'Return to Bramblewick',
      description: 'A cozy nook and a familiar garden are just down the path.',
      arrival:
        'Home again. The honesty stall takes berries, and {name}’s nook could use some love.',
    },
    glade: {
      label: 'Explore Clover Glade',
      description: 'Follow the path with {name}. There are sunberries waiting beyond the fence.',
      arrival: 'Clover Glade smells of warm grass and sunberries. {name}’s ears perk up.',
    },
    town: {
      label: 'Walk to Oakhaven',
      description: 'The lane west of the yard winds down into town.',
      arrival: 'Oakhaven bustles around its square. {name} sticks close to your heels.',
    },
    colosseum: {
      label: 'Walk to the Colosseum',
      description:
        'Past the edge of town, half-built stands full of neighbours who love a good show.',
      arrival: 'Banners, half-built stands, and a cheerful crowd. {name} stands a little taller.',
    },
    cottage: { label: '', description: '', arrival: '' },
  };
const ITEM_LABELS: Partial<Record<InventoryItem['itemId'], string>> = {
  turnip: 'turnips',
  berry: 'sunberries',
};
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

export function learnedStage(critter: Critter, behavior: BehaviorDefinition): BehaviorStage {
  const progress = critter.learnedBehaviors[behavior.id] ?? 0;
  return behavior.stages.reduce((current, stage) =>
    progress >= stage.threshold ? stage : current,
  );
}

const foraging = BEHAVIORS['sunberry-foraging'];
const hauling = BEHAVIORS['lumber-hauling'];

/** A new household with its chosen first companion and the seed its offer was drawn from. */
export function createInitialState(starter: StarterCandidate = MALLOW, seed = 240921): GameState {
  return {
    version: 11,
    seed,
    day: 1,
    minute: 480,
    totalMinutes: 480,
    areaId: 'homestead',
    areaInstanceId: 'local-homestead',
    player: {
      id: 'player-local',
      position: { x: 0, z: 0 },
      stamina: 100,
      coins: 6,
      stats: { strength: 5, endurance: 5, speed: 4, intelligence: 5 },
      skills: { woodcutting: 1, mining: 1, hauling: 1, foraging: 1, farming: 1 },
    },
    materialNodes: initialMaterialNodes(),
    groundCargo: [],
    work: null,
    activeCritterId: starter.id,
    critters: [
      {
        id: starter.id,
        name: starter.name,
        ownerId: 'player-local',
        lastPettedDay: null,
        speciesId: starter.speciesId,
        ageDays: 18,
        sex: starter.sex,
        personality: starter.personality,
        position: { x: -1, z: 0.6 },
        stats: { ...starter.stats },
        stamina: 100,
        health: 100,
        happiness: 70,
        bond: 20,
        hunger: 35,
        learnedBehaviors: {},
        hauling: { enabled: false, phase: 'idle', cued: false },
        drills: { day: 1, sessions: {} },
        practised: {},
        skills: { harvesting: 0, racing: 0 },
        visualTraits: { ...starter.visualTraits },
        pedigree: { parentIds: [] },
        genetics: { ...starter.genetics },
        history: ['Day 1: A new home at Bramblewick Yard.'],
        competitions: [],
      },
      createPip(1),
    ],
    containers: initialContainers(
      'player-local',
      starter.id,
      [
        { id: 'stack-feed-1', itemId: 'feed', quantity: 4, quality: 1 },
        { id: 'stack-seed-1', itemId: 'seed', quantity: 3, quality: 1 },
      ],
      [starter.id, PIP_ID],
    ),
    production: { progressMinutes: 0 },
    haulLesson: null,
    resources: BERRY_NODES.map((node) => ({
      ...node,
      position: { ...node.position },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    })),
    plots: initialPlots(),
    companionIndoors: false,
    shedLevel: 0,
    flags: [],
    journal: [
      `Morning at Bramblewick. Grandpa is already up: “${starter.name} will be hungry after yesterday. Say good morning, then see about some feed.”`,
    ],
    training: null,
  };
}

/** How practice, intelligence and bond shape a companion's own sunberry harvests. */
export function forageYield(critter: Critter): { bonusChance: number; quality: number } {
  return {
    bonusChance: Math.min(0.75, critter.skills.harvesting / 20 + critter.stats.intelligence / 40),
    quality: Math.min(
      3,
      1 +
        Math.floor(
          (critter.skills.harvesting + critter.stats.intelligence * 0.5 + critter.bond / 20) / 8,
        ),
    ),
  };
}

/** Speed above the starting 4 and hauling practice quicken a working companion, up to +50%. */
export function haulingPace(critter: Critter): number {
  return (
    1 +
    Math.min(
      0.5,
      Math.max(0, critter.stats.speed - 4) * 0.03 + (critter.skills['hauling'] ?? 0) * 0.02,
    )
  );
}

/** The sole owner of game rules. Rendering and persistence consume its state. */
export class LocalGameHost {
  private readonly current: GameState;

  /** Wider timing windows: a device preference, fixed into each activity as it starts. */
  assist = false;

  constructor(state: GameState = createInitialState()) {
    this.current = structuredClone(state);
  }

  get state(): GameState {
    return this.current;
  }

  get critter(): Critter {
    return activeCritter(this.state);
  }

  learning() {
    const critter = this.critter;
    const stage = learnedStage(critter, foraging);
    const opportunity = this.berryOpportunity();
    const cueNode = this.state.resources
      .filter((node) => node.areaId === this.state.areaId && this.inReach(node.id))
      .sort(
        (a, b) =>
          distance(a.position, this.state.player.position) -
          distance(b.position, this.state.player.position),
      )[0];
    const reason = this.berryWorkReason('autonomous');
    const earned = forageYield(critter);
    return {
      name: foraging.name,
      label: stage.label,
      effect:
        stage.id === 'cued' || stage.id === 'autonomous'
          ? `Finds a third berry ${Math.round(earned.bonusChance * 100)}% of the time; berry quality ${earned.quality} of 3. Practice, intelligence and bond raise both.`
          : `Once ${critter.name} gathers, practice, intelligence and bond raise the yield and quality.`,
      progress: critter.learnedBehaviors[foraging.id] ?? 0,
      goal: foraging.stages[foraging.stages.length - 1].threshold,
      hint: stage.hint.replaceAll('{name}', critter.name),
      status:
        stage.id !== 'autonomous'
          ? this.state.training
            ? `${critter.name} is busy with the current activity.`
            : stage.id === 'cued'
              ? (this.berryWorkReason('command', cueNode) ??
                (cueNode
                  ? 'Ready for your cue at this ripe bush.'
                  : 'Walk up to a ripe sunberry bush to give a cue.'))
              : `Gather sunberries nearby so ${critter.name} can watch.`
          : (reason ??
            (opportunity
              ? `${critter.name} spots ripe sunberries. Each harvest uses ${GAME_CONFIG.berryEnergy} energy; keeps ${GAME_CONFIG.autonomousEnergyReserve} in reserve.`
              : this.state.areaId !== 'glade'
                ? 'Find ripe sunberries together in Clover Glade.'
                : 'No ripe bush nearby. Walk closer or wait for regrowth.')),
    };
  }

  haulingLearning() {
    const critter = this.critter;
    const job = critter.hauling;
    const stage = learnedStage(critter, hauling);
    const output = this.state.containers.find((item) => item.kind === 'mill-output')!;
    const chest = this.state.containers.find((item) => item.kind === 'chest')!;
    const status =
      this.state.areaId === 'glade'
        ? 'Hauling waits while you explore together.'
        : this.state.areaId === 'cottage' && this.state.companionIndoors
          ? `${critter.name} keeps you company indoors.`
          : this.state.training
            ? 'Work pauses for your activity together.'
            : job.phase === 'eat'
              ? containerQuantity(
                  this.state.containers.find((item) => item.kind === 'trough')!,
                  'feed',
                )
                ? 'Heading to the trough for a meal.'
                : 'The trough is empty. Bring feed so work can resume.'
              : job.phase === 'rest'
                ? 'Taking a break at the nook; work resumes at 50 energy.'
                : job.phase === 'deliver'
                  ? room(chest, 'lumber')
                    ? 'Carrying a board to the yard chest.'
                    : 'The chest is full. Make room; the board stays in the satchel.'
                  : job.phase === 'collect'
                    ? 'Walking to the mill output crate.'
                    : job.enabled
                      ? room(chest, 'lumber') < 1
                        ? 'The yard chest is full.'
                        : containerQuantity(output, 'lumber')
                          ? 'Looking for the next board.'
                          : 'Waiting for lumber. Supply the mill with timber.'
                      : stage.id === 'autonomous'
                        ? 'Following you. Enable hauling at the mill or chest.'
                        : stage.hint.replaceAll('{name}', critter.name);
    const pace = Math.round((haulingPace(critter) - 1) * 100);
    return {
      name: hauling.name,
      label: stage.label,
      effect:
        stage.id === 'cued' || stage.id === 'autonomous'
          ? `Hauls ${pace}% faster than at first. Speed and hauling practice quicken the route; strength lightens the load.`
          : `Once ${critter.name} hauls, speed and practice quicken the route.`,
      progress: critter.learnedBehaviors[hauling.id] ?? 0,
      goal: 6,
      status,
      enabled: job.enabled,
    };
  }

  private haulingActions(): InteractionAction[] {
    const job = this.critter.hauling;
    const stage = learnedStage(this.critter, hauling).id;
    const output = this.state.containers.find((item) => item.kind === 'mill-output')!;
    const reason =
      this.state.areaId !== 'homestead'
        ? 'Return to the yard for a hauling lesson.'
        : stage !== 'cued' && stage !== 'autonomous'
          ? 'Show two complete mill-to-chest deliveries first.'
          : job.cued || job.enabled
            ? 'Already helping. Ask to follow to pause work.'
            : containerQuantity(satchel(this.state), 'lumber')
              ? 'Store the carried lumber before starting a new lesson.'
              : !containerQuantity(output, 'lumber')
                ? 'The mill output has no lumber yet.'
                : this.critter.stamina < 8 || this.critter.hunger > 80
                  ? 'Offer food or rest together before a hauling lesson.'
                  : this.state.player.stamina < 2
                    ? 'You need 2 energy for a cue.'
                    : undefined;
    return [
      {
        id: 'cue-haul',
        label: `Ask ${this.critter.name} to haul a board · 2 your energy`,
        disabled: !!reason,
        reason,
      },
      ...(stage === 'autonomous' || job.cued
        ? [
            {
              id: 'toggle-hauling',
              label:
                job.enabled || job.cued ? 'Follow me · pause hauling' : 'Haul lumber independently',
              ...(this.state.areaId !== 'homestead' && !job.enabled && !job.cued
                ? { disabled: true, reason: 'Return to the yard to start hauling.' }
                : {}),
            },
          ]
        : []),
    ];
  }

  private berryWorkReason(mode: 'command' | 'autonomous', node?: ResourceNode): string | undefined {
    const critter = this.critter;
    const stage = learnedStage(critter, foraging).id;
    if (this.state.training) return `${critter.name} is busy with the current activity.`;
    if (
      encumbrance(critter, [
        ...satchel(this.state).items,
        { id: 'preview', itemId: 'berry', quantity: 3, quality: 1 },
      ]).speed === 0
    )
      return `${critter.name}'s satchel is too heavy. Take some cargo before more work.`;
    if (node && (!node.available || node.areaId !== this.state.areaId))
      return 'These berries are growing back.';
    if (stage !== 'cued' && stage !== 'autonomous')
      return `Let ${critter.name} watch you harvest ${foraging.stages.find((stage) => stage.id === 'cued')!.threshold} times.`;
    if (mode === 'autonomous' && stage !== 'autonomous') return 'Keep practicing with cues.';
    if (mode === 'autonomous' && critter.bond < 20)
      return `${critter.name} needs 20 bond to forage independently. Spend some time together.`;
    if (critter.hunger > 80) return `Feed ${critter.name} before asking for more work.`;
    if (mode === 'command' && node && distance(critter.position, node.position) > 5)
      return `Wait for ${critter.name} to catch up.`;
    if (mode === 'command' && this.state.player.stamina < 2)
      return 'You need some rest. Rest together at the nook.';
    if (critter.stamina < GAME_CONFIG.berryEnergy)
      return `${critter.name} needs some rest (${GAME_CONFIG.berryEnergy} energy to gather). Rest together at the nook or offer food.`;
    if (
      mode === 'autonomous' &&
      critter.stamina < GAME_CONFIG.berryEnergy + GAME_CONFIG.autonomousEnergyReserve
    )
      return `${critter.name} is keeping ${GAME_CONFIG.autonomousEnergyReserve} energy in reserve. Gather yourself, give a cue, or rest together at the nook.`;
    return undefined;
  }

  private berryOpportunity(): ResourceNode | undefined {
    if (this.berryWorkReason('autonomous')) return undefined;
    return this.state.resources
      .filter(
        (node) =>
          node.areaId === this.state.areaId &&
          node.available &&
          distance(node.position, this.state.player.position) < 4.3,
      )
      .sort(
        (a, b) =>
          distance(a.position, this.critter.position) - distance(b.position, this.critter.position),
      )[0];
  }

  dispatch(command: GameCommand): boolean {
    if (command.type === 'debug') {
      if (command.action === 'next-day') this.sleep();
      else if (command.action === 'restore') {
        this.state.player.stamina = 100;
        this.critter.stamina = 100;
        this.note('Developer: restored stamina.');
      } else return false;
      return true;
    }
    if (command.type === 'training-hit') return this.trainingHit();
    if (command.type === 'training-release') return this.trainingRelease();
    if (this.state.training || this.state.work) return false;
    if (command.type === 'drop-cargo') return this.dropCargo();
    if (command.type === 'move') return this.move(command.x, command.z, command.seconds);
    if (command.action === 'drop-cargo') return this.dropCargo();
    const interaction = this.describe(command.targetId);
    if (!interaction || !this.inReach(command.targetId)) return false;
    const action = interaction.actions.find((item) => item.id === command.action);
    if (!action || action.disabled) return false;
    return this.interact(command.targetId, command.action);
  }

  update(seconds: number): void {
    if (!Number.isFinite(seconds) || seconds <= 0) return;
    // Background tabs pause rather than charging the player for missed frames.
    const dt = Math.min(seconds, 1);
    this.advanceMinutes((dt * 1440) / GAME_CONFIG.realSecondsPerDay);
    if (this.state.training) {
      const training = this.state.training;
      training.elapsed += dt;
      if (training.kind === 'routine') {
        if (training.elapsed >= ROUTINE.seconds) this.finishTraining();
      } else if (training.kind === 'toss') {
        if (stepToss(training)) this.finishTraining();
      } else if (this.gauge(training)) {
        const done =
          training.kind === 'pace'
            ? stepPace(training, this.critter, dt)
            : stepLift(training, this.critter, dt, training.kind === 'exhibition');
        if (done) this.finishTraining();
      } else {
        const cycle = (training.elapsed * (training.kind === 'training' ? 0.72 : 0.9)) % 2;
        training.phase = cycle <= 1 ? cycle : 2 - cycle;
      }
    }
    if (this.state.work) {
      this.state.work.remainingSeconds = Math.max(0, this.state.work.remainingSeconds - dt);
      if (this.state.work.remainingSeconds === 0) this.finishWork();
    }
    this.companion(dt);
  }

  interaction(): Interaction | null {
    const target = this.nearestInteraction();
    if (
      !this.state.work &&
      !this.state.training &&
      backpack(this.state).items.some((item) => ['timber', 'stone', 'lumber'].includes(item.itemId))
    ) {
      const dock = target ?? {
        id: this.state.player.id,
        title: 'Carrying materials',
        description: 'Set cargo down to lighten your load.',
        actions: [],
      };
      dock.actions.push({ id: 'drop-cargo', label: 'Set cargo down' });
      return dock;
    }
    return target;
  }

  private nearestInteraction(): Interaction | null {
    if (this.state.work)
      return {
        id: this.state.work.nodeId,
        title: 'A steady swing…',
        description: 'Working the material. The paid action will finish here, even after a reload.',
        actions: [],
      };
    if (this.state.training) return null;
    const state = this.state;
    const candidates = [
      ...AREAS[state.areaId].objects.map((object) => ({
        id: object.id,
        position: object.position,
      })),
      ...state.resources.filter((node) => node.areaId === state.areaId),
      ...state.materialNodes.filter((node) => node.areaId === state.areaId),
      ...(state.areaId === 'homestead' ? state.plots : []),
      ...state.groundCargo.filter((pile) => pile.areaId === state.areaId && pile.items.length),
      ...state.containers
        .filter(
          (container) =>
            'areaId' in container.location && container.location.areaId === state.areaId,
        )
        .map((container) => ({ id: container.id, position: this.containerPosition(container) })),
      ...this.residents(),
    ].filter((target) => this.inReach(target.id));
    candidates.sort(
      (a, b) =>
        distance(a.position, state.player.position) - distance(b.position, state.player.position),
    );
    // Give scenery precedence so a faithfully following companion never blocks a station.
    if (candidates.length) return this.describe(candidates[0].id);
    return this.inReach(activeCritter(state).id) ? this.describe(activeCritter(state).id) : null;
  }

  private inReach(id: string): boolean {
    const state = this.state;
    const resident = this.residents().find((item) => item.id === id);
    // Walk right up to Grandpa or Pip; from farther off, your own companion keeps the dock.
    if (resident)
      return (
        resident.areaId === state.areaId &&
        distance(resident.position, state.player.position) <= RESIDENT_REACH
      );
    const container = state.containers.find((item) => item.id === id);
    if (container)
      return (
        this.containerLocal(container) &&
        distance(this.containerPosition(container), state.player.position) <=
          GAME_CONFIG.interactionDistance
      );
    const object = AREAS[state.areaId].objects.find((item) => item.id === id);
    if (object) {
      const reach =
        object.kind === 'house' || object.kind === 'shed'
          ? object.radius + 1.2
          : GAME_CONFIG.interactionDistance;
      return distance(object.position, state.player.position) <= reach;
    }
    if (id === activeCritter(state).id)
      return (
        this.companionHere() &&
        distance(activeCritter(state).position, state.player.position) <=
          GAME_CONFIG.interactionDistance
      );
    const plot = state.plots.find((item) => item.id === id);
    if (plot)
      return (
        state.areaId === 'homestead' &&
        distance(plot.position, state.player.position) <= GAME_CONFIG.interactionDistance
      );
    const node = [...state.resources, ...state.materialNodes, ...state.groundCargo].find(
      (item) => item.id === id && item.areaId === state.areaId,
    );
    return (
      !!node && distance(node.position, state.player.position) <= GAME_CONFIG.interactionDistance
    );
  }

  private describe(id: string): Interaction | null {
    const state = this.state;
    const critter = activeCritter(state);
    const action = (id: string, label: string, reason?: string): InteractionAction => ({
      id,
      label,
      disabled: !!reason,
      reason,
    });
    const energy = (player: number, companion = 0) =>
      state.player.stamina < player
        ? 'You need some rest. Rest together at the nook.'
        : critter.stamina < companion
          ? `${critter.name} needs some rest. Rest together at the nook or offer food.`
          : undefined;
    const resident = this.residents().find((item) => item.id === id);
    if (resident?.id === GRANDPA.id)
      return {
        id,
        title: GRANDPA.name,
        description: resident.activity,
        actions: [action('talk', 'Talk with Grandpa · 5 min')],
      };
    if (resident)
      return {
        id,
        title: 'Pip',
        description: `${resident.activity} Grandpa's Brindlekin, older than anyone can quite say.`,
        actions: [
          action(
            'greet-pip',
            'Scratch Pip behind the ears',
            state.flags.includes('greeted-pip-today')
              ? 'Pip has had his fuss for today. He will remember you tomorrow.'
              : undefined,
          ),
        ],
      };
    if (id === critter.id)
      return {
        id,
        title: `A moment with ${critter.name}`,
        description: `Hunger ${Math.round(critter.hunger)}/100. Feed eases hunger by up to 35 and restores up to 10 energy; a berry eases 15 and restores up to 3. Both build bond.`,
        actions: [
          action(
            'pet',
            'Give a little scritch · 5 min',
            critter.lastPettedDay === state.day
              ? `${critter.name} has had today’s scritches.`
              : undefined,
          ),
          action(
            'feed',
            'Offer feed · 1 feed · 5 min',
            this.quantity('feed') < 1
              ? 'Grow feed in your garden or buy it at the stall.'
              : critter.hunger < 10
                ? `${critter.name} is comfortably full.`
                : undefined,
          ),
          action(
            'treat',
            'Berry treat · 1 berry · 5 min',
            this.quantity('berry') < 1
              ? 'Gather a berry in Clover Glade.'
              : critter.hunger < 10
                ? `${critter.name} is comfortably full.`
                : undefined,
          ),
          ...this.containerActions(satchel(state)),
          ...this.haulingActions(),
        ],
      };
    const container = state.containers.find((item) => item.id === id);
    if (container)
      return {
        id,
        title:
          container.kind === 'chest'
            ? 'Wooden yard chest'
            : container.kind === 'trough'
              ? 'Feed trough'
              : container.kind === 'mill-input'
                ? 'Yard sawmill · input hopper'
                : 'Sawmill · output crate',
        description: `${container.items.length ? container.items.map((item) => `${item.quantity} ${item.itemId}`).join(' · ') : 'Empty'} · ${containerQuantity(container)}/${container.capacity ?? '—'} units. ${container.kind.startsWith('mill') ? productionStatus(state.containers) : 'Supplies stay here until someone carries them.'}`,
        actions: [
          ...this.containerActions(container),
          ...(container.kind === 'mill-output' || container.kind === 'chest'
            ? this.haulingActions()
            : []),
        ],
      };
    const material = state.materialNodes.find(
      (item) => item.id === id && item.areaId === state.areaId,
    );
    if (material) {
      const skill = material.kind === 'timber' ? 'woodcutting' : 'mining';
      const result = this.materialCheck(material.kind);
      return {
        id,
        title:
          material.kind === 'timber'
            ? 'Fallen timber · starter axe'
            : 'Quarry boulder · starter pick',
        description:
          material.remaining > 0
            ? `Resistance ${material.remaining}/6. ${skill} ${state.player.skills[skill].toFixed(2)} · ${result.damage} damage per swing. Finished bundles weigh ${material.kind === 'timber' ? 8 : 12} kg each.`
            : 'Worked clean. More material will be available tomorrow.',
        actions: [
          action(
            'work-material',
            `${material.kind === 'timber' ? 'Chop timber' : 'Crack stone'} · ${result.staminaCost} energy · ${result.timeMinutes} min`,
            material.remaining <= 0 ? 'Return tomorrow.' : energy(result.staminaCost),
          ),
        ],
      };
    }
    const pile = state.groundCargo.find((item) => item.id === id && item.areaId === state.areaId);
    if (pile)
      return {
        id,
        title: 'Cargo on the ground',
        description: pile.items.map((item) => `${item.quantity} ${item.itemId}`).join(' · '),
        actions: [
          action('pickup-cargo', 'Pick up cargo', pile.items.length ? undefined : 'Nothing here.'),
        ],
      };
    const node = state.resources.find((item) => item.id === id && item.areaId === state.areaId);
    if (node)
      return {
        id,
        title: 'Sunberry bush',
        description: node.available
          ? `${foraging.name}: ${this.learning().label}. ${this.learning().hint} ${distance(critter.position, node.position) < 5 ? `${critter.name} is close enough to watch.` : `Wait for ${critter.name} to catch up to watch.`}`
          : `Picked clean. Fresh berries in ${Math.max(1, Math.ceil(node.respawnAt - state.totalMinutes))} game minutes.`,
        actions: [
          action(
            'gather',
            'Gather · 6 your energy · 15 min',
            !node.available ? 'These berries are growing back.' : energy(6),
          ),
          action(
            'critter-gather',
            `Ask ${critter.name} to gather · ${GAME_CONFIG.berryEnergy} their energy · 2 yours · 20 min`,
            this.berryWorkReason('command', node),
          ),
        ],
      };
    const plot = state.plots.find((item) => item.id === id);
    if (plot) return state.areaId === 'homestead' ? this.describePlot(plot) : null;
    const object = AREAS[state.areaId].objects.find((item) => item.id === id);
    if (!object) return null;
    const sleep = action('sleep', 'Turn in for the night · tomorrow 8:00');
    const sleepCopy =
      'Sleep restores both energies to 100 at 8:00 tomorrow; hunger carries over. For daytime recovery, rest together at the nook.';
    switch (object.kind) {
      case 'house':
        return {
          id,
          title: 'Your little cottage',
          description: `Step inside for the hearth and the wall calendar. ${sleepCopy}`,
          actions: [action('enter', 'Step inside · 1 min'), sleep],
        };
      case 'door':
        return {
          id,
          title: 'Cottage door',
          description: this.companionHere()
            ? `${critter.name} will follow you back out.`
            : `${critter.name} is still working out in the yard.`,
          actions: [action('leave', 'Back out to the yard · 1 min')],
        };
      case 'bed':
        return { id, title: 'Your quilted bed', description: sleepCopy, actions: [sleep] };
      case 'calendar': {
        const next = upcomingEvents(state)[0];
        return {
          id,
          title: 'Wall calendar',
          description: `Today is ${formatDate(state.day)} · ${weatherFor(state.day)}. ${next ? `Next: ${next.label} (${formatDate(next.day)}).` : 'A quiet stretch of days ahead.'}`,
          actions: [action('read-calendar', 'Read the calendar')],
        };
      }
      case 'notices':
        return {
          id,
          title: 'Oakhaven notice board',
          description: `${formatDate(state.day)} · ${weatherFor(state.day)}. The Colosseum grounds, just west of the square, hold an exhibition every day. ${
            critter.competitions.some(
              (entry) => entry.event === 'exhibition' && entry.day === state.day,
            )
              ? `Someone has pinned up today's results; ${critter.name} is on them.`
              : 'Any rancher with a companion may enter.'
          }`,
          actions: [],
        };
      case 'hearth':
        return {
          id,
          title: 'Stone hearth',
          description:
            'A small fire keeps the cottage warm. Cooking and appliances arrive as the house grows.',
          actions: [],
        };
      case 'counter':
        return {
          id,
          title: 'Kitchen counter',
          description: 'A kettle, a bread board, and seed packets waiting for the right season.',
          actions: [],
        };
      case 'shed':
        return {
          id,
          title: state.shedLevel ? 'A proper snug little nook' : `${critter.name}’s weathered nook`,
          description:
            'Rest costs time, not supplies. Hunger rises and crops grow; daily activities stay used. A cozy roof brings happier mornings.',
          actions: [
            action(
              'rest',
              `Rest together · ${GAME_CONFIG.restMinutes} min · +${Math.min(GAME_CONFIG.restPlayerEnergy, Math.round(100 - state.player.stamina))} your energy · +${Math.min(GAME_CONFIG.restCritterEnergy, Math.round(100 - critter.stamina))} ${critter.name}`,
              state.minute + GAME_CONFIG.restMinutes >= 1440
                ? 'Too late for a full break today. Turn in for the night.'
                : state.player.stamina >= 100 && critter.stamina >= 100
                  ? 'You are both full of energy.'
                  : undefined,
            ),
            action(
              'upgrade',
              'Make it cozy · 12 coins · 60 min',
              state.shedLevel
                ? 'The cozy nook is already complete.'
                : state.player.coins < GAME_CONFIG.shedCost
                  ? `Save ${GAME_CONFIG.shedCost - state.player.coins} more coins. Sell berries at the stall.`
                  : undefined,
            ),
          ],
        };
      case 'training':
        return {
          id,
          title: 'A little practice, a little progress',
          description: `Three encouraging cues. Tap near the center. Happiness, bond, a full tummy, timing, and endurance improve speed gains. Energy is spent when you start. ${this.drillCopy('hoops')}`,
          actions: [
            action(
              'train',
              `Practice hoops · ${GAME_CONFIG.practiceEnergy} ${critter.name} energy · 5 yours · 40 min + cues${this.gainSuffix('hoops')}`,
              critter.hunger > 80
                ? `${critter.name} is too hungry to concentrate.`
                : energy(5, GAME_CONFIG.practiceEnergy),
            ),
            this.routineAction('hoops'),
          ],
        };
      case 'market':
        return {
          id,
          title: 'The honesty stall',
          description: `${this.quantity('berry')} berries, ${this.quantity('turnip')} turnips, ${this.quantity('wheat')} wheat in your basket. Better harvests earn better prices. Seeds only grow in their seasons.`,
          actions: [
            action(
              'sell',
              `Sell berries · ${this.berryValue()} coins · 5 min`,
              !this.berryValue()
                ? 'Bring berries in your backpack or your nearby companion’s satchel.'
                : undefined,
            ),
            action(
              'sell-produce',
              `Sell garden produce · ${this.produceValue()} coins · 5 min`,
              !this.produceValue() ? 'Harvest turnips or wheat from the garden first.' : undefined,
            ),
            action(
              'buy-feed',
              'Buy feed · 2 coins',
              state.player.coins < 2 ? 'You need 2 coins.' : undefined,
            ),
            action(
              'buy-seed',
              'Buy feed seeds · 1 coin',
              state.player.coins < 1 ? 'You need 1 coin.' : undefined,
            ),
            ...(['turnip', 'wheat', 'sunberry'] as CropId[]).map((cropId) => {
              const crop = CROPS[cropId];
              return action(
                `buy-crop:${cropId}`,
                `Buy ${crop.seedLabel}s · ${crop.seedPrice} coins · ${crop.seasons.join(' & ')}`,
                state.player.coins < crop.seedPrice
                  ? `You need ${crop.seedPrice} coins.`
                  : undefined,
              );
            }),
          ],
        };
      case 'gate': {
        const route = ROUTES[object.destination!];
        return {
          id,
          title: object.name,
          description: route.description.replaceAll('{name}', critter.name),
          actions: [
            action(
              'travel',
              `${state.areaId === 'colosseum' ? 'Back to Oakhaven' : route.label} · ${this.travelMinutes(object.destination!)} min`,
            ),
          ],
        };
      }
      case 'lift':
      case 'pace':
      case 'toss': {
        const drill = DRILLS[object.kind];
        return {
          id,
          title: object.name,
          description: `${
            {
              lift: 'Tap to push the force gauge up; the boulder pushes it back down. Hold it in the green for three seconds. Builds strength.',
              pace: 'Tap to set the pace. Faster laps spend breath; run dry and you are winded. Builds endurance and a little speed.',
              toss: 'Hold to charge the throw and let go at the peak, or tap once to start and again to throw. Three throws; strength widens the sweet spot. Builds strength and a little speed.',
            }[object.kind]
          } ${this.drillCopy(object.kind)}`,
          actions: [
            action(
              object.kind,
              `${drill.name} · ${drill.energy} ${critter.name} energy · 5 yours · ${drill.minutes} min${this.gainSuffix(object.kind)}`,
              critter.hunger > 80
                ? `${critter.name} is too hungry to concentrate.`
                : energy(5, drill.energy),
            ),
            this.routineAction(object.kind),
          ],
        };
      }
      case 'exhibition':
        return {
          id,
          title: 'Athletic exhibition',
          description: `One showing a day: a timed sprint, then a heavy stone pull. Speed and strength count as much as your timing. Gold needs ${EXHIBITION.gold} points, silver ${EXHIBITION.silver}.`,
          actions: [
            action(
              'exhibit',
              `Enter the exhibition · ${EXHIBITION.energy} ${critter.name} energy · 5 yours · ${EXHIBITION.minutes} min`,
              critter.competitions.some(
                (result) => result.day === state.day && result.event === 'exhibition',
              )
                ? 'Today’s exhibition is done. The crowd will be back tomorrow.'
                : critter.hunger > 80
                  ? `${critter.name} needs a meal before performing.`
                  : energy(5, EXHIBITION.energy),
            ),
          ],
        };
      case 'race':
        return {
          id,
          title: 'The Clover Cup',
          description: `One friendly time trial each day. Speed, endurance, timing, happiness, bond, and a full tummy improve the result. Energy is spent when you start.`,
          actions: [
            action(
              'race',
              `Run the trial · ${GAME_CONFIG.trialEnergy} ${critter.name} energy · 5 yours · 45 min + cues`,
              critter.competitions.some((result) => result.day === state.day && !result.event)
                ? 'Today’s trial is complete. Come back tomorrow.'
                : critter.hunger > 80
                  ? `${critter.name} needs a meal before racing.`
                  : energy(5, GAME_CONFIG.trialEnergy),
            ),
          ],
        };
    }
  }

  private interact(id: string, action: string): boolean {
    const state = this.state;
    const critter = activeCritter(state);
    if (action.startsWith('transfer:')) {
      const [, sourceId, destinationId, itemId] = action.split(':');
      const source = state.containers.find((container) => container.id === sourceId)!;
      const destination = state.containers.find((container) => container.id === destinationId)!;
      if (!transfer(source, destination, itemId as InventoryItem['itemId'])) return false;
      if (itemId === 'lumber') {
        if (
          source.kind === 'mill-output' &&
          destination === backpack(state) &&
          distance(critter.position, this.containerPosition(source)) <= 4
        ) {
          state.haulLesson = { critterId: critter.id, lumber: (state.haulLesson?.lumber ?? 0) + 1 };
          this.note(
            `${critter.name} watches you lift lumber. Carry it to the yard chest to show the whole route.`,
          );
        } else if (source === backpack(state) && state.haulLesson) {
          if (
            destination.kind === 'chest' &&
            distance(critter.position, this.containerPosition(destination)) <= 4 &&
            state.haulLesson.critterId === critter.id
          ) {
            this.learn(hauling, 'observation');
            state.haulLesson = null;
            this.flag('moved-cargo');
            return true;
          } else if (--state.haulLesson.lumber <= 0) state.haulLesson = null;
        }
        if (
          source === satchel(state) &&
          !containerQuantity(source, 'lumber') &&
          critter.hauling.phase === 'deliver'
        ) {
          critter.hauling.phase = 'idle';
          critter.hauling.cued = false;
        }
      }
      this.note(`${itemId} carried from ${source.kind} to ${destination.kind}.`);
      this.flag('moved-cargo');
      return true;
    }
    const plot = state.plots.find((item) => item.id === id);
    if (plot) return this.tend(plot, action);
    if (action.startsWith('buy-crop:')) {
      const crop = CROPS[action.slice('buy-crop:'.length) as CropId];
      state.player.coins -= crop.seedPrice;
      this.add(crop.seedItem, 1);
      this.note(`One packet of ${crop.seedLabel}s. They grow in ${crop.seasons.join(' and ')}.`);
      return true;
    }
    switch (action) {
      case 'enter': {
        const working = critter.hauling.enabled || critter.hauling.cued;
        state.areaId = 'cottage';
        state.areaInstanceId = 'local-cottage';
        state.player.position = { ...AREAS.cottage.spawn };
        state.companionIndoors = !working;
        if (!working) critter.position = { ...COTTAGE_COMPANION_SPOT };
        this.advanceMinutes(1);
        this.flag('visited-cottage');
        this.note(
          working
            ? `You step inside. ${critter.name} keeps hauling out in the yard.`
            : `${critter.name} pads in after you and sniffs toward the hearth.`,
        );
        return true;
      }
      case 'leave':
        state.areaId = 'homestead';
        state.areaInstanceId = 'local-homestead';
        state.player.position = { x: -4.45, z: -1.5 };
        if (state.companionIndoors) critter.position = { x: -3.6, z: -1.2 };
        state.companionIndoors = false;
        this.advanceMinutes(1);
        return true;
      case 'read-calendar':
        this.flag('checked-calendar');
        return true;
      case 'sell-produce': {
        const amount = this.produceValue();
        const keep = (item: InventoryItem) => !PRODUCE_PRICES[item.itemId];
        state.player.coins += amount;
        backpack(state).items = backpack(state).items.filter(keep);
        if (distance(critter.position, state.player.position) <= GAME_CONFIG.interactionDistance)
          satchel(state).items = satchel(state).items.filter(keep);
        this.flag('sold');
        this.advanceMinutes(5);
        this.note(`Garden produce sold for ${amount} coins.`);
        return true;
      }
      case 'cue-haul':
        state.player.stamina -= 2;
        critter.hauling = { enabled: false, phase: hauling.steps![0], cued: true };
        this.note(`${critter.name} sets off: collect one board, then carry it to the chest.`);
        return true;
      case 'toggle-hauling': {
        const enabled = !critter.hauling.enabled && !critter.hauling.cued;
        critter.hauling = { enabled, phase: 'idle', cued: false };
        this.note(
          enabled
            ? `${critter.name} will keep the lumber moving while you work in the yard.`
            : `${critter.name} comes along. Any carried cargo stays safe in the satchel.`,
        );
        return true;
      }
      case 'work-material': {
        const node = state.materialNodes.find((item) => item.id === id)!;
        const result = this.materialCheck(node.kind);
        state.player.stamina -= result.staminaCost;
        this.advanceMinutes(result.timeMinutes);
        state.work = { nodeId: id, remainingSeconds: result.durationSeconds, result };
        return true;
      }
      case 'pickup-cargo': {
        const pile = state.groundCargo.find((item) => item.id === id)!;
        for (const item of pile.items) this.add(item.itemId, item.quantity, item.quality);
        state.groundCargo = state.groundCargo.filter((item) => item !== pile);
        this.note('Cargo lifted. Set it down at any time if the load is too heavy.');
        return true;
      }
      case 'pet':
        critter.bond = clamp(critter.bond + 5);
        critter.happiness = clamp(critter.happiness + 8);
        critter.lastPettedDay = state.day;
        this.flag('petted-today');
        this.flag('cared');
        this.advanceMinutes(5);
        this.note(
          `${critter.name} closes their eyes and makes a pleased little trill. Your bond grows.`,
        );
        return true;
      case 'feed':
      case 'treat': {
        const beforeEnergy = critter.stamina;
        this.take(action === 'feed' ? 'feed' : 'berry', 1);
        critter.hunger = clamp(critter.hunger - (action === 'feed' ? 35 : 15));
        critter.stamina = clamp(critter.stamina + (action === 'feed' ? 10 : 3));
        critter.happiness = clamp(critter.happiness + 4);
        critter.bond = clamp(critter.bond + 2);
        this.flag('cared');
        this.advanceMinutes(5);
        this.note(
          (action === 'feed'
            ? `${critter.name} crunches the feed with great seriousness. A happy, well-fed companion.`
            : 'A sunberry disappears in one delighted nibble.') +
            ` +${Math.round(critter.stamina - beforeEnergy)} energy; hunger now ${Math.round(critter.hunger)}/100.`,
        );
        return true;
      }
      case 'rest': {
        // A shared break replaces the worker's separate rest, rather than doubling it.
        critter.hauling.phase = 'idle';
        const playerGain = Math.min(GAME_CONFIG.restPlayerEnergy, 100 - state.player.stamina);
        const critterGain = Math.min(GAME_CONFIG.restCritterEnergy, 100 - critter.stamina);
        this.advanceMinutes(GAME_CONFIG.restMinutes);
        state.player.stamina += playerGain;
        critter.stamina += critterGain;
        this.note(
          `Two quiet hours together. You regain ${Math.round(playerGain)} energy; ${critter.name} regains ${Math.round(critterGain)}. Hunger now ${Math.round(critter.hunger)}/100. There is still today to enjoy.`,
        );
        return true;
      }
      case 'sleep':
        this.sleep();
        return true;
      case 'upgrade':
        state.player.coins -= GAME_CONFIG.shedCost;
        state.shedLevel = 1;
        this.flag('improved');
        this.advanceMinutes(60);
        critter.happiness = clamp(critter.happiness + 12);
        this.note(
          `A warm roof, fresh wood, and soft bedding. ${critter.name}’s nook is finally a home.`,
        );
        return true;
      case 'train':
      case 'race':
        state.player.stamina -= 5;
        critter.stamina -=
          action === 'train' ? GAME_CONFIG.practiceEnergy : GAME_CONFIG.trialEnergy;
        state.training = {
          critterId: critter.id,
          phase: 0,
          hits: [],
          elapsed: 0,
          lastHitAt: 0,
          kind: action === 'train' ? 'training' : 'race',
          assist: this.assist,
        };
        this.note(
          action === 'train'
            ? `${critter.name} crouches at the first hoop. Give three cues near the center!`
            : `${critter.name} takes a place on the starting line. Three good cues; one happy runner.`,
        );
        return true;
      case 'lift':
      case 'pace':
      case 'toss':
      case 'exhibit': {
        const kind = action === 'exhibit' ? 'exhibition' : action;
        state.player.stamina -= 5;
        critter.stamina -= kind === 'exhibition' ? EXHIBITION.energy : DRILLS[kind].energy;
        state.training = {
          critterId: critter.id,
          phase: 0,
          hits: [],
          elapsed: 0,
          lastHitAt: 0,
          kind,
          assist: this.assist,
        };
        if (kind === 'exhibition') state.training.stage = 0;
        else if (kind === 'toss') startToss(state.training);
        else startGauge(state.training);
        this.note(
          {
            lift: `${critter.name} braces against the boulder. Keep the gauge in the green!`,
            pace: `${critter.name} sets off around the loop. Find a pace you can keep.`,
            toss: `${critter.name} squares up to the log. Charge the throw and let go at the peak!`,
            exhibition: `The crowd hushes. First, the sprint: three cues near the center!`,
          }[kind],
        );
        return true;
      }
      case 'routine': {
        const station = AREAS[state.areaId].objects.find((item) => item.id === id)!;
        const drill: Drill = station.kind === 'training' ? 'hoops' : (station.kind as Drill);
        critter.stamina -= DRILLS[drill].energy + ROUTINE.extraEnergy;
        state.training = {
          critterId: critter.id,
          phase: 0,
          hits: [],
          elapsed: 0,
          kind: 'routine',
          drill,
          scores: [this.routineScore(critter)],
        };
        this.note(
          `${critter.name} runs the ${DRILLS[drill].name.toLowerCase()} alone while you watch.`,
        );
        return true;
      }
      case 'sell': {
        const amount = this.berryValue();
        state.player.coins += amount;
        backpack(state).items = backpack(state).items.filter((item) => item.itemId !== 'berry');
        if (distance(critter.position, state.player.position) <= GAME_CONFIG.interactionDistance)
          satchel(state).items = satchel(state).items.filter((item) => item.itemId !== 'berry');
        this.flag('sold');
        this.advanceMinutes(5);
        this.note(`Your sunberries find a new home. ${amount} coins in the jar.`);
        return true;
      }
      case 'buy-feed':
        state.player.coins -= 2;
        this.add('feed', 1);
        this.note('One bundle of feed tucked into your basket.');
        return true;
      case 'buy-seed':
        state.player.coins -= 1;
        this.add('seed', 1);
        this.note('One packet of feed seeds. They grow in spring, summer, and autumn.');
        return true;
      case 'talk':
        this.advanceMinutes(5);
        this.note(grandpaSays(state, nextObjective(state)));
        this.flag('talked-grandpa');
        return true;
      case 'greet-pip': {
        const pip = state.critters.find((item) => item.id === PIP_ID)!;
        pip.happiness = clamp(pip.happiness + 5);
        this.flag('greeted-pip-today');
        this.note('Pip leans into your hand and sighs, the way he does for Grandpa.');
        return true;
      }
      case 'travel': {
        const gate = AREAS[state.areaId].objects.find((item) => item.id === id)!;
        const destination = gate.destination!;
        const minutes = this.travelMinutes(destination);
        state.areaId = destination;
        state.areaInstanceId = `local-${destination}`;
        state.player.position = { ...gate.arrival! };
        critter.position = { x: gate.arrival!.x, z: gate.arrival!.z + 1.2 };
        this.advanceMinutes(minutes);
        this.flag(
          destination === 'colosseum'
            ? 'visited-colosseum'
            : destination === 'town'
              ? 'visited-town'
              : 'explored',
        );
        this.note(ROUTES[destination].arrival.replaceAll('{name}', critter.name));
        return true;
      }
      case 'gather':
      case 'critter-gather': {
        const node = state.resources.find((item) => item.id === id)!;
        this.gather(node, action === 'gather' ? 'player' : 'command');
        return true;
      }
      default:
        return false;
    }
  }

  private move(x: number, z: number, seconds: number): boolean {
    if (![x, z, seconds].every(Number.isFinite) || seconds <= 0) return false;
    const length = Math.hypot(x, z);
    if (length === 0) return false;
    const load = encumbrance(this.state.player, backpack(this.state).items);
    const step =
      Math.min(seconds, 0.1) *
      GAME_CONFIG.movementSpeed *
      load.speed *
      (1 + Math.min(0.8, (this.state.player.stats.speed - 4) * 0.015)) *
      (load.drain && this.state.player.stamina <= 0 ? 0.5 : 1);
    const position = this.state.player.position;
    const edge = AREAS[this.state.areaId].halfSize - 0.5;
    const next = {
      x: clamp(position.x + (x / length) * step, -edge, edge),
      z: clamp(position.z + (z / length) * step, -edge, edge),
    };
    const area = AREAS[this.state.areaId];
    const solid: Blocker[] = [
      ...area.objects
        .filter((item) => ['house', 'shed', 'bed', 'hearth', 'counter'].includes(item.kind))
        .map((item) => ({ ...item.position, r: item.radius })),
      ...(area.blockers ?? []),
    ];
    const clear = (point: Point) =>
      solid.every((blocker) => clearance(point, blocker) >= BODY_RADIUS);
    // Glance off round things: keep the part of the step that runs along their edge.
    const glance = solid
      .filter((blocker) => 'r' in blocker && clearance(next, blocker) < BODY_RADIUS)
      .slice(0, 1)
      .map((blocker) => {
        const away = { x: position.x - blocker.x, z: position.z - blocker.z };
        const size = Math.hypot(away.x, away.z) || 1;
        const normal = { x: away.x / size, z: away.z / size };
        const into = (next.x - position.x) * normal.x + (next.z - position.z) * normal.z;
        return { x: next.x - normal.x * into, z: next.z - normal.z * into };
      });
    const landing = [next, ...glance, { x: next.x, z: position.z }, { x: position.x, z: next.z }]
      .filter((point) => distance(point, position) > 1e-6)
      .find(clear);
    // Someone already standing inside new scenery (an older save) can always walk out.
    if (landing) this.state.player.position = landing;
    else if (!clear(position)) this.state.player.position = next;
    const moved = distance(position, this.state.player.position);
    if (moved > 0 && load.drain) {
      this.state.player.stamina = Math.max(0, this.state.player.stamina - moved * load.drain);
      this.state.player.skills['hauling'] = Math.min(
        99,
        this.state.player.skills['hauling'] + moved * 0.003,
      );
      this.state.player.stats.endurance = Math.min(
        999,
        this.state.player.stats.endurance + moved * 0.0003,
      );
      this.state.player.stats.strength = Math.min(
        999,
        this.state.player.stats.strength + moved * 0.0005,
      );
    }
    return moved > 0;
  }

  private trainingHit(): boolean {
    const state = this.state;
    const training = state.training;
    if (
      !training ||
      training.kind === 'routine' ||
      training.critterId !== state.activeCritterId ||
      training.elapsed - (training.lastHitAt ?? 0) <
        (this.gauge(training) || training.kind === 'toss' ? 0.08 : 0.3)
    )
      return false;
    training.lastHitAt = training.elapsed;
    if (training.kind === 'toss') {
      // The first press starts the charge; a second press (tap, tap) throws.
      if (training.stage !== 1) {
        training.stage = 1;
        training.chargeStart = training.elapsed;
        training.meter = 0;
      } else if (throwLog(training, this.critter)) this.finishTraining();
      return true;
    }
    if (this.gauge(training)) {
      push(training);
      return true;
    }
    training.hits.push(sweepAccuracy(training.phase, training.assist));
    if (training.hits.length < 3) return true;
    if (training.kind === 'exhibition') {
      // The sprint is scored; the heavy stone pull follows in the same paid showing.
      training.scores = [training.hits.reduce((sum, value) => sum + value, 0) / 3];
      training.hits = [];
      training.stage = 1;
      startGauge(training);
      this.note('A clean sprint! Now the stone pull: keep the gauge in the green.');
      return true;
    }
    this.finishTraining();
    return true;
  }

  /** Letting go after holding a charge throws the log; a quick tap keeps it charging. */
  private trainingRelease(): boolean {
    const training = this.state.training;
    if (
      !training ||
      training.kind !== 'toss' ||
      training.stage !== 1 ||
      training.critterId !== this.state.activeCritterId ||
      training.elapsed - (training.chargeStart ?? training.elapsed) < TOSS_HOLD
    )
      return false;
    if (throwLog(training, this.critter)) this.finishTraining();
    return true;
  }

  private finishTraining(): void {
    const state = this.state;
    const training = state.training!;
    const accuracy = training.hits.reduce((sum, value) => sum + value, 0) / 3;
    const critter = activeCritter(state);
    const care = (critter.happiness + critter.bond + (100 - critter.hunger)) / 300;
    const drill = drillOf(training);
    if (drill) {
      this.finishDrill(drill, training, care);
      return;
    }
    if (training.kind === 'exhibition') {
      const sprint = training.scores?.[0] ?? 0;
      const pull = liftScore(training, critter, true);
      const points =
        Math.round(
          (sprint * 25 +
            pull * 25 +
            critter.stats.speed * 2.5 +
            critter.stats.strength * 2.5 +
            care * 8 +
            this.random() * 4) *
            10,
        ) / 10;
      const medal =
        points >= EXHIBITION.gold ? 'gold' : points >= EXHIBITION.silver ? 'silver' : 'bronze';
      const coins = EXHIBITION.coins[medal];
      critter.competitions.push({ day: state.day, time: points, medal, event: 'exhibition' });
      critter.history.push(
        `Day ${state.day}: ${medal} at the Colosseum exhibition (${points} points).`,
      );
      critter.skills.racing += 1;
      critter.bond = clamp(critter.bond + 3);
      critter.happiness = clamp(critter.happiness + 6);
      state.player.coins += coins;
      this.flag('exhibited');
      state.training = null;
      this.advanceMinutes(EXHIBITION.minutes);
      this.note(
        `The crowd roars! ${critter.name} scores ${points} points (sprint ${Math.round(sprint * 100)}%, pull ${Math.round(pull * 100)}%) for a ${medal} medal and ${coins} coins.`,
      );
      return;
    }
    {
      const time =
        Math.round(
          Math.max(
            9,
            31 -
              critter.stats.speed * 0.8 -
              critter.stats.endurance * 0.25 -
              accuracy * 5 -
              care * 3 +
              this.random() * 0.8,
          ) * 10,
        ) / 10;
      const medal = time < 19 ? 'gold' : time < 23 ? 'silver' : 'bronze';
      const coins = medal === 'gold' ? 8 : medal === 'silver' ? 5 : 3;
      critter.competitions.push({ day: state.day, time, medal });
      critter.skills.racing += 2;
      state.player.coins += coins;
      this.flag('raced');
      critter.history.push(`Day ${state.day}: ${medal} in the Clover Cup (${time}s).`);
      this.advanceMinutes(45);
      this.note(
        `${time.toFixed(1)} seconds! ${critter.name} earns a ${medal} ribbon and ${coins} coins. ${Math.round(critter.stamina)} energy left. Today’s trial is complete.`,
      );
    }
    critter.happiness = clamp(critter.happiness + 3);
    state.training = null;
  }

  /** A drill run alone from the menu, once it has been played together. */
  private routineAction(drill: Drill): InteractionAction {
    const critter = this.critter;
    const cost = DRILLS[drill].energy + ROUTINE.extraEnergy;
    const reason = !critter.practised[drill]
      ? `Play it together once first; then ${critter.name} can run it alone.`
      : critter.hunger > 80
        ? `${critter.name} is too hungry to concentrate.`
        : critter.stamina < cost
          ? `${critter.name} needs some rest. Rest together at the nook or offer food.`
          : undefined;
    return {
      id: 'routine',
      label: `Run it as a routine · ${cost} ${critter.name} energy · ${DRILLS[drill].minutes} min${this.gainSuffix(drill)}`,
      disabled: !!reason,
      reason,
    };
  }

  /** Usually a fair session; a happy, fed, close companion has more great days than flops. */
  private routineScore(critter: Critter): number {
    const care = (critter.happiness + critter.bond + (100 - critter.hunger)) / 300;
    const roll = this.random();
    const { flop, fair, great } = ROUTINE.scores;
    if (roll < 0.2 - care * 0.15) return flop;
    return roll > 0.9 - care * 0.15 ? great : fair;
  }

  /** Every drill pays out the same way, shaped by its row in the drill table. */
  private finishDrill(drill: Drill, training: Training, care: number): void {
    const state = this.state;
    const critter = activeCritter(state);
    const definition = DRILLS[drill];
    const routine = training.kind === 'routine';
    const score = routine
      ? // Drawn as the routine started.
        training.scores![0]
      : drill === 'lift'
        ? liftScore(training, critter)
        : drill === 'pace'
          ? paceScore(training)
          : // Hoops cues and log throws: the average of three.
            training.hits.reduce((sum, value) => sum + value, 0) / 3;
    const multiplier = drillMultiplier(critter, drill, state.day);
    const { base, score: weight, care: careWeight, bonus } = definition.gain;
    const gain =
      Math.round(
        (base +
          score * weight +
          care * careWeight +
          (bonus ? critter.stats[bonus.stat] * bonus.weight : 0)) *
          multiplier *
          100,
      ) / 100;
    const { stat, side } = definition;
    critter.stats[stat] = Math.round((critter.stats[stat] + gain) * 100) / 100;
    critter.stats[side] =
      Math.round((critter.stats[side] + gain * definition.sideShare) * 100) / 100;
    critter.skills[definition.skill] = (critter.skills[definition.skill] ?? 0) + 1;
    recordDrill(critter, drill, state.day);
    if (!routine) critter.practised[drill] = (critter.practised[drill] ?? 0) + 1;
    // Training together builds more bond than a routine run alone.
    critter.bond = clamp(critter.bond + (routine ? 1 : 2));
    critter.happiness = clamp(critter.happiness + 3);
    this.flag(definition.flag);
    state.training = null;
    this.advanceMinutes(definition.minutes);
    const [great, good, weak] = definition.praise;
    const best =
      drill === 'toss' && !routine
        ? ` Best throw ${throwDistance(Math.max(0, ...training.hits), critter)} m.`
        : '';
    this.note(
      `${score > 0.75 ? great : score > 0.4 ? good : weak} ${critter.name}${routine ? ' ran it alone and' : ''} gains ${gain.toFixed(2)} ${stat}${multiplier < 1 ? ` (${Math.round(multiplier * 100)}% gains, repeated today)` : ''}.${best} ${Math.round(critter.stamina)} energy left${critter.stamina < 30 ? '; rest together at the nook to recover' : ''}.`,
    );
  }

  private gauge(training: GameState['training']): boolean {
    return (
      !!training &&
      (training.kind === 'lift' ||
        training.kind === 'pace' ||
        (training.kind === 'exhibition' && training.stage === 1))
    );
  }
  private gainSuffix(drill: Drill): string {
    const multiplier = drillMultiplier(this.critter, drill, this.state.day);
    return multiplier < 1 ? ` · ${Math.round(multiplier * 100)}% gains today` : '';
  }
  private drillCopy(drill: Drill): string {
    const multiplier = drillMultiplier(this.critter, drill, this.state.day);
    return multiplier < 1
      ? `Repeating a drill today tires it out: the next session gives ${Math.round(multiplier * 100)}% gains. Mix disciplines; gains reset tomorrow.`
      : 'Full gains for the first session today.';
  }
  private travelMinutes(destination: GameState['areaId']): number {
    // Oakhaven is a longer walk from the yard than the glade; the Colosseum is at its edge.
    const ends = [destination, this.state.areaId];
    return ends.includes('town') && ends.includes('homestead') ? 20 : 10;
  }

  private gather(node: ResourceNode, actor: 'player' | 'command' | 'autonomous'): void {
    const state = this.state;
    const critter = activeCritter(state);
    const earned = forageYield(critter);
    const quality = actor === 'player' ? 1 : earned.quality;
    const amount = actor === 'player' ? 2 : 2 + (this.random() < earned.bonusChance ? 1 : 0);
    if (actor === 'player') this.add('berry', amount, quality);
    else addItem(satchel(state), 'berry', amount, quality);
    node.available = false;
    node.respawnAt = state.totalMinutes + GAME_CONFIG.berryRespawnMinutes;
    if (actor === 'player') {
      state.player.skills['foraging'] = Math.min(99, state.player.skills['foraging'] + 0.2);
      state.player.stamina -= 6;
      this.advanceMinutes(15);
      this.note(
        `You pick ${amount} sunberries (6 energy; ${Math.round(state.player.stamina)} left). ${distance(critter.position, node.position) < 5 ? `${critter.name} watches your hands carefully.` : `${critter.name} was too far away to watch this time.`}`,
      );
    } else {
      critter.stamina -= GAME_CONFIG.berryEnergy;
      critter.skills.harvesting += 1;
      critter.bond = clamp(critter.bond + 1);
      if (actor === 'command') {
        state.player.stamina -= 2;
        this.advanceMinutes(20);
      }
      this.flag(actor === 'command' ? 'directed' : 'assisted');
      this.note(
        `${actor === 'autonomous' ? `On their own, ${critter.name}` : `At your cue, ${critter.name}`} gathers ${amount} ${quality > 1 ? 'fine ' : ''}sunberries. Spent ${GAME_CONFIG.berryEnergy} energy${actor === 'command' ? ' and 2 of yours' : ''}; ${Math.round(critter.stamina)} left.`,
      );
    }
    this.flag('gathered');
    if (actor !== 'player' || distance(critter.position, node.position) < 5)
      this.learn(
        foraging,
        actor === 'player' ? 'observation' : actor === 'command' ? 'cue' : 'autonomous',
      );
  }

  private learn(behavior: BehaviorDefinition, source: keyof BehaviorDefinition['gains']): void {
    const critter = this.critter;
    const before = learnedStage(critter, behavior);
    const progress = critter.learnedBehaviors[behavior.id] ?? 0;
    // Legacy observation was uncapped. Retain even above-ceiling progress without reducing it.
    critter.learnedBehaviors[behavior.id] =
      source === 'observation'
        ? progress + behavior.gains[source]
        : Math.max(progress, Math.min(behavior.practiceCeiling, progress + behavior.gains[source]));
    const after = learnedStage(critter, behavior);
    if (after.id !== before.id) {
      critter.history.push(`Day ${this.state.day}: ${after.label}.`);
      this.note(after.milestone.replaceAll('{name}', critter.name));
      if (behavior.id === 'lumber-hauling' && after.id === 'autonomous')
        critter.hauling.enabled = true;
    }
  }

  private haul(seconds: number): boolean {
    const state = this.state;
    const critter = this.critter;
    const job = critter.hauling;
    // The cottage is part of the stead: a working helper keeps working in the yard.
    if (!this.inYard() || state.companionIndoors || (!job.enabled && !job.cued)) return false;
    const bag = satchel(state);
    const output = state.containers.find((item) => item.kind === 'mill-output')!;
    const chest = state.containers.find((item) => item.kind === 'chest')!;
    const trough = state.containers.find((item) => item.kind === 'trough')!;
    const walkTo = (target: Point): boolean => {
      const gap = distance(critter.position, target);
      if (gap <= 0.75) return true;
      const load = encumbrance(critter, bag.items);
      const step = Math.min(gap - 0.6, seconds * 3.6 * load.speed * haulingPace(critter));
      critter.position = {
        x: critter.position.x + ((target.x - critter.position.x) / gap) * step,
        z: critter.position.z + ((target.z - critter.position.z) / gap) * step,
      };
      critter.stamina = Math.max(0, critter.stamina - step * load.drain);
      return false;
    };
    const hungry = critter.hunger > 70 || (job.phase === 'eat' && critter.hunger > 55);
    // Say so once when a hungry worker will find the trough empty; it waits there until fed.
    if (hungry && job.phase !== 'eat' && !containerQuantity(trough, 'feed'))
      this.note(
        `${critter.name} is hungry, but the feed trough is empty. Store feed there so work can resume.`,
      );
    if (hungry) job.phase = 'eat';
    else if (job.phase === 'eat') job.phase = 'idle';
    if (job.phase === 'eat') {
      if (walkTo(this.containerPosition(trough)) && containerQuantity(trough, 'feed')) {
        // Feed remains local; consume one stack unit without routing it through the player.
        const feed = trough.items.find((item) => item.itemId === 'feed' && item.quantity > 0)!;
        feed.quantity--;
        trough.items = trough.items.filter((item) => item.quantity > 0);
        critter.hunger = clamp(critter.hunger - 35);
        critter.stamina = clamp(critter.stamina + 10);
        this.note(`${critter.name} takes a meal from the trough before returning to work.`);
        if (critter.hunger <= 55) job.phase = 'idle';
      }
      return true;
    }
    if (critter.stamina < (job.cued ? 8 : 20) && job.phase !== 'rest') job.phase = 'rest';
    if (job.phase === 'rest') {
      walkTo({ x: 4, z: -2 });
      return true;
    }
    if (job.phase === 'idle')
      job.phase = containerQuantity(bag, 'lumber') ? hauling.steps![1] : hauling.steps![0];
    if (job.phase === 'collect') {
      if (room(chest, 'lumber') < 1 || !containerQuantity(output, 'lumber')) {
        if (!job.cued) job.phase = 'idle';
        return true;
      }
      const projected = [
        ...bag.items,
        { id: 'preview', itemId: 'lumber' as const, quantity: 1, quality: 1 },
      ];
      if (!encumbrance(critter, projected).speed) return true;
      if (walkTo(this.containerPosition(output))) {
        transfer(output, bag, 'lumber');
        critter.stamina = Math.max(0, critter.stamina - 4);
        job.phase = hauling.steps![1];
        this.note(`${critter.name} lifts a board from the mill and heads for the yard chest.`);
      }
      return true;
    }
    if (
      job.phase === 'deliver' &&
      walkTo(this.containerPosition(chest)) &&
      room(chest, 'lumber') > 0
    ) {
      if (!transfer(bag, chest, 'lumber')) {
        job.phase = 'idle';
        job.cued = false;
        return true;
      }
      critter.stamina = Math.max(0, critter.stamina - 4);
      critter.skills['hauling'] = Math.min(99, (critter.skills['hauling'] ?? 0) + 0.5);
      critter.stats.strength = Math.min(999, critter.stats.strength + 0.015);
      critter.stats.endurance = Math.min(999, critter.stats.endurance + 0.01);
      this.note(`${critter.name} stores a board in the yard chest. One less trip for you.`);
      this.learn(hauling, job.cued ? 'cue' : 'autonomous');
      job.cued = false;
      job.phase = 'idle';
      this.flag('hauled-lumber');
    }
    return true;
  }

  private companion(seconds: number): void {
    const state = this.state;
    const critter = activeCritter(state);
    if (state.training) return;
    if (this.haul(seconds)) return;
    if (!this.companionHere()) {
      // A finished errand ends indoors beside the rancher, not at yard coordinates.
      state.companionIndoors = true;
      critter.position = { ...COTTAGE_COMPANION_SPOT };
      this.note(`${critter.name} finishes up outside and joins you indoors.`);
      return;
    }
    let target: Point = state.player.position;
    const harvest = this.berryOpportunity();
    if (harvest) target = harvest.position;
    const gap = distance(critter.position, target);
    const stop = harvest ? 0.7 : 1.15;
    if (gap > stop) {
      const load = encumbrance(critter, satchel(state).items);
      const step = Math.min(gap - stop, seconds * 3.6 * load.speed);
      critter.stamina = Math.max(0, critter.stamina - step * load.drain);
      critter.position = {
        x: critter.position.x + ((target.x - critter.position.x) / gap) * step,
        z: critter.position.z + ((target.z - critter.position.z) / gap) * step,
      };
    }
    if (harvest && distance(critter.position, harvest.position) <= 1)
      this.gather(harvest, 'autonomous');
  }

  private advanceMinutes(minutes: number): void {
    const state = this.state;
    this.produce(minutes);
    const previousDay = state.day;
    const previousMinutes = state.totalMinutes;
    state.totalMinutes += minutes;
    state.day = Math.floor(state.totalMinutes / 1440) + 1;
    state.minute = state.totalMinutes % 1440;
    for (const note of advanceGarden(state.plots, previousMinutes, state.totalMinutes))
      this.note(note);
    for (const [index, mark] of PIP_PICKS.entries()) {
      const at = (state.day - 1) * 1440 + mark;
      if (previousMinutes < at && at <= state.totalMinutes) this.pipPick(index + 1);
    }
    activeCritter(state).hunger = clamp(activeCritter(state).hunger + minutes * 0.025);
    const worker = this.critter;
    if (
      !state.training &&
      this.inYard() &&
      worker.hauling.phase === 'rest' &&
      distance(worker.position, { x: 4, z: -2 }) <= 1
    ) {
      worker.stamina = clamp(
        worker.stamina + (minutes * GAME_CONFIG.restCritterEnergy) / GAME_CONFIG.restMinutes,
      );
      if (worker.stamina >= 50) {
        worker.hauling.phase = 'idle';
        this.note(`${worker.name} stretches, rested and ready to help again.`);
      }
    }
    if (state.day > previousDay) {
      for (const individual of state.critters) individual.ageDays += state.day - previousDay;
      state.flags = state.flags.filter(
        (flag) =>
          flag !== 'petted-today' && flag !== 'greeted-pip-today' && !flag.startsWith('pip-'),
      );
    }
    for (const node of state.materialNodes)
      if (node.remaining === 0 && node.respawnAt <= state.totalMinutes) node.remaining = 6;
    for (const node of state.resources)
      if (!node.available && node.respawnAt <= state.totalMinutes) node.available = true;
  }

  /** Grandpa and Pip, where they are right now; Pip only while he belongs to the household. */
  residents(): (Whereabouts & { id: string })[] {
    const state = this.state;
    const grandpa = grandpaWhereabouts(state);
    const pip = state.critters.some((item) => item.id === PIP_ID)
      ? pipWhereabouts(state, activeCritter(state).position)
      : null;
    return [
      ...(grandpa ? [{ id: GRANDPA.id, ...grandpa }] : []),
      ...(pip ? [{ id: PIP_ID, ...pip }] : []),
    ];
  }

  /**
   * One of Pip's two morning picks. The berries go to the yard chest; a companion close
   * enough to see it learns from watching, as it would from you.
   */
  private pipPick(pick: number): void {
    const state = this.state;
    const weather = weatherFor(state.day);
    if (
      !state.critters.some((item) => item.id === PIP_ID) ||
      weather === 'rain' ||
      weather === 'snow' ||
      state.flags.some((flag) => flag.startsWith(`pip-${pick}:`))
    )
      return;
    const companion = activeCritter(state);
    const node = pipNextPick(state, companion.position);
    if (!node) return;
    node.available = false;
    node.respawnAt = state.totalMinutes + GAME_CONFIG.berryRespawnMinutes;
    state.flags.push(`pip-${pick}:${node.id}`);
    const chest = state.containers.find((container) => container.kind === 'chest')!;
    const kept = room(chest, 'berry') >= 2;
    if (kept) addItem(chest, 'berry', 2, 2);
    if (state.areaId !== 'glade') return;
    const watching = this.companionHere() && distance(companion.position, node.position) <= 5;
    this.note(
      `Pip pads to a sunberry bush and strips it with practised paws${kept ? ', saving two fine berries for the yard chest' : ''}. ${watching ? `${companion.name} watches every move.` : `${companion.name} was too far away to see how.`}`,
    );
    if (watching) this.learn(foraging, 'observation');
  }

  private sleep(): void {
    const state = this.state;
    this.advanceMinutes(1440 - state.minute + 480);
    state.areaId = 'homestead';
    state.areaInstanceId = 'local-homestead';
    state.player.position = { ...AREAS.homestead.spawn };
    activeCritter(state).position = { x: -1, z: 0.6 };
    state.player.stamina = 100;
    activeCritter(state).stamina = 100;
    activeCritter(state).happiness = clamp(
      activeCritter(state).happiness + (state.shedLevel ? 8 : 2),
    );
    state.training = null;
    state.work = null;
    state.companionIndoors = false;
    this.flag('slept');
    const ready = state.plots.filter(plotReady).length;
    const dry = state.plots.filter(
      (plot) =>
        plot.crop &&
        !plot.crop.withered &&
        !plotReady(plot) &&
        plot.moistUntil <= state.totalMinutes,
    ).length;
    this.note(
      `Day ${state.day} · ${formatDate(state.day)}. A ${weatherFor(state.day) === 'rain' ? 'rainy' : 'soft'} morning at Bramblewick. Everyone is rested${ready ? `, and ${ready} garden bed${ready > 1 ? 's are' : ' is'} ready` : ''}${dry ? `; ${dry} bed${dry > 1 ? 's need' : ' needs'} water` : ''}.`,
    );
  }

  private materialCheck(kind: 'timber' | 'stone') {
    return resolveCheck(
      this.state.player,
      kind === 'timber' ? 'woodcutting' : 'mining',
      { strength: 0.65, endurance: 0.2, speed: 0.1, intelligence: 0.05 },
      1,
      kind === 'timber' ? 7 : 9,
    );
  }

  private finishWork(): void {
    const work = this.state.work!;
    const node = this.state.materialNodes.find((item) => item.id === work.nodeId)!;
    node.remaining = Math.max(0, node.remaining - work.result.damage);
    const skill = node.kind === 'timber' ? 'woodcutting' : 'mining';
    applyExperience(this.state.player, skill, work.result);
    if (!node.remaining) {
      this.add(node.kind, 2);
      node.respawnAt = (Math.floor(this.state.totalMinutes / 1440) + 1) * 1440 + 480;
      this.flag('worked-material');
    }
    this.state.work = null;
    this.note(
      `${work.result.degree > 0.25 ? 'Clean, confident' : work.result.degree < -0.5 ? 'Slow, stubborn' : 'Steady'} work. ${node.remaining ? `${node.remaining}/6 resistance remains.` : `Two ${node.kind} bundles lifted into your arms.`} ${skill} +0.35; strength grows a little. Load: ${encumbrance(this.state.player, backpack(this.state).items).band.toLowerCase()}.`,
    );
  }

  private dropCargo(): boolean {
    const items = backpack(this.state).items.filter((item) =>
      ['timber', 'stone', 'lumber'].includes(item.itemId),
    );
    if (!items.length) return false;
    const state = this.state;
    state.haulLesson = null;
    let pile = state.groundCargo.find(
      (item) =>
        item.areaId === state.areaId && distance(item.position, state.player.position) < 0.5,
    );
    if (!pile) {
      let serial = 1;
      while (state.groundCargo.some((item) => item.id === `ground-cargo-${serial}`)) serial++;
      pile = {
        id: `ground-cargo-${serial}`,
        areaId: state.areaId,
        position: { ...state.player.position },
        items: [],
      };
      state.groundCargo.push(pile);
    }
    for (const item of items) {
      const existing = pile.items.find(
        (entry) => entry.itemId === item.itemId && entry.quality === item.quality,
      );
      if (existing) existing.quantity += item.quantity;
      else pile.items.push({ ...item, id: `${pile.id}-${item.itemId}-${item.quality}` });
    }
    backpack(state).items = backpack(state).items.filter((item) => !items.includes(item));
    this.note('Cargo set safely on the ground. Walk back to pick it up.');
    return true;
  }

  private containerPosition(container: Container): Point {
    if ('position' in container.location) return container.location.position;
    return container.location.actorId === this.state.player.id
      ? this.state.player.position
      : this.critter.position;
  }
  private containerLocal(container: Container): boolean {
    if (!('actorId' in container.location)) return container.location.areaId === this.state.areaId;
    return (
      container.location.actorId === this.state.player.id ||
      (container.location.actorId === this.state.activeCritterId && this.companionHere())
    );
  }
  private inYard(): boolean {
    return this.state.areaId === 'homestead' || this.state.areaId === 'cottage';
  }
  /** False only while the rancher is indoors and the companion is working outside. */
  private companionHere(): boolean {
    return this.state.areaId !== 'cottage' || this.state.companionIndoors;
  }
  private tillCheck() {
    return resolveCheck(
      this.state.player,
      'farming',
      { strength: 0.5, endurance: 0.3, intelligence: 0.2 },
      1,
      6,
    );
  }
  private describePlot(plot: SoilPlot): Interaction {
    const state = this.state;
    const bed = state.plots.indexOf(plot) + 1;
    const date = calendarDate(state.day);
    const moist = plot.moistUntil > state.totalMinutes;
    const energy = (cost: number) =>
      state.player.stamina < cost ? 'You need some rest. Rest together at the nook.' : undefined;
    const action = (id: string, label: string, reason?: string): InteractionAction => ({
      id,
      label,
      disabled: !!reason,
      reason,
    });
    const base = { id: plot.id };
    if (!plot.tilled) {
      const check = this.tillCheck();
      return {
        ...base,
        title: `Garden bed ${bed} · overgrown`,
        description:
          'Till the soil before planting. Farming skill, strength and endurance make the work lighter.',
        actions: [
          action(
            'till',
            `Till the soil · ${check.staminaCost} energy · ${check.timeMinutes} min`,
            energy(check.staminaCost),
          ),
        ],
      };
    }
    const crop = plot.crop;
    if (!crop)
      return {
        ...base,
        title: `Garden bed ${bed} · tilled, ${moist ? 'moist' : 'dry'}`,
        description: `${capitalize(date.season)} ${date.dayOfSeason}. Each crop grows only in its seasons, and only while its bed is moist. Water lasts until dawn.`,
        actions: CROP_IDS.map((cropId) => {
          const species = CROPS[cropId];
          return action(
            `plant:${cropId}`,
            cropId === 'feed'
              ? 'Plant feed seeds · 1 seed · 5 energy · 15 min'
              : `Plant ${species.name.toLowerCase()} · 1 ${species.seedLabel} · 5 energy · 15 min`,
            !species.seasons.includes(date.season)
              ? `${species.name} grow in ${species.seasons.join(' and ')}.`
              : this.quantity(species.seedItem) < 1
                ? `Buy ${species.seedLabel}s at the stall.`
                : energy(5),
          );
        }),
      };
    const species = CROPS[crop.speciesId];
    const name = species.name.toLowerCase();
    if (crop.withered)
      return {
        ...base,
        title: `Withered ${name}`,
        description: 'Out-of-season crops cannot recover. Clear the bed to plant again.',
        actions: [action('clear', 'Clear the bed · 2 energy · 10 min', energy(2))],
      };
    const harvest = action(
      'harvest',
      `Harvest · ${species.harvest.map((item) => `${item.quantity} ${ITEM_LABELS[item.itemId] ?? item.itemId}`).join(' + ')} · 4 energy · 15 min`,
      plotReady(plot) ? energy(4) : 'Let it grow a little longer.',
    );
    if (plotReady(plot))
      return {
        ...base,
        title: `${species.name} are ready!`,
        description: `Bed ${bed} is ready to harvest. The soil stays tilled for the next planting.`,
        actions: [harvest],
      };
    const left = Math.ceil(species.growthMinutes - crop.growthMinutes);
    const nextSeason = SEASONS[(SEASONS.indexOf(date.season) + 1) % SEASONS.length];
    const daysLeft = DAYS_PER_SEASON - date.dayOfSeason + 1;
    const warning =
      !species.seasons.includes(nextSeason) && daysLeft <= 3
        ? ` ${capitalize(nextSeason)} begins in ${daysLeft} day${daysLeft > 1 ? 's' : ''}; unharvested ${name} will wither.`
        : '';
    if (moist)
      return {
        ...base,
        title: `${species.name} are growing`,
        description:
          (state.totalMinutes + left <= plot.moistUntil
            ? `Ready in about ${left} game minutes.`
            : `Moist until dawn. About ${left} growing minutes left, so water again tomorrow.`) +
          warning,
        actions: [harvest],
      };
    return {
      ...base,
      title: `Thirsty ${name}`,
      description: `Dry soil pauses growth. About ${left} growing minutes left; watering lasts until dawn.${warning}`,
      actions: [action('water', 'Water the garden bed · 3 energy · 10 min', energy(3)), harvest],
    };
  }
  private tend(plot: SoilPlot, action: string): boolean {
    const state = this.state;
    const bed = state.plots.indexOf(plot) + 1;
    const farming = (amount: number) => {
      state.player.skills['farming'] = Math.min(99, (state.player.skills['farming'] ?? 0) + amount);
    };
    if (action === 'till') {
      const check = this.tillCheck();
      state.player.stamina -= check.staminaCost;
      applyExperience(state.player, 'farming', check);
      plot.tilled = true;
      this.advanceMinutes(check.timeMinutes);
      this.flag('gardened');
      this.note(
        `Bed ${bed} is turned and ready for seed. ${check.degree > 0.25 ? 'Clean, even furrows.' : 'Hard, rooty work.'} Farming grows a little.`,
      );
      return true;
    }
    if (action.startsWith('plant:')) {
      const cropId = action.slice('plant:'.length) as CropId;
      const species = CROPS[cropId];
      this.take(species.seedItem, 1);
      state.player.stamina -= 5;
      farming(0.1);
      plot.crop = {
        speciesId: cropId,
        plantedAt: state.totalMinutes,
        growthMinutes: 0,
        withered: false,
      };
      this.advanceMinutes(15);
      this.note(
        `${species.name} sown in bed ${bed}. ${plot.moistUntil > state.totalMinutes ? 'The soil is already moist.' : 'Give them a little water.'}`,
      );
      return true;
    }
    if (action === 'water') {
      state.player.stamina -= 3;
      farming(0.1);
      plot.moistUntil = nextDawn(state.totalMinutes);
      this.advanceMinutes(10);
      this.flag('gardened');
      const crop = plot.crop!;
      const left = CROPS[crop.speciesId].growthMinutes - crop.growthMinutes;
      this.note(
        `Bed ${bed} is watered and stays moist until dawn. ${state.totalMinutes + left <= plot.moistUntil ? `Ready in about ${Math.ceil(left)} game minutes.` : 'It will need water again tomorrow.'}`,
      );
      return true;
    }
    if (action === 'harvest') {
      const species = CROPS[plot.crop!.speciesId];
      state.player.stamina -= 4;
      farming(0.2);
      for (const item of species.harvest) this.add(item.itemId, item.quantity);
      if (plot.crop!.speciesId === 'feed') this.flag('grew-feed');
      this.flag('harvested-crop');
      plot.crop = null;
      this.advanceMinutes(15);
      this.note(
        `You harvest ${species.harvest.map((item) => `${item.quantity} ${ITEM_LABELS[item.itemId] ?? item.itemId}`).join(' and ')} from bed ${bed}.`,
      );
      return true;
    }
    if (action === 'clear') {
      state.player.stamina -= 2;
      plot.crop = null;
      this.advanceMinutes(10);
      this.note(`Bed ${bed} is cleared and still tilled.`);
      return true;
    }
    return false;
  }
  private produceValue(): number {
    return [
      ...backpack(this.state).items,
      ...(distance(this.critter.position, this.state.player.position) <=
      GAME_CONFIG.interactionDistance
        ? satchel(this.state).items
        : []),
    ].reduce(
      (sum, item) => sum + item.quantity * item.quality * (PRODUCE_PRICES[item.itemId] ?? 0),
      0,
    );
  }
  private containerActions(container: Container): InteractionAction[] {
    const bag = backpack(this.state);
    const helper = satchel(this.state);
    const actions: InteractionAction[] = [];
    const offer = (
      source: Container,
      destination: Container,
      itemId: InventoryItem['itemId'],
      label: string,
    ) => {
      if (
        source === destination ||
        !containerQuantity(source, itemId) ||
        !destination.allowed.includes(itemId) ||
        destination.kind === 'mill-output'
      )
        return;
      const usesCompanion = source === helper || destination === helper;
      const projected = [...helper.items, { id: 'preview', itemId, quantity: 1, quality: 1 }];
      const reason =
        room(destination, itemId) < 1
          ? 'This container is full.'
          : usesCompanion &&
              distance(this.critter.position, this.containerPosition(container)) >
                GAME_CONFIG.interactionDistance
            ? `Wait for ${this.critter.name} to reach the cargo.`
            : destination === helper && encumbrance(this.critter, projected).speed === 0
              ? 'Too heavy for your companion. Carry this yourself.'
              : undefined;
      actions.push({
        id: `transfer:${source.id}:${destination.id}:${itemId}`,
        label,
        disabled: !!reason,
        reason,
      });
    };
    for (const itemId of ITEM_IDS) {
      offer(bag, container, itemId, `Store 1 ${itemId}`);
      offer(container, bag, itemId, `Take 1 ${itemId}`);
      if (container !== helper) {
        offer(container, helper, itemId, `Ask ${this.critter.name}: carry 1 ${itemId}`);
        offer(helper, container, itemId, `Ask ${this.critter.name}: deposit 1 ${itemId}`);
      }
    }
    return actions;
  }
  private produce(minutes: number): void {
    const input = this.state.containers.find((container) => container.kind === 'mill-input')!;
    const output = this.state.containers.find((container) => container.kind === 'mill-output')!;
    if (!containerQuantity(input, 'timber') || room(output, 'lumber') < 2) return;
    const progress = this.state.production.progressMinutes + minutes;
    const batches = Math.min(
      Math.floor(progress / MILL_MINUTES),
      containerQuantity(input, 'timber'),
      Math.floor(room(output, 'lumber') / 2),
    );
    let left = batches;
    for (const item of input.items) {
      const used = Math.min(left, item.quantity);
      item.quantity -= used;
      left -= used;
    }
    input.items = input.items.filter((item) => item.quantity > 0);
    if (batches) {
      addItem(output, 'lumber', batches * 2);
      this.flag('refined-lumber');
    }
    // Blocked elapsed time is never banked; unspent partial work remains resumable.
    this.state.production.progressMinutes =
      !containerQuantity(input, 'timber') || room(output, 'lumber') < 2
        ? 0
        : progress - batches * MILL_MINUTES;
  }

  private quantity(itemId: InventoryItem['itemId']): number {
    return backpack(this.state)
      .items.filter((item) => item.itemId === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }
  private berryValue(): number {
    return [
      ...backpack(this.state).items,
      ...(distance(this.critter.position, this.state.player.position) <=
      GAME_CONFIG.interactionDistance
        ? satchel(this.state).items
        : []),
    ]
      .filter((item) => item.itemId === 'berry')
      .reduce((sum, item) => sum + item.quantity * item.quality, 0);
  }
  private add(itemId: InventoryItem['itemId'], quantity: number, quality = 1): void {
    const stack = backpack(this.state).items.find(
      (item) => item.itemId === itemId && item.quality === quality,
    );
    if (stack) stack.quantity += quantity;
    else
      backpack(this.state).items.push({
        id: `stack-${itemId}-${quality}`,
        itemId,
        quantity,
        quality,
      });
  }
  private take(itemId: InventoryItem['itemId'], quantity: number): void {
    for (const stack of backpack(this.state).items.filter((item) => item.itemId === itemId)) {
      const amount = Math.min(stack.quantity, quantity);
      stack.quantity -= amount;
      quantity -= amount;
      if (!quantity) break;
    }
    backpack(this.state).items = backpack(this.state).items.filter((item) => item.quantity > 0);
  }
  private flag(flag: string): void {
    if (!this.state.flags.includes(flag)) this.state.flags.push(flag);
  }
  private note(message: string): void {
    this.state.journal = [message, ...this.state.journal].slice(0, 30);
  }
  private random(): number {
    this.state.seed = (Math.imul(1664525, this.state.seed) + 1013904223) >>> 0;
    return this.state.seed / 4294967296;
  }
}
