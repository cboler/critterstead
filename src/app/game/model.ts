export type AreaId = 'homestead' | 'glade' | 'cottage' | 'colosseum' | 'town';
export type Drill = 'hoops' | 'lift' | 'pace' | 'toss' | 'beam' | 'run';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type Weather = 'sunny' | 'cloudy' | 'rain' | 'snow';
export type CropId = 'feed' | 'turnip' | 'wheat' | 'sunberry';
export interface Point {
  x: number;
  z: number;
}
export interface Stats {
  strength: number;
  endurance: number;
  speed: number;
  intelligence: number;
}
export interface ActorCapabilities {
  stats: Stats;
  skills: Record<string, number>;
}
export interface CheckResult {
  degree: number;
  staminaCost: number;
  timeMinutes: number;
  durationSeconds: number;
  damage: number;
  skillXpGained: number;
  statXpGained: Partial<Stats>;
}
export interface MaterialNode {
  id: string;
  areaId: AreaId;
  position: Point;
  kind: 'timber' | 'stone';
  remaining: number;
  respawnAt: number;
}
export interface GroundCargo {
  id: string;
  areaId: AreaId;
  position: Point;
  items: InventoryItem[];
}
export interface ResourceWork {
  nodeId: string;
  remainingSeconds: number;
  result: CheckResult;
}
export type BehaviorId = 'sunberry-foraging' | 'lumber-hauling';
export interface HaulingJob {
  enabled: boolean;
  phase: 'idle' | 'collect' | 'deliver' | 'eat' | 'rest';
  cued: boolean;
}
export interface BehaviorStage {
  id: 'unfamiliar' | 'observing' | 'cued' | 'autonomous';
  threshold: number;
  label: string;
  hint: string;
  milestone: string;
}
export interface BehaviorDefinition {
  id: BehaviorId;
  name: string;
  stages: readonly BehaviorStage[];
  gains: { observation: number; cue: number; autonomous: number };
  practiceCeiling: number;
  steps?: readonly ('collect' | 'deliver')[];
}
export interface Critter extends ActorCapabilities {
  id: string;
  ownerId: string;
  lastPettedDay: number | null;
  name: string;
  // A root family id (see families.ts) or a stabilized lineage such as Brindlekin.
  speciesId: string;
  ageDays: number;
  sex: 'female' | 'male';
  personality: string;
  position: Point;
  stats: Stats;
  stamina: number;
  health: number;
  happiness: number;
  bond: number;
  hunger: number;
  learnedBehaviors: Partial<Record<BehaviorId, number>>;
  hauling: HaulingJob;
  skills: Record<string, number> & { harvesting: number; racing: number };
  visualTraits: { coat: string; accent: string; size: number };
  pedigree: { parentIds: string[] };
  genetics: Record<string, string>;
  history: string[];
  // Completed training sessions per discipline on one game day, for diminishing returns.
  drills: { day: number; sessions: Partial<Record<Drill, number>> };
  // Sessions played together with the player, per drill, ever. One unlocks its routine.
  practised: Partial<Record<Drill, number>>;
  // Clover Cup entries have no event; exhibition entries store points in `time`.
  competitions: { day: number; time: number; medal: string; event?: 'exhibition' }[];
}
export interface InventoryItem {
  id: string;
  itemId:
    | 'berry'
    | 'feed'
    | 'seed'
    | 'timber'
    | 'stone'
    | 'lumber'
    | 'turnip'
    | 'wheat'
    | 'turnip-seed'
    | 'wheat-seed'
    | 'sunberry-seed';
  quantity: number;
  quality: number;
}
export interface Container {
  id: string;
  kind: 'backpack' | 'satchel' | 'chest' | 'mill-input' | 'mill-output' | 'trough';
  location: { actorId: string } | { areaId: AreaId; position: Point };
  // Carried bags use mass-based encumbrance. Fixed storage limits total item units.
  capacity: number | null;
  allowed: InventoryItem['itemId'][];
  items: InventoryItem[];
}
export interface ResourceNode {
  id: string;
  areaId: AreaId;
  position: Point;
  available: boolean;
  respawnAt: number;
}
export interface PlotCrop {
  speciesId: CropId;
  plantedAt: number;
  growthMinutes: number;
  withered: boolean;
}
export interface SoilPlot {
  id: string;
  position: Point;
  tilled: boolean;
  // Absolute game minute when the soil dries; growth accrues only before it.
  moistUntil: number;
  crop: PlotCrop | null;
}
export interface CropDefinition {
  name: string;
  seedItem: InventoryItem['itemId'];
  seedLabel: string;
  seedPrice: number;
  seasons: readonly Season[];
  growthMinutes: number;
  harvest: { itemId: InventoryItem['itemId']; quantity: number }[];
}
export interface Training {
  critterId: string;
  phase: number;
  hits: number[];
  elapsed: number;
  lastHitAt?: number;
  kind: 'training' | 'race' | 'lift' | 'pace' | 'toss' | 'beam' | 'run' | 'exhibition' | 'routine';
  // A routine: the drill the critter runs on its own; its score is drawn as it starts.
  drill?: Drill;
  // Wider timing windows, fixed when the activity starts.
  assist?: boolean;
  // Gauge drills: meter is force or pace, progress is 0-1 toward done, reserve is breath.
  // Log toss: meter is power, hits are throws, and chargeStart is when the charge began.
  // Balance beam: meter is where the critter leans, phase the drifting zone's centre, and
  // progress the crossing. Runner: meter is jump height, rise its upward speed, progress
  // the course, and hits one per obstacle. Seed shapes the drift or lays out the course.
  meter?: number;
  progress?: number;
  reserve?: number;
  // Exhibition: 0 sprint, 1 stone pull. Pacing: 1 while winded. Log toss: 1 while charging.
  // Balance beam: 1 while wobbling outside the zone. Runner: jumps used since landing.
  stage?: number;
  chargeStart?: number;
  rise?: number;
  seed?: number;
  scores?: number[];
}
export interface GameState {
  version: 11;
  seed: number;
  day: number;
  minute: number;
  totalMinutes: number;
  areaId: AreaId;
  areaInstanceId: string;
  player: ActorCapabilities & { id: string; position: Point; stamina: number; coins: number };
  materialNodes: MaterialNode[];
  groundCargo: GroundCargo[];
  work: ResourceWork | null;
  critters: Critter[];
  activeCritterId: string;
  containers: Container[];
  production: { progressMinutes: number };
  haulLesson: { critterId: string; lumber: number } | null;
  resources: ResourceNode[];
  plots: SoilPlot[];
  // In the cottage, a following companion comes inside; a working one stays in the yard.
  companionIndoors: boolean;
  shedLevel: number;
  flags: string[];
  journal: string[];
  training: Training | null;
}
export type GameCommand =
  | { type: 'move'; x: number; z: number; seconds: number }
  | { type: 'interact'; targetId: string; action: string }
  | { type: 'training-hit' }
  | { type: 'training-release' }
  // Balance beam: lean left (-1), right (1), or hold still (0).
  | { type: 'training-steer'; direction: number }
  | { type: 'drop-cargo' }
  | { type: 'debug'; action: 'next-day' | 'restore' };
