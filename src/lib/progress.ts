/**
 * Rounded percentage of `items` for which `isComplete` holds. Returns null
 * for an empty list, so callers know to keep whatever value they already
 * had instead of overwriting it with a meaningless 0/100 — used both for a
 * task's progress from its subtasks and a project's progress from its
 * tasks (section 8/6 of the master prompt: progress rolls up automatically
 * from the items below it).
 */
export function percentageComplete<T>(items: T[], isComplete: (item: T) => boolean): number | null {
  if (items.length === 0) return null;
  const done = items.filter(isComplete).length;
  return Math.round((done / items.length) * 100);
}
