import { GameState } from '../model';

/**
 * A household with a second critter of the player's own, an expert forager who is not the
 * companion, placed first in the roster so tests can check it is never touched.
 */
export function withDormantExpert(state: GameState): GameState {
  const companion = state.critters.find((critter) => critter.id === state.activeCritterId)!;
  const dormant = {
    ...structuredClone(companion),
    id: 'critter-dormant',
    name: 'Bramble',
    position: { x: 6, z: 6 },
    learnedBehaviors: { 'sunberry-foraging': 8 },
    skills: { harvesting: 6, racing: 6 },
    history: ['Day 1: An old hand at the berry bushes.'],
  };
  state.critters.unshift(dormant);
  state.containers.push({
    id: `satchel-${dormant.id}`,
    kind: 'satchel',
    location: { actorId: dormant.id },
    capacity: null,
    allowed: [...state.containers.find((item) => item.kind === 'satchel')!.allowed],
    items: [],
  });
  return state;
}
