import { PIP_ID } from '../household';

/** What a migration kept, leaving out Grandpa's Pip and his satchel, which v10 adds. */
export function kept<T extends { id: string }>(items: T[]): T[] {
  return items.filter((item) => item.id !== PIP_ID && item.id !== `satchel-${PIP_ID}`);
}
