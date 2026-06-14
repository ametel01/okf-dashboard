import type {
  BundleFacets,
  BundleMetrics,
  ConceptDocument,
  DirectoryNode,
  SourceFileSummary,
} from "./okf-types";
import { directoryOf } from "./source-model";

export function buildDirectoryTree(
  files: SourceFileSummary[],
  concepts: ConceptDocument[],
): DirectoryNode[] {
  const nodes = new Map<string, DirectoryNode>();
  const ensure = (path: string): DirectoryNode => {
    const existing = nodes.get(path);
    if (existing) return existing;
    const name = path === "" ? "bundle root" : (path.split("/").pop() ?? path);
    const node: DirectoryNode = {
      path,
      name,
      depth: path === "" ? 0 : path.split("/").length,
      fileCount: 0,
      conceptCount: 0,
      children: [],
    };
    nodes.set(path, node);
    const parent = directoryOf(path);
    if (path !== "") ensure(parent).children.push(node);
    return node;
  };
  ensure("");
  for (const file of files) {
    const directory = directoryOf(file.path);
    ensure(directory).fileCount += 1;
  }
  for (const concept of concepts) ensure(concept.directory).conceptCount += 1;
  return [ensure("")];
}

export function deriveFacets(concepts: ConceptDocument[]): BundleFacets {
  return {
    types: countValues(concepts.map((concept) => concept.type ?? "Unknown")),
    tags: countValues(concepts.flatMap((concept) => concept.tags)),
    directories: countValues(concepts.map((concept) => concept.directory || "bundle root")),
  };
}

export function deriveMetrics(input: {
  files: SourceFileSummary[];
  concepts: ConceptDocument[];
  directoryCount: number;
  maxDepth: number;
  linkCounts: { brokenLinks: number };
  findings: { severity: "error" | "warning" | "info" }[];
  indexCount: number;
  logCount: number;
  auxiliaryCount: number;
}): BundleMetrics {
  const missingRecommendedFields = input.concepts.reduce((total, concept) => {
    return total + (concept.title ? 0 : 1) + (concept.description ? 0 : 1);
  }, 0);
  return {
    markdownFiles: input.files.length,
    concepts: input.concepts.length,
    indexes: input.indexCount,
    logs: input.logCount,
    auxiliary: input.auxiliaryCount,
    directories: input.directoryCount,
    maxDepth: input.maxDepth,
    withResources: input.concepts.filter((concept) => concept.resource).length,
    withCitations: input.concepts.filter((concept) => concept.citations.length > 0).length,
    brokenLinks: input.linkCounts.brokenLinks,
    missingRecommendedFields,
    uniqueTypes: new Set(input.concepts.map((concept) => concept.type ?? "Unknown")).size,
    uniqueTags: new Set(input.concepts.flatMap((concept) => concept.tags)).size,
    errors: input.findings.filter((finding) => finding.severity === "error").length,
    warnings: input.findings.filter((finding) => finding.severity === "warning").length,
    info: input.findings.filter((finding) => finding.severity === "info").length,
    passed: Math.max(0, input.concepts.length + input.files.length - input.findings.length),
  };
}

function countValues(values: string[]): Array<{ value: string; count: number }> {
  const counts = new Map<string, number>();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()]
    .map(([value, count]) => ({ value, count }))
    .sort((left, right) => right.count - left.count || left.value.localeCompare(right.value));
}
