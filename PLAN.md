# Implementation Plan

## Source Document
- Paths:
  - `/Users/alexmetelli/source/okf-dashboard/docs/TECH_SPEC.md`
  - `/Users/alexmetelli/source/okf-dashboard/docs/PRD.md`
  - `/Users/alexmetelli/source/okf-dashboard/docs/DESIGN.md`
- Related reference read: `/Users/alexmetelli/source/okf-dashboard/docs/OKF_SPEC.md`
- Summary: Build a local-first, read-only OKF Dashboard that loads Open Knowledge Format bundles from trusted local directories, parses and validates Markdown/frontmatter content, derives links/search/graph/cache data, and renders a dense responsive React dashboard using the provided visual design.

## Goals
- Scaffold a Bun, TypeScript, Vite React, Biome, and Bun test project with strict quality gates.
- Implement OKF v0.1 parsing for local Markdown bundles while keeping source files external and immutable.
- Surface bundle overview metrics, concept browsing, concept detail, validation findings, source context, and a basic graph view.
- Keep all domain logic in pure `src/core` modules with no React, browser, Bun server, or filesystem dependencies.
- Provide local-only APIs for loading, refreshing, retrieving, and clearing cached bundle snapshots.
- Preserve unknown concept types, tags, and custom frontmatter without hard-coded domain assumptions.
- Match the operational design in `design/dashboard.png` and `design/subpage.png`, including responsive desktop and mobile layouts.

## Non-Goals
- No source editing, write-back, source-file management, or dashboard-owned copy of an OKF bundle.
- No database, hosted service, authentication, private GitHub import, or continuous sync in MVP.
- No durable source-content persistence in cache; only derived temporary data is allowed.
- No custom graph physics engine in MVP.
- No claim-level citation inference.
- No domain-specific concept types, tag taxonomies, directory names, labels, filters, or navigation.
- No validation export, graph export, search export, revision diffing, archive upload, or saved dashboard layouts in MVP.

## Assumptions and Open Questions
- Assumption: The repo is currently docs-only. Impact: Step 0 must create the project scaffold and quality gates before feature implementation.
- Assumption: Bun is the package manager and runtime. Impact: all scripts, lockfile, CI-like validation, and tests should use Bun rather than npm, pnpm, or yarn.
- Assumption: MVP source loading accepts a trusted local filesystem path entered by the user. Impact: the server should validate readability and avoid arbitrary browsing APIs beyond the selected root, but does not need multi-user path authorization.
- Assumption: Public GitHub loading is post-MVP even though the architecture should leave a `SourceLoader` extension point. Impact: local source interfaces must not hard-code filesystem-only parser inputs.
- Assumption: `index.md` frontmatter is generally forbidden except the OKF version declaration allowed by `OKF_SPEC.md`. Impact: validator should handle that exception deliberately.
- Open question: Should the app ship with a generated fixture OKF bundle, or should tests create only minimal fixtures under `test/fixtures`? Impact: affects demo data and local smoke testing.
- Open question: Should the graph renderer use plain SVG or React Flow for MVP? Impact: plain SVG is lower dependency risk; React Flow is richer but may add layout and bundle complexity.
- Open question: Should local path selection be plain text input only, or include a native file picker when browser support allows? Impact: the server API works either way, but UI acceptance details differ.

## Quality Gates
- Setup status: No project manifests, scripts, CI workflows, or test configuration exist yet. Step 0 must add them before implementation.
- Baseline command: `bun install --frozen-lockfile && bun run verify`
- Format command: `bun run format`
- Lint command: `bun run check`
- Test command: `bun run test`
- Additional gates: `bun run typecheck`, `bun run build`, `bun run verify`

## Incremental Steps

### Step 0: Quality Gates Setup
Goal: Create the project scaffold and runnable validation gates before feature work starts.

Changes:
- Add `package.json` with scripts:
  - `dev`: `bun run server:dev`
  - `server:dev`: `bun --hot src/server/index.ts`
  - `app:dev`: `vite --host 127.0.0.1`
  - `check`: `biome check .`
  - `format`: `biome format --write .`
  - `typecheck`: `tsc --noEmit`
  - `test`: `bun test`
  - `build`: `vite build`
  - `verify`: `bun run check && bun run typecheck && bun run test && bun run build`
