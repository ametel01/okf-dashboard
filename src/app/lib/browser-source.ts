import { buildBundleSnapshot } from "../../core/bundle";
import type { BundleSnapshot, SourceFile } from "../../core/okf-types";
import {
  createSourceDescriptor,
  createSourceFile,
  normalizeRelativePath,
} from "../../core/source-model";

interface LocalFileHandle {
  kind: "file";
  name: string;
  getFile(): Promise<File>;
}

interface LocalDirectoryHandle {
  kind: "directory";
  name: string;
  values(): AsyncIterable<LocalDirectoryHandle | LocalFileHandle>;
}

interface DirectoryPickerWindow extends Window {
  showDirectoryPicker?: () => Promise<LocalDirectoryHandle>;
}

type BrowserSelectedFile = File & { webkitRelativePath?: string };

export interface BrowserDirectoryLoad {
  snapshot: BundleSnapshot;
  reload: () => Promise<BundleSnapshot>;
}

export function isDirectoryPickerSupported(): boolean {
  return typeof (window as DirectoryPickerWindow).showDirectoryPicker === "function";
}

export async function loadBrowserDirectoryBundle(): Promise<BrowserDirectoryLoad> {
  const picker = (window as DirectoryPickerWindow).showDirectoryPicker;
  if (!picker) {
    throw new Error(
      "This browser cannot open a local folder directly. Enter a server-readable local path instead.",
    );
  }
  const directory = await picker();
  const readSnapshot = async () => buildSnapshot(directory);
  return {
    snapshot: await readSnapshot(),
    reload: readSnapshot,
  };
}

export async function loadBrowserFileList(files: FileList): Promise<BrowserDirectoryLoad> {
  const selectedFiles = Array.from(files) as BrowserSelectedFile[];
  const readSnapshot = async () => buildSnapshotFromFiles(selectedFiles);
  return {
    snapshot: await readSnapshot(),
    reload: readSnapshot,
  };
}

async function buildSnapshot(directory: LocalDirectoryHandle): Promise<BundleSnapshot> {
  const files = await readMarkdownFiles(directory, "");
  if (files.length === 0) {
    throw new Error("The selected folder does not contain Markdown files.");
  }
  return buildBundleSnapshot({
    source: createSourceDescriptor({
      type: "local",
      rootPath: directory.name,
      displayName: directory.name,
    }),
    files,
    warnings: [],
  });
}

async function buildSnapshotFromFiles(files: BrowserSelectedFile[]): Promise<BundleSnapshot> {
  const paths = files.map(relativePathOf).filter((path) => path.length > 0);
  const rootName = commonSelectedRoot(paths);
  const markdownFiles: SourceFile[] = [];

  for (const file of files) {
    const rawPath = relativePathOf(file);
    const path =
      rootName && rawPath.startsWith(`${rootName}/`)
        ? normalizeRelativePath(rawPath.slice(rootName.length + 1))
        : rawPath;
    if (!path.endsWith(".md") || hasHiddenPathSegment(path)) continue;
    markdownFiles.push(createSourceFile(path, await file.text()));
  }

  if (markdownFiles.length === 0) {
    throw new Error("The selected folder does not contain Markdown files.");
  }

  const displayName = rootName ?? "Selected folder";
  return buildBundleSnapshot({
    source: createSourceDescriptor({
      type: "local",
      rootPath: displayName,
      displayName,
    }),
    files: markdownFiles.sort((left, right) => left.path.localeCompare(right.path)),
    warnings: [],
  });
}

async function readMarkdownFiles(
  directory: LocalDirectoryHandle,
  prefix: string,
): Promise<SourceFile[]> {
  const files: SourceFile[] = [];
  for await (const entry of directory.values()) {
    if (entry.kind === "directory") {
      if (!entry.name.startsWith(".")) {
        files.push(...(await readMarkdownFiles(entry, joinPath(prefix, entry.name))));
      }
      continue;
    }
    if (!entry.name.endsWith(".md")) continue;
    const file = await entry.getFile();
    files.push(createSourceFile(joinPath(prefix, entry.name), await file.text()));
  }
  return files.sort((left, right) => left.path.localeCompare(right.path));
}

function joinPath(prefix: string, name: string): string {
  return normalizeRelativePath(prefix ? `${prefix}/${name}` : name);
}

function relativePathOf(file: BrowserSelectedFile): string {
  return normalizeRelativePath(file.webkitRelativePath || file.name);
}

function commonSelectedRoot(paths: string[]): string | undefined {
  const rootSegments = paths
    .filter((path) => path.includes("/"))
    .map((path) => path.split("/")[0])
    .filter((segment) => segment.length > 0);
  if (rootSegments.length === 0) return undefined;
  const [first] = rootSegments;
  return rootSegments.every((segment) => segment === first) ? first : undefined;
}

function hasHiddenPathSegment(path: string): boolean {
  return path.split("/").some((segment) => segment.startsWith("."));
}
