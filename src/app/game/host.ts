import { AREAS, BEHAVIORS, BERRY_NODES, GAME_CONFIG, STARTER } from './content';
import {
  activeCritter,
  BehaviorDefinition,
  BehaviorStage,
  Critter,
  GameCommand,
  GameState,
  Interaction,
  InteractionAction,
  InventoryItem,
  Point,
  ResourceNode,
} from './model';

const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

export function learnedStage(critter: Critter, behavior: BehaviorDefinition): BehaviorStage {
  const progress = critter.learnedBehaviors[behavior.id] ?? 0;
  return behavior.stages.reduce((current, stage) =>
    progress >= stage.threshold ? stage : current,
  );
}

const foraging = BEHAVIORS['sunberry-foraging'];

export function createInitialState(): GameState {
  return {
    version: 3,
    seed: 240921,
    day: 1,
    minute: 480,
    totalMinutes: 480,
    areaId: 'homestead',
    areaInstanceId: 'local-homestead',
    player: { id: 'player-local', position: { x: 0, z: 0 }, stamina: 100, coins: 6 },
    activeCritterId: STARTER.id,
    critters: [
      {
        id: STARTER.id,
        name: STARTER.name,
        ownerId: 'player-local',
        lastPettedDay: null,
        speciesId: 'brindlekin',
        ageDays: 18,
        sex: 'female',
        personality: 'Curious · food-motivated · quietly brave',
        position: { x: -1, z: 0.6 },
        stats: { strength: 3, endurance: 5, speed: 4, intelligence: 6 },
        stamina: 100,
        health: 100,
        happiness: 70,
        bond: 20,
        hunger: 35,
        learnedBehaviors: {},
        skills: { harvesting: 0, racing: 0 },
        visualTraits: { coat: 'peach', accent: 'moss' },
        pedigree: { parentIds: [] },
        genetics: { coat: 'peach/peach', crest: 'fern/fern' },
        history: ['Day 1: A new home at Bramblewick Yard.'],
        competitions: [],
      },
    ],
    inventory: [
      { id: 'stack-feed-1', itemId: 'feed', quantity: 4, quality: 1 },
      { id: 'stack-seed-1', itemId: 'seed', quantity: 3, quality: 1 },
    ],
    resources: BERRY_NODES.map((node) => ({
      ...node,
      position: { ...node.position },
      areaId: 'glade',
      available: true,
      respawnAt: 0,
    })),
    crop: { id: 'crop-feed', plantedAt: null, watered: false, readyAt: null },
    shedLevel: 0,
    flags: [],
    journal: [
      `Welcome to Bramblewick. ${STARTER.name} is waiting to meet you. Walk close, then offer a little care.`,
    ],
    training: null,
  };
}

/** The sole owner of game rules. Rendering and persistence consume its state. */
export class LocalGameHost {
  private readonly current: GameState;

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
    return {
      name: foraging.name,
      label: stage.label,
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

  private berryWorkReason(mode: 'command' | 'autonomous', node?: ResourceNode): string | undefined {
    const critter = this.critter;
    const stage = learnedStage(critter, foraging).id;
    if (this.state.training) return `${critter.name} is busy with the current activity.`;
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
    if (this.state.training) return false;
    if (command.type === 'move') return this.move(command.x, command.z, command.seconds);
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
      const cycle = (training.elapsed * (training.kind === 'race' ? 0.9 : 0.72)) % 2;
      training.phase = cycle <= 1 ? cycle : 2 - cycle;
    }
    this.companion(dt);
  }

