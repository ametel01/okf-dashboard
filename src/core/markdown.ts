import type { IndexEntry, MarkdownHeading, MarkdownLink } from "./okf-types";

const linkPattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;

export function extractHeadings(body: string): MarkdownHeading[] {
  return body.split(/\r?\n/u).flatMap((line, index) => {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
    return match ? [{ depth: match[1].length, text: match[2].trim(), line: index + 1 }] : [];
  });
}

export function extractMarkdownLinks(body: string): MarkdownLink[] {
  const lines = body.split(/\r?\n/u);
  const links: MarkdownLink[] = [];
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];
    for (const match of line.matchAll(linkPattern)) {
      links.push({ text: match[1].trim(), href: match[2].trim(), line: lineIndex + 1 });
    }
  }
  return links;
}

export function parseIndexEntries(body: string): IndexEntry[] {
  const lines = body.split(/\r?\n/u);
  const entries: IndexEntry[] = [];
  let section = "Index";
  for (let index = 0; index < lines.length; index += 1) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/u.exec(lines[index]);
    if (heading) section = heading[2].trim();
    const item = /^\s*[-*]\s+\[([^\]]+)\]\(([^)]+)\)(?:\s*[-:]\s*(.+))?\s*$/u.exec(lines[index]);
    if (item) {
      entries.push({
        section,
        title: item[1].trim(),
        href: item[2].trim(),
        description: item[3]?.trim(),
        line: index + 1,
      });
    }
  }
  return entries;
}

export function markdownToText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(linkPattern, "$1 $2")
    .replace(/[#>*_~|-]/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}
