import { activeMoment, rhythmSong, runCourse, RUN_SECONDS, TOSS_PEAK } from '../drills';
import { createInitialState, LocalGameHost } from '../host';
import { activeCritter, GameState, Training } from '../model';

/** At the booth on a day of spring, with a fed, rested companion and coins to spare. */
export function booth(day: number, modify?: (state: GameState) => void): LocalGameHost {
  const state = createInitialState();
  state.day = day;
  state.totalMinutes = (day - 1) * 1440 + state.minute;
  state.areaId = 'colosseum';
  state.areaInstanceId = 'local-colosseum';
  state.player.position = { x: -3, z: 1.8 };
  state.player.coins = 50;
  activeCritter(state).position = { x: -2.5, z: 1.8 };
  modify?.(state);
  return new LocalGameHost(state);
}
export const hit = (host: LocalGameHost, lane?: number) =>
  host.dispatch({ type: 'training-hit', lane });

/** A capable player: whatever the leg, it is played well until the event ends. */
export function perform(host: LocalGameHost, legs: Training['kind'][] = []): void {
  for (let tick = 0; tick < 60 * 200 && host.state.training; tick++) {
    const training = host.state.training;
    if (legs.at(-1) !== training.kind || legs.length <= (training.leg ?? 0))
      legs.push(training.kind);
    const since = training.elapsed - (training.lastHitAt ?? 0);
    switch (training.kind) {
      case 'training':
        if (since > 0.3 && Math.abs(training.phase - 0.5) < 0.03) hit(host);
        break;
      case 'lift':
        if ((training.meter ?? 0) < 0.64) hit(host);
        break;
      case 'pace':
        if ((training.meter ?? 0) < 0.56) hit(host);
        break;
      case 'toss':
        if (training.stage !== 1) {
          if (since > 0.1) hit(host);
        } else if ((training.meter ?? 0) >= TOSS_PEAK - 0.005) hit(host);
        break;
      case 'beam': {
        const off = training.phase - (training.meter ?? 0);
        host.dispatch({
          type: 'training-steer',
          direction: Math.abs(off) > 0.02 ? Math.sign(off) : 0,
        });
        break;
      }
      case 'run': {
        const run = (training.progress ?? 0) * RUN_SECONDS;
        const next = runCourse(training.seed!)[training.hits.length];
        const lead = next ? next.at - run : Infinity;
        if ((training.stage ?? 0) === 0 && lead < (next?.tall ? 0.62 : 0.3)) hit(host);
        else if (training.stage === 1 && next?.tall && lead < 0.45 && (training.rise ?? 0) < 0.4)
          hit(host);
        break;
      }
      case 'rhythm': {
        const note = rhythmSong(training.seed!)[training.hits.length];
        if (note && training.elapsed >= note.at) hit(host, note.lane);
        break;
      }
      case 'chess': {
        const moment = activeMoment(training);
        if (moment && training.elapsed >= moment.at + 0.3)
          host.dispatch({ type: moment.kind === 'idea' ? 'training-hit' : 'training-shoo' });
        break;
      }
    }
    host.update(1 / 60);
  }
}
