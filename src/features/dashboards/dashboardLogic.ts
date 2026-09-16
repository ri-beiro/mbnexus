export interface ChartDatum {
  label: string;
  value: number;
}

/** Buckets `items` by a key derived from each one, always returning one
 * entry per `orderedKeys` (zero-filled) in that order — so a chart never
 * silently drops a category just because nothing currently falls into it. */
export function countByKey<T, K extends string>(
  items: T[],
  keyOf: (item: T) => K,
  orderedKeys: readonly K[],
  labelOf: (key: K) => string,
): ChartDatum[] {
  const counts = new Map<K, number>(orderedKeys.map((key) => [key, 0]));
  for (const item of items) {
    const key = keyOf(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return orderedKeys.map((key) => ({ label: labelOf(key), value: counts.get(key) ?? 0 }));
}
