import { describe, expect, it } from 'vitest';
import { CHESS_TABLE, DRILLS, RHYTHM_STATION } from './content';
import {
  activeMoment,
  chessMoments,
  momentWindow,
  RHYTHM_BEAT,
  rhythmSong,
  rhythmWindow,
} from './drills';
import { createInitialState, LocalGameHost } from './host';
import { activeCritter, GameState, Training } from './model';
import { readSave, validateSave } from './storage';

function indoors(station: { x: number; z: number }, modify?: (state: GameState) => void) {
  const state = createInitialState();
  state.areaId = 'cottage';
  state.areaInstanceId = 'local-cottage';
  state.companionIndoors = true;
  state.player.position = { x: station.x + 0.4, z: station.z + 0.8 };
  activeCritter(state).position = { x: station.x + 0.8, z: station.z + 0.4 };
  modify?.(state);
  return new LocalGameHost(state);
}
const step = (host: LocalGameHost, lane: number) => host.dispatch({ type: 'training-hit', lane });
const cheer = (host: LocalGameHost) => host.dispatch({ type: 'training-hit' });
const shoo = (host: LocalGameHost) => host.dispatch({ type: 'training-shoo' });

/** Steps each note's lane as it reaches the line, or a frame late for a good step. */
function dance(host: LocalGameHost, late = 0): void {
  for (let tick = 0; tick < 60 * 25 && host.state.training; tick++) {
    const training = host.state.training;
    const note = rhythmSong(training.seed!)[training.hits.length];
    if (note && training.elapsed >= note.at + late) step(host, note.lane);
    host.update(1 / 60);
  }
}

/** Answers every moment a little after it begins: cheer ideas, shoo moths, or the wrong one. */
function sit(host: LocalGameHost, answer: 'right' | 'wrong' | 'none'): void {
  for (let tick = 0; tick < 60 * 25 && host.state.training; tick++) {
    const training = host.state.training;
    const moment = activeMoment(training);
    if (moment && answer !== 'none' && training.elapsed >= moment.at + 0.3) {
      const idea = moment.kind === 'idea';
      if (idea === (answer === 'right')) cheer(host);
      else shoo(host);
    }
    host.update(1 / 60);
  }
}

