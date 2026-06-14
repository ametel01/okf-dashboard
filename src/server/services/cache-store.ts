import { DEFAULT_CACHE_TTL_MS, isExpired } from "../../core/cache";
import type { BundleSnapshot, SourceType } from "../../core/okf-types";

interface CacheRecord {
  snapshot: BundleSnapshot;
  sourceType: SourceType;
  sourceIdentifier: string;
  rootPath: string;
  contentFingerprint: string;
  expiresAt: string;
}

export class CacheStore {
  private readonly entries = new Map<string, CacheRecord>();

  constructor(private readonly ttlMs = DEFAULT_CACHE_TTL_MS) {}

  key(
    sourceType: SourceType,
    sourceIdentifier: string,
    rootPath: string,
    contentFingerprint: string,
  ): string {
    return `${sourceType}:${sourceIdentifier}:${rootPath}:${contentFingerprint}`;
  }

  get(
    sourceType: SourceType,
    sourceIdentifier: string,
    rootPath: string,
    contentFingerprint: string,
  ): BundleSnapshot | undefined {
    const key = this.key(sourceType, sourceIdentifier, rootPath, contentFingerprint);
    const record = this.entries.get(key);
    if (!record) return undefined;
    if (isExpired(record.expiresAt)) {
      this.entries.delete(key);
      return undefined;
    }
    return { ...record.snapshot, cache: { ...record.snapshot.cache, cacheHit: true } };
  }

  set(snapshot: BundleSnapshot): BundleSnapshot {
    const expiresAt = new Date(Date.now() + this.ttlMs).toISOString();
    const key = this.key(
      snapshot.source.type,
      snapshot.source.id,
      snapshot.source.rootPath,
      snapshot.cache.contentFingerprint,
    );
    this.entries.set(key, {
      snapshot,
      sourceType: snapshot.source.type,
      sourceIdentifier: snapshot.source.id,
      rootPath: snapshot.source.rootPath,
      contentFingerprint: snapshot.cache.contentFingerprint,
      expiresAt,
    });
    return snapshot;
  }

  getBySourceId(sourceId: string): BundleSnapshot | undefined {
    for (const [key, record] of this.entries) {
      if (record.snapshot.source.id !== sourceId) continue;
      if (isExpired(record.expiresAt)) {
        this.entries.delete(key);
        return undefined;
      }
      return record.snapshot;
    }
    return undefined;
  }

  clear(sourceId?: string): { cleared: boolean } {
    if (!sourceId) {
      const cleared = this.entries.size > 0;
      this.entries.clear();
      return { cleared };
    }
    let cleared = false;
    for (const [key, record] of this.entries) {
      if (record.snapshot.source.id === sourceId) {
        this.entries.delete(key);
        cleared = true;
      }
    }
    return { cleared };
  }
}

export const cacheStore = new CacheStore();
