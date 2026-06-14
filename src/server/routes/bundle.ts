import type { CacheStore } from "../services/cache-store";

export function getBundle(sourceId: string, cache: CacheStore) {
  const snapshot = cache.getBySourceId(sourceId);
  if (!snapshot) throw new Error(`Bundle not found for source ${sourceId}`);
  return snapshot;
}
