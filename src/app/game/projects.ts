import { BEHAVIORS } from './content';
import { AreaId, BehaviorId, Critter, DutyId, GameState, Point, ProjectId } from './model';

/**
 * The chore board and building projects (D56). Duties rest on what a critter has learned and
 * run at fixed hours; projects are paid in lumber and stone delivered to a building site.
 * Every number here is provisional, to be tuned in play.
 */

export interface DutyDefinition {
  id: DutyId;
  name: string;
  // What the critter does, in a phrase after its name.
  doing: string;
  // Minute of the day the chore is done.
  at: number;
  // The learned behavior it rests on.
  needs: BehaviorId;
}

export const DUTIES: readonly DutyDefinition[] = [
  {
    id: 'forage',
    name: 'Forage the glade',
    doing: 'brings two fine berries from the glade to the yard chest',
    at: 660,
    needs: 'sunberry-foraging',
  },
  {
    id: 'haul',
    name: 'Haul lumber',
    doing: 'carries the sawmill’s lumber to the yard chest',
    at: 840,
    needs: 'lumber-hauling',
  },
  {
    id: 'deliver',
    name: 'Deliver building materials',
    doing: 'takes lumber and stone from the yard chest to the building site',
    at: 900,
    needs: 'lumber-hauling',
  },
  {
    id: 'stock',
    name: 'Stock the feed trough',
    doing: 'tops up the trough with feed from the yard chest',
    at: 1020,
    needs: 'lumber-hauling',
  },
  {
    id: 'ship',
    name: 'Ship produce',
    doing: 'carries berries, turnips and wheat from the farm box to the sales pickup',
    at: 1080,
    needs: 'lumber-hauling',
  },
];

export const CHORE = {
  // Energy a chore costs, and the reserve a critter keeps for itself.
  energy: 4,
  reserve: 20,
  // How much one critter moves in one chore.
  haul: 2,
  deliver: 3,
  ship: 4,
} as const;

/** Every duty on: what barn critters did before the chore board, and a new critter's start. */
export const allDuties = (): Record<DutyId, boolean> => ({
  forage: true,
  haul: true,
  deliver: true,
  stock: true,
  ship: true,
});

/** Whether a critter has learned what a duty needs, so it can do it unasked. */
export function dutyLearned(critter: Critter, duty: DutyId): boolean {
  const definition = DUTIES.find((item) => item.id === duty)!;
  const behavior = BEHAVIORS[definition.needs];
  const autonomous = behavior.stages.find((stage) => stage.id === 'autonomous')!;
  return (critter.learnedBehaviors[definition.needs] ?? 0) >= autonomous.threshold;
}

/** How to teach a duty's behavior, for a critter that has not learned it. */
export function dutyLesson(duty: DutyId): string {
  return DUTIES.find((item) => item.id === duty)!.needs === 'sunberry-foraging'
    ? 'Learns by watching you pick sunberries in the glade, then picking on your cue.'
    : 'Learns by watching you carry lumber from the sawmill to the yard chest, then on your cue.';
}

export interface ProjectDefinition {
  id: ProjectId;
  name: string;
  // What building it does, for the plan's description.
  blurb: string;
  // Where it is planned (an object or container id) and where materials are left.
  target: string;
  areaId: AreaId;
  site: Point;
  lumber: number;
  stone: number;
  coins: number;
  minutes: number;
  // Rancher energy spent building.
  energy: number;
  // The journal's line when it is finished.
  finished: string;
}

