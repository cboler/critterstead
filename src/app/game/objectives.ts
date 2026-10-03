import { BEHAVIORS, GAME_CONFIG } from './content';
import { plotReady } from './garden';
import { learnedStage } from './host';
import { quantity } from './logistics';
import { activeCritter, GameState } from './model';

/**
 * A reading of the save for the journal's quest page: nothing here is stored, and nothing
 * here changes a rule. "Today" lists what is worth doing now; "journey" is the long arc.
 */
export interface Objective {
  id: string;
  group: 'today' | 'journey';
  title: string;
  detail: string;
  done: boolean;
  progress?: { value: number; goal: number };
}

export function objectives(state: GameState): Objective[] {
  const critter = activeCritter(state);
  const name = critter.name;
  const has = (flag: string) => state.flags.includes(flag);
  const today: Objective[] = [];
  const offer = (id: string, title: string, detail: string) =>
    today.push({ id, group: 'today', title, detail, done: false });

  if (critter.hunger >= 60) offer('hungry', `${name} is hungry`, 'Offer feed or a berry treat.');
  if (critter.lastPettedDay !== state.day)
    offer('scritch', `Give ${name} today’s scritch`, 'A little care builds your bond.');
  const ready = state.plots.filter(plotReady).length;
  if (ready)
    offer('harvest', `Harvest ${ready} garden bed${ready > 1 ? 's' : ''}`, 'A crop is ready.');
  const dry = state.plots.filter(
    (plot) =>
      plot.crop && !plot.crop.withered && !plotReady(plot) && plot.moistUntil <= state.totalMinutes,
  ).length;
  if (dry)
    offer('water', `Water ${dry} garden bed${dry > 1 ? 's' : ''}`, 'Crops only grow while moist.');
  const trough = state.containers.find((item) => item.kind === 'trough');
  if (critter.hauling.enabled && trough && !quantity(trough, 'feed'))
    offer('trough', 'Stock the feed trough', `${name} eats there between hauling trips.`);
  const output = state.containers.find((item) => item.kind === 'mill-output');
  if (output && output.capacity !== null && quantity(output) >= output.capacity)
    offer('crate', 'Clear the sawmill’s lumber crate', 'The mill stops while it is full.');
  if (has('trained')) {
    if (critter.drills.day !== state.day || !Object.keys(critter.drills.sessions).length)
      offer(
        'drills',
        'Train while gains are full',
        'Each drill’s first session today counts most.',
      );
    if (!critter.competitions.some((result) => result.day === state.day && !result.event))
      offer('cup', 'Run today’s Clover Cup', 'One friendly time trial each day, in the yard.');
  }
  if (
    has('exhibited') &&
    !critter.competitions.some(
      (result) => result.day === state.day && result.event === 'exhibition',
    )
  )
    offer(
      'exhibition',
      'Today’s Colosseum exhibition',
      'The crowd is back; through Oakhaven, west of the yard.',
    );

  const lesson = (id: 'sunberry-foraging' | 'lumber-hauling') => {
    const behavior = BEHAVIORS[id];
    const goal = behavior.stages[behavior.stages.length - 1].threshold;
    const value = Math.min(goal, critter.learnedBehaviors[id] ?? 0);
    return {
      progress: { value, goal },
      done: value >= goal,
      detail: learnedStage(critter, behavior).hint.replaceAll('{name}', name),
    };
  };
  const step = (
    id: string,
    title: string,
    detail: string,
    done: boolean,
    progress?: Objective['progress'],
  ): Objective => ({ id, group: 'journey', title, detail, done, progress });
  const foraging = lesson('sunberry-foraging');
  const hauling = lesson('lumber-hauling');
  const journey = [
    step('care', `Say hello to ${name}`, 'Give a scritch or offer feed.', has('cared')),
    step('practice', 'Practice together', 'Try the practice hoops in the yard.', has('trained')),
    step('gather', 'Beyond the garden gate', 'Gather sunberries in Clover Glade.', has('gathered')),
    step('foraging', `Teach ${name} to forage`, foraging.detail, foraging.done, foraging.progress),
    step(
      'garden',
      'Grow something',
      'Plant, water and harvest a garden bed.',
      has('harvested-crop') || has('grew-feed'),
    ),
    step(
      'nook',
      'A cozier nook',
      `Save ${GAME_CONFIG.shedCost} coins and make ${name}’s nook cozy.`,
      state.shedLevel > 0,
    ),
    step(
      'lumber',
      'Timber to lumber',
      'Chop fallen timber and feed the yard sawmill.',
      has('refined-lumber'),
    ),
    step('hauling', `Teach ${name} to haul`, hauling.detail, hauling.done, hauling.progress),
    step('cup', 'A first ribbon', 'Run the Clover Cup time trial in the yard.', has('raced')),
    step(
      'exhibition',
      'Stand before the crowd',
      'Enter the Colosseum exhibition, through Oakhaven.',
      has('exhibited'),
    ),
    step(
      'calendar',
      'Know your seasons',
      'Read the wall calendar inside the cottage.',
      has('checked-calendar'),
    ),
  ];
  return [...today, ...journey];
}

/** The one thing to suggest when the rancher is not near anything: the journey's next step. */
export function nextObjective(state: GameState): Objective | undefined {
  const all = objectives(state);
  return (
    all.find((item) => item.group === 'journey' && !item.done) ??
    all.find((item) => item.group === 'today')
  );
}
