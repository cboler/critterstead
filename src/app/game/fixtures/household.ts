import { PIP_ID } from '../household';

/**
 * What a migration kept: leaves out Grandpa's Pip and his satchel, which v10 adds, the
 * practice record v11 gives every critter, and the ladder standing v13 gives it.
 */
export function kept<T extends { id: string }>(items: T[]): T[] {
  return items
    .filter((item) => item.id !== PIP_ID && item.id !== `satchel-${PIP_ID}`)
    .map((item) => {
      const rest: Record<string, unknown> = { ...item };
      delete rest['practised'];
      delete rest['ladder'];
      return rest as T;
    });
}
