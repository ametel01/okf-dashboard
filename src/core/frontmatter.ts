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
    if (
      hasFrontmatter &&
      Object.keys(data).length === 0 &&
      parsed.content.trimStart().startsWith("---")
    ) {
      const recovered = parseLenientFrontmatter(content);
      if (recovered) return recoveredFrontmatter(recovered, findings);
    }
    return {
      data,
      body: parsed.content.trimStart(),
      hasFrontmatter,
      okfVersion: stringValue(data.okf_version),
      findings,
    };
  } catch (error) {
    const recovered = parseLenientFrontmatter(content);
    if (recovered) {
      return recoveredFrontmatter(recovered, findings);
    }
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

function recoveredFrontmatter(
  recovered: { data: Record<string, unknown>; body: string },
  findings: ValidationFinding[],
): ParsedFrontmatter {
  return {
    data: recovered.data,
    body: recovered.body,
    hasFrontmatter: true,
    okfVersion: stringValue(recovered.data.okf_version),
    findings,
  };
}

function parseLenientFrontmatter(
  content: string,
): { data: Record<string, unknown>; body: string } | undefined {
  const match = /^\s*---[ \t]*\r?\n/u.exec(content);
  if (!match) return undefined;
  const rest = content.slice(match[0].length);
  const closing = /\r?\n---[ \t]*(?:\r?\n|$)/u.exec(rest);
  if (!closing) return undefined;
  const frontmatter = rest.slice(0, closing.index);
  const body = rest.slice(closing.index + closing[0].length).trimStart();
  const data: Record<string, unknown> = {};
  for (const line of frontmatter.split(/\r?\n/u)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const field = /^([A-Za-z_][\w.-]*)\s*:\s*(.*)$/u.exec(line);
    if (!field) return undefined;
    data[field[1]] = parseLenientValue(field[2].trim());
  }
  return Object.keys(data).length > 0 ? { data, body } : undefined;
}

function parseLenientValue(value: string): unknown {
  if (!value) return "";
  if (value.startsWith("[") && value.endsWith("]")) {
    return value
      .slice(1, -1)
      .split(",")
      .map((item) => unquoteLenientValue(item.trim()))
      .filter((item) => item.length > 0);
  }
  return unquoteLenientValue(value);
}

function unquoteLenientValue(value: string): string {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
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

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function arrayOfStrings(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (typeof item !== "string") return [];
    const trimmed = item.trim();
    return trimmed ? [trimmed] : [];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
