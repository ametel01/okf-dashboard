import { describe, expect, test } from "bun:test";
import { extractMarkdownOutline } from "../../src/core/markdown";

describe("Markdown outline extraction", () => {
  test("keeps section body lines and links under their headings", () => {
    const outline = extractMarkdownOutline(`# Current headline

Software Engineer - Backend / Developer Infrastructure / AI Tooling

# Project ordering guidance

For broad backend/platform/AI-tooling roles, emphasize:

1. [ScopePilot](/projects/scopepilot.md) - product/backend ownership.
2. [weld-cli](/projects/weld-cli.md) - AI tooling workflows.

# Related concepts

- [Target roles](/career/target-roles.md)
- [Resume update playbook](/playbooks/resume-update.md)`);

    expect(outline.map((section) => section.text)).toEqual([
      "Current headline",
      "Project ordering guidance",
      "Related concepts",
    ]);
    expect(outline[1].items.map((item) => item.text)).toEqual([
      "For broad backend/platform/AI-tooling roles, emphasize:",
      "ScopePilot (/projects/scopepilot.md) - product/backend ownership.",
      "weld-cli (/projects/weld-cli.md) - AI tooling workflows.",
    ]);
    expect(outline[2].items.map((item) => item.text)).toEqual([
      "Target roles (/career/target-roles.md)",
      "Resume update playbook (/playbooks/resume-update.md)",
    ]);
  });
});
