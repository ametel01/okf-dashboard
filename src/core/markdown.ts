import type { IndexEntry, MarkdownHeading, MarkdownLink } from "./okf-types";

const linkPattern = /\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/gu;
const headingPattern = /^(#{1,6})\s+(.+?)\s*#*\s*$/u;

export interface MarkdownOutlineItem {
  line: number;
  text: string;
}

export interface MarkdownOutlineSection extends MarkdownHeading {
  items: MarkdownOutlineItem[];
}

export function extractHeadings(body: string): MarkdownHeading[] {
  return body.split(/\r?\n/u).flatMap((line, index) => {
    const match = headingPattern.exec(line);
    return match ? [{ depth: match[1].length, text: match[2].trim(), line: index + 1 }] : [];
  });
}

export function extractMarkdownOutline(body: string): MarkdownOutlineSection[] {
  const lines = body.split(/\r?\n/u);
  const headings = extractHeadings(body);
  return headings.map((heading, index) => {
    const nextHeadingLine = headings[index + 1]?.line ?? lines.length + 1;
    return {
      ...heading,
      items: extractOutlineItems(lines, heading.line + 1, nextHeadingLine),
    };
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

function extractOutlineItems(
  lines: string[],
  startLine: number,
  endLine: number,
): MarkdownOutlineItem[] {
  const items: MarkdownOutlineItem[] = [];
  let inFence = false;
  for (let lineNumber = startLine; lineNumber < endLine; lineNumber += 1) {
    const line = lines[lineNumber - 1] ?? "";
    const trimmed = line.trim();
    if (/^(```|~~~)/u.test(trimmed)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const text = cleanOutlineLine(line);
    if (text) items.push({ line: lineNumber, text });
  }
  return items;
}

function cleanOutlineLine(line: string): string {
  const trimmed = line
    .replace(/^\s*(?:[-*+]\s+|\d+[.)]\s+)/u, "")
    .replace(/^>\s?/u, "")
    .trim();
  if (!trimmed || headingPattern.test(trimmed) || /^[-*_]{3,}$/u.test(trimmed)) return "";
  return trimmed
    .replace(linkPattern, "$1 ($2)")
    .replace(/`([^`]+)`/gu, "$1")
    .replace(/\*\*([^*]+)\*\*/gu, "$1")
    .replace(/\*([^*]+)\*/gu, "$1")
    .replace(/__([^_]+)__/gu, "$1")
    .replace(/_([^_]+)_/gu, "$1")
    .replace(/\s+/gu, " ")
    .trim();
}
