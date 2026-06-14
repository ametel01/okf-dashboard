import type { ApiErrorResponse, BundleSnapshot } from "../../core/okf-types";

export async function loadLocalBundle(rootPath: string): Promise<BundleSnapshot> {
  return postJson("/api/sources/local/load", { rootPath });
}

export async function refreshLocalBundle(
  sourceId: string,
  rootPath: string,
): Promise<BundleSnapshot> {
  return postJson("/api/sources/local/refresh", { sourceId, rootPath });
}

export async function loadGitHubBundle(input: {
  owner: string;
  repo: string;
  ref: string;
  path?: string;
}): Promise<BundleSnapshot> {
  return postJson("/api/sources/github/load", input);
}

export async function clearBundleCache(sourceId?: string): Promise<{ cleared: boolean }> {
  return postJson("/api/cache/clear", { sourceId });
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload = (await response.json().catch(() => undefined)) as ApiErrorResponse | undefined;
    throw new Error(payload?.error.message ?? `Request failed with ${response.status}`);
  }
  return (await response.json()) as T;
}