  interaction(): Interaction | null {
    if (this.state.training) return null;
    const state = this.state;
    const candidates = [
      ...AREAS[state.areaId].objects.map((object) => ({
        id: object.id,
        position: object.position,
      })),
      ...state.resources.filter((node) => node.areaId === state.areaId),
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
        distance(activeCritter(state).position, state.player.position) <=
        GAME_CONFIG.interactionDistance
      );
    const node = state.resources.find((item) => item.id === id && item.areaId === state.areaId);
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
    const object = AREAS[state.areaId].objects.find((item) => item.id === id);
    if (!object) return null;
    switch (object.kind) {
      case 'house':
        return {
          id,
          title: 'Your little cottage',
          description:
            'Sleep restores both energies to 100 at 8:00 tomorrow; hunger carries over. For daytime recovery, rest together at the nook.',
          actions: [action('sleep', 'Turn in for the night · tomorrow 8:00')],
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
      case 'crop': {
        const crop = state.crop;
        if (crop.plantedAt === null)
          return {
            id,
            title: 'A small feed garden',
            description:
              'Grow a little food for a very good companion. Every harvest yields three feed and a seed.',
            actions: [
              action(
                'plant',
                'Plant feed seeds · 1 seed · 5 energy · 15 min',
                this.quantity('seed') < 1 ? 'Buy a seed at the stall.' : energy(5),
              ),
            ],
          };
        if (!crop.watered)
          return {
            id,
            title: 'Thirsty little seedlings',
            description: 'A drink of water will get these growing.',
            actions: [action('water', 'Water the garden · 3 energy · 10 min', energy(3))],
          };
        const ready = crop.readyAt !== null && crop.readyAt <= state.totalMinutes;
        return {
          id,
          title: ready ? 'Dinner is growing!' : 'The garden is growing',
          description: ready
            ? `A pocketful of fresh feed for ${critter.name}.`
            : `Ready in ${Math.max(1, Math.ceil((crop.readyAt ?? state.totalMinutes) - state.totalMinutes))} game minutes. Take ${critter.name} for a walk while it grows.`,
          actions: [
            action(
              'harvest',
              'Harvest · 3 feed + 1 seed · 4 energy · 15 min',
              !ready ? 'Let it grow a little longer.' : energy(4),
            ),
          ],
        };
      }
      case 'training':
        return {
          id,
          title: 'A little practice, a little progress',
          description: `Three encouraging cues. Tap near the center. Happiness, bond, a full tummy, timing, and endurance improve speed gains. Energy is spent when you start.`,
          actions: [
            action(
              'train',
              `Practice hoops · ${GAME_CONFIG.practiceEnergy} ${critter.name} energy · 5 yours · 40 min + cues`,
              critter.hunger > 80
                ? `${critter.name} is too hungry to concentrate.`
                : energy(5, GAME_CONFIG.practiceEnergy),
            ),
          ],
        };
      case 'market':
        return {
          id,
          title: 'The honesty stall',
          description: `${this.quantity('berry')} berries in your basket. Better harvests earn better prices. Leave produce; take what you need.`,
          actions: [
            action(
              'sell',
              `Sell berries · ${this.berryValue()} coins · 5 min`,
              !this.quantity('berry') ? 'Your basket has no berries yet.' : undefined,
            ),
            action(
              'buy-feed',
              'Buy feed · 2 coins',
              state.player.coins < 2 ? 'You need 2 coins.' : undefined,
            ),
            action(
              'buy-seed',
              'Buy seeds · 1 coin',
              state.player.coins < 1 ? 'You need 1 coin.' : undefined,
            ),
          ],
        };
      case 'gate':
        return {
          id,
          title: object.name,
          description:
            state.areaId === 'homestead'
              ? `Follow the path with ${critter.name}. There are sunberries waiting beyond the fence.`
              : 'A cozy nook and a familiar garden are just down the path.',
          actions: [
            action(
              'travel',
              state.areaId === 'homestead'
                ? 'Explore Clover Glade · 10 min'
                : 'Return to Bramblewick · 10 min',
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
              critter.competitions.some((result) => result.day === state.day)
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
    switch (action) {
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
      case 'plant':
        this.take('seed', 1);
        state.player.stamina -= 5;
        state.crop.plantedAt = state.totalMinutes;
        state.crop.watered = false;
        state.crop.readyAt = null;
        this.advanceMinutes(15);
        this.note('Feed seeds tucked into the soil. Give them a little water.');
        return true;
      case 'water':
        state.player.stamina -= 3;
        state.crop.watered = true;
        state.crop.readyAt = state.totalMinutes + GAME_CONFIG.cropGrowthMinutes;
        this.advanceMinutes(10);
        this.flag('gardened');
        this.note('The feed garden is watered. It will be ready in about three game hours.');
        return true;
      case 'harvest':
        state.player.stamina -= 4;
        this.add('feed', 3);
        this.add('seed', 1);
        state.crop.plantedAt = null;
        state.crop.watered = false;
        state.crop.readyAt = null;
        this.advanceMinutes(15);
        this.flag('grew-feed');
        this.note('Three bundles of fresh feed, and a seed for the next planting.');
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
        };
        this.note(
          action === 'train'
            ? `${critter.name} crouches at the first hoop. Give three cues near the center!`
            : `${critter.name} takes a place on the starting line. Three good cues; one happy runner.`,
        );
        return true;
      case 'sell': {
        const amount = this.berryValue();
        state.player.coins += amount;
        state.inventory = state.inventory.filter((item) => item.itemId !== 'berry');
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
        this.note('One packet of feed seeds, ready for the garden.');
        return true;
      case 'travel':
        state.areaId = state.areaId === 'homestead' ? 'glade' : 'homestead';
        state.areaInstanceId = `local-${state.areaId}`;
        state.player.position = state.areaId === 'glade' ? { x: -6, z: 0 } : { x: 6, z: 0 };
        critter.position = { x: state.player.position.x, z: 1.2 };
        this.advanceMinutes(10);
        this.flag('explored');
        this.note(
          state.areaId === 'glade'
            ? `Clover Glade smells of warm grass and sunberries. ${critter.name}’s ears perk up.`
            : `Home again. The honesty stall takes berries, and ${critter.name}’s nook could use some love.`,
        );
        return true;
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
    const step = Math.min(seconds, 0.1) * GAME_CONFIG.movementSpeed;
    const position = this.state.player.position;
    const edge = AREAS[this.state.areaId].halfSize - 0.5;
    const next = {
      x: clamp(position.x + (x / length) * step, -edge, edge),
      z: clamp(position.z + (z / length) * step, -edge, edge),
    };
    const solid = AREAS[this.state.areaId].objects.filter(
      (item) => item.kind === 'house' || item.kind === 'shed',
    );
    const clear = (point: Point) =>
      solid.every((item) => distance(point, item.position) >= item.radius + 0.3);
    if (clear(next)) this.state.player.position = next;
    else if (clear({ x: next.x, z: position.z }))
      this.state.player.position = { x: next.x, z: position.z };
    else if (clear({ x: position.x, z: next.z }))
      this.state.player.position = { x: position.x, z: next.z };
    return distance(position, this.state.player.position) > 0;
  }

  private trainingHit(): boolean {
    const state = this.state;
    const training = state.training;
    if (
      !training ||
      training.critterId !== state.activeCritterId ||
      training.elapsed - (training.lastHitAt ?? 0) < 0.3
    )
      return false;
    training.hits.push(clamp(1 - Math.abs(training.phase - 0.5) * 2, 0, 1));
    training.lastHitAt = training.elapsed;
    if (training.hits.length < 3) return true;
    const accuracy = training.hits.reduce((sum, value) => sum + value, 0) / 3;
    const critter = activeCritter(state);
    const care = (critter.happiness + critter.bond + (100 - critter.hunger)) / 300;
    if (training.kind === 'training') {
      const gain =
        Math.round((0.25 + accuracy * 0.8 + care * 0.35 + critter.stats.endurance * 0.008) * 100) /
        100;
      critter.stats.speed = Math.round((critter.stats.speed + gain) * 100) / 100;
      critter.stats.endurance = Math.round((critter.stats.endurance + gain * 0.35) * 100) / 100;
      critter.skills.racing += 1;
      critter.bond = clamp(critter.bond + 2);
      this.flag('trained');
      this.advanceMinutes(40);
      this.note(
        `${accuracy > 0.75 ? 'Lovely rhythm!' : accuracy > 0.4 ? 'Good practice!' : 'Every little try counts.'} ${critter.name} gains ${gain.toFixed(2)} speed. ${Math.round(critter.stamina)} energy left; rest together at the nook to recover.`,
      );
    } else {
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
    return true;
  }

  private gather(node: ResourceNode, actor: 'player' | 'command' | 'autonomous'): void {
    const state = this.state;
    const critter = activeCritter(state);
    const quality =
      actor === 'player'
        ? 1
        : Math.min(
            3,
            1 +
              Math.floor(
                (critter.skills.harvesting + critter.stats.intelligence * 0.5 + critter.bond / 20) /
                  8,
              ),
          );
    const amount =
      actor === 'player'
        ? 2
        : 2 +
          (this.random() <
          Math.min(0.75, critter.skills.harvesting / 20 + critter.stats.intelligence / 40)
            ? 1
            : 0);
    this.add('berry', amount, quality);
    node.available = false;
    node.respawnAt = state.totalMinutes + GAME_CONFIG.berryRespawnMinutes;
    if (actor === 'player') {
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
    }
  }

  private companion(seconds: number): void {
    const state = this.state;
    const critter = activeCritter(state);
    let target: Point = state.player.position;
    const harvest = this.berryOpportunity();
    if (harvest) target = harvest.position;
    const gap = distance(critter.position, target);
    const stop = harvest ? 0.7 : 1.15;
    if (gap > stop) {
      const step = Math.min(gap - stop, seconds * 3.6);
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
    const previousDay = state.day;
    state.totalMinutes += minutes;
    state.day = Math.floor(state.totalMinutes / 1440) + 1;
    state.minute = state.totalMinutes % 1440;
    activeCritter(state).hunger = clamp(activeCritter(state).hunger + minutes * 0.025);
    if (state.day > previousDay) {
      activeCritter(state).ageDays += state.day - previousDay;
      state.flags = state.flags.filter((flag) => flag !== 'petted-today');
    }
    for (const node of state.resources)
      if (!node.available && node.respawnAt <= state.totalMinutes) node.available = true;
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
    this.flag('slept');
    this.note(
      `Day ${state.day}. A soft morning at Bramblewick. Everyone is rested${state.crop.readyAt !== null && state.crop.readyAt <= state.totalMinutes ? ', and your feed garden is ready' : ''}.`,
    );
  }

  private quantity(itemId: InventoryItem['itemId']): number {
    return this.state.inventory
      .filter((item) => item.itemId === itemId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }
  private berryValue(): number {
    return this.state.inventory
      .filter((item) => item.itemId === 'berry')
      .reduce((sum, item) => sum + item.quantity * item.quality, 0);
  }
  private add(itemId: InventoryItem['itemId'], quantity: number, quality = 1): void {
    const stack = this.state.inventory.find(
      (item) => item.itemId === itemId && item.quality === quality,
    );
    if (stack) stack.quantity += quantity;
    else this.state.inventory.push({ id: `stack-${itemId}-${quality}`, itemId, quantity, quality });
  }
  private take(itemId: InventoryItem['itemId'], quantity: number): void {
    for (const stack of this.state.inventory.filter((item) => item.itemId === itemId)) {
      const amount = Math.min(stack.quantity, quantity);
      stack.quantity -= amount;
      quantity -= amount;
      if (!quantity) break;
    }
    this.state.inventory = this.state.inventory.filter((item) => item.quantity > 0);
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
