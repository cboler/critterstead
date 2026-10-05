import { DRILL_GAIN_STEPS } from './content';
import { Critter, Drill, Training } from './model';

// M8 provisional gauge tuning. Physics are pure so tests can step them with fixed time.
export const LIFT_BAND = [0.55, 0.8] as const;
export const PACE_STEADY = [0.5, 0.65] as const;
// Plan 004 provisional log toss tuning: power rises for TOSS_RISE seconds, then falls back.
export const TOSS_RISE = 1.2;
export const TOSS_PEAK = 0.82;
export const TOSS_LIMIT = 25;
// A press held at least this long throws on release; a shorter tap leaves the charge running.
export const TOSS_HOLD = 0.25;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

/** The wider-timing assist grows every green zone by 40% of its width. */
function widen(band: readonly [number, number], assist?: boolean): [number, number] {
  const extra = assist ? (band[1] - band[0]) * 0.2 : 0;
  return [clamp01(band[0] - extra), clamp01(band[1] + extra)];
}
export const liftBand = (training: Training) => widen(LIFT_BAND, training.assist);
export const paceBand = (training: Training) => widen(PACE_STEADY, training.assist);

/** Cue accuracy for a marker sweeping 0..1: full at the center, zero at either end. */
export function sweepAccuracy(phase: number, assist?: boolean): number {
  return clamp01(1 - Math.max(0, Math.abs(phase - 0.5) - (assist ? 0.06 : 0)) * 2);
}
/** Where a cue scores at least 80%, drawn as the green patch. */
export const sweepBand = (training: Training): [number, number] =>
  training.assist ? [0.34, 0.66] : [0.4, 0.6];

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
  const band = liftBand(training);
  if (training.meter >= band[0] && training.meter <= band[1])
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
  const steady = paceBand(training);
  const drain =
    pace > steady[1]
      ? (pace - steady[1]) * 1.6 * (1 - Math.min(0.5, critter.stats.endurance * 0.03))
      : pace < steady[0]
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

/** The log toss's sweet spot around the peak; strength widens it. */
export function tossBand(training: Training, critter: Critter): [number, number] {
  const half = Math.min(0.12, 0.04 + critter.stats.strength * 0.006) * (training.assist ? 1.4 : 1);
  return [TOSS_PEAK - half, Math.min(1, TOSS_PEAK + half)];
}

/** Power while charging: up over TOSS_RISE seconds, then back down, and again. */
export function tossPower(training: Training): number {
  const held = (training.elapsed - (training.chargeStart ?? training.elapsed)) % (TOSS_RISE * 2);
  return held <= TOSS_RISE ? held / TOSS_RISE : 2 - held / TOSS_RISE;
}

/** Inside the sweet spot a throw scores 80–100%; outside it falls away quickly. */
export function tossAccuracy(power: number, band: readonly [number, number]): number {
  const center = (band[0] + band[1]) / 2;
  const half = (band[1] - band[0]) / 2;
  const off = Math.abs(power - center);
  return off <= half ? 0.8 + 0.2 * (1 - off / half) : Math.max(0, 0.8 - (off - half) * 4);
}

export function startToss(training: Training): void {
  training.meter = 0;
  training.stage = 0;
  training.lastHitAt = 0;
}

/** Advances the charge; returns true when time runs out. */
export function stepToss(training: Training): boolean {
  if (training.stage === 1) training.meter = tossPower(training);
  return training.elapsed >= TOSS_LIMIT;
}

/** Releases the log at the current power; returns true after the third throw. */
export function throwLog(training: Training, critter: Critter): boolean {
  training.meter = tossPower(training);
  training.hits.push(tossAccuracy(training.meter, tossBand(training, critter)));
  training.stage = 0;
  training.chargeStart = undefined;
  return training.hits.length >= 3;
}

/** How far a throw flies, in metres, for the result note and the landing marker. */
export function throwDistance(accuracy: number, critter: Critter): number {
  return Math.round((3 + accuracy * 7 + critter.stats.strength * 0.25) * 10) / 10;
}

