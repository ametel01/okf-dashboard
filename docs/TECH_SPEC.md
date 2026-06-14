# OKF Dashboard Technical Specification

## 1. Purpose

This document defines the technical approach for the OKF Dashboard described in `docs/PRD.md`.

The implementation should stay low-complexity for the MVP while leaving clear extension points for GitHub import, validation export, external dashboard profiles, larger search indexes, and richer graph layouts.

## 2. Technology Choices

### Runtime and Tooling

- Language: TypeScript.
- Runtime and package manager: Bun.
- Formatter and linter: Biome.
- Type checking: strict TypeScript.
- Test runner: Bun test for parser, validator, graph, cache, and API behavior.

### Application Shape

Use a local-first web application:

- A small Bun HTTP server provides source access, parsing, validation, and cache APIs.
- A Vite React single-page app provides the dashboard UI.
- Shared OKF domain logic lives in pure TypeScript modules used by both server tests and UI data shaping.

This avoids desktop-wrapper complexity in the MVP while still allowing a future Tauri, Electron, or packaged local server wrapper if needed.

## 3. Architecture

```text
okf-dashboard/
  docs/
    PRD.md
    OKF_SPEC.md
    TECH_SPEC.md
  src/
    core/
      okf-types.ts
      source-model.ts
      frontmatter.ts
      markdown.ts
      links.ts
      citations.ts
      indexes.ts
      logs.ts
      validate.ts
      graph.ts
      search.ts
      cache.ts
    server/
      index.ts
      routes/
        local-source.ts
        github-source.ts
        bundle.ts
        cache.ts
      services/
        local-loader.ts
        github-loader.ts
        bundle-parser.ts
        cache-store.ts
    app/
      main.tsx
      App.tsx
      routes/
      components/
      features/
        bundle-overview/
        concept-list/
        concept-detail/
        graph/
        validation/
        source-context/
      styles/
  test/
    fixtures/
    core/
    server/
```

The main architectural rule is that `src/core` must not depend on React, browser APIs, Bun server APIs, or filesystem APIs. It should accept file inventories and text content, then return typed parse results.

## 4. Data Flow

### Local Source Flow

1. User enters or selects a local bundle root.
2. Server scans the directory recursively for Markdown files.
3. Server skips symlinked Markdown files and records warnings.
4. Server reads file contents as UTF-8.
5. Core parser classifies files as concepts, reserved files, or auxiliary files.
6. Core parser extracts frontmatter, Markdown body, headings, links, citations, index sections, and log entries.
7. Core validator produces conformance errors and hygiene warnings.
8. Core graph builder derives concept nodes, resolved edges, unresolved placeholder nodes, and case-mismatch findings.
9. Cache store saves the derived snapshot temporarily.
10. UI fetches the parsed snapshot and renders views.

### GitHub Source Flow

GitHub import is post-local implementation scope. It should reuse the same parser by converting GitHub repository contents into the same file inventory shape used by local loading.

1. User provides owner, repository, ref or branch, and bundle path.
2. Server fetches Markdown file contents from the public GitHub repository.
3. Server records source identity and fetched time.
4. Parser, validator, graph, search, and cache behavior remain the same as local source behavior.

Private GitHub repositories require explicit authentication and are later scope.

## 5. Core Domain Types

Define explicit TypeScript types before UI work begins.

```ts
export type SourceType = "local" | "github";

export type FileKind = "concept" | "index" | "log" | "auxiliary";

export type LinkStatus =
  | "resolved"
  | "unresolved"
  | "external"
  | "unsupported"
  | "case-mismatch";

export type FindingSeverity = "error" | "warning" | "info";

export interface SourceDescriptor {
  type: SourceType;
  id: string;
  rootPath: string;
  ref?: string;
  loadedAt: string;
}

export interface SourceFile {
  path: string;
  kind: FileKind;
  content: string;
  fingerprint: string;
  symlinkSkipped?: boolean;
}

export interface BundleSnapshot {
  source: SourceDescriptor;
  okfVersion?: string;
  files: SourceFileSummary[];
  directories: DirectoryNode[];
  concepts: ConceptDocument[];
  reservedFiles: ReservedFile[];
  auxiliaryFiles: AuxiliaryFile[];
  links: ConceptLink[];
  graph: GraphSnapshot;
  findings: ValidationFinding[];
  cache: CacheMetadata;
}

export interface ConceptDocument {
  id: string;
  path: string;
  directory: string;
  frontmatter: Record<string, unknown>;
  type?: string;
  title?: string;
  description?: string;
  resource?: string;
  tags: string[];
  timestamp?: string;
  customFrontmatter: Record<string, unknown>;
  body: string;
  headings: MarkdownHeading[];
  citations: Citation[];
  outgoingLinks: ConceptLink[];
  incomingLinks: ConceptLink[];
  findings: ValidationFinding[];
}
```

