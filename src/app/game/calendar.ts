import { CROPS, EXHIBITIONS, scheduledExhibition } from './content';
import { activeCritter, ExhibitionId, GameState, Season, Weather } from './model';
import { ATHLETIC_RANKS, CUP, isCupDay, RANKS } from './ladder';

export const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter'];
export const DAYS_PER_SEASON = 30;
export const DAYS_PER_YEAR = DAYS_PER_SEASON * SEASONS.length;
export const DAWN_MINUTE = 360;
const FORECAST_DAYS = 3;

export interface CalendarDate {
  year: number;
  season: Season;
  dayOfSeason: number;
  dayOfYear: number;
}
export interface CalendarEvent {
  day: number;
  label: string;
  kind: 'season' | 'birthday' | 'weather' | 'harvest' | 'exhibition' | 'cup';
}

export function calendarDate(day: number): CalendarDate {
  const dayOfYear = ((day - 1) % DAYS_PER_YEAR) + 1;
  return {
    year: Math.floor((day - 1) / DAYS_PER_YEAR) + 1,
    season: SEASONS[Math.floor((dayOfYear - 1) / DAYS_PER_SEASON)],
    dayOfSeason: ((dayOfYear - 1) % DAYS_PER_SEASON) + 1,
    dayOfYear,
  };
}

export function formatDate(day: number): string {
  const date = calendarDate(day);
  return `${capitalize(date.season)} ${date.dayOfSeason}, Year ${date.year}`;
}

// Fixed per-day weather from an integer hash, so forecasts never consume the save's random seed.
export function weatherFor(day: number): Weather {
  if (day === 1) return 'sunny';
  let x = Math.imul(day ^ 0x9e3779b9, 0x85ebca6b);
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35);
  x ^= x >>> 16;
  const roll = (x >>> 0) / 4294967296;
  const season = calendarDate(day).season;
  if (season === 'winter') return roll < 0.3 ? 'snow' : roll < 0.55 ? 'cloudy' : 'sunny';
  const rain = season === 'summer' ? 0.15 : 0.3;
  return roll < rain ? 'rain' : roll < rain + 0.25 ? 'cloudy' : 'sunny';
}

/** The first dawn strictly after an absolute game minute. */
export function nextDawn(totalMinutes: number): number {
  return DAWN_MINUTE + 1440 * (Math.floor((totalMinutes - DAWN_MINUTE) / 1440) + 1);
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Upcoming facts the household can know: seasons, birthdays, forecast rain and harvests. */
export function upcomingEvents(state: GameState, days = DAYS_PER_SEASON): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const critter = activeCritter(state);
  for (let day = state.day; day < state.day + days; day++) {
    const date = calendarDate(day);
    if (date.dayOfSeason === 1 && day !== state.day)
      events.push({ day, label: `${capitalize(date.season)} begins`, kind: 'season' });
    const age = critter.ageDays + day - state.day;
    if (age > 0 && age % DAYS_PER_YEAR === 0)
      events.push({
        day,
        label: `${critter.name}'s birthday · ${age / DAYS_PER_YEAR} year${age > DAYS_PER_YEAR ? 's' : ''}`,
        kind: 'birthday',
      });
    const event = scheduledExhibition(date.dayOfSeason);
    if (event)
      events.push({
        day,
        label: `${EXHIBITIONS[event].name} · Colosseum · ${EXHIBITIONS[event].fee} coins to enter`,
        kind: 'exhibition',
      });
    if (isCupDay(date.dayOfSeason) && critter.ladder.rank < ATHLETIC_RANKS)
      events.push({
        day,
        label: `${RANKS[critter.ladder.rank]} Cup · ranked · ${CUP.fee[critter.ladder.rank]} coins to enter`,
        kind: 'cup',
      });
    if (day < state.day + FORECAST_DAYS && weatherFor(day) === 'rain')
      events.push({ day, label: 'Rain forecast · waters tilled beds', kind: 'weather' });
  }
  state.plots.forEach((plot, index) => {
    const crop = plot.crop;
    if (!crop || crop.withered) return;
    const left = CROPS[crop.speciesId].growthMinutes - crop.growthMinutes;
    const finish = state.totalMinutes + left;
    // Only promise a harvest the current moisture can actually deliver.
    if (left > 0 && finish > plot.moistUntil) return;
    events.push({
      day: Math.floor(finish / 1440) + 1,
      label: `${CROPS[crop.speciesId].name} ready · bed ${index + 1}`,
      kind: 'harvest',
    });
  });
  return events.sort((a, b) => a.day - b.day);
}

export interface CalendarView {
  today: CalendarDate & { day: number; weather: Weather };
  forecast: { day: number; label: string; weather: Weather }[];
  seasons: {
    season: Season;
    days: { day: number; dayOfSeason: number; past: boolean; today: boolean; marked: boolean }[];
  }[];
  events: (CalendarEvent & { date: string })[];
}

export function calendarView(state: GameState): CalendarView {
  const today = calendarDate(state.day);
  const firstDay = state.day - today.dayOfYear + 1;
  const events = upcomingEvents(state, DAYS_PER_YEAR - today.dayOfYear + 1);
  const marked = new Set(events.map((event) => event.day));
  return {
    today: { ...today, day: state.day, weather: weatherFor(state.day) },
    forecast: Array.from({ length: FORECAST_DAYS }, (_, offset) => ({
      day: state.day + offset,
      label: offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : formatDate(state.day + offset),
      weather: weatherFor(state.day + offset),
    })),
    seasons: SEASONS.map((season, index) => ({
      season,
      days: Array.from({ length: DAYS_PER_SEASON }, (_, offset) => {
        const day = firstDay + index * DAYS_PER_SEASON + offset;
        return {
          day,
          dayOfSeason: offset + 1,
          past: day < state.day,
          today: day === state.day,
          marked: marked.has(day),
        };
      }),
    })),
    events: events.slice(0, 8).map((event) => ({ ...event, date: formatDate(event.day) })),
  };
}

/** The next scheduled Colosseum event after today, and when it is, within a season. */
export function nextExhibition(
  day: number,
): { id: ExhibitionId; day: number; when: string } | null {
  for (let ahead = 1; ahead <= DAYS_PER_SEASON; ahead++) {
    const id = scheduledExhibition(calendarDate(day + ahead).dayOfSeason);
    if (id)
      return {
        id,
        day: day + ahead,
        when: ahead === 1 ? 'tomorrow' : `in ${ahead} days (${formatDate(day + ahead)})`,
      };
  }
  return null;
}
