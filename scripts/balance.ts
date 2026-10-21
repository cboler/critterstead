// Prints how quickly each kind of player climbs the Colosseum ladder (plan 005 M3).
// Run with `npm run balance`; pass a number of days to simulate (default two years).
import { pace, PLAYERS } from '../src/app/game/balance';
import { RANKS } from '../src/app/game/ladder';

const days = Number(process.argv[2]) || 240;
const cell = (value: string) => value.padEnd(16);
console.log(`Median day each rank is reached, over every family, in ${days} days of play`);
console.log(['player', ...RANKS.slice(1, 4), 'stats', 'ladder coins'].map(cell).join(''));
for (const player of PLAYERS) {
  const result = pace(player, days);
  const ranks = [1, 2, 3].map((rank) =>
    result.medians[rank] === undefined
      ? `- (${Math.round(result.reached[rank] * 100)}%)`
      : `day ${result.medians[rank]} (${Math.round(result.reached[rank] * 100)}%)`,
  );
  console.log([player.name, ...ranks, `${result.stats}`, `${result.coins}`].map(cell).join(''));
}