Use `unknown` for arbitrary frontmatter values. Narrow values at display and validation boundaries instead of using `any`.

## 6. Parsing Design

### File Classification

- `index.md`: reserved index file.
- `log.md`: reserved log file.
- `README.md`: auxiliary file by default.
- Any other `.md` file: concept document.

Classification is path-name based and case-sensitive.

### Frontmatter

Use a small YAML frontmatter parser library rather than hand-rolled parsing. The parser must:

- Preserve unknown fields.
- Accept optional fields.
- Report malformed frontmatter as a validation error.
- Keep the raw source content available for the raw view.

Recommended library: `gray-matter`.

### Markdown

Markdown parsing has two responsibilities:

- Structural extraction for headings, links, citations, index entries, and log entries.
- Safe rendering in the React UI.

Recommended libraries:

- `remark-parse` and `remark-gfm` for structural Markdown parsing.
- `react-markdown`, `remark-gfm`, and `rehype-sanitize` for UI rendering.

Do not execute code blocks, embedded scripts, or active HTML. Render code blocks as text with optional syntax highlighting.

### Link Resolution

The resolver must support:

- Bundle-root links beginning with `/`.
- Relative links from the source file directory.
- Hash fragments on Markdown links.
- External URLs.
- Unsupported schemes as non-fatal findings.

Resolution is case-sensitive. If an unresolved link has a case-insensitive match, return `case-mismatch` and add a portability warning.

### Citations

Parse citations only from `# Citations` sections for MVP. Treat other external links as external references, not citations.

Avoid claim-level citation inference.

## 7. Validation Design

Validation returns findings, never thrown errors for ordinary bundle problems.

### Conformance Errors

- Concept file is missing parseable YAML frontmatter.
- Concept frontmatter has an empty or missing `type`.
- Reserved `index.md` structure cannot be parsed enough to render sections.
- Reserved `log.md` has malformed date headings when date headings are present.

### Hygiene Warnings

- Missing recommended `title`.
- Missing recommended `description`.
- Missing or malformed `timestamp`.
- Empty tags.
- Duplicate concept titles.
- Broken local links.
- Case-only link mismatches.
- Concepts not referenced by any index.
- Concepts with no incoming or outgoing links.
- Concepts with external links but no `# Citations` section.
- Skipped symlinked Markdown files.

Conformance errors and hygiene warnings must be separately filterable in the UI.

## 8. Cache Design

Use a simple temporary cache service.

MVP cache behavior:

- Store only derived parse data, search data, graph data, rendered previews, and validation findings.
- Keep source files external and immutable.
- Use in-memory cache first.
- Key cache entries by source type, source identifier, bundle root path, and content fingerprint.
- Invalidate when source fingerprints change.
- Expire entries after 24 hours.
- Clear volatile cache on app restart.
- Provide a manual clear-cache endpoint and UI action.

Do not persist a durable copy of the OKF bundle.

## 9. API Design

Keep the server API small and local-only for MVP.

```text
POST /api/sources/local/load
  body: { rootPath: string }
  returns: BundleSnapshot

POST /api/sources/local/refresh
  body: { sourceId: string }
  returns: BundleSnapshot

GET /api/bundles/:sourceId
  returns: BundleSnapshot

POST /api/cache/clear
  body: { sourceId?: string }
  returns: { cleared: boolean }
```

Post-MVP GitHub endpoints:

```text
POST /api/sources/github/load
  body: { owner: string; repo: string; ref: string; path: string }
  returns: BundleSnapshot

POST /api/sources/github/refresh
  body: { sourceId: string }
  returns: BundleSnapshot
```

The API should return typed error responses for unreadable paths, unsupported sources, parse failures, and GitHub fetch failures. Bundle validation problems belong in `BundleSnapshot.findings`, not in transport errors.

## 10. UI Design

Use a responsive React SPA.

### Routes

- `/`: source loading and recent local session state.
- `/bundle/:sourceId`: bundle overview.
- `/bundle/:sourceId/concepts`: searchable concept list.
- `/bundle/:sourceId/concepts/:conceptId`: concept detail.
- `/bundle/:sourceId/graph`: graph view.
- `/bundle/:sourceId/validation`: validation findings.
- `/bundle/:sourceId/source`: reserved and auxiliary source context.

### Layout

Desktop:

- Left sidebar for directory tree, type facets, and tag facets.
- Main pane for selected view.
- Right inspector for metadata, relationships, or validation detail when useful.

Mobile:

- Top source bar.
- Collapsible filter drawer.
- Single-column content.
- Graph defaults to focused subgraph and selected-concept neighborhood.

