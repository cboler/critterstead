import { AREAS, BERRY_NODES, GAME_CONFIG, STARTER } from './content';
import {
  activeCritter,
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

export function knowledgeStage(knowledge: number): string {
  if (knowledge >= GAME_CONFIG.autonomousKnowledge) return 'Independent forager';
  if (knowledge >= GAME_CONFIG.commandedKnowledge) return 'Harvests on cue';
  if (knowledge > 0) return 'Learning by watching';
  return 'Curious companion';
}

export function createInitialState(): GameState {
  return {
    version: 2,
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
        berryKnowledge: 0,
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
        ? 'You need some rest.'
        : critter.stamina < companion
          ? `${critter.name} needs some rest.`
          : undefined;
    if (id === critter.id)
      return {
        id,
        title: `A moment with ${critter.name}`,
        description: `${knowledgeStage(critter.berryKnowledge)}. ${critter.hunger > 55 ? 'Their tummy is rumbling.' : 'Your companion leans into your company.'}`,
        actions: [
          action(
            'pet',
            'Give a little scritch',
            critter.lastPettedDay === state.day
              ? `${critter.name} has had today’s scritches.`
              : undefined,
          ),
          action(
            'feed',
            'Offer feed · 1 feed',
            this.quantity('feed') < 1
              ? 'Grow feed in your garden or buy it at the stall.'
              : critter.hunger < 10
                ? `${critter.name} is comfortably full.`
                : undefined,
          ),
          action(
            'treat',
            'Berry treat · 1 berry',
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
          ? `Sweet little berries. ${critter.name}’s knowledge: ${critter.berryKnowledge}/7. Watch three harvests, then try giving a cue.`
          : `Picked clean. Fresh berries in ${Math.max(1, Math.ceil(node.respawnAt - state.totalMinutes))} game minutes.`,
        actions: [
          action(
            'gather',
            'Gather · 6 energy · 15 min',
            !node.available ? 'These berries are growing back.' : energy(6),
          ),
          action(
            'critter-gather',
            `Ask ${critter.name} to gather · 8 ${critter.name} energy · 20 min`,
            !node.available
              ? 'These berries are growing back.'
              : critter.berryKnowledge < GAME_CONFIG.commandedKnowledge
                ? `Let ${critter.name} watch you harvest three times.`
                : critter.hunger > 80
                  ? `Feed ${critter.name} before asking for more work.`
                  : distance(critter.position, node.position) > 5
                    ? `Wait for ${critter.name} to catch up.`
                    : energy(2, 8),
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
          description: `Rest until 8:00 tomorrow. Energy returns, crops grow, and ${critter.name} gets a little older.`,
          actions: [action('sleep', 'Turn in for the night')],
        };
      case 'shed':
        return {
          id,
          title: state.shedLevel ? 'A proper snug little nook' : `${critter.name}’s weathered nook`,
          description: state.shedLevel
            ? `Fresh timber, a warm roof, and a softer bed. ${critter.name} wakes happier here.`
            : 'Give your companion a warm roof and a cozy bed. A small start for a happy homestead.',
          actions: [
            action(
              'upgrade',
              'Make it cozy · 12 coins',
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
                'Plant feed seeds · 1 seed · 5 energy',
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
              'Harvest · 3 feed + 1 seed · 4 energy',
              !ready ? 'Let it grow a little longer.' : energy(4),
            ),
          ],
        };
      }
      case 'training':
        return {
          id,
          title: 'A little practice, a little progress',
          description: `Three encouraging cues. Tap when the marker reaches the center. Care, timing, and endurance shape ${critter.name}’s progress.`,
          actions: [
            action(
              'train',
              `Practice hoops · 15 ${critter.name} energy · 5 energy`,
              critter.hunger > 80 ? `${critter.name} is too hungry to concentrate.` : energy(5, 15),
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
              `Sell berries · ${this.berryValue()} coins`,
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
              state.areaId === 'homestead' ? 'Explore Clover Glade' : 'Return to Bramblewick',
            ),
          ],
        };
      case 'race':
        return {
          id,
          title: 'The Clover Cup',
          description: `One friendly time trial each day. Three well-timed cues help ${critter.name} run at their best. Speed, endurance, and good care matter.`,
          actions: [
            action(
              'race',
              `Run the trial · 20 ${critter.name} energy · 5 energy`,
              critter.competitions.some((result) => result.day === state.day)
                ? 'Today’s trial is complete. Come back tomorrow.'
                : critter.hunger > 80
                  ? `${critter.name} needs a meal before racing.`
                  : energy(5, 20),
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
      case 'treat':
        this.take(action === 'feed' ? 'feed' : 'berry', 1);
        critter.hunger = clamp(critter.hunger - (action === 'feed' ? 35 : 15));
        critter.stamina = clamp(critter.stamina + (action === 'feed' ? 10 : 3));
        critter.happiness = clamp(critter.happiness + 4);
        critter.bond = clamp(critter.bond + 2);
        this.flag('cared');
        this.advanceMinutes(5);
        this.note(
          action === 'feed'
            ? `${critter.name} crunches the feed with great seriousness. A happy, well-fed companion.`
            : 'A sunberry disappears in one delighted nibble.',
        );
        return true;
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
        critter.stamina -= action === 'train' ? 15 : 20;
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
        `${accuracy > 0.75 ? 'Lovely rhythm!' : accuracy > 0.4 ? 'Good practice!' : 'Every little try counts.'} ${critter.name} gains ${gain.toFixed(2)} speed. Allow some rest between sessions.`,
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
        `${time.toFixed(1)} seconds! ${critter.name} earns a ${medal} ribbon and ${coins} coins. Today’s trial is complete.`,
      );
    }
    critter.happiness = clamp(critter.happiness + 3);
    state.training = null;
    return true;
  }

  private gather(node: ResourceNode, actor: 'player' | 'command' | 'autonomous'): void {
    const state = this.state;
    const critter = activeCritter(state);
    const before = knowledgeStage(critter.berryKnowledge);
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
      if (distance(critter.position, node.position) < 5) critter.berryKnowledge += 1;
      this.advanceMinutes(15);
      this.note(
        `You pick ${amount} sunberries. ${distance(critter.position, node.position) < 5 ? `${critter.name} watches your hands carefully.` : `${critter.name} was too far away to watch this time.`}`,
      );
    } else {
      critter.stamina -= 8;
      critter.skills.harvesting += 1;
      critter.berryKnowledge = Math.min(20, critter.berryKnowledge + (actor === 'command' ? 2 : 1));
      critter.bond = clamp(critter.bond + 1);
      if (actor === 'command') {
        state.player.stamina -= 2;
        this.advanceMinutes(20);
      }
      this.flag(actor === 'command' ? 'directed' : 'assisted');
      this.note(
        `${actor === 'autonomous' ? `On their own, ${critter.name}` : `At your cue, ${critter.name}`} gathers ${amount} ${quality > 1 ? 'fine ' : ''}sunberries. Good work, little one!`,
      );
    }
    this.flag('gathered');
    const after = knowledgeStage(critter.berryKnowledge);
    if (after !== before) {
      critter.history.push(`Day ${state.day}: ${after}.`);
      this.note(
        after === 'Harvests on cue'
          ? `${critter.name} understands! You can now ask for a harvest of berries near a bush.`
          : after === 'Independent forager'
            ? `A little light goes on. ${critter.name} will now gather nearby berries independently when rested and well-fed.`
            : `${critter.name} is learning what sunberries are for. Keep gathering together.`,
      );
    }
  }

  private companion(seconds: number): void {
    const state = this.state;
    const critter = activeCritter(state);
    let target: Point = state.player.position;
    let harvest: ResourceNode | undefined;
    if (
      !state.training &&
      critter.berryKnowledge >= GAME_CONFIG.autonomousKnowledge &&
      critter.bond >= 20 &&
      critter.hunger <= 80 &&
      critter.stamina >= 8
    ) {
      harvest = state.resources
        .filter(
          (node) =>
            node.areaId === state.areaId &&
            node.available &&
            distance(node.position, state.player.position) < 4.3,
        )
        .sort(
          (a, b) => distance(a.position, critter.position) - distance(b.position, critter.position),
        )[0];
      if (harvest) target = harvest.position;
    }
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
