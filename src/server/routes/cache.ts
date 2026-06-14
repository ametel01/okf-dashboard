import type { CacheStore } from "../services/cache-store";

export function clearCache(body: unknown, cache: CacheStore): { cleared: boolean } {
  const sourceId =
    typeof body === "object" && body && "sourceId" in body && typeof body.sourceId === "string"
      ? body.sourceId
      : undefined;
  return cache.clear(sourceId);
}