describe('rhythm steps', () => {
  it('pays for steps on the beat and counts perfect and good steps', () => {
    const play = (how: 'perfect' | 'late' | 'still') => {
      const host = indoors(RHYTHM_STATION);
      expect(host.interaction()!.id).toBe('rhythm');
      expect(host.interaction()!.actions[0].label).toBe(
        'Rhythm steps · 20 Mallow energy · 5 yours · 30 min',
      );
      const before = structuredClone(host.critter);
      expect(host.dispatch({ type: 'interact', targetId: 'rhythm', action: 'rhythm' })).toBe(true);
      expect(host.critter.stamina).toBe(before.stamina - DRILLS.rhythm.energy);
      if (how === 'still') for (let second = 0; second < 25; second++) host.update(1);
      else dance(host, how === 'late' ? 0.1 : 0);
      expect(host.state.training).toBeNull();
      expect(host.critter.drills.sessions).toEqual({ rhythm: 1 });
      expect(host.critter.skills['dancing']).toBe(1);
      expect(host.state.flags).toContain('danced');
      return { host, gain: host.critter.stats.intelligence - before.stats.intelligence };
    };
    const perfect = play('perfect');
    expect(perfect.host.state.journal[0]).toMatch(
      /^Every step on the beat!.*16 perfect and 0 good steps of 16\./,
    );
    const late = play('late');
    expect(late.host.state.journal[0]).toMatch(/0 perfect and 16 good steps of 16\./);
    const still = play('still');
    expect(still.host.state.journal[0]).toMatch(/^A two-left-feet try\./);
    expect(perfect.gain).toBeGreaterThan(0.8);
    expect(perfect.gain).toBeGreaterThan(late.gain + 0.15);
    expect(late.gain).toBeGreaterThan(still.gain + 0.25);
  });

  it('costs composure for stray steps, so mashing every lane pays less than dancing', () => {
    const host = indoors(RHYTHM_STATION);
    host.dispatch({ type: 'interact', targetId: 'rhythm', action: 'rhythm' });
    for (let tick = 0; tick < 60 * 25 && host.state.training; tick++) {
      if (tick % 6 === 0) step(host, (tick / 6) % 3);
      host.update(1 / 60);
    }
    expect(host.state.journal[0]).not.toMatch(/^Every step on the beat!/);
    const mashed = host.critter.stats.intelligence;
    const dancer = indoors(RHYTHM_STATION);
    dancer.dispatch({ type: 'interact', targetId: 'rhythm', action: 'rhythm' });
    dance(dancer);
    expect(dancer.critter.stats.intelligence).toBeGreaterThan(mashed + 0.2);
  });

  it('marks skipped notes missed when a later one is stepped', () => {
    const host = indoors(RHYTHM_STATION);
    host.dispatch({ type: 'interact', targetId: 'rhythm', action: 'rhythm' });
    const song = rhythmSong(host.state.training!.seed!);
    // Two notes half a beat apart in different lanes: skip the first and step the second
    // early, while both are still in reach.
    const index = song.findIndex((note, at) => at > 0 && note.at - song[at - 1].at < 0.4);
    expect(index).toBeGreaterThan(0);
    const at = song[index].at - 0.15;
    while (host.state.training!.elapsed < at)
      host.update(Math.min(0.05, at - host.state.training!.elapsed + 1e-6));
    expect(host.state.training!.hits).toHaveLength(index - 1);
    expect(step(host, song[index].lane)).toBe(true);
    expect(host.state.training!.hits.slice(index - 1)).toEqual([0, 0.6]);
  });

  it('writes a song of beats and neighbouring half-beat steps from its seed', () => {
    for (const seed of [0, 0.2, 0.47, 0.73, 0.99]) {
      const song = rhythmSong(seed);
      expect(song).toEqual(rhythmSong(seed));
      expect(song).toHaveLength(16);
      song.slice(1).forEach((note, index) => {
        const gap = note.at - song[index].at;
        expect(gap).toBeGreaterThan(RHYTHM_BEAT / 2 - 0.02);
        if (gap < RHYTHM_BEAT - 0.02) expect(Math.abs(note.lane - song[index].lane)).toBe(1);
        expect([0, 1, 2]).toContain(note.lane);
      });
    }
    expect(rhythmSong(0.2)).not.toEqual(rhythmSong(0.47));
    const critter = createInitialState().critters[0];
    const good = (intelligence: number, assist = false) => {
      critter.stats.intelligence = intelligence;
      return rhythmWindow({ assist } as Training, critter).good;
    };
    expect(good(15)).toBeGreaterThan(good(2) + 0.04);
    expect(good(5, true)).toBeGreaterThan(good(5));
  });

  it('needs the companion inside, and saves mid-song', () => {
    const away = indoors(RHYTHM_STATION, (state) => (state.companionIndoors = false));
    expect(away.interaction()!.actions[0]).toMatchObject({
      disabled: true,
      reason: 'Mallow is out in the yard.',
    });
    const host = indoors(RHYTHM_STATION);
    host.dispatch({ type: 'interact', targetId: 'rhythm', action: 'rhythm' });
    for (let tick = 0; tick < 60 * 6; tick++) host.update(1 / 60);
    expect(host.state.training!.hits.length).toBeGreaterThan(2);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    const corrupt = structuredClone(host.state);
    delete (corrupt.training as Partial<Training>).seed;
    expect(() => readSave(corrupt)).toThrow(/kept/);
    const overfull = structuredClone(host.state);
    overfull.training!.hits = Array<number>(17).fill(1);
    expect(() => readSave(overfull)).toThrow(/kept/);
  });
});

