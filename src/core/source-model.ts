import type { FileKind, SourceDescriptor, SourceFile, SourceType } from "./okf-types";

export function normalizeRelativePath(path: string): string {
  return path.replaceAll("\\", "/").replace(/^\/+/, "").replace(/\/+/g, "/");
}

export function directoryOf(path: string): string {
  const normalized = normalizeRelativePath(path);
  const index = normalized.lastIndexOf("/");
  return index === -1 ? "" : normalized.slice(0, index);
}

function basename(path: string): string {
  const normalized = normalizeRelativePath(path);
  return normalized.split("/").pop() ?? normalized;
}

function classifyMarkdownFile(path: string): FileKind {
  const name = basename(path);
  if (name === "index.md") return "index";
  if (name === "log.md") return "log";
  if (name === "README.md") return "auxiliary";
  return "concept";
}

export function conceptIdFromPath(path: string): string {
  return normalizeRelativePath(path).replace(/\.md$/u, "");
}

export function deriveTitle(path: string): string {
  const raw = basename(path).replace(/\.md$/u, "");
  return raw
    .split(/[-_]/u)
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

export function createSourceDescriptor(input: {
  type: SourceType;
  rootPath: string;
  ref?: string;
  displayName?: string;
}): SourceDescriptor {
  const loadedAt = new Date().toISOString();
  const key = `${input.type}:${input.rootPath}:${input.ref ?? ""}`;
  return {
    type: input.type,
    id: fingerprintText(key).slice(0, 16),
    rootPath: input.rootPath,
    ref: input.ref,
    loadedAt,
    displayName: input.displayName,
  };
}

export function createSourceFile(
  path: string,
  content: string,
  symlinkSkipped = false,
): SourceFile {
  const normalized = normalizeRelativePath(path);
  return {
    path: normalized,
    kind: classifyMarkdownFile(normalized),
    content,
    fingerprint: fingerprintText(content),
    symlinkSkipped,
  };
}

function fingerprintText(text: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fingerprintFiles(files: Pick<SourceFile, "path" | "fingerprint">[]): string {
  return fingerprintText(
    files
      .map((file) => `${file.path}:${file.fingerprint}`)
      .sort((left, right) => left.localeCompare(right))
      .join("|"),
  );
}
