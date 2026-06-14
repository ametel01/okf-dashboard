import type { CacheMetadata } from "./okf-types";

export const DEFAULT_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export function createCacheMetadata(input: {
  sourceId: string;
  contentFingerprint: string;
  now?: Date;
  ttlMs?: number;
  cacheHit?: boolean;
}): CacheMetadata {
  const now = input.now ?? new Date();
  const expires = new Date(now.getTime() + (input.ttlMs ?? DEFAULT_CACHE_TTL_MS));
  return {
    sourceId: input.sourceId,
    contentFingerprint: input.contentFingerprint,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    cacheHit: input.cacheHit ?? false,
  };
}

export function isExpired(expiresAt: string, now = new Date()): boolean {
  return Date.parse(expiresAt) <= now.getTime();
}
