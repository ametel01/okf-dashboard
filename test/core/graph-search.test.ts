import { describe, expect, test } from "bun:test";
import { buildBundleSnapshot } from "../../src/core/bundle";
import { focusGraph } from "../../src/core/graph";
import { searchConceptIds } from "../../src/core/search";
import { createSourceDescriptor, createSourceFile } from "../../src/core/source-model";

describe("graph focus and search labels", () => {
  const snapshot = buildBundleSnapshot({
    source: createSourceDescriptor({ type: "local", rootPath: "/fixture" }),
    warnings: [],
    files: [
      createSourceFile(
        "a.md",
        "---\ntype: Guide\ntitle: Alpha\ntags: [one]\n---\nSee [Beta](b.md).",
      ),
      createSourceFile("b.md", "---\ntype: Guide\ntitle: Beta\n---\nBody text"),
    ],
  });

  test("focuses a selected concept neighborhood", () => {
    const focused = focusGraph(snapshot.graph, { conceptId: "a" });
    expect(focused.nodes.map((node) => node.id)).toContain("a");
    expect(focused.nodes.map((node) => node.id)).toContain("b");
  });

  test("identifies matching search fields", () => {
    const results = searchConceptIds(snapshot.searchIndex, "alpha");
    expect(results[0]).toMatchObject({ conceptId: "a", label: "Title" });
  });
});
