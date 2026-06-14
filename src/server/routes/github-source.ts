import { buildBundleSnapshot } from "../../core/bundle";
import { fingerprintFiles } from "../../core/source-model";
import type { CacheStore } from "../services/cache-store";
import { loadGitHubInventory } from "../services/github-loader";

export async function loadGitHubSource(body: unknown, cache: CacheStore) {
  const input = readGitHubInput(body);
  const inventory = await loadGitHubInventory(input);
  const fingerprint = fingerprintFiles(inventory.files);
  const cached = cache.get("github", inventory.source.id, inventory.source.rootPath, fingerprint);
  if (cached) return cached;
  return cache.set(buildBundleSnapshot(inventory));
}

export async function refreshGitHubSource(body: unknown, cache: CacheStore) {
  const input = readGitHubInput(body);
  cache.clear(readOptionalString(body, "sourceId"));
  return loadGitHubSource(input, cache);
}

function readGitHubInput(body: unknown): {
  owner: string;
  repo: string;
  ref: string;
  path?: string;
} {
  return {
    owner: readString(body, "owner"),
    repo: readString(body, "repo"),
    ref: readString(body, "ref"),
    path: readOptionalString(body, "path"),
  };
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
