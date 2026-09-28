import { ActorCapabilities, CheckResult, InventoryItem, Stats } from './model';

// Campaign 001 provisional tuning: fractional skill levels are earned experience.
// No random draw: the same capabilities and task always give the same result.
export function resolveCheck(
  actor: ActorCapabilities,
  skill: string,
  statWeights: Partial<Stats>,
  toolQuality: number,
  difficulty: number,
): CheckResult {
  const proficiency = actor.skills[skill] ?? 0;
  const weighted = Object.entries(statWeights).reduce(
    (sum, [stat, weight]) => sum + actor.stats[stat as keyof Stats] * weight,
    0,
  );
  // A novice can wield the starter tool; mastery realizes advanced tool quality.
  const tool = 1 + Math.max(0, toolQuality - 1) * Math.min(1, proficiency / 25);
  const degree = Math.max(
    -1,
    Math.min(1, (proficiency + weighted + tool - difficulty) / difficulty),
  );
  return {
    degree,
    staminaCost: Math.max(2, Math.ceil(7 - degree * 3 - actor.stats.endurance * 0.04)),
    timeMinutes: Math.max(2, Math.ceil(9 - degree * 4)),
    durationSeconds: Math.max(0.8, 2.8 - degree - actor.stats.speed * 0.025),
    damage: degree < -0.5 ? 1 : degree < 0.25 ? 2 : 3,
    skillXpGained: 0.35,
    statXpGained: Object.fromEntries(
      Object.entries(statWeights).map(([stat, weight]) => [stat, weight * 0.035]),
    ),
  };
}

export function applyExperience(
  actor: ActorCapabilities,
  skill: string,
  result: CheckResult,
): void {
  actor.skills[skill] = Math.min(99, (actor.skills[skill] ?? 0) + result.skillXpGained);
  for (const [stat, amount] of Object.entries(result.statXpGained)) {
    const key = stat as keyof Stats;
    actor.stats[key] = Math.min(999, actor.stats[key] + amount);
  }
}

export const ITEM_MASS: Record<InventoryItem['itemId'], number> = {
  berry: 0.1,
  feed: 0.2,
  seed: 0.05,
  timber: 8,
  stone: 12,
  lumber: 4,
};

export function encumbrance(actor: ActorCapabilities, items: InventoryItem[]) {
  const mass = items.reduce((sum, item) => sum + ITEM_MASS[item.itemId] * item.quantity, 0);
  const capacity = 12 + actor.stats.strength * 4;
  const ratio = mass / capacity;
  const band =
    ratio > 1.5 ? 'Overloaded' : ratio > 1 ? 'Heavy' : ratio > 0.5 ? 'Moderate' : 'Light';
  return {
    mass,
    capacity,
    band,
    speed: ratio > 1.5 ? 0 : ratio > 1 ? 0.42 : ratio > 0.5 ? 0.72 : 1,
    drain: ratio > 1 ? 0.35 : ratio > 0.5 ? 0.14 : 0,
  };
}