- Add Bun/TypeScript/Vite/React/Biome dependencies and generate `bun.lock`.
- Add `tsconfig.json`, `tsconfig.node.json`, `vite.config.ts`, `biome.json`, `index.html`, and starter `src/app/main.tsx`.
- Add initial source/test directories from the technical spec:
  - `src/core`
  - `src/server`
  - `src/app`
  - `test/fixtures`
  - `test/core`
  - `test/server`
- Add `.gitignore` for dependencies, build output, coverage, logs, and local environment files.

Acceptance Criteria:
- `bun install --frozen-lockfile` succeeds after the lockfile is created.
- `bun run verify` runs and passes on the scaffold.
- No feature behavior is implemented beyond a minimal app/server shell.

Validation:
- Run `bun install --frozen-lockfile`
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `chore: scaffold okf dashboard project`

### Step 1: Define OKF Core Types and Fixture Model
Goal: Establish the typed data contract shared by parser, server, tests, and UI.

Dependencies:
- Step 0 complete.

Changes:
- Add `src/core/okf-types.ts` with `SourceType`, `FileKind`, `LinkStatus`, `FindingSeverity`, `SourceDescriptor`, `SourceFile`, `BundleSnapshot`, `ConceptDocument`, `ReservedFile`, `AuxiliaryFile`, `ConceptLink`, `GraphSnapshot`, `ValidationFinding`, and cache-related types.
- Add `src/core/source-model.ts` for pure file inventory inputs and source descriptors.
- Add `test/fixtures/minimal-okf` with conformant concept, `index.md`, `log.md`, and `README.md` examples.
- Add `test/core/okf-types.test.ts` or equivalent smoke tests that construct representative snapshots without `any`.

Acceptance Criteria:
- Types express required, recommended, and custom frontmatter without discarding unknown fields.
- `src/core` has no imports from React, browser APIs, Bun server APIs, or filesystem APIs.
- Fixtures include at least one concept, one reserved index, one log, and one auxiliary README.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: define okf core types`

### Step 2: Implement Local File Inventory Loading
Goal: Load trusted local Markdown files into the pure parser input shape while skipping symlinked Markdown files.

Dependencies:
- Step 1 complete.

Changes:
- Add `src/server/services/local-loader.ts` to recursively scan a selected root for `.md` files, read UTF-8 contents, compute content fingerprints, and skip symlinked Markdown files with warnings.
- Add `src/core/source-model.ts` helpers if needed for normalized relative paths and directory nodes.
- Add `test/server/local-loader.test.ts` with temporary fixture directories covering nested Markdown files, non-Markdown files, unreadable paths where practical, and symlink skip behavior.
- Keep source files read-only; do not add write, delete, move, or file management operations.

Acceptance Criteria:
- Loader returns source files with paths relative to the selected bundle root.
- Loader classifies symlink skips as warnings without following them.
- Loader does not expose arbitrary filesystem browsing beyond the selected root.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: load local okf file inventories`

### Step 3: Parse Frontmatter, Markdown Structure, Reserved Files, and Auxiliary Files
Goal: Convert file inventories into parsed OKF document structures.

Dependencies:
- Step 2 complete.

Changes:
- Add `src/core/frontmatter.ts` using `gray-matter` to parse YAML frontmatter, preserve unknown keys, and report malformed frontmatter as findings.
- Add `src/core/markdown.ts` using `remark-parse` and `remark-gfm` for headings, links, citation sections, index sections, and log date entries.
- Add `src/core/indexes.ts`, `src/core/logs.ts`, and `src/core/citations.ts` for reserved-file and citation extraction.
- Add parser tests in `test/core` for concepts, optional fields, custom fields, malformed frontmatter, `index.md`, `log.md`, `README.md`, and `# Citations` extraction.