// Plan 004 provisional balance beam tuning: a crossing takes BEAM_CROSSING seconds in the
// zone; outside it the critter wobbles and creeps on at a third of the pace.
export const BEAM_CROSSING = 10;
export const BEAM_LIMIT = 20;
export const BEAM_STEER = 0.6;
const BEAM_WOBBLE_PACE = 0.35;

/** Where the steady zone sits: two slow swells, offset per session by the seed. */
export function beamZone(training: Training): number {
  const turn = (training.seed ?? 0) * Math.PI * 2;
  const t = training.elapsed;
  return clamp01(0.5 + 0.22 * Math.sin(t * 0.9 + turn) + 0.12 * Math.sin(t * 2.1 + turn * 3));
}

/** The steady zone around its drifting centre; endurance widens it. */
export function beamBand(training: Training, critter: Critter): [number, number] {
  const half = Math.min(0.16, 0.08 + critter.stats.endurance * 0.004) * (training.assist ? 1.4 : 1);
  return [clamp01(training.phase - half), clamp01(training.phase + half)];
}

export function startBeam(training: Training, seed: number): void {
  training.seed = seed;
  training.phase = beamZone(training);
  training.meter = training.phase;
  training.progress = 0;
  training.stage = 0;
  training.lastHitAt = 0;
}

/** Leans with the steering and crosses; returns true when across or out of time. */
export function stepBeam(training: Training, critter: Critter, dt: number, steer: number): boolean {
  const lean = Math.max(-1, Math.min(1, steer));
  training.meter = clamp01((training.meter ?? 0.5) + lean * BEAM_STEER * dt);
  training.phase = beamZone(training);
  const [low, high] = beamBand(training, critter);
  const steady = training.meter >= low && training.meter <= high;
  training.stage = steady ? 0 : 1;
  training.progress = Math.min(
    1,
    (training.progress ?? 0) + (dt / BEAM_CROSSING) * (steady ? 1 : BEAM_WOBBLE_PACE),
  );
  return training.progress >= 1 || training.elapsed >= BEAM_LIMIT;
}

export function beamScore(training: Training): number {
  const progress = training.progress ?? 0;
  if (progress < 1) return progress * 0.5;
  return Math.max(0.4, Math.min(1, 1 - Math.max(0, training.elapsed - BEAM_CROSSING - 0.5) / 12));
}

// Plan 004 provisional runner tuning, in seconds of running and jump heights from 0 to 1.
export const RUN_SECONDS = 24;
export const RUN_GRAVITY = 5.2;
export const RUN_JUMP = 2.1;
export const HURDLE_HEIGHT = { low: 0.2, tall: 0.6 } as const;
// A frame's worth of running, so a slow frame never steps over a hurdle unseen.
const RUN_STEP = 1 / 60;

export interface Hurdle {
  // Seconds into the run.
  at: number;
  // Tall hedges need a double jump; low stumps clear with one.
  tall: boolean;
}

/** The course a seed lays out: low stumps, and tall hedges once the run is under way. */
export function runCourse(seed: number): Hurdle[] {
  const random = seeded(seed);
  const hurdles: Hurdle[] = [];
  // A hedge gets a longer run-up: land from the last hurdle, then jump twice.
  for (let at = 2.5, tall = false; at < RUN_SECONDS - 1.5;) {
    hurdles.push({ at: Math.round(at * 100) / 100, tall });
    tall = hurdles.length >= 2 && random() < 0.35;
    at += (tall ? 1.6 : 1.3) + random() * 0.9;
  }
  return hurdles;
}

/** Half a hurdle's width, in seconds of running; the assist narrows it. */
export const hurdleHalf = (training: Training) => (training.assist ? 0.055 : 0.09);

/** Upward speed of a jump; speed springs a little higher. */
export const runJump = (critter: Critter) =>
  RUN_JUMP * (1 + Math.min(0.12, critter.stats.speed * 0.008));

export function startRun(training: Training, seed: number): void {
  training.seed = seed;
  training.meter = 0;
  training.rise = 0;
  training.progress = 0;
  training.stage = 0;
  training.lastHitAt = 0;
}

