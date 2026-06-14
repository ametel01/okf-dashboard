import { describe, expect, test } from "bun:test";
import { buildBundleSnapshot } from "../../src/core/bundle";
import { parseFrontmatter, splitStandardFrontmatter } from "../../src/core/frontmatter";
import { createSourceDescriptor, createSourceFile } from "../../src/core/source-model";

const targetRolesContent = `---
type: Career Positioning
title: Target Roles
description: Alex's job-search focus: fully remote backend, platform, developer tools, AI tooling, and adjacent software engineering roles.
tags: [career, job-search, remote, backend, platform, developer-tools, ai-tooling]
timestamp: 2026-06-14T00:18:25Z
---

# Target role profile

Alex is targeting fully remote software engineering roles focused on:

- Backend engineering.`;

describe("frontmatter parsing", () => {
  test("parses simple metadata with unquoted colon-containing values", () => {
    const parsed = parseFrontmatter(targetRolesContent, "career/target-roles.md");
    const fields = splitStandardFrontmatter(parsed.data);

    expect(fields.type).toBe("Career Positioning");
    expect(fields.title).toBe("Target Roles");
    expect(fields.description).toBe(
      "Alex's job-search focus: fully remote backend, platform, developer tools, AI tooling, and adjacent software engineering roles.",
    );
    expect(fields.tags).toEqual([
      "career",
      "job-search",
      "remote",
      "backend",
      "platform",
      "developer-tools",
      "ai-tooling",
    ]);
    expect(fields.timestamp).toBe("2026-06-14T00:18:25Z");
    expect(parsed.body).toStartWith("# Target role profile");
    expect(parsed.findings).toEqual([]);
  });

  test("populates concept metadata from recovered frontmatter", () => {
    const snapshot = buildBundleSnapshot({
      source: createSourceDescriptor({ type: "local", rootPath: "/fixture" }),
      warnings: [],
      files: [createSourceFile("career/target-roles.md", targetRolesContent)],
    });

    expect(snapshot.concepts[0]).toMatchObject({
      type: "Career Positioning",
      title: "Target Roles",
      description:
        "Alex's job-search focus: fully remote backend, platform, developer tools, AI tooling, and adjacent software engineering roles.",
      tags: [
        "career",
        "job-search",
        "remote",
        "backend",
        "platform",
        "developer-tools",
        "ai-tooling",
      ],
      timestamp: "2026-06-14T00:18:25Z",
    });
  });
});
