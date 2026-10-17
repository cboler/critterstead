import { noise } from './noise';
import { calendarDate } from './calendar';
import { TAVERN_BIN } from './content';
import { GameState, InventoryItem, Point } from './model';

/**
 * Gemothy, the raccoon-like scavenger from the opening walk. He belongs to nobody and never
 * joins a party (D54), but calm visits and scraps earn his trust, and a friend finds him
 * leaving things for them. Where he is comes from the clock like everyone in the cast; only
 * his trust and when he last brought something are saved.
 */
export interface GemothyState {
  trust: number;
  // The last day you visited him, and the last day he left you a find.
  visitedDay: number;
  findDay: number;
}

export const GEMOTHY = {
  id: 'gemothy',
  // Trust at which he becomes a friend and starts leaving finds.
  friend: 10,
  // How often a friend's finds turn up.
  findEvery: 7,
  // Feeling the calm a scrap, a quiet sit and a pushy hand are worth.
  scrap: 2,
  sit: 1,
  pushy: -2,
} as const;

// Bin day comes round once a week; Gemothy has never once missed it.
export const isBinDay = (day: number) => day % 7 === 3;

/** Whether Gemothy is about the tavern bin right now. */
export function gemothyAbout(state: GameState): boolean {
  if (state.areaId !== 'town') return false;
  const minute = state.minute;
  if (isBinDay(state.day)) return minute >= 360 && minute < 720;
  // On other days, now and then of an evening.
  return noise(77, state.day) < 0.45 && minute >= 1020 && minute < 1260;
}

export function isFriend(state: GameState): boolean {
  return state.gemothy.trust >= GEMOTHY.friend;
}

/** Where he is: rummaging by the bin, or, for a friend standing nearby, at their side. */
export function gemothyPosition(state: GameState): Point {
  const angle = state.totalMinutes / 23;
  const bin = { x: TAVERN_BIN.x + 0.6 + Math.cos(angle) * 0.3, z: TAVERN_BIN.z + 0.5 };
  const player = state.player.position;
  const near = Math.hypot(player.x - bin.x, player.z - bin.z) < 4;
  if (isFriend(state) && near) return { x: player.x + 0.9, z: player.z - 0.6 };
  return bin;
}

/** How he behaves at his trust, from bolting to trotting along at your heel. */
export function gemothyMood(state: GameState): string {
  const trust = state.gemothy.trust;
  if (trust >= GEMOTHY.friend)
    return 'Gemothy trots over the moment he sees you, tail high, pockets of the bin forgotten.';
  if (trust >= 6) return 'Gemothy lets you come close and sniffs at your sleeve.';
  if (trust >= 3) return 'Gemothy keeps rummaging, one ear turned your way.';
  return 'Gemothy freezes when you come near, ready to bolt behind the bin.';
}

/** Scraps he likes, best first: anything tasty from your backpack. */
export const SCRAPS: InventoryItem['itemId'][] = ['berry', 'turnip', 'wheat', 'feed'];

const FINDS: {
  itemId: InventoryItem['itemId'];
  quantity: number;
  quality: number;
  what: string;
}[] = [
  { itemId: 'berry', quantity: 4, quality: 3, what: 'four perfect sunberries' },
  { itemId: 'stone', quantity: 1, quality: 2, what: 'a smooth, heavy stone' },
  { itemId: 'turnip-seed', quantity: 2, quality: 1, what: 'two packets of turnip seed' },
  { itemId: 'lumber', quantity: 1, quality: 2, what: 'a good plank, from who knows where' },
  { itemId: 'wheat-seed', quantity: 2, quality: 1, what: 'two packets of wheat seed' },
  { itemId: 'sunberry-seed', quantity: 1, quality: 1, what: 'a packet of sunberry seed' },
];

/** This week's find: chosen by the week, with coins sometimes instead. */
export function gemothyFind(state: GameState): (typeof FINDS)[number] | { coins: number } {
  const week = Math.floor(state.day / GEMOTHY.findEvery);
  if (noise(91, week) < 0.25) return { coins: 3 + Math.floor(noise(92, week) * 6) };
  const season = calendarDate(state.day).season;
  const choices = FINDS.filter(
    (find) =>
      !(find.itemId === 'sunberry-seed' && season !== 'summer' && season !== 'autumn') &&
      !(find.itemId === 'wheat-seed' && season !== 'spring' && season !== 'summer'),
  );
  return choices[Math.floor(noise(93, week) * choices.length)];
}
