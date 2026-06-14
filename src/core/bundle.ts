import { createCacheMetadata } from "./cache";
import { extractCitations } from "./citations";
import { parseFrontmatter, splitStandardFrontmatter } from "./frontmatter";
import { buildGraph } from "./graph";
import { buildDirectoryTree, deriveFacets, deriveMetrics } from "./indexes";
import { resolveConceptLinks } from "./links";
import { parseLogEntries } from "./logs";
import { extractHeadings, extractMarkdownLinks, parseIndexEntries } from "./markdown";
import type {
  AuxiliaryFile,
  BundleSnapshot,
  ConceptDocument,
  ReservedFile,
  SourceFileSummary,
  SourceInventory,
} from "./okf-types";
import { buildSearchIndex } from "./search";
import { conceptIdFromPath, directoryOf, fingerprintFiles } from "./source-model";
import { attachFindingsToConcepts, validateBundle } from "./validate";

export function buildBundleSnapshot(inventory: SourceInventory, cacheHit = false): BundleSnapshot {
  const concepts: ConceptDocument[] = [];
  const reservedFiles: ReservedFile[] = [];
  const auxiliaryFiles: AuxiliaryFile[] = [];
  const parseFindings = [];
  let okfVersion: string | undefined;

  for (const file of inventory.files) {
    if (file.symlinkSkipped) continue;
    const parsed = parseFrontmatter(file.content, file.path);
    parseFindings.push(...parsed.findings);
    const headings = extractHeadings(parsed.body);
    const links = extractMarkdownLinks(parsed.body);

    if (file.kind === "concept") {
      const fields = splitStandardFrontmatter(parsed.data);
      concepts.push({
        id: conceptIdFromPath(file.path),
        path: file.path,
        directory: directoryOf(file.path),
        frontmatter: parsed.data,
        ...fields,
        body: parsed.body,
        raw: file.content,
        headings,
        citations: extractCitations(parsed.body),
        markdownLinks: links,
        outgoingLinks: [],
        incomingLinks: [],
        findings: [],
      });
    } else if (file.kind === "index" || file.kind === "log") {
      if (file.path === "index.md") okfVersion = parsed.okfVersion;
      reservedFiles.push({
        path: file.path,
        kind: file.kind,
        directory: directoryOf(file.path),
        body: parsed.body,
        raw: file.content,
        okfVersion: parsed.okfVersion,
        headings,
        links,
        indexEntries: file.kind === "index" ? parseIndexEntries(parsed.body) : [],
        logEntries: file.kind === "log" ? parseLogEntries(parsed.body) : [],
        findings: [],
      });
    } else {
      auxiliaryFiles.push({
        path: file.path,
        kind: "README",
        directory: directoryOf(file.path),
        body: parsed.body,
        raw: file.content,
        headings,
        links,
      });
    }
  }

  const resolved = resolveConceptLinks(concepts);
  const initialFindings = [
    ...parseFindings,
    ...validateBundle({ inventory, concepts: resolved.concepts, reservedFiles }),
    ...resolved.findings,
  ];
  attachFindingsToConcepts(resolved.concepts, initialFindings);
  const graph = buildGraph(resolved.concepts, resolved.links);
  const files: SourceFileSummary[] = [];
  for (const file of inventory.files) {
    if (file.symlinkSkipped) continue;
    files.push({
      path: file.path,
      kind: file.kind,
      fingerprint: file.fingerprint,
      bytes: new TextEncoder().encode(file.content).byteLength,
    });
  }
  const directories = buildDirectoryTree(files, resolved.concepts);
  const flattenedDirectories = flattenDirectories(directories);
  const contentFingerprint = fingerprintFiles(files);
  const cache = createCacheMetadata({
    sourceId: inventory.source.id,
    contentFingerprint,
    cacheHit,
  });
  const metrics = deriveMetrics({
    files,
    concepts: resolved.concepts,
    directoryCount: flattenedDirectories.length,
    maxDepth: Math.max(0, ...flattenedDirectories.map((directory) => directory.depth)),
    linkCounts: {
      brokenLinks: resolved.links.filter(
        (link) => link.status === "unresolved" || link.status === "case-mismatch",
      ).length,
    },
    findings: initialFindings,
    indexCount: reservedFiles.filter((file) => file.kind === "index").length,
    logCount: reservedFiles.filter((file) => file.kind === "log").length,
    auxiliaryCount: auxiliaryFiles.length,
  });
  return {
    source: inventory.source,
    okfVersion,
    files,
    directories,
    concepts: resolved.concepts,
    reservedFiles,
    auxiliaryFiles,
    links: resolved.links,
    graph,
    findings: initialFindings,
    cache,
    metrics,
    facets: deriveFacets(resolved.concepts),
    searchIndex: buildSearchIndex(resolved.concepts),
  };
}

function flattenDirectories(
  nodes: ReturnType<typeof buildDirectoryTree>,
): ReturnType<typeof buildDirectoryTree> {
  return nodes.flatMap((node) => [node, ...flattenDirectories(node.children)]);
}
