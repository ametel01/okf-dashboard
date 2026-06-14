import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadLocalInventory } from "../../src/server/services/local-loader";

let temporaryDirectories: string[] = [];

afterEach(async () => {
  await Promise.all(
    temporaryDirectories.map((directory) => rm(directory, { recursive: true, force: true })),
  );
  temporaryDirectories = [];
});

describe("local loader", () => {
  test("loads nested Markdown files and skips symlinked Markdown", async () => {
    const root = await mkdtemp(join(tmpdir(), "okf-loader-"));
    temporaryDirectories.push(root);
    await mkdir(join(root, "nested"));
    await writeFile(join(root, "index.md"), "# Index");
    await writeFile(join(root, "nested", "concept.md"), "---\ntype: Note\n---\nBody");
    await writeFile(join(root, "notes.txt"), "ignored");
    await symlink(join(root, "nested", "concept.md"), join(root, "linked.md"));

    const inventory = await loadLocalInventory(root);
    expect(inventory.files.map((file) => file.path).sort()).toEqual([
      "index.md",
      "nested/concept.md",
    ]);
    expect(inventory.warnings[0].rule).toBe("symlink-skipped");
  });
});
