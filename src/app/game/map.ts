import { calendarDate } from './calendar';
import { castFor, RESIDENTS, wildCritters } from './cast';
import { AREAS, EXHIBITIONS, scheduledExhibition } from './content';
import { plotReady } from './garden';
import { grandpaWhereabouts, PIP_ID, pipWhereabouts } from './household';
import { ATHLETIC_RANKS, isCupDay, isPromotionDay, qualifiedForPromotion, RANKS } from './ladder';
import { activeCritter, AreaId, GameState, Point } from './model';

/**
 * The map Grandpa gives you on the walk to town, and the optional minimap: both are pure
 * readings of the save, like the quests. Nothing about them is stored.
 */
export type OutdoorArea = Exclude<AreaId, 'cottage'>;

export interface MapPlace {
  id: OutdoorArea;
  name: string;
  // The place's box on the map, in map units (the map is 100 × 40).
  x: number;
  y: number;
  width: number;
  height: number;
  // Who is there, and what is worth knowing today.
  who: string[];
  notes: string[];
  here: boolean;
}

// West to east, the way the roads run.
const ORDER: OutdoorArea[] = ['colosseum', 'road', 'town', 'lane', 'homestead', 'glade'];
export const MAP_SIZE = { width: 100, height: 26 } as const;

const hhmm = (minute: number) => `${Math.floor(minute / 60)}:00`;

/** The cottage is inside the yard, as far as the map is concerned. */
const outdoors = (areaId: AreaId): OutdoorArea => (areaId === 'cottage' ? 'homestead' : areaId);

function notesFor(state: GameState, id: OutdoorArea): string[] {
  const notes: string[] = [];
  const dayOfSeason = calendarDate(state.day).dayOfSeason;
  const critter = activeCritter(state);
  if (id === 'homestead') {
    const ready = state.plots.filter(plotReady).length;
    if (ready) notes.push(`${ready} bed${ready > 1 ? 's' : ''} ready to harvest`);
    const dry = state.plots.filter(
      (plot) => plot.crop && !plot.crop.withered && plot.moistUntil <= state.totalMinutes,
    ).length;
    if (dry) notes.push(`${dry} bed${dry > 1 ? 's' : ''} need water`);
    const pickup = state.containers.find((container) => container.kind === 'pickup');
    const waiting = pickup?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
    if (waiting) notes.push(`${waiting} in the pickup for tonight's cart`);
  }
  if (id === 'glade') {
    const ripe = state.resources.filter((node) => node.areaId === 'glade' && node.available).length;
    notes.push(ripe ? `${ripe} sunberry bushes ripe` : 'Sunberries growing back');
  }
  if (id === 'town') {
    const store = RESIDENTS.find((resident) => resident.id === 'resident-store')!;
    const open = state.minute >= store.hours.start && state.minute < store.hours.end;
    notes.push(
      open
        ? `Store open until ${hhmm(store.hours.end)}`
        : `Store opens at ${hhmm(store.hours.start)}`,
    );
    notes.push('Critter shelter');
  }
  if (id === 'colosseum') {
    const event = scheduledExhibition(dayOfSeason);
    if (event) notes.push(`Today: the ${EXHIBITIONS[event].name}`);
    if (isCupDay(dayOfSeason) && critter.ladder.rank < ATHLETIC_RANKS)
      notes.push(`Today: the ${RANKS[critter.ladder.rank]} Cup`);
    if (isPromotionDay(dayOfSeason) && qualifiedForPromotion(critter.ladder))
      notes.push(`Today: the ${RANKS[critter.ladder.rank]} Promotion Cup`);
    if (!notes.length) notes.push('Everyday showing');
  }
  if ((id === 'lane' || id === 'road') && wildCritters(state, id).length)
    notes.push('Wild critters about');
  return notes;
}

/** Every outdoor place with its roads, who is where, and what matters today. */
export function worldMap(state: GameState): MapPlace[] {
  const who = new Map<OutdoorArea, string[]>();
  const add = (areaId: AreaId, name: string) => {
    const place = outdoors(areaId);
    who.set(place, [...(who.get(place) ?? []), name]);
  };
  add(state.areaId, 'You');
  const critter = activeCritter(state);
  // A companion left working stays in the yard; otherwise it is at your side.
  add(
    state.areaId === 'cottage' && !state.companionIndoors ? 'homestead' : state.areaId,
    critter.name,
  );
  const grandpa = grandpaWhereabouts(state);
  if (grandpa) add(grandpa.areaId, 'Grandpa');
  const pip = state.critters.some((item) => item.id === PIP_ID)
    ? pipWhereabouts(state, critter.position)
    : null;
  if (pip) add(pip.areaId, 'Pip');
  // The map is laid out west to east, each place as wide as it is long.
  const widths = ORDER.map((id) => AREAS[id].half.x);
  const scale =
    (MAP_SIZE.width - (ORDER.length + 1) * 3) / widths.reduce((sum, w) => sum + w * 2, 0);
  let x = 3;
  return ORDER.map((id) => {
    const width = AREAS[id].half.x * 2 * scale;
    const height = AREAS[id].half.z * 2 * scale;
    const place: MapPlace = {
      id,
      name: AREAS[id].name,
      x,
      y: MAP_SIZE.height / 2 - height / 2,
      width,
      height,
      who: who.get(id) ?? [],
      notes: notesFor(state, id),
      here: outdoors(state.areaId) === id,
    };
    x += width + 3;
    return place;
  });
}

export interface MinimapMark {
  kind: 'you' | 'companion' | 'person' | 'critter' | 'gate' | 'place';
  point: Point;
  label?: string;
}

/** The current area seen from above: its bounds, its exits and who is about. */
export function minimap(state: GameState): { half: Point; marks: MinimapMark[] } {
  const area = AREAS[state.areaId];
  const marks: MinimapMark[] = area.objects.map((object) => ({
    kind: object.kind === 'gate' || object.kind === 'door' ? 'gate' : 'place',
    point: object.position,
    label: object.kind === 'gate' || object.kind === 'door' ? object.name : undefined,
  }));
  for (const member of castFor(state))
    marks.push({
      kind: member.figure.kind === 'person' ? 'person' : 'critter',
      point: member.position,
    });
  const grandpa = grandpaWhereabouts(state);
  if (grandpa?.areaId === state.areaId) marks.push({ kind: 'person', point: grandpa.position });
  const critter = activeCritter(state);
  if (state.areaId !== 'cottage' || state.companionIndoors)
    marks.push({ kind: 'companion', point: critter.position });
  marks.push({ kind: 'you', point: state.player.position });
  return { half: area.half, marks };
}
