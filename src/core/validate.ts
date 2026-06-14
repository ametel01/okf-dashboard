import type {
  ConceptDocument,
  ReservedFile,
  SourceInventory,
  ValidationFinding,
} from "./okf-types";
import { deriveTitle } from "./source-model";

export function validateBundle(input: {
  inventory: SourceInventory;
  concepts: ConceptDocument[];
  reservedFiles: ReservedFile[];
}): ValidationFinding[] {
  const findings: ValidationFinding[] = [...input.inventory.warnings];
  const titles = new Map<string, ConceptDocument[]>();

  for (const concept of input.concepts) {
    if (!concept.frontmatter || Object.keys(concept.frontmatter).length === 0) {
      findings.push({
        id: `required-frontmatter:${concept.path}`,
        severity: "error",
        scope: "concept",
        rule: "required-frontmatter",
        message: "Concept is missing parseable YAML frontmatter.",
        filePath: concept.path,
        conceptId: concept.id,
        remediation: "Add a YAML frontmatter block with at least a non-empty type field.",
      });
    }
    if (!concept.type) {
      findings.push({
        id: `required-type:${concept.path}`,
        severity: "error",
        scope: "concept",
        rule: "required-type",
        message: "Concept frontmatter is missing a non-empty type.",
        filePath: concept.path,
        conceptId: concept.id,
        field: "type",
        remediation: "Set type to a descriptive concept type.",
      });
    }
    if (!concept.title) {
      findings.push({
        id: `recommended-title:${concept.path}`,
        severity: "warning",
        scope: "concept",
        rule: "recommended-title",
        message: `Concept is missing a title; ${deriveTitle(concept.path)} will be derived for display.`,
        filePath: concept.path,
        conceptId: concept.id,
        field: "title",
        remediation: "Add a human-readable title.",
      });
    }
    if (!concept.description) {
      findings.push({
        id: `recommended-description:${concept.path}`,
        severity: "warning",
        scope: "concept",
        rule: "recommended-description",
        message: "Concept is missing a one-line description.",
        filePath: concept.path,
        conceptId: concept.id,
        field: "description",
      });
    }
    if (concept.timestamp && Number.isNaN(Date.parse(concept.timestamp))) {
      findings.push({
        id: `timestamp:${concept.path}`,
        severity: "warning",
        scope: "concept",
        rule: "timestamp-format",
        message: "Concept timestamp is not parseable as ISO 8601.",
        filePath: concept.path,
        conceptId: concept.id,
        field: "timestamp",
      });
    }
    if (concept.frontmatter.tags !== undefined && concept.tags.length === 0) {
      findings.push({
        id: `empty-tags:${concept.path}`,
        severity: "warning",
        scope: "concept",
        rule: "empty-tags",
        message: "Tags field is present but contains no usable tag values.",
        filePath: concept.path,
        conceptId: concept.id,
        field: "tags",
      });
    }
    if (
      concept.markdownLinks.some((link) => /^(https?:)?\/\//iu.test(link.href)) &&
      concept.citations.length === 0
    ) {
      findings.push({
        id: `external-without-citations:${concept.path}`,
        severity: "info",
        scope: "concept",
        rule: "external-without-citations",
        message: "Concept contains external links but no # Citations section.",
        filePath: concept.path,
        conceptId: concept.id,
        remediation: "List external sources under a # Citations heading when they support claims.",
      });
    }
    const title = concept.title?.toLowerCase();
    if (title) titles.set(title, [...(titles.get(title) ?? []), concept]);
  }

  for (const duplicates of titles.values()) {
    if (duplicates.length <= 1) continue;
    for (const concept of duplicates) {
      findings.push({
        id: `duplicate-title:${concept.path}`,
        severity: "warning",
        scope: "concept",
        rule: "duplicate-title",
        message: `Duplicate concept title "${concept.title}".`,
        filePath: concept.path,
        conceptId: concept.id,
        field: "title",
      });
    }
  }

  const indexedHrefs = new Set(
    input.reservedFiles.flatMap((file) =>
      file.indexEntries.map((entry) => entry.href.replace(/^\//u, "")),
    ),
  );
  for (const concept of input.concepts) {
    if (
      input.reservedFiles.some((file) => file.kind === "index") &&
      !indexedHrefs.has(concept.path)
    ) {
      findings.push({
        id: `unindexed:${concept.path}`,
        severity: "info",
        scope: "concept",
        rule: "unindexed-concept",
        message: "Concept is not referenced by any index.md entry.",
        filePath: concept.path,
        conceptId: concept.id,
      });
    }
    if (concept.outgoingLinks.length === 0 && concept.incomingLinks.length === 0) {
      findings.push({
        id: `isolated:${concept.path}`,
        severity: "info",
        scope: "concept",
        rule: "isolated-concept",
        message: "Concept has no incoming or outgoing concept links.",
        filePath: concept.path,
        conceptId: concept.id,
      });
    }
  }

  for (const reserved of input.reservedFiles) {
    if (
      reserved.kind === "index" &&
      reserved.indexEntries.length === 0 &&
      reserved.body.trim().length > 0
    ) {
      findings.push({
        id: `index-structure:${reserved.path}`,
        severity: "error",
        scope: "index",
        rule: "index-structure",
        message: "index.md has content but no parseable linked entries.",
        filePath: reserved.path,
      });
    }
    if (reserved.kind === "log") {
      const malformed = reserved.headings.filter(
        (heading) => heading.depth === 2 && !/^\d{4}-\d{2}-\d{2}$/u.test(heading.text),
      );
      for (const heading of malformed) {
        findings.push({
          id: `log-date:${reserved.path}:${heading.line}`,
          severity: "error",
          scope: "log",
          rule: "log-date-heading",
          message: `Log date heading is not YYYY-MM-DD: ${heading.text}`,
          filePath: reserved.path,
          line: heading.line,
        });
      }
    }
  }

  return findings;
}

export function attachFindingsToConcepts(
  concepts: ConceptDocument[],
  findings: ValidationFinding[],
): ConceptDocument[] {
  for (const concept of concepts) {
    concept.findings = findings.filter(
      (finding) => finding.conceptId === concept.id || finding.filePath === concept.path,
    );
  }
  return concepts;
}
