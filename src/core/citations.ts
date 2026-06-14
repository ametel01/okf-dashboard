import type { Citation } from "./okf-types";

const citationLinkPattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

export function extractCitations(body: string): Citation[] {
  const lines = body.split(/\r?\n/u);
  const citations: Citation[] = [];
  let inCitations = false;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const heading = /^(#{1,6})\s+(.+?)\s*$/u.exec(line);
    if (heading) {
      inCitations = heading[1].length === 1 && heading[2].trim().toLowerCase() === "citations";
      continue;
    }
    if (!inCitations) continue;
    const labelMatch = /^\s*(?:[-*]\s*)?\[?(\d+)\]?\s*(.*)$/u.exec(line);
    const linkMatch = citationLinkPattern.exec(line);
    citationLinkPattern.lastIndex = 0;
    if (labelMatch && labelMatch[2].trim().length > 0) {
      citations.push({
        label: labelMatch[1],
        text: labelMatch[2].trim(),
        href: linkMatch?.[2],
        line: index + 1,
      });
    }
  }
  return citations;
}
