import type { ConceptDocument, ConceptLink, MarkdownLink, ValidationFinding } from "./okf-types";
import { conceptIdFromPath, directoryOf, normalizeRelativePath } from "./source-model";

const schemePattern = /^[a-z][a-z\d+.-]*:/iu;

export function resolveConceptLinks(concepts: ConceptDocument[]): {
  concepts: ConceptDocument[];
  links: ConceptLink[];
  findings: ValidationFinding[];
} {
  const byPath = new Map(concepts.map((concept) => [concept.path, concept]));
  const lowerPath = new Map(concepts.map((concept) => [concept.path.toLowerCase(), concept.path]));
  const links: ConceptLink[] = [];
  const findings: ValidationFinding[] = [];

  for (const concept of concepts) {
    const outgoing = concept.markdownLinks.map((link) =>
      resolveMarkdownLink(concept, link, byPath, lowerPath),
    );
    links.push(...outgoing);
    for (const resolved of outgoing) {
      if (
        resolved.status === "unresolved" ||
        resolved.status === "case-mismatch" ||
        resolved.status === "unsupported"
      ) {
        findings.push(linkFinding(resolved));
      }
    }
    concept.outgoingLinks = outgoing;
  }

  for (const concept of concepts) {
    concept.incomingLinks = links.filter(
      (link) => link.targetId === concept.id && link.status === "resolved",
    );
  }

  return { concepts, links, findings };
}

function resolveMarkdownLink(
  concept: ConceptDocument,
  link: MarkdownLink,
  byPath: Map<string, ConceptDocument>,
  lowerPath: Map<string, string>,
): ConceptLink {
  const href = link.href.trim();
  const base = {
    sourceId: concept.id,
    sourcePath: concept.path,
    rawHref: href,
    text: link.text,
    line: link.line,
  };

  if (/^(https?:)?\/\//iu.test(href) || href.startsWith("mailto:")) {
    return { ...base, status: "external", externalUrl: href };
  }
  if (schemePattern.test(href) && !href.startsWith("file:")) {
    return { ...base, status: "unsupported" };
  }

  const withoutHash = href.split("#")[0];
  if (!withoutHash.endsWith(".md")) {
    return { ...base, status: href.startsWith("#") ? "resolved" : "unsupported" };
  }

  const targetPath = normalizeTarget(concept.path, withoutHash);
  const target = byPath.get(targetPath);
  if (target) {
    return {
      ...base,
      status: "resolved",
      resolvedPath: target.path,
      targetPath: target.path,
      targetId: target.id,
    };
  }
  const suggestedPath = lowerPath.get(targetPath.toLowerCase());
  if (suggestedPath) {
    return {
      ...base,
      status: "case-mismatch",
      resolvedPath: targetPath,
      targetPath: suggestedPath,
      targetId: conceptIdFromPath(suggestedPath),
      suggestedPath,
    };
  }
  return {
    ...base,
    status: "unresolved",
    resolvedPath: targetPath,
    targetPath,
  };
}

function normalizeTarget(sourcePath: string, href: string): string {
  if (href.startsWith("/")) return normalizeRelativePath(href);
  const directory = directoryOf(sourcePath);
  const stack = directory ? directory.split("/") : [];
  for (const part of href.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") stack.pop();
    else stack.push(part);
  }
  return normalizeRelativePath(stack.join("/"));
}

function linkFinding(link: ConceptLink): ValidationFinding {
  const severity = link.status === "unsupported" ? "info" : "warning";
  return {
    id: `link:${link.sourcePath}:${link.line}:${link.rawHref}`,
    severity,
    scope: "link",
    rule: link.status,
    message:
      link.status === "case-mismatch"
        ? `Link target casing differs from bundle path: ${link.rawHref}`
        : link.status === "unsupported"
          ? `Unsupported Markdown link scheme or target: ${link.rawHref}`
          : `Local Markdown link does not resolve: ${link.rawHref}`,
    filePath: link.sourcePath,
    conceptId: link.sourceId,
    line: link.line,
    remediation:
      link.status === "case-mismatch"
        ? `Update the link to match ${link.suggestedPath}.`
        : "Update the link target or add the missing concept document.",
  };
}
