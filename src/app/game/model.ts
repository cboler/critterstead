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
export interface Critter {
  id: string;
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
  berryKnowledge: number;
  skills: { harvesting: number; racing: number };
  visualTraits: { coat: string; accent: string };
  pedigree: { parentIds: string[] };
  genetics: Record<string, string>;
  history: string[];
  competitions: { day: number; time: number; medal: string }[];
}
export interface InventoryItem {
  id: string;
  itemId: 'berry' | 'feed' | 'seed';
  quantity: number;
  quality: number;
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
  phase: number;
  hits: number[];
  elapsed: number;
  lastHitAt?: number;
  kind: 'training' | 'race';
}
export interface GameState {
  version: 1;
  seed: number;
  day: number;
  minute: number;
  totalMinutes: number;
  areaId: AreaId;
  areaInstanceId: string;
  player: { id: string; position: Point; stamina: number; coins: number };
  critter: Critter;
  inventory: InventoryItem[];
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