export const PROJECTS: Record<ProjectId, ProjectDefinition> = {
  stall: {
    id: 'stall',
    name: 'Another barn stall',
    blurb: 'Room in the barn for one more critter.',
    target: 'shed',
    areaId: 'homestead',
    site: { x: -1.1, z: -2.4 },
    lumber: 4,
    stone: 0,
    coins: 20,
    minutes: 90,
    energy: 12,
    finished: 'Sawdust, pegs and a fresh bed of straw: the barn has {stalls} stalls now.',
  },
  chest: {
    id: 'chest',
    name: 'A bigger yard chest',
    blurb: 'Raised sides and a second lid: the yard chest holds 96 instead of 64.',
    target: 'yard-chest',
    areaId: 'homestead',
    site: { x: 0.8, z: 3.4 },
    lumber: 3,
    stone: 0,
    coins: 0,
    minutes: 45,
    energy: 8,
    finished: 'The yard chest stands taller, with room for 96.',
  },
  trough: {
    id: 'trough',
    name: 'A deeper feed trough',
    blurb: 'A stone footing and higher boards: the trough holds 16 feed instead of 8.',
    target: 'feed-trough',
    areaId: 'homestead',
    site: { x: 8.6, z: -1 },
    lumber: 2,
    stone: 1,
    coins: 0,
    minutes: 45,
    energy: 8,
    finished: 'The trough sits deeper on its stone footing, with room for 16 feed.',
  },
  mill: {
    id: 'mill',
    name: 'Larger sawmill hoppers',
    blurb: 'The timber hopper and lumber crate each hold 8 instead of 4.',
    target: 'mill-input',
    areaId: 'homestead',
    site: { x: 8.4, z: 1.2 },
    lumber: 4,
    stone: 2,
    coins: 15,
    minutes: 90,
    energy: 12,
    finished: 'Wider hoppers on stone legs: the sawmill takes 8 timber and holds 8 lumber.',
  },
  stove: {
    id: 'stove',
    name: 'A kitchen stove',
    blurb: 'An iron stove beside the hearth, for cooking feed from wheat and turnips.',
    target: 'hearth',
    areaId: 'cottage',
    site: { x: 1.4, z: -2.6 },
    lumber: 4,
    stone: 4,
    coins: 30,
    minutes: 120,
    energy: 15,
    finished: 'The stove is in, set on a stone hearth. Wheat and turnips can become feed now.',
  },
};
export const PROJECT_IDS = Object.keys(PROJECTS) as ProjectId[];

// Bigger containers once their project is built.
const UPGRADED_CAPACITY: Record<string, { project: ProjectId; capacity: number }> = {
  'yard-chest': { project: 'chest', capacity: 96 },
  'feed-trough': { project: 'trough', capacity: 16 },
  'mill-input': { project: 'mill', capacity: 8 },
  'mill-output': { project: 'mill', capacity: 8 },
};

/** A container's capacity given the upgrades built so far. */
export function upgradedCapacity(
  containerId: string,
  capacity: number | null,
  built: readonly ProjectId[],
): number | null {
  const upgrade = UPGRADED_CAPACITY[containerId];
  return upgrade && built.includes(upgrade.project) ? upgrade.capacity : capacity;
}

// Cooking at the stove, from the backpack.
export const STOVE = { wheat: 1, turnip: 1, feed: 3, minutes: 20 } as const;

/** Why a project cannot be planned now, or undefined if it can. */
export function planBlocked(
  state: GameState,
  id: ProjectId,
  maxStalls: number,
): string | undefined {
  if (state.project)
    return state.project.id === id
      ? 'Already planned. Bring materials to the building site.'
      : `Finish or set aside ${PROJECTS[state.project.id].name.toLowerCase()} first.`;
  if (id === 'stall') {
    if (!state.shedLevel) return 'Mend the barn first.';
    if (Math.min(maxStalls, 1 + state.shedLevel) >= maxStalls)
      return 'The barn is as big as it gets.';
    return undefined;
  }
  return state.built.includes(id) ? 'Already built.' : undefined;
}

/** What a project still needs at its site. */
export function stillNeeded(state: GameState): { lumber: number; stone: number } {
  if (!state.project) return { lumber: 0, stone: 0 };
  const plan = PROJECTS[state.project.id];
  return {
    lumber: Math.max(0, plan.lumber - state.project.delivered.lumber),
    stone: Math.max(0, plan.stone - state.project.delivered.stone),
  };
}

/** A project's needs and delivery so far, in a short line. */
export function projectProgress(state: GameState): string {
  if (!state.project) return '';
  const plan = PROJECTS[state.project.id];
  const parts = [`lumber ${state.project.delivered.lumber}/${plan.lumber}`];
  if (plan.stone) parts.push(`stone ${state.project.delivered.stone}/${plan.stone}`);
  return parts.join(' · ');
}
