# OKF Dashboard Product Requirements

## 1. Purpose

Build a generic dashboard for exploring, validating, and understanding Open Knowledge Format (OKF) knowledge bundles.

The dashboard must work with any OKF-compliant bundle, not with a single person's or organization's knowledge base. A local OKF bundle can be used as a development fixture, but no product behavior, labels, filters, or navigation should be hard-coded to that bundle's domain.

The product is a local-first, read-only application. It visualizes OKF bundles sourced from local directories or GitHub repositories while keeping the source knowledge-base files external and immutable.

## 2. Background

OKF represents a knowledge bundle as a directory tree of Markdown files with YAML frontmatter. Each non-reserved Markdown file is a concept. Reserved files such as `index.md` and `log.md` provide progressive-disclosure navigation and update history.

The format is intentionally permissive:

- Concept documents require a parseable frontmatter block with a non-empty `type`.
- Common metadata such as `title`, `description`, `resource`, `tags`, and `timestamp` should be surfaced when present.
- Producers may add arbitrary frontmatter fields.
- Consumers must tolerate unknown concept types, missing optional fields, missing indexes, and broken links.
- Links between concept documents express directed relationships, but OKF does not prescribe typed edge semantics.

The dashboard should make this lightweight format easier to inspect without weakening the core property that an OKF bundle remains readable and useful as plain files.

## 3. Goals

- Help users quickly understand the structure, contents, and health of an OKF bundle.
- Provide clear navigation across hierarchy, indexes, tags, concept types, citations, and cross-links.
- Show both human-readable Markdown content and machine-readable metadata.
- Make OKF conformance issues visible without rejecting partially valid bundles.
- Stay generic across domains, producers, and custom metadata conventions.

## 4. Non-Goals

- Do not define a new OKF schema or central type registry.
- Do not prescribe domain-specific taxonomies, tags, or concept types.
- Do not require a database, hosted service, or proprietary import format for MVP use.
- Do not replace Markdown editors, Git workflows, or source repositories.
- Do not mutate source bundles in any product iteration.
- Do not provide editing, write-back, or source-file management features.
- Do not turn temporary parsed data into a durable copy of the source bundle.
- Do not use the dashboard as an agent-specific retrieval runtime in the MVP.

## 5. Target Users

- Knowledge-base authors who maintain OKF bundles and need to inspect structure, metadata, and quality.
- Agent/tool builders who need to understand how a bundle will be consumed by software.
- Reviewers who need to audit whether a bundle is coherent, cited, linked, and conformant.
- Domain users who need to browse a bundle without reading raw files in a code editor.

## 6. Primary Use Cases

### 6.1 Load a Bundle

A user can load an OKF bundle from a local directory. The product should also support public GitHub repositories after local loading is stable. Private GitHub repositories require explicit authentication and are out of MVP scope.

For both local and GitHub sources, the user must be able to select a bundle root that is either the source root or a subdirectory within a larger repository.

The dashboard parses:

- Concept documents.
- Directory hierarchy.
- Reserved `index.md` files.
- Reserved `log.md` files.
- Auxiliary `README.md` files.
- Frontmatter fields.
- Markdown headings.
- Bundle-relative and relative Markdown links.
- Citations sections.

GitHub sourcing should load an explicit owner, repository, ref or branch, and bundle path snapshot on demand. The dashboard should provide manual refresh and show source identity, selected ref, selected path, and last fetched time. It should not continuously sync in the background.

### 6.2 Understand Bundle Shape

A user can see a high-level bundle summary:

- Total Markdown files.
- Total concept documents.
- Reserved index and log files.
- Directory count and depth.
- Concept type distribution.
- Tag distribution.
- Concepts with resources.
- Concepts with citations.
- Broken or unresolved links.
- Missing recommended fields.

### 6.3 Browse Concepts

A user can navigate concepts through multiple complementary views:

- Directory tree view.
- Index-driven view when `index.md` files are present.
- Type grouping.
- Tag grouping.
- Recently updated grouping based on `timestamp` and log entries.
- Search results.

Each concept preview should show title, concept ID, type, description, tags, resource, timestamp, and validation status when available.

### 6.4 Inspect a Concept

A user can open a concept detail page that shows:

- Rendered Markdown body.
- Raw Markdown toggle.
- Parsed frontmatter table.
- Unknown custom frontmatter fields.
- Outgoing links.
- Incoming links.
- Citations.
- Related concepts inferred from shared tags and cross-links.
- File path and concept ID.
- Validation warnings and errors affecting that concept.

### 6.5 Explore the Knowledge Graph

A user can view concepts and Markdown links as a directed graph.