/** A press jumps, and a second press in the air jumps again; returns false after two. */
export function jump(training: Training, critter: Critter): boolean {
  if ((training.stage ?? 0) >= 2) return false;
  training.rise = runJump(critter);
  training.stage = (training.stage ?? 0) + 1;
  return true;
}

/** Runs, falls and meets hurdles in small steps; returns true at the end of the course. */
export function stepRun(training: Training, dt: number): boolean {
  const course = runCourse(training.seed ?? 0);
  const half = hurdleHalf(training);
  for (let left = dt; left > 1e-9; left -= RUN_STEP) {
    const step = Math.min(left, RUN_STEP);
    const before = training.rise ?? 0;
    const rise = before - RUN_GRAVITY * step;
    let height = (training.meter ?? 0) + ((before + rise) / 2) * step;
    training.rise = rise;
    if (height <= 0) {
      height = 0;
      training.rise = 0;
      training.stage = 0;
    } else if (height >= 1) {
      height = 1;
      training.rise = Math.min(0, rise);
    }
    training.meter = height;
    training.progress = Math.min(1, (training.progress ?? 0) + step / RUN_SECONDS);
    const run = training.progress * RUN_SECONDS;
    const next = course[training.hits.length];
    if (next && run >= next.at - half) {
      if (height < HURDLE_HEIGHT[next.tall ? 'tall' : 'low']) training.hits.push(0);
      else if (run > next.at + half) training.hits.push(1);
    }
    if (training.progress >= 1) return true;
  }
  return false;
}

/** The share of the course's hurdles cleared. */
export function runScore(training: Training): number {
  const course = runCourse(training.seed ?? 0);
  return course.length ? training.hits.reduce((sum, hit) => sum + hit, 0) / course.length : 0;
}

