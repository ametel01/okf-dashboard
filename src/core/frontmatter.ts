import matter from "gray-matter";
import type { ValidationFinding } from "./okf-types";

export interface ParsedFrontmatter {
  data: Record<string, unknown>;
  body: string;
  hasFrontmatter: boolean;
  okfVersion?: string;
  findings: ValidationFinding[];
}

export function parseFrontmatter(content: string, filePath: string): ParsedFrontmatter {
  const findings: ValidationFinding[] = [];
  const hasFrontmatter = content.trimStart().startsWith("---");
  try {
    const parsed = matter(content);
    const data = isRecord(parsed.data) ? parsed.data : {};
    return {
      data,
      body: parsed.content.trimStart(),
      hasFrontmatter,
      okfVersion: stringValue(data.okf_version),
      findings,
    };
  } catch (error) {
    findings.push({
      id: `frontmatter:${filePath}`,
      severity: "error",
      scope: "file",
      rule: "frontmatter-parse",
      message: `YAML frontmatter could not be parsed: ${error instanceof Error ? error.message : "unknown error"}`,
      filePath,
      remediation: "Fix the YAML block delimited by --- at the top of the Markdown file.",
    });
    return { data: {}, body: content, hasFrontmatter, findings };
  }
}

export function splitStandardFrontmatter(data: Record<string, unknown>): {
  type?: string;
  title?: string;
  description?: string;
  resource?: string;
  tags: string[];
  timestamp?: string;
  customFrontmatter: Record<string, unknown>;
} {
  const standard = new Set(["type", "title", "description", "resource", "tags", "timestamp"]);
  const customFrontmatter: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (!standard.has(key)) customFrontmatter[key] = value;
  }

  return {
    type: stringValue(data.type),
    title: stringValue(data.title),
    description: stringValue(data.description),
    resource: stringValue(data.resource),
    tags: arrayOfStrings(data.tags),
    timestamp: stringValue(data.timestamp),
    customFrontmatter,
  };
}

export function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