Graph requirements:

- Nodes represent concepts.
- Directed edges represent Markdown links from one concept to another.
- The default layout groups nodes by directory hierarchy and overlays directed links.
- Broken links appear both as unresolved placeholder nodes and validation issues.
- External URLs do not appear in the default concept graph.
- Users can filter by type, tag, directory, validation status, and search term.
- Selecting a node opens the concept preview or detail view.
- Unknown concept types must use a generic visual treatment.
- Large bundles should default to focused subgraphs by directory, search or filter result, selected concept neighborhood, or type/tag facet instead of rendering every node at once.

### 6.6 Validate Conformance

A user can inspect OKF v0.1 conformance and hygiene checks.

Hard conformance checks:

- Non-reserved Markdown files have parseable YAML frontmatter.
- Concept frontmatter contains a non-empty `type`.
- Reserved `index.md` and `log.md` files follow their expected structure when present.

Soft guidance checks:

- Missing recommended `title`.
- Missing recommended `description`.
- Missing or malformed `timestamp`.
- Empty tags.
- Duplicate concept titles.
- Links that do not resolve inside the bundle.
- Links whose target only matches through case-insensitive comparison.
- Concepts not referenced by any index.
- Concepts with no incoming or outgoing links.
- Concepts with external links but no `# Citations` section.

Validation must be advisory. The dashboard should not refuse to load a bundle solely because soft guidance checks fail. OKF conformance errors must be separated from hygiene warnings and recommendations, and users must be able to filter or hide hygiene findings.

### 6.7 Review History and Indexes

A user can inspect reserved files:

- `index.md` files should be rendered as navigation documents and linked to their containing directory.
- `log.md` files should be rendered as chronological history.
- Date headings in logs should be parsed and used for activity views when possible.
- `README.md` files should be treated as auxiliary source context, not concept documents by default.

## 7. Functional Requirements

### 7.1 Bundle Parsing

- The system must recursively scan a selected bundle root for `.md` files.
- The system must classify `index.md` and `log.md` as reserved files.
- The system must classify `README.md` as an auxiliary document by default.
- The system must classify every other `.md` file as a concept document.
- The system must derive each concept ID from the file path without the `.md` suffix.
- The system must parse YAML frontmatter without discarding unknown keys.
- The system must parse Markdown body headings, links, and citation sections.
- The system must resolve bundle-root absolute links beginning with `/`.
- The system must resolve relative Markdown links from the source file's directory.
- The system must preserve exact path casing and resolve links case-sensitively by default.
- The system must preserve unresolved links as first-class validation findings.
- The system must skip local symlinks by default and report skipped symlinked Markdown files as warnings.
- The system must sanitize rendered Markdown and must not execute scripts, code blocks, embedded HTML scripts, or active content.

### 7.2 Dashboard Views

- The system must provide a bundle overview view.
- The system must provide a concept list view.
- The system must provide a concept detail view.
- The system must provide a graph view.
- The system must provide a validation view.
- The system must provide index and log views.
- The system must provide a source context view for auxiliary `README.md` files when present.

### 7.3 Search and Filtering

- Users must be able to search across title, description, concept ID, tags, type, resource, frontmatter values, headings, and body text.
- Users must be able to filter by type, tag, directory, timestamp range, resource presence, citation presence, and validation status.
- Filters must be derived from the loaded bundle, not hard-coded.
- Search results must make the matching field clear.
- Search should be client-side for MVP and operate over the parsed bundle snapshot.

### 7.4 Metadata Display

- The system must display required, recommended, and custom frontmatter fields distinctly.
- The system must not hide unknown producer-defined frontmatter.
- The system should visually distinguish concepts with external `resource` URIs.
- The system should show tags as navigable facets.
- The system should show timestamps in a human-readable form while preserving the original value.

### 7.5 Relationship Display

- The system must show outgoing links from each concept.
- The system must compute and show incoming links for each concept.
- The system must mark broken links without treating them as fatal parse errors.
- The system should support navigation from any relationship to the linked concept or unresolved target.
- The system must display external `resource` values and external Markdown links in concept detail, not in the default concept graph.

### 7.6 Generic Domain Behavior

- The system must not assume any specific concept types.
- The system must not assume any specific directory names.
- The system must not assume any specific tag vocabulary.
- The system must not require concepts to have resources.
- The system must not require concepts to have citations.
- The system must tolerate arbitrary custom frontmatter fields.
- The system must keep source files external and read-only for all source types.

### 7.7 Source and Cache Behavior