/** A small seeded random stream for laying out a course, a song or a puzzle session. */
function seeded(seed: number): () => number {
  let state = (Math.floor(seed * 4294967296) ^ 0x9e3779b9) >>> 0;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

// Plan 004 provisional rhythm tuning: 100 beats a minute, three lanes, sixteen notes.
export const RHYTHM_BEAT = 0.6;
export const RHYTHM_NOTES = 16;
export const RHYTHM_LANES = 3;

export interface Note {
  // Seconds into the song.
  at: number;
  lane: number;
}

/** The song a seed writes: notes on beats and half beats, rarely the same lane twice fast. */
export function rhythmSong(seed: number): Note[] {
  const random = seeded(seed);
  const notes: Note[] = [];
  let at = 2;
  let lane = 1;
  for (let index = 0; index < RHYTHM_NOTES; index++) {
    notes.push({ at: Math.round(at * 100) / 100, lane });
    const roll = random();
    const gap = index > 3 && roll < 0.22 ? 0.5 : roll > 0.85 ? 2 : 1;
    // A half-beat step always moves to a neighbouring lane, so it reads as a step.
    lane =
      gap === 0.5
        ? lane === 1
          ? random() < 0.5
            ? 0
            : 2
          : 1
        : Math.floor(random() * RHYTHM_LANES);
    at += gap * RHYTHM_BEAT;
  }
  return notes;
}

/** Seconds either side of a note for a perfect and a good step; intelligence widens good. */
export function rhythmWindow(training: Training, critter: Critter) {
  const scale = training.assist ? 1.4 : 1;
  return {
    perfect: 0.07 * scale,
    good: (0.14 + Math.min(0.06, critter.stats.intelligence * 0.004)) * scale,
  };
}

export function startRhythm(training: Training, seed: number): void {
  training.seed = seed;
  training.reserve = 1;
  training.lastHitAt = 0;
}

/** A step in a lane: the first unplayed note there in reach is scored, any skipped are missed. */
export function stepToNote(training: Training, critter: Critter, lane: number): boolean {
  const song = rhythmSong(training.seed ?? 0);
  const { perfect, good } = rhythmWindow(training, critter);
  const index = song.findIndex(
    (note, at) =>
      at >= training.hits.length &&
      note.lane === lane &&
      Math.abs(note.at - training.elapsed) <= good,
  );
  if (index < 0) {
    // A stray step costs a little composure.
    training.reserve = clamp01((training.reserve ?? 1) - 0.08);
    return false;
  }
  while (training.hits.length < index) training.hits.push(0);
  const off = Math.abs(song[index].at - training.elapsed);
  training.hits.push(off <= perfect ? 1 : 0.6);
  return true;
}

/** Misses notes that have gone by; returns true when the song is over. */
export function stepRhythm(training: Training, critter: Critter): boolean {
  const song = rhythmSong(training.seed ?? 0);
  const { good } = rhythmWindow(training, critter);
  while (
    training.hits.length < song.length &&
    training.elapsed > song[training.hits.length].at + good
  )
    training.hits.push(0);
  return training.hits.length >= song.length && training.elapsed > song.at(-1)!.at + 0.6;
}

export function rhythmScore(training: Training): number {
  const song = rhythmSong(training.seed ?? 0);
  const hits = training.hits.reduce((sum, hit) => sum + hit, 0) / song.length;
  return hits * (0.7 + 0.3 * (training.reserve ?? 1));
}

// Plan 004 provisional chess tuning: a twenty-second sitting of ideas to cheer and moths.
export const CHESS_SECONDS = 20;

export interface Moment {
  at: number;
  // An idea to cheer, or a moth to shoo from the left (-1) or right (1).
  kind: 'idea' | 'moth';
  side: number;
}

/** The sitting a seed lays out: mostly ideas, with a moth now and then. */
export function chessMoments(seed: number): Moment[] {
  const random = seeded(seed);
  const moments: Moment[] = [];
  for (let at = 1.5; at < CHESS_SECONDS - 1.5; at += 1.8 + random() * 0.9) {
    const moth = moments.length > 0 && random() < 0.4;
    moments.push({
      at: Math.round(at * 100) / 100,
      kind: moth ? 'moth' : 'idea',
      side: random() < 0.5 ? -1 : 1,
    });
  }
  return moments;
}

/** How long an idea or a moth waits for you; intelligence holds an idea a little longer. */
export function momentWindow(training: Training, critter: Critter, kind: Moment['kind']): number {
  const base = kind === 'idea' ? 1 + Math.min(0.4, critter.stats.intelligence * 0.025) : 1.4;
  return base * (training.assist ? 1.4 : 1);
}

export function startChess(training: Training, seed: number): void {
  training.seed = seed;
  training.reserve = 1;
  training.lastHitAt = 0;
}

/** The moment waiting on you now, if one has begun and not been answered. */
export function activeMoment(training: Training): Moment | undefined {
  const next = chessMoments(training.seed ?? 0)[training.hits.length];
  return next && training.elapsed >= next.at ? next : undefined;
}

/** Cheering or shooing: right for the moment scores it; at the wrong time it breaks focus. */
export function answerMoment(training: Training, kind: Moment['kind']): boolean {
  const moment = activeMoment(training);
  if (moment?.kind === kind) {
    training.hits.push(1);
    return true;
  }
  training.reserve = clamp01((training.reserve ?? 1) - (kind === 'idea' ? 0.15 : 0.1));
  return false;
}

/** Lets unanswered moments pass; returns true when the sitting is over. */
export function stepChess(training: Training, critter: Critter): boolean {
  const moments = chessMoments(training.seed ?? 0);
  for (
    let moment = activeMoment(training);
    moment && training.elapsed > moment.at + momentWindow(training, critter, moment.kind);
    moment = activeMoment(training)
  )
    training.hits.push(0);
  return training.hits.length >= moments.length || training.elapsed >= CHESS_SECONDS;
}

export function chessScore(training: Training): number {
  const moments = chessMoments(training.seed ?? 0);
  const answered = training.hits.reduce((sum, hit) => sum + hit, 0) / moments.length;
  return answered * (0.7 + 0.3 * (training.reserve ?? 1));
}
