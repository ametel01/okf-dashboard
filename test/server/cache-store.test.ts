import { describe, expect, test } from "bun:test";
import { buildBundleSnapshot } from "../../src/core/bundle";
import { createSourceDescriptor, createSourceFile } from "../../src/core/source-model";
import { CacheStore } from "../../src/server/services/cache-store";

function snapshot(title: string) {
  return buildBundleSnapshot({
    source: createSourceDescriptor({ type: "local", rootPath: "/fixture" }),
    warnings: [],
    files: [createSourceFile("a.md", `---\ntype: Note\ntitle: ${title}\n---\nBody`)],
  });
}

describe("cache store", () => {
  test("returns hits, clears manually, and new instances start empty", () => {
    const store = new CacheStore();
    const first = store.set(snapshot("Alpha"));
    const hit = store.get(
      first.source.type,
      first.source.id,
      first.source.rootPath,
      first.cache.contentFingerprint,
    );
    expect(hit?.cache.cacheHit).toBe(true);
    expect(store.clear(first.source.id)).toEqual({ cleared: true });
    expect(store.getBySourceId(first.source.id)).toBeUndefined();
    expect(new CacheStore().getBySourceId(first.source.id)).toBeUndefined();
  });

  test("invalidates by fingerprint and TTL", async () => {
    const store = new CacheStore(1);
    const first = store.set(snapshot("Alpha"));
    const second = snapshot("Beta");
    expect(
      store.get(
        second.source.type,
        second.source.id,
        second.source.rootPath,
        second.cache.contentFingerprint,
      ),
    ).toBeUndefined();
    await Bun.sleep(2);
    expect(
      store.get(
        first.source.type,
        first.source.id,
        first.source.rootPath,
        first.cache.contentFingerprint,
      ),
    ).toBeUndefined();
  });
});