- The system must support local-first operation without hosted infrastructure.
- The system must support a trusted local filesystem path as the first implementation source.
- The system should support public GitHub repository snapshots as the second source type.
- The system must not require continuous background synchronization.
- The system must support manual reload or refresh for local and GitHub sources.
- The system may keep temporary parsed caches for performance.
- Temporary parsed caches may contain derived indexes, graph edges, search data, validation findings, and rendered previews.
- Temporary parsed caches must never become the source of truth.
- Temporary parsed caches must be invalidated when the source changes.
- Temporary parsed caches must expire after a short time-to-live, initially 24 hours.
- Volatile caches should clear on app restart unless explicitly configured otherwise.
- The system should provide a manual clear-cache action for debugging.

## 8. MVP Scope

The MVP should include:

- Local bundle loading from a configured filesystem path.
- Recursive Markdown scanning.
- Frontmatter and body parsing.
- Bundle overview metrics.
- Directory tree navigation.
- Concept list with search and filters.
- Concept detail page with rendered Markdown and metadata.
- Link extraction with incoming, outgoing, and broken-link reporting.
- Type and tag facets derived from the bundle.
- Basic graph view for concepts and links.
- Validation view for hard conformance checks and common soft guidance checks.
- Rendering for root-level and nested `index.md` and `log.md`.
- Rendering for auxiliary `README.md` source context.
- Client-side search over hundreds to low thousands of concepts.
- Responsive layout that remains useful on mobile.
- Temporary parsed cache with automatic invalidation and cleanup.
- Manual reload and manual clear-cache controls.

## 9. Post-MVP Opportunities

- Public GitHub repository import by owner, repository, ref, and bundle path.
- Private GitHub repository import through explicit authentication.
- Zip or tarball upload.
- Git history overlays for concept changes.
- Side-by-side diff between bundle revisions.
- Exportable validation reports.
- Agent-oriented retrieval traces.
- Saved dashboard layouts.
- Configurable soft validation policies stored outside the OKF source bundle.
- External dashboard profiles for source-specific preferences, stored outside the OKF source bundle.
- Pluggable renderers for conventional sections such as `# Schema` and `# Examples`.
- Optional external references graph layer.
- Optional diagram rendering for safe declarative formats.
- Embeddable read-only bundle browser.

## 10. UX Requirements

- The first screen should show the loaded bundle's structure and health, not marketing copy.
- Navigation should support both hierarchical browsing and cross-link exploration.
- Empty states should explain what is absent in the bundle without implying the bundle is invalid.
- Validation language should distinguish errors from warnings and recommendations.
- Unknown types and custom fields should feel expected, not exceptional.
- The interface should remain usable for small personal bundles and larger organizational bundles.
- The interface should be designed for hundreds to low thousands of concepts before backend indexing is needed.
- The interface should progressively narrow graph views for large bundles instead of showing unreadable hairballs.
- The concept detail page should be a real reading surface with rendered GitHub-Flavored Markdown, structured metadata, links, and citations.
- A raw source toggle should show the exact file content read from the external source.
- Code blocks should render with syntax highlighting when possible but must never execute.
- Responsive design is required so the dashboard remains useful on mobile devices as well as desktop.
- Dense metadata views should favor scanning over decorative layout.

## 11. Data Model

### Bundle

- Root path or source identifier.
- Source type: local filesystem or GitHub.
- Source ref, branch, or commit when applicable.
- Bundle root path within the source.
- Last loaded or fetched time.
- OKF version when declared.
- File inventory.
- Directory tree.
- Concepts.
- Reserved files.
- Auxiliary files.
- Validation findings.
- Cache metadata.

### Concept

- Concept ID.
- File path.
- Directory path.
- Type.
- Title.
- Description.
- Resource.
- Tags.
- Timestamp.
- Custom frontmatter.
- Markdown body.
- Headings.
- Citations.
- Outgoing links.
- Incoming links.
- Validation findings.

### Link

- Source concept ID.
- Raw href.
- Resolved target path when possible.
- Target concept ID when resolved.
- Link text.
- Status: resolved, unresolved, external, unsupported, or case-mismatch.

### Reserved File

- File path.
- Kind: index or log.
- Directory scope.
- Parsed sections or date entries when possible.
- Rendered Markdown.
- Validation findings.

### Auxiliary File

- File path.
- Kind, initially README.
- Directory scope.
- Rendered Markdown.
- Raw Markdown.

### Validation Finding

- Severity: error, warning, or info.
- Scope: bundle, file, concept, link, index, or log.
- Message.
- File path.
- Field or line reference when available.
- Suggested remediation when useful.

### Cache Entry