describe('chess puzzles', () => {
  it('pays for cheering ideas and shooing moths, and tallies them', () => {
    const play = (answer: 'right' | 'wrong' | 'none') => {
      const host = indoors(CHESS_TABLE);
      expect(host.interaction()!.id).toBe('chess');
      expect(host.interaction()!.actions[0].label).toBe(
        'Chess puzzles · 15 Mallow energy · 5 yours · 40 min',
      );
      const before = structuredClone(host.critter);
      host.dispatch({ type: 'interact', targetId: 'chess', action: 'chess' });
      const moments = chessMoments(host.state.training!.seed!);
      sit(host, answer);
      expect(host.state.training).toBeNull();
      expect(host.critter.drills.sessions).toEqual({ chess: 1 });
      expect(host.state.flags).toContain('puzzled');
      return { host, moments, gain: host.critter.stats.intelligence - before.stats.intelligence };
    };
    const right = play('right');
    const ideas = right.moments.filter((moment) => moment.kind === 'idea').length;
    const moths = right.moments.length - ideas;
    expect(right.host.state.journal[0]).toMatch(
      new RegExp(
        `^A brilliant sitting!.*${ideas} of ${ideas} ideas cheered, ${moths} of ${moths} moths shooed\\.`,
      ),
    );
    const wrong = play('wrong');
    expect(wrong.host.state.journal[0]).toMatch(/^A distracted try\..*0 of \d+ ideas cheered/);
    const none = play('none');
    expect(right.gain).toBeGreaterThan(0.8);
    expect(right.gain - none.gain).toBeGreaterThan(0.5);
    // Wrong answers also cost focus, so they pay no more than sitting still.
    expect(wrong.gain).toBeLessThanOrEqual(none.gain);
  });

  it('shoos only at the chessboard and lays out a sitting from its seed', () => {
    const host = indoors(CHESS_TABLE);
    expect(shoo(host)).toBe(false);
    host.dispatch({ type: 'interact', targetId: 'chess', action: 'chess' });
    host.update(0.5);
    // Before the first moment, a cheer is stray and costs focus.
    expect(cheer(host)).toBe(false);
    expect(host.state.training!.reserve).toBeCloseTo(0.85);
    for (const seed of [0.1, 0.4, 0.8]) {
      const moments = chessMoments(seed);
      expect(moments).toEqual(chessMoments(seed));
      expect(moments.length).toBeGreaterThanOrEqual(6);
      expect(moments[0].kind).toBe('idea');
      expect(moments.some((moment) => moment.kind === 'moth')).toBe(true);
    }
    const critter = createInitialState().critters[0];
    critter.stats.intelligence = 2;
    const slow = momentWindow({} as Training, critter, 'idea');
    critter.stats.intelligence = 14;
    expect(momentWindow({} as Training, critter, 'idea')).toBeGreaterThan(slow + 0.2);
    expect(momentWindow({ assist: true } as Training, critter, 'moth')).toBeGreaterThan(
      momentWindow({} as Training, critter, 'moth'),
    );
  });

  it('saves mid-sitting and runs alone as a routine once played', () => {
    const host = indoors(CHESS_TABLE);
    const routine = () => host.interaction()!.actions.find((action) => action.id === 'routine')!;
    expect(routine().disabled).toBe(true);
    host.dispatch({ type: 'interact', targetId: 'chess', action: 'chess' });
    for (let tick = 0; tick < 60 * 6; tick++) host.update(1 / 60);
    expect(() => validateSave(host.state)).not.toThrow();
    const resumed = new LocalGameHost(readSave(structuredClone(host.state)));
    expect(resumed.state.training).toEqual(host.state.training);
    sit(host, 'right');
    host.critter.stamina = 100;
    expect(routine().disabled).toBe(false);
    host.state.companionIndoors = false;
    expect(routine()).toMatchObject({ disabled: true, reason: 'Mallow is out in the yard.' });
    host.state.companionIndoors = true;
    expect(host.dispatch({ type: 'interact', targetId: 'chess', action: 'routine' })).toBe(true);
    for (let second = 0; second < 5 && host.state.training; second++) host.update(1);
    expect(host.state.journal[0]).toMatch(/ran it alone and gains [\d.]+ intelligence/);
  });
});
