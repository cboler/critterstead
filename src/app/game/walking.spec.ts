import { describe, expect, it } from 'vitest';
import { EXHIBITION_BOOTH, TOWN_WELL } from './content';
import { createInitialState, LocalGameHost } from './host';
import { AreaId, Point } from './model';

function standing(areaId: AreaId, position: Point): LocalGameHost {
  const state = createInitialState();
  state.areaId = areaId;
  state.player.position = { ...position };
  return new LocalGameHost(state);
}
/** Steers toward a point until within reach, as the walk-to-tap does. */
function approach(host: LocalGameHost, target: Point, reach = 1.2): Point {
  for (let tick = 0; tick < 200 && distance(host.state.player.position, target) > reach; tick++) {
    const { x, z } = host.state.player.position;
    host.dispatch({ type: 'move', x: target.x - x, z: target.z - z, seconds: 0.1 });
  }
  return host.state.player.position;
}
/** Holds a direction for some seconds, as the keyboard does, a tenth of a second at a time. */
function walk(host: LocalGameHost, x: number, z: number, seconds: number): Point {
  for (let tick = 0; tick < seconds * 10; tick++)
    host.dispatch({ type: 'move', x, z, seconds: 0.1 });
  return host.state.player.position;
}
// Where a point sits against the arena wall's ellipse: below 1 is inside the ring.
const ring = ({ x, z }: Point) => ((x - 1) / 5.6) ** 2 + ((z + 1) / 3.8) ** 2;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.z - b.z);

describe('solid scenery', () => {
  it('keeps the rancher out of the Colosseum wall and stands, but lets them in at the entrance', () => {
    const front = standing('colosseum', { x: 1, z: 4 });
    for (let tick = 0; tick < 30; tick++) {
      walk(front, 0, -1, 0.1);
      expect(ring(front.state.player.position)).toBeGreaterThan(1);
    }

    const behind = standing('colosseum', { x: 1, z: -9 });
    expect(walk(behind, 0, 1, 3).z).toBeLessThan(-6.5);

    // From the gate along the path, through the gap, up to the steward's booth.
    const visitor = standing('colosseum', { x: -6, z: 4 });
    approach(visitor, { x: -3.4, z: 1.6 }, 0.3);
    expect(ring(approach(visitor, EXHIBITION_BOOTH))).toBeLessThan(1);
    expect(distance(visitor.state.player.position, EXHIBITION_BOOTH)).toBeLessThan(1.25);
    expect(visitor.interaction()!.id).toBe('exhibition');
  });

  it('stops at Oakhaven buildings and glances around the well on the way through town', () => {
    const shopper = standing('town', { x: 0, z: -2 });
    expect(walk(shopper, 0, -1, 3).z).toBeGreaterThan(-4.3);

    const traveller = standing('town', { x: 6.4, z: 1 });
    for (let tick = 0; tick < 50; tick++) {
      walk(traveller, -1, 0, 0.1);
      expect(distance(traveller.state.player.position, TOWN_WELL)).toBeGreaterThanOrEqual(1.19);
    }
    expect(traveller.state.player.position.x).toBeLessThan(-6);
  });

  it('lets someone standing inside new scenery from an older save walk out', () => {
    const stuck = standing('town', { x: 0.2, z: 0.1 });
    const out = walk(stuck, 1, 0, 1);
    expect(distance(out, TOWN_WELL)).toBeGreaterThan(1.2);
  });
});
