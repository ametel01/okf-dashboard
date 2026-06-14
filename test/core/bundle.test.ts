import { describe, expect, test } from "bun:test";
import { buildBundleSnapshot } from "../../src/core/bundle";
import { createSourceDescriptor, createSourceFile } from "../../src/core/source-model";

function inventory() {
  const source = createSourceDescriptor({ type: "local", rootPath: "/fixture" });
  return {
    source,
    warnings: [],
    files: [
      createSourceFile(
        "index.md",
        `---
okf_version: "0.1"
---
# Root
* [Orders](tables/orders.md) - table`,
      ),
      createSourceFile(
        "tables/orders.md",
        `---
type: Table
title: Orders
description: One row per order.
tags: [sales]
timestamp: 2026-05-28T00:00:00Z
custom: kept
---
# Body
See [Customers](./customers.md), [Bad](/Tables/Customers.md), [Missing](/missing.md), and [Docs](https://example.com).

# Citations
[1] [Docs](https://example.com)`,
      ),
      createSourceFile(
        "tables/customers.md",
        `---
type: Table
title: Customers
description: Customer records.
tags: [sales]
timestamp: 2026-05-27T00:00:00Z
---
# Body`,
      ),
      createSourceFile("README.md", "# Readme"),
      createSourceFile(
        "log.md",
        "# Directory Update Log\n\n## 2026-05-22\n* **Update**: Added orders.",
      ),
    ],
  };
}

describe("bundle snapshot derivation", () => {
  test("parses files, frontmatter, links, citations, facets, graph, and search", () => {
    const snapshot = buildBundleSnapshot(inventory());
    expect(snapshot.okfVersion).toBe("0.1");
    expect(snapshot.concepts).toHaveLength(2);
    expect(snapshot.reservedFiles).toHaveLength(2);
    expect(snapshot.auxiliaryFiles).toHaveLength(1);
    expect(snapshot.concepts[0].customFrontmatter.custom).toBe("kept");
    expect(snapshot.links.some((link) => link.status === "resolved")).toBe(true);
    expect(snapshot.links.some((link) => link.status === "case-mismatch")).toBe(true);
    expect(snapshot.links.some((link) => link.status === "unresolved")).toBe(true);
    expect(snapshot.links.some((link) => link.status === "external")).toBe(true);
    expect(snapshot.graph.nodes.some((node) => node.unresolved)).toBe(true);
    expect(snapshot.searchIndex.some((entry) => entry.label === "Body")).toBe(true);
    expect(snapshot.facets.types[0]).toEqual({ value: "Table", count: 2 });
  });

  test("keeps validation advisory for incomplete concepts", () => {
    const source = createSourceDescriptor({ type: "local", rootPath: "/fixture" });
    const snapshot = buildBundleSnapshot({
      source,
      warnings: [],
      files: [createSourceFile("draft.md", "No frontmatter")],
    });
    expect(snapshot.concepts).toHaveLength(1);
    expect(snapshot.findings.some((finding) => finding.severity === "error")).toBe(true);
  });
});
