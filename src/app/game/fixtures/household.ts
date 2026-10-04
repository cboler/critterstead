import { PIP_ID } from '../household';

/**
 * What a migration kept: leaves out Grandpa's Pip and his satchel, which v10 adds, and the
 * practice record v11 gives every critter.
 */
export function kept<T extends { id: string }>(items: T[]): T[] {
  return items
    .filter((item) => item.id !== PIP_ID && item.id !== `satchel-${PIP_ID}`)
    .map((item) => {
      if (!('practised' in item)) return item;
      const rest: Partial<T & { practised: unknown }> = { ...item };
      delete rest.practised;
      return rest as unknown as T;
    });
}
