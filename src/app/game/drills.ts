import { DRILL_GAIN_STEPS } from './content';
import { Critter, Drill, Training } from './model';

// M8 provisional gauge tuning. Physics are pure so tests can step them with fixed time.
export const LIFT_BAND = [0.55, 0.8] as const;
export const PACE_STEADY = [0.5, 0.65] as const;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

export function drillMultiplier(critter: Critter, drill: Drill, day: number): number {
  const done = critter.drills.day === day ? (critter.drills.sessions[drill] ?? 0) : 0;
  return DRILL_GAIN_STEPS[Math.min(done, DRILL_GAIN_STEPS.length - 1)];
}

export function recordDrill(critter: Critter, drill: Drill, day: number): void {
  if (critter.drills.day !== day) critter.drills = { day, sessions: {} };
  critter.drills.sessions[drill] = (critter.drills.sessions[drill] ?? 0) + 1;
}

/** A heavier exhibition stone falls faster and needs a shorter hold. Strength slows the fall. */
export function liftSettings(critter: Critter, heavy: boolean) {
  return {
    hold: heavy ? 2.5 : 3,
    limit: heavy ? 9 : 10,
    decay: 0.42 + (heavy ? 0.06 : 0) - Math.min(0.2, critter.stats.strength * 0.012),
  };
}

export function startGauge(training: Training): void {
  training.meter = 0.3;
  training.progress = 0;
  training.elapsed = 0;
  training.lastHitAt = 0;
  if (training.kind === 'pace') {
    training.reserve = 1;
    training.stage = 0;
  }
}

/** Advances a lift; returns true when it is complete or out of time. */
export function stepLift(training: Training, critter: Critter, dt: number, heavy = false): boolean {
  const settings = liftSettings(critter, heavy);
  training.meter = clamp01((training.meter ?? 0) - settings.decay * dt);
  if (training.meter >= LIFT_BAND[0] && training.meter <= LIFT_BAND[1])
    training.progress = Math.min(1, (training.progress ?? 0) + dt / settings.hold);
  return (training.progress ?? 0) >= 1 || training.elapsed >= settings.limit;
}

export function liftScore(training: Training, critter: Critter, heavy = false): number {
  const settings = liftSettings(critter, heavy);
  const progress = training.progress ?? 0;
  if (progress < 1) return progress * 0.6;
  return Math.max(
    0.6,
    Math.min(1, 1 - Math.max(0, training.elapsed - settings.hold - 0.5) / settings.limit),
  );
}

export function paceRate(critter: Critter): number {
  return 0.15 + critter.stats.speed * 0.005;
}

/** Advances a lap. Running above the steady zone spends breath; empty breath means winded. */
export function stepPace(training: Training, critter: Critter, dt: number): boolean {
  const winded = training.stage === 1;
  let pace = Math.max(0, (training.meter ?? 0) - 0.25 * dt);
  if (winded) pace = Math.min(pace, 0.35);
  training.meter = pace;
  const drain =
    pace > PACE_STEADY[1]
      ? (pace - PACE_STEADY[1]) * 1.6 * (1 - Math.min(0.5, critter.stats.endurance * 0.03))
      : pace < PACE_STEADY[0]
        ? -0.08
        : 0;
  training.reserve = clamp01((training.reserve ?? 1) - drain * dt);
  if (training.reserve === 0) training.stage = 1;
  else if (winded && training.reserve >= 0.3) training.stage = 0;
  training.progress = Math.min(1, (training.progress ?? 0) + pace * paceRate(critter) * dt);
  return training.progress >= 1 || training.elapsed >= 18;
}

export function paceScore(training: Training): number {
  const progress = training.progress ?? 0;
  if (progress < 1) return progress * 0.5;
  return (
    Math.max(0.4, Math.min(1, 1.6 - training.elapsed / 10)) *
    (0.75 + 0.25 * (training.reserve ?? 0))
  );
}

export function push(training: Training): void {
  const cap = training.kind === 'pace' && training.stage === 1 ? 0.35 : 1;
  training.meter = Math.min(cap, (training.meter ?? 0) + (training.kind === 'pace' ? 0.1 : 0.12));
}
