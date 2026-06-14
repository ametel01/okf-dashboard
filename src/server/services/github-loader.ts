import type { SourceInventory } from "../../core/okf-types";
import {
  createSourceDescriptor,
  createSourceFile,
  normalizeRelativePath,
} from "../../core/source-model";

interface GitTreeItem {
  path: string;
  type: "blob" | "tree";
  url: string;
}

const GIT_SLUG_PATTERN = /^[A-Za-z0-9_.-]+$/u;

export async function loadGitHubInventory(input: {
  owner: string;
  repo: string;
  ref: string;
  path?: string;
}): Promise<SourceInventory> {
  const owner = validateGitSlug(input.owner, "owner");
  const repo = validateGitSlug(input.repo, "repo");
  const ref = validateGitSlug(input.ref, "ref");
  const encodedOwner = encodeURIComponent(owner);
  const encodedRepo = encodeURIComponent(repo);
  const encodedRef = encodeURIComponent(ref);
  const bundlePath = normalizeRelativePath(input.path ?? "");
  const treeResponse = await fetch(
    `https://api.github.com/repos/${encodedOwner}/${encodedRepo}/git/trees/${encodedRef}?recursive=1`,
    { headers: { Accept: "application/vnd.github+json", "User-Agent": "okf-dashboard-local" } },
  );
  if (!treeResponse.ok) {
    throw new Error(`GitHub tree request failed with ${treeResponse.status}`);
  }
  const treeBody = (await treeResponse.json()) as { tree?: GitTreeItem[] };
  const markdownFiles = (treeBody.tree ?? []).filter((item) => {
    if (item.type !== "blob" || !item.path.endsWith(".md")) return false;
    return bundlePath ? item.path === bundlePath || item.path.startsWith(`${bundlePath}/`) : true;
  });
  const source = createSourceDescriptor({
    type: "github",
    rootPath: `${owner}/${repo}/${bundlePath}`,
    ref,
    displayName: `${owner}/${repo}`,
  });
  const files = await Promise.all(
    markdownFiles.map(async (item) => {
      const rawPath = bundlePath
        ? item.path.slice(bundlePath.length).replace(/^\/+/u, "")
        : item.path;
      const encodedPath = item.path.split("/").map(encodeURIComponent).join("/");
      const contentResponse = await fetch(
        `https://raw.githubusercontent.com/${encodedOwner}/${encodedRepo}/${encodedRef}/${encodedPath}`,
      );
      if (!contentResponse.ok) throw new Error(`GitHub file request failed for ${item.path}`);
      return createSourceFile(rawPath, await contentResponse.text());
    }),
  );
  return { source, files, warnings: [] };
}

function validateGitSlug(value: string, field: string): string {
  if (!GIT_SLUG_PATTERN.test(value)) {
    throw new Error(`Invalid GitHub ${field}. Use only letters, numbers, ".", "_", or "-".`);
  }
  return value;
}