Acceptance Criteria:
- `index.md` and `log.md` are reserved files, `README.md` is auxiliary, and every other Markdown file is a concept.
- Concept IDs are derived from file paths without `.md`.
- Unknown frontmatter is available in `customFrontmatter`.
- Citation extraction is limited to `# Citations` sections.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: parse okf markdown documents`

### Step 4: Resolve Links and Build Relationship Indexes
Goal: Resolve Markdown links into outgoing, incoming, external, unsupported, unresolved, and case-mismatch relationships.

Dependencies:
- Step 3 complete.

Changes:
- Add `src/core/links.ts` for bundle-root links beginning with `/`, relative links, hash fragments, external URLs, unsupported schemes, case-sensitive matching, and case-insensitive mismatch detection.
- Add `src/core/indexes.ts` helpers for incoming links, directory indexes, type facets, tag facets, resource/citation facets, and timestamp sorting.
- Add tests for absolute links, relative links, fragments, external URLs, unsupported schemes, unresolved links, and case-only mismatches.

Acceptance Criteria:
- Broken local links remain first-class non-fatal findings.
- Case-only mismatches are separate from fully unresolved links.
- External URLs do not become concept graph edges.
- Incoming links are computed for every concept.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: resolve okf concept links`

### Step 5: Implement Validation Rules
Goal: Produce OKF conformance errors and hygiene warnings without rejecting partially valid bundles.

Dependencies:
- Step 4 complete.

Changes:
- Add `src/core/validate.ts` with validation rules for required concept frontmatter, non-empty `type`, parseable reserved file structure, log date headings, recommended metadata, empty tags, duplicate titles, broken links, case mismatches, unindexed concepts, isolated concepts, external links without citations, and skipped symlinked Markdown.
- Separate conformance errors, hygiene warnings, and info findings by severity and rule metadata.
- Add `test/core/validate.test.ts` with fixture bundles for hard errors and soft guidance.

Acceptance Criteria:
- Soft guidance never prevents a bundle snapshot from being returned.
- Findings include severity, scope, message, file path, field or line reference when available, and suggested remediation when useful.
- Conformance errors and hygiene warnings are filterable by severity/rule.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: validate okf bundle health`

### Step 6: Build Search, Graph, and Bundle Snapshot Derivation
Goal: Derive the complete `BundleSnapshot` consumed by API and UI.

Dependencies:
- Step 5 complete.

Changes:
- Add `src/core/search.ts` for normalized client-side search indexes over concept ID, path, type, title, description, tags, resource, frontmatter scalar values, headings, and body text.
- Add `src/core/graph.ts` for concept nodes, directed concept links, unresolved placeholder nodes, directory grouping metadata, and focused subgraph helpers.
- Add `src/core/cache.ts` types or pure helpers for cache metadata and fingerprints if needed.
- Add snapshot assembly module, such as `src/core/bundle.ts`, that joins parsed docs, links, validation, graph, search data, and metrics.
- Add tests for graph nodes/edges, unresolved placeholders, metrics, derived filters, and search match field labels.

Acceptance Criteria:
- Bundle overview metrics match parsed fixture contents.
- Graph excludes external URLs by default and includes unresolved placeholders.
- Search results identify the matching field.
- Large graph helper can produce a focused result by directory, search/filter result, selected concept neighborhood, or type/tag facet.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: derive okf snapshots`

### Step 7: Add Temporary Cache Service
Goal: Cache only derived bundle data temporarily, with invalidation and manual clearing.

Dependencies:
- Step 6 complete.

Changes:
- Add `src/server/services/cache-store.ts` implementing in-memory cache keyed by source type, source identifier, bundle root path, and content fingerprint.
- Support 24-hour TTL expiry, fingerprint invalidation, app restart clearing by using volatile memory only, and manual clear by source ID or all sources.
- Add `test/server/cache-store.test.ts` for hit/miss behavior, TTL expiry, fingerprint invalidation, restart semantics through new instance creation, and manual clearing.

