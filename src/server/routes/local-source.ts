import { buildBundleSnapshot } from "../../core/bundle";
import { fingerprintFiles } from "../../core/source-model";
import type { CacheStore } from "../services/cache-store";
import { loadLocalInventory } from "../services/local-loader";

export async function loadLocalSource(body: unknown, cache: CacheStore) {
  const rootPath = readString(body, "rootPath");
  const inventory = await loadLocalInventory(rootPath);
  const fingerprint = fingerprintFiles(inventory.files);
  const cached = cache.get("local", inventory.source.id, inventory.source.rootPath, fingerprint);
  if (cached) return cached;
  return cache.set(buildBundleSnapshot(inventory));
}

export async function refreshLocalSource(body: unknown, cache: CacheStore) {
  const rootPath = readString(body, "rootPath");
  cache.clear(readOptionalString(body, "sourceId"));
  return loadLocalSource({ rootPath }, cache);
}

function readString(body: unknown, field: string): string {
  if (
    typeof body === "object" &&
    body &&
    field in body &&
    typeof body[field as keyof typeof body] === "string"
  ) {
    return body[field as keyof typeof body] as string;
  }
  throw new Error(`Missing required field: ${field}`);
}

function readOptionalString(body: unknown, field: string): string | undefined {
  if (
    typeof body === "object" &&
    body &&
    field in body &&
    typeof body[field as keyof typeof body] === "string"
  ) {
    return body[field as keyof typeof body] as string;
  }
  return undefined;
}
