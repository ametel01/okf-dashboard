import type { ConceptDocument, ConceptLink, GraphSnapshot } from "./okf-types";
import { deriveTitle } from "./source-model";

export function buildGraph(
  concepts: ConceptDocument[],
  links: ConceptLink[],
  maxNodes = 80,
): GraphSnapshot {
  const conceptNodes = concepts.map((concept) => ({
    id: concept.id,
    label: concept.title ?? deriveTitle(concept.path),
    path: concept.path,
    directory: concept.directory || "bundle root",
    type: concept.type,
    findingCount: concept.findings.length,
  }));
  const unresolvedLinks = links.filter(
    (link) => link.status === "unresolved" || link.status === "case-mismatch",
  );
  const unresolvedNodes = unresolvedLinks.map((link) => ({
    id: `unresolved:${link.sourceId}:${link.rawHref}`,
    label: link.rawHref,
    path: link.targetPath ?? link.rawHref,
    directory: "unresolved",
    unresolved: true,
    findingCount: 1,
  }));
  const nodeIds = new Set([...conceptNodes, ...unresolvedNodes].map((node) => node.id));
  const edges = links
    .filter((link) => link.status !== "external" && link.status !== "unsupported")
    .map((link, index) => ({
      id: `${link.sourceId}:${link.targetId ?? link.rawHref}:${index}`,
      sourceId: link.sourceId,
      targetId:
        link.targetId && nodeIds.has(link.targetId)
          ? link.targetId
          : `unresolved:${link.sourceId}:${link.rawHref}`,
      status: link.status,
      label: link.text,
    }));
  const nodes = [...conceptNodes, ...unresolvedNodes];
  const groups = [...new Set(nodes.map((node) => node.directory))].map((directory) => ({
    directory,
    nodeIds: nodes.filter((node) => node.directory === directory).map((node) => node.id),
  }));
  return { nodes, edges, groups, largeGraph: nodes.length > maxNodes };
}

export function focusGraph(
  snapshot: GraphSnapshot,
  options: { conceptId?: string; directory?: string; query?: string; limit?: number },
): GraphSnapshot {
  const limit = options.limit ?? 40;
  let nodes = snapshot.nodes;
  if (options.conceptId) {
    const relatedIds = new Set<string>([options.conceptId]);
    for (const edge of snapshot.edges) {
      if (edge.sourceId === options.conceptId) relatedIds.add(edge.targetId);
      if (edge.targetId === options.conceptId) relatedIds.add(edge.sourceId);
    }
    nodes = nodes.filter((node) => relatedIds.has(node.id));
  } else if (options.directory) {
    nodes = nodes.filter((node) => node.directory === options.directory);
  } else if (options.query) {
    const query = options.query.toLowerCase();
    nodes = nodes.filter((node) =>
      `${node.label} ${node.path} ${node.type ?? ""}`.toLowerCase().includes(query),
    );
  }
  nodes = nodes.slice(0, limit);
  const ids = new Set(nodes.map((node) => node.id));
  const edges = snapshot.edges.filter((edge) => ids.has(edge.sourceId) && ids.has(edge.targetId));
  const groups = [...new Set(nodes.map((node) => node.directory))].map((directory) => ({
    directory,
    nodeIds: nodes.filter((node) => node.directory === directory).map((node) => node.id),
  }));
  return { nodes, edges, groups, largeGraph: snapshot.largeGraph };
}
