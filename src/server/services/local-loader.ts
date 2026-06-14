import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import type { SourceFile, SourceInventory, ValidationFinding } from "../../core/okf-types";
import {
  createSourceDescriptor,
  createSourceFile,
  normalizeRelativePath,
} from "../../core/source-model";

export async function loadLocalInventory(rootPath: string): Promise<SourceInventory> {
  const absoluteRoot = resolve(rootPath);
  const source = createSourceDescriptor({
    type: "local",
    rootPath: absoluteRoot,
    displayName: absoluteRoot.split("/").pop() || absoluteRoot,
  });
  const files: SourceFile[] = [];
  const warnings: ValidationFinding[] = [];
  await scanDirectory(absoluteRoot, absoluteRoot, files, warnings);
  files.sort((left, right) => left.path.localeCompare(right.path));
  return { source, files, warnings };
}

async function scanDirectory(
  root: string,
  directory: string,
  files: SourceFile[],
  warnings: ValidationFinding[],
): Promise<void> {
  const entries = await readdir(directory, { withFileTypes: true });
  const scans: Array<Promise<void>> = [];
  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);
    const relativePath = normalizeRelativePath(relative(root, absolutePath));
    if (entry.isSymbolicLink() && entry.name.endsWith(".md")) {
      warnings.push({
        id: `symlink:${relativePath}`,
        severity: "warning",
        scope: "file",
        rule: "symlink-skipped",
        message: `Skipped symlinked Markdown file ${relativePath}.`,
        filePath: relativePath,
        remediation: "Replace the symlink with a regular Markdown file if it should be included.",
      });
      continue;
    }
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".")) {
        scans.push(scanDirectory(root, absolutePath, files, warnings));
      }
      continue;
    }
    if (entry.isFile() && entry.name.endsWith(".md")) {
      scans.push(
        readFile(absolutePath, "utf8").then((content) => {
          files.push(createSourceFile(relativePath, content));
        }),
      );
    }
  }
  await Promise.all(scans);
}