- Source identifier.
- Source version or content fingerprint when available.
- Created time.
- Expires time.
- Derived parse data.
- Derived search data.
- Derived graph data.
- Validation findings.

## 12. Success Metrics

- A user can load a conformant OKF bundle and identify its major directories, types, tags, and concept count within one minute.
- A user can find a known concept by title, tag, type, path, or body text.
- A user can inspect incoming and outgoing relationships for any concept.
- A user can identify hard conformance errors without reading raw files.
- The dashboard can load bundles containing unknown types and custom frontmatter without code changes.
- The dashboard can handle broken links as visible findings without failing the full import.
- The dashboard can be used on desktop and mobile viewports for core browsing tasks.
- The dashboard can reload a changed source and clear stale parsed cache.

## 13. Acceptance Criteria

- Given a bundle with valid concept frontmatter, the dashboard lists every concept with a derived concept ID.
- Given a concept with unknown frontmatter fields, the dashboard displays those fields without dropping them.
- Given a concept without optional `title` or `description`, the dashboard still loads it and shows a warning.
- Given absolute bundle links and relative links, the dashboard resolves links that point to existing concepts.
- Given a broken bundle link, the dashboard records a non-fatal validation finding.
- Given arbitrary concept `type` values, the dashboard groups and filters by those values.
- Given arbitrary tags, the dashboard derives tag filters from the bundle.
- Given `index.md` files, the dashboard renders them as navigation aids.
- Given `log.md` files, the dashboard renders date-grouped history entries.
- Given a bundle with no `index.md`, the dashboard synthesizes navigation from the directory tree.
- Given a `README.md`, the dashboard renders it as auxiliary source context without requiring concept frontmatter.
- Given a symlinked Markdown file in a local bundle, the dashboard skips it by default and reports a warning.
- Given a link with different path casing than the target file, the dashboard reports a portability warning.
- Given a concept with external links but no `# Citations` section, the dashboard may report a hygiene recommendation without treating it as a conformance error.
- Given a large bundle, the graph view narrows to a focused subgraph rather than rendering every concept by default.
- Given a mobile viewport, the dashboard still supports bundle summary, concept search, concept detail, and validation review.

## 14. Assumptions

- OKF v0.1 is the initial compatibility target.
- Markdown files are UTF-8 encoded.
- The MVP can read from a trusted local filesystem path.
- Public GitHub import follows local import in implementation order.
- Validation focuses on OKF conformance and dashboard usability, not domain correctness.
- The source bundle remains the system of record.
- The dashboard is single-user and does not need authentication until private GitHub sources are supported.
- Historical comparison relies on source-control metadata in future iterations, not dashboard-owned source history.

## 15. Resolved Product Decisions

- The dashboard is read-only permanently. It must never edit or write back to OKF source files.
- OKF source files stay external, sourced from local directories or GitHub repositories.
- Temporary parsed cache is allowed only for derived data and must be regularly cleaned.
- Cache invalidation happens on source change, 24-hour TTL expiry, app restart for volatile caches, and manual clear-cache action.
- Local filesystem loading is implemented first.
- Public GitHub repository loading is implemented after local loading is stable.
- Private GitHub repositories require explicit authentication and are later scope.
- GitHub imports load a selected owner, repository, ref or branch, and bundle path snapshot with manual refresh.
- Bundles may live in repository subdirectories.
- `README.md` is auxiliary context, not a concept by default.
- Validation separates OKF conformance errors from hygiene warnings and recommendations.
- Hygiene checks start as built-in defaults with per-session toggles.
- Persisted source-specific preferences may later live in external dashboard profiles, never in the OKF bundle.
- The default graph layout groups by directory hierarchy and overlays directed links.
- Broken links appear both as graph placeholders and validation findings.
- External URLs stay out of the default concept graph.
- Citations are parsed from `# Citations` sections; other external links are external references.
- MVP avoids claim-level citation inference.
- MVP search is client-side over the parsed bundle snapshot.
- MVP should handle hundreds to low thousands of concepts comfortably.
- Large graph views should progressively narrow to focused subgraphs.
- Concept detail is a primary reading surface, not only a jump-off point to external files.
- Concept detail includes rendered Markdown and raw source.
- Markdown rendering supports GitHub-Flavored Markdown, sanitized output, and non-executing code blocks.
- Link resolution preserves exact casing and warns on case-only mismatches.
- Local symlinks are skipped by default.
- Local source refresh is manual in MVP.
- The dashboard stores only the current loaded snapshot and temporary derived cache in MVP.
- Validation export is useful post-MVP; graph and search export can wait.
- MVP has no authentication or multi-user features.
- The product is local-first with responsive design for mobile and desktop use.