Acceptance Criteria:
- Cache entries contain only derived snapshots/search/graph/validation data, not a durable source of truth.
- Source changes invalidate stale cache entries.
- Manual clear returns `{ cleared: boolean }` semantics for API use.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: cache derived bundle snapshots`

### Step 8: Implement Local Source API Routes
Goal: Expose local-only server endpoints for loading, refreshing, retrieving, and clearing bundle snapshots.

Dependencies:
- Steps 2 through 7 complete.

Changes:
- Add `src/server/index.ts` Bun HTTP server with local-only CORS/host assumptions suitable for development.
- Add `src/server/routes/local-source.ts` for:
  - `POST /api/sources/local/load`
  - `POST /api/sources/local/refresh`
- Add `src/server/routes/bundle.ts` for:
  - `GET /api/bundles/:sourceId`
- Add `src/server/routes/cache.ts` for:
  - `POST /api/cache/clear`
- Add typed transport error responses for unreadable paths, unsupported sources, parse failures, and cache misses while keeping bundle validation problems inside `BundleSnapshot.findings`.
- Add route tests in `test/server` using Bun request handlers or direct handler calls.

Acceptance Criteria:
- Loading a local fixture returns a complete `BundleSnapshot`.
- Refreshing reloads from source and invalidates stale cached data when fingerprints change.
- `GET /api/bundles/:sourceId` returns cached/current snapshot or typed not-found response.
- Cache clear can clear one source or all entries.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: expose local bundle api`

### Step 9: Build App Shell, Routing, and Central Design System
Goal: Create the responsive React application foundation that matches the design specification.

Dependencies:
- Step 0 complete; API integration from Step 8 can be stubbed until wired.

Changes:
- Add React router structure for:
  - `/`
  - `/bundle/:sourceId`
  - `/bundle/:sourceId/concepts`
  - `/bundle/:sourceId/concepts/:conceptId`
  - `/bundle/:sourceId/graph`
  - `/bundle/:sourceId/validation`
  - `/bundle/:sourceId/source`
- Add central CSS files:
  - `src/app/styles/reset.css`
  - `src/app/styles/tokens.css`
  - `src/app/styles/layout.css`
  - `src/app/styles/components.css`
  - `src/app/styles/utilities.css`
- Add shell components for fixed/collapsible sidebar, page header, tabs, search/actions row, source card, and icon-led navigation using lucide icons.
- Add initial API client and app state model under `src/app/features` or `src/app/lib`.

Acceptance Criteria:
- First screen is the usable source-loading/dashboard surface, not marketing copy.
- Colors, typography, spacing, radius, shadows, and layout constants are centralized in tokens/styles.
- Desktop and mobile shell behavior follows the `232px`, `860px`, and `1180px` design constraints.
- Icon-only buttons have accessible labels and tooltips.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: build dashboard app shell`

### Step 10: Implement Source Loading and Bundle Overview
Goal: Let users load a local bundle and inspect its structure and health from the overview dashboard.

Dependencies:
- Steps 8 and 9 complete.

Changes:
- Add `src/app/features/source-loader` for local path input, load state, typed error display, recent session state, manual reload, and manual clear-cache action.
- Add `src/app/features/bundle-overview` for bundle summary metrics, type/tag distributions, recent activity, directory tree, recently updated concepts, graph preview, and validation summary.
- Add reusable cards, metric tiles, tables, badges, charts, and empty states consistent with the design.
- Ensure filters, labels, and distributions are derived from loaded bundle data.

Acceptance Criteria:
- User can load a fixture local OKF bundle by path and see metrics within the overview.
- Empty states explain absent indexes, logs, tags, or citations without implying invalidity.
- Manual reload and clear-cache controls call the relevant API routes.
- Overview layout matches the reference density and stacks correctly under `1180px` and `860px`.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: load bundles into overview dashboard`

### Step 11: Implement Concept List and Concept Detail Views
Goal: Provide searchable concept browsing and a full reading surface for individual concepts.

Dependencies:
- Step 10 complete.

Changes:
- Add `src/app/features/concept-list` with search, type/tag/directory/resource/citation/timestamp/validation filters, desktop table results, and mobile compact cards.
- Add `src/app/features/concept-detail` with rendered sanitized Markdown, raw source toggle, frontmatter table split into required/recommended/custom fields, outgoing links, incoming links, citations, related concepts, file path, concept ID, and validation findings.
- Add Markdown rendering using `react-markdown`, `remark-gfm`, and `rehype-sanitize`; render code blocks as text with optional safe highlighting.
- Add derived title fallback display with a muted "derived" badge when title is missing.

