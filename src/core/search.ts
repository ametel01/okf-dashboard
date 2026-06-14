import { markdownToText } from "./markdown";
import type { ConceptDocument, SearchEntry } from "./okf-types";

export function buildSearchIndex(concepts: ConceptDocument[]): SearchEntry[] {
  return concepts.flatMap((concept) => {
    const entries: SearchEntry[] = [
      entry(concept.id, "id", "Concept ID", concept.id),
      entry(concept.id, "path", "Path", concept.path),
      entry(concept.id, "type", "Type", concept.type ?? ""),
      entry(concept.id, "title", "Title", concept.title ?? ""),
      entry(concept.id, "description", "Description", concept.description ?? ""),
      entry(concept.id, "tags", "Tags", concept.tags.join(" ")),
      entry(concept.id, "resource", "Resource", concept.resource ?? ""),
      entry(
        concept.id,
        "headings",
        "Headings",
        concept.headings.map((heading) => heading.text).join(" "),
      ),
      entry(concept.id, "body", "Body", markdownToText(concept.body)),
    ];
    for (const [key, value] of Object.entries(concept.frontmatter)) {
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        entries.push(entry(concept.id, `frontmatter.${key}`, `Frontmatter: ${key}`, String(value)));
      }
    }
    return entries.filter((item) => item.value.length > 0);
  });
}

export function searchConceptIds(
  index: SearchEntry[],
  query: string,
): Array<{ conceptId: string; field: string; label: string }> {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];
  const seen = new Set<string>();
  const results: Array<{ conceptId: string; field: string; label: string }> = [];
  for (const entry of index) {
    if (!entry.value.toLowerCase().includes(normalized)) continue;
    const key = `${entry.conceptId}:${entry.field}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({ conceptId: entry.conceptId, field: entry.field, label: entry.label });
  }
  return results;
}

function entry(conceptId: string, field: string, label: string, value: string): SearchEntry {
  return { conceptId, field, label, value };
}