### Views

Bundle overview:

- Concept count, file count, directory count, type distribution, tag distribution, link health, and validation summary.

Concept list:

- Search box.
- Type, tag, directory, resource, citation, timestamp, and validation filters.
- Results with title fallback, concept ID, type, tags, description, and finding badges.

Concept detail:

- Rendered GitHub-Flavored Markdown body.
- Raw source toggle.
- Frontmatter table split into required, recommended, and custom fields.
- Outgoing links, incoming links, citations, external references, and validation findings.

Graph:

- Default hierarchy-grouped concept graph.
- Directed edges for concept links.
- Placeholder nodes for unresolved links.
- Filters by directory, type, tag, validation status, and search term.
- Focused subgraph behavior for large bundles.

Validation:

- Separate tabs or filters for conformance errors, hygiene warnings, and info findings.
- Group by file, finding type, and severity.

Source context:

- Render `index.md`, `log.md`, and `README.md` files.
- Show parsed index sections and log dates when available.

## 11. Search Design

MVP search is client-side over the parsed bundle snapshot.

Index these fields:

- Concept ID.
- Path.
- Type.
- Title.
- Description.
- Tags.
- Resource.
- Frontmatter scalar values.
- Headings.
- Body text.

Start with normalized substring matching and field labels in results. Add Fuse.js or a server-side index only if real bundle size or UX demands it.

## 12. Graph Design

Keep graph implementation simple.

MVP:

- Build graph data in `src/core/graph.ts`.
- Render with a lightweight SVG or React Flow component.
- Group nodes by directory hierarchy by default.
- Draw concept-to-concept directed edges.
- Show unresolved links as muted placeholder nodes.
- Keep external URLs out of the default graph.
- Limit large graphs to focused subgraphs.

Avoid custom physics simulation in MVP. If layout complexity grows, introduce a dedicated layout library behind a `GraphLayoutStrategy` interface.

## 13. Security and Safety

- Treat local paths as trusted user input, but never follow symlinks by default.
- Do not expose arbitrary filesystem browsing over the API beyond the selected bundle root.
- Sanitize rendered Markdown.
- Never execute Markdown code blocks.
- Never execute embedded HTML or scripts.
- Do not store GitHub credentials in MVP.
- Do not write to OKF source files.
- Do not persist durable copies of source bundle contents.

## 14. Quality Gates

Add these scripts when the project is scaffolded:

```json
{
  "scripts": {
    "dev": "bun run server:dev",
    "server:dev": "bun --hot src/server/index.ts",
    "app:dev": "vite --host 127.0.0.1",
    "check": "biome check .",
    "format": "biome format --write .",
    "typecheck": "tsc --noEmit",
    "test": "bun test",
    "build": "vite build",
    "verify": "bun run check && bun run typecheck && bun run test && bun run build"
  }
}
```

Validation expectations:

- Parser and validator behavior must have unit tests with fixture bundles.
- Link resolution must test absolute, relative, external, unresolved, fragment, and case-mismatch links.
- Cache behavior must test TTL expiry, source fingerprint invalidation, app restart clearing, and manual clearing.
- UI smoke tests can wait until the first React implementation exists.

## 15. MVP Implementation Order

1. Scaffold Bun, TypeScript, Biome, Vite, and React.
2. Define core domain types.
3. Build local file inventory scanner with symlink skipping.
4. Build parser for frontmatter, Markdown headings, links, citations, indexes, logs, and README auxiliary files.
5. Build validation rules.
6. Build graph snapshot derivation.
7. Build temporary cache service.
8. Add local source API routes.
9. Build overview, concept list, concept detail, validation, source context, and basic graph views.
10. Add responsive layout behavior.
11. Add tests for core parser, validation, graph, and cache.
12. Add public GitHub import after local loading is stable.

## 16. Extension Points

- `SourceLoader`: local, public GitHub, private GitHub, archive upload.
- `ValidationRule`: built-in and future external-profile-driven hygiene checks.
- `GraphLayoutStrategy`: hierarchy, selected neighborhood, type cluster, tag cluster, recency.
- `SearchProvider`: client substring search, Fuse.js, server index.
- `CacheStore`: memory, temporary disk cache, browser IndexedDB for UI-only derived state.
- `MarkdownSectionRenderer`: default Markdown, schema table, examples, future safe diagrams.
- `ExportProvider`: validation report export and later graph/search export.

## 17. Explicit Technical Non-Goals

- No source editing or write-back.
- No database in MVP.
- No authentication in MVP.
- No private GitHub import in MVP.
- No continuous filesystem or GitHub sync in MVP.
- No source bundle copying as durable app data.
- No custom graph physics engine in MVP.
- No claim-level citation inference in MVP.
