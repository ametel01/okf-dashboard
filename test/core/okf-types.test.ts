import { describe, expect, test } from "bun:test";
import type { BundleSnapshot, ConceptDocument } from "../../src/core/okf-types";

describe("OKF core type contract", () => {
  test("allows custom frontmatter without any", () => {
    const concept: ConceptDocument = {
      id: "tables/orders",
      path: "tables/orders.md",
      directory: "tables",
      frontmatter: { type: "Table", producer_score: 12 },
      type: "Table",
      tags: [],
      customFrontmatter: { producer_score: 12 },
      body: "",
      raw: "",
      headings: [],
      citations: [],
      markdownLinks: [],
      outgoingLinks: [],
      incomingLinks: [],
      findings: [],
    };
    expect(concept.customFrontmatter.producer_score).toBe(12);
  });

  test("constructs a representative snapshot", () => {
    const snapshot: Pick<BundleSnapshot, "concepts" | "findings" | "okfVersion"> = {
      okfVersion: "0.1",
      concepts: [],
      findings: [],
    };
    expect(snapshot.okfVersion).toBe("0.1");
  });
});
