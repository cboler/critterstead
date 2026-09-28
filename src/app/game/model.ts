export type AreaId = 'homestead' | 'glade';
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
  visualTraits: { coat: string; accent: string };
  pedigree: { parentIds: string[] };
  genetics: Record<string, string>;
  history: string[];
  competitions: { day: number; time: number; medal: string }[];
}
export interface InventoryItem {
  id: string;
  itemId: 'berry' | 'feed' | 'seed' | 'timber' | 'stone' | 'lumber';
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
export interface Crop {
  id: string;
  plantedAt: number | null;
  watered: boolean;
  readyAt: number | null;
}
export interface Training {
  critterId: string;
  phase: number;
  hits: number[];
  elapsed: number;
  lastHitAt?: number;
  kind: 'training' | 'race';
}
export interface GameState {
  version: 6;
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
  crop: Crop;
  shedLevel: number;
  flags: string[];
  journal: string[];
  training: Training | null;
}
export type GameCommand =
  | { type: 'move'; x: number; z: number; seconds: number }
  | { type: 'interact'; targetId: string; action: string }
  | { type: 'training-hit' }
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
  kind: 'house' | 'shed' | 'crop' | 'training' | 'market' | 'gate' | 'race';
  name: string;
  position: Point;
  radius: number;
}
export interface AreaDefinition {
  id: AreaId;
  name: string;
  subtitle: string;
  halfSize: number;
  objects: WorldObject[];
  spawn: Point;
}

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
