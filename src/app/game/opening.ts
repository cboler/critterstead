import { AreaId, GameState, Point } from './model';

/**
 * The walk to Oakhaven that opens a new game: authored beats staged in the world before any
 * save exists. The first household starts the next morning, so nothing here is saved.
 */
export interface SceneStage {
  grandpa: Point;
  pip: Point;
  gemothy: Point | null;
  binTipped: boolean;
  berriesPicked: boolean;
}

export interface OpeningBeat {
  id: string;
  areaId: AreaId;
  // Minutes after midnight, so the light moves through the morning.
  minute: number;
  player: Point;
  stage: SceneStage;
  speaker: 'Grandpa' | null;
  line: string;
  // Who waits to be chosen: Mallow alone, or the whole offer.
  guests?: 'mallow' | 'offer';
}

const stage = (
  grandpa: Point,
  pip: Point,
  extra: Partial<Pick<SceneStage, 'gemothy' | 'binTipped' | 'berriesPicked'>> = {},
): SceneStage => ({
  grandpa,
  pip,
  gemothy: null,
  binTipped: false,
  berriesPicked: false,
  ...extra,
});

export const OPENING: readonly OpeningBeat[] = [
  {
    id: 'shoes-on',
    areaId: 'homestead',
    minute: 450,
    player: { x: -1.2, z: 0.2 },
    stage: stage({ x: -3.6, z: -0.6 }, { x: -2.8, z: 0.4 }),
    speaker: 'Grandpa',
    line: 'Shoes on, sleepyhead. Today we walk to Oakhaven, and you come home with a partner of your own.',
  },
  {
    id: 'west-road',
    areaId: 'homestead',
    minute: 470,
    player: { x: -5.8, z: 1 },
    stage: stage({ x: -6.8, z: 0.5 }, { x: -6.3, z: 1.8 }),
    speaker: null,
    line: 'Pip falls in at Grandpa’s heel, unhurried as ever, and the three of you take the west road.',
  },
  {
    id: 'the-hedge',
    areaId: 'town',
    minute: 530,
    player: { x: 6.6, z: 1.8 },
    stage: stage({ x: 5.4, z: 1.4 }, { x: 5.9, z: -0.7 }),
    speaker: null,
    line: 'Just outside town, Pip leaves the path. Nobody asked him to. He noses into the sunberry hedge and comes back with the ripest ones.',
  },
  {
    id: 'given-time',
    areaId: 'town',
    minute: 540,
    player: { x: 6.4, z: 1.9 },
    stage: stage({ x: 5.4, z: 1.4 }, { x: 4.8, z: 2 }, { berriesPicked: true }),
    speaker: 'Grandpa',
    line: 'He saw ripe berries and knew the job. That’s what a partner learns, given time and someone to watch. Yours will too.',
  },
  {
    id: 'bin-day',
    areaId: 'town',
    minute: 550,
    player: { x: 2.2, z: 0.4 },
    stage: stage(
      { x: 0.9, z: -0.6 },
      { x: 1.6, z: -1.8 },
      { gemothy: { x: 3.9, z: -2.9 }, binTipped: true, berriesPicked: true },
    ),
    speaker: null,
    line: 'Clang! A bin beside the tavern goes over, and a ringed tail vanishes into the spill.',
  },
  {
    id: 'gemothy',
    areaId: 'town',
    minute: 555,
    player: { x: 2.2, z: 0.4 },
    stage: stage(
      { x: 0.9, z: -0.6 },
      { x: 1.6, z: -1.8 },
      { gemothy: { x: 2.9, z: -2 }, binTipped: true, berriesPicked: true },
    ),
    speaker: 'Grandpa',
    line: 'That’s Gemothy. Belongs to nobody, answers to nobody, and has never once missed bin day.',
  },
  {
    id: 'many-ways',
    areaId: 'town',
    minute: 570,
    player: { x: 0.4, z: 3.6 },
    stage: stage(
      { x: -3.2, z: 3.2 },
      { x: -3.9, z: 3.8 },
      { binTipped: true, berriesPicked: true },
    ),
    speaker: 'Grandpa',
    line: 'Folk find their partners all sorts of ways. Some raise one from a youngster, some buy from a breeder, and some make friends with a wild one out past the fields.',
  },
  {
    id: 'other-ways',
    areaId: 'town',
    minute: 575,
    player: { x: 0.4, z: 3.6 },
    stage: stage(
      { x: -3.2, z: 3.2 },
      { x: -3.9, z: 3.8 },
      { binTipped: true, berriesPicked: true },
    ),
    speaker: 'Grandpa',
    line: 'Some take in a critter nobody else could keep, or come to an arrangement with another owner. And there are the growth labs, for folk with deep pockets.',
  },
  {
    id: 'mallow',
    areaId: 'town',
    minute: 580,
    player: { x: 0.4, z: 3.6 },
    stage: stage(
      { x: -3.2, z: 3.2 },
      { x: -3.9, z: 3.8 },
      { binTipped: true, berriesPicked: true },
    ),
    speaker: 'Grandpa',
    line: 'See that one with the leafy tail? That’s Mallow, in with the breeder this morning. Friendly as anything.',
    guests: 'mallow',
  },
  {
    id: 'choose',
    areaId: 'town',
    minute: 590,
    player: { x: 0.4, z: 3.6 },
    stage: stage(
      { x: -3.2, z: 3.2 },
      { x: -3.9, z: 3.8 },
      { binTipped: true, berriesPicked: true },
    ),
    speaker: 'Grandpa',
    line: 'Three of them are looking for a home today. Take your time. This one is yours to choose.',
    guests: 'offer',
  },
];

/** The beat where the starter offer is made; skipping the walk goes straight here. */
export const OFFER_BEAT = OPENING.findIndex((beat) => beat.guests === 'offer');

/**
 * Stages a beat on a throwaway state used only to draw the scene. The rancher is moved by the
 * caller between beats in the same area; arriving in a new one places them at once.
 */
export function stageOpening(state: GameState, beat: OpeningBeat): void {
  const arriving = state.areaId !== beat.areaId;
  state.areaId = beat.areaId;
  state.areaInstanceId = `local-${beat.areaId}`;
  state.minute = beat.minute;
  state.totalMinutes = beat.minute;
  if (arriving) state.player.position = { ...beat.player };
}

/** What Grandpa says once the choice is made, and how the first night passes. */
export function openingFarewell(name: string): string {
  return `“Good choice. Let’s get ${name} home.” ${name} follows you all the way back to Bramblewick. That night, ${name} sleeps in the nook, and Pip keeps one ear on the newcomer.`;
}