Acceptance Criteria:
- Users can find a known concept by title, tag, type, path, or body text.
- Concept detail preserves exact raw Markdown and source path.
- Unknown custom frontmatter is visible and distinct from standard fields.
- Broken links and unresolved targets are navigable as findings/placeholders, not fatal UI states.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: browse and inspect okf concepts`

### Step 12: Implement Validation and Source Context Views
Goal: Make conformance, hygiene, reserved files, logs, indexes, and README context inspectable.

Dependencies:
- Steps 5, 8, and 10 complete.

Changes:
- Add `src/app/features/validation` with summary counters, severity/scope/rule/file filters, grouped findings table, hygiene hide controls, and finding detail drawer.
- Add `src/app/features/source-context` with a left list of `index.md`, `log.md`, and `README.md` files by directory, rendered Markdown panel, and parsed outline/date panel.
- Label `README.md` as auxiliary source context, not a concept.
- Ensure errors, warnings, info, and passed checks are visually and semantically distinct.

Acceptance Criteria:
- Conformance errors and hygiene warnings are never visually conflated.
- Users can inspect hard errors without reading raw files.
- Index and log files render as navigation/history aids.
- Bundles with no `index.md` still provide synthesized directory navigation.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: review validation and source context`

### Step 13: Implement Graph View
Goal: Render directed concept relationships with focused graph behavior for larger bundles.

Dependencies:
- Steps 4, 6, and 10 complete.

Changes:
- Add `src/app/features/graph` using either lightweight SVG or React Flow behind a local rendering abstraction.
- Add controls for directory/type/tag/validation/search filters, focus mode, selected concept neighborhood, and fullscreen.
- Render concept nodes, directed edges, directory grouping, unknown-type generic styling, and unresolved placeholder nodes with dashed red treatment.
- Provide a keyboard-reachable list alternative for graph nodes and relationships.

Acceptance Criteria:
- Default graph groups by directory hierarchy and excludes external URLs.
- Unresolved links appear as placeholder nodes and validation issues.
- Large bundles default to focused subgraphs rather than rendering every node at once.
- Selecting a node opens concept preview or detail navigation.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: visualize okf relationship graph`

### Step 14: Responsive, Accessibility, and UI Quality Pass
Goal: Bring the full dashboard up to the design and UX acceptance standard across desktop and mobile.

Dependencies:
- Steps 9 through 13 complete.

Changes:
- Audit all dashboard views against `docs/DESIGN.md` and reference images.
- Verify `640px`, `860px`, and `1180px` responsive behavior for overview, concept list, concept detail, validation, source context, and graph.
- Add or refine accessible labels, focus states, table headers, tab semantics, current-page state, validation severity affordances, and graph list alternatives.
- Add UI smoke tests if the project has enough stable UI surface; otherwise add documented manual verification steps for this pass.
- Ensure no nested cards, no decorative hero/orb patterns, no viewport-scaled text, and no page-local color/radius/shadow constants.

Acceptance Criteria:
- Desktop dashboard resembles `design/dashboard.png` and concept detail resembles `design/subpage.png` in structure, density, and visual language.
- Mobile supports bundle summary, concept search, concept detail, and validation review.
- Text does not overlap or overflow controls at supported widths.
- Validation severity is not conveyed by color alone.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: polish responsive dashboard ui`

### Step 15: Public GitHub Source Extension Point
Goal: Add public GitHub repository snapshot loading only after local loading is stable.

Dependencies:
- Steps 1 through 14 complete.

Changes:
- Add `src/server/services/github-loader.ts` behind the same source inventory shape used by local loading.
- Add `src/server/routes/github-source.ts` for:
  - `POST /api/sources/github/load`
  - `POST /api/sources/github/refresh`
- Capture owner, repository, ref or branch, bundle path, fetched time, and source identity.
- Reuse existing parser, validator, graph, search, and cache paths without GitHub-specific core logic.
- Add tests with mocked public GitHub responses; do not add private repository authentication.

Acceptance Criteria:
- Public GitHub snapshots can load a selected owner/repo/ref/path on demand.
- Manual refresh updates the snapshot and source identity.
- No background sync, credentials, or private repository behavior is introduced.
- Core parser behavior is identical for local and GitHub inventories.

Validation:
- Run `bun run format`
- Run `bun run check`
- Run `bun run typecheck`
- Run `bun run test`
- Run `bun run build`
- Run `bun run verify`
- Fix any failures before proceeding.

Commit:
- `feat: load public github okf snapshots`