export interface InteractionAction {
  id: string;
  label: string;
  disabled?: boolean;
  reason?: string;
}
export interface Interaction {
  id: string;
  title: string;
  description: string;
  actions: InteractionAction[];
}
export interface WorldObject {
  id: string;
  kind:
    | 'house'
    | 'shed'
    | 'training'
    | 'market'
    | 'gate'
    | 'race'
    | 'door'
    | 'bed'
    | 'calendar'
    | 'hearth'
    | 'counter'
    | 'lift'
    | 'pace'
    | 'toss'
    | 'beam'
    | 'run'
    | 'exhibition'
    | 'notices';
  name: string;
  position: Point;
  radius: number;
  // Gates: where they lead and where the rancher arrives.
  destination?: AreaId;
  arrival?: Point;
}
export interface AreaDefinition {
  id: AreaId;
  name: string;
  subtitle: string;
  halfSize: number;
  objects: WorldObject[];
  spawn: Point;
  // Scenery that blocks walking, beyond the solid objects.
  blockers?: Blocker[];
}
/** A circle (r) or an axis-aligned box (half sizes hx, hz) the rancher cannot walk into. */
export type Blocker =
  { x: number; z: number; r: number } | { x: number; z: number; hx: number; hz: number };

/** The one currently playable companion. Other individuals remain dormant in this slice. */
export function activeCritter(state: GameState): Critter {
  const critter = state.critters.find((individual) => individual.id === state.activeCritterId);
  if (!critter || critter.ownerId !== state.player.id)
    throw new Error('The selected companion must be a player-owned individual.');
  return critter;
}

export function backpack(state: GameState): Container {
  return state.containers.find(
    (container) =>
      container.kind === 'backpack' &&
      'actorId' in container.location &&
      container.location.actorId === state.player.id,
  )!;
}
export function satchel(state: GameState): Container {
  return state.containers.find(
    (container) =>
      container.kind === 'satchel' &&
      'actorId' in container.location &&
      container.location.actorId === state.activeCritterId,
  )!;
}
