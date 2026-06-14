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

export async function loadGitHubInventory(input: {
  owner: string;
  repo: string;
  ref: string;
  path?: string;
}): Promise<SourceInventory> {
  const bundlePath = normalizeRelativePath(input.path ?? "");
  const treeResponse = await fetch(
    `https://api.github.com/repos/${input.owner}/${input.repo}/git/trees/${encodeURIComponent(input.ref)}?recursive=1`,
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
    rootPath: `${input.owner}/${input.repo}/${bundlePath}`,
    ref: input.ref,
    displayName: `${input.owner}/${input.repo}`,
  });
  const files = [];
  for (const item of markdownFiles) {
    const rawPath = bundlePath
      ? item.path.slice(bundlePath.length).replace(/^\/+/u, "")
      : item.path;
    const contentResponse = await fetch(
      `https://raw.githubusercontent.com/${input.owner}/${input.repo}/${input.ref}/${item.path}`,
    );
    if (!contentResponse.ok) throw new Error(`GitHub file request failed for ${item.path}`);
    files.push(createSourceFile(rawPath, await contentResponse.text()));
  }
  return { source, files, warnings: [] };
}
