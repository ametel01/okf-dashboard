# OKF Dashboard Design Specification

## 1. Purpose

This document defines the visual design system and page layouts for the OKF Dashboard based on `design/dashboard.png` and `design/subpage.png`.

The UI should feel like a serious local knowledge inspection tool: dense, calm, fast to scan, and reliable. The design should not look like a marketing site. It should prioritize navigation, metadata comparison, validation state, and reading comfort.

## 2. Visual Direction

The reference design uses:

- A fixed dark navy sidebar for source context and primary navigation.
- A light neutral workspace for content-heavy dashboard screens.
- Compact bordered cards with low-radius corners.
- Blue as the primary interaction color.
- Green, amber, red, and violet for semantic states and metadata accents.
- Thin dividers, subtle shadows, and restrained density.
- Icon-led navigation and controls.

The implementation should keep this operational dashboard character across all pages.

## 3. Central CSS Architecture

Use centralized CSS definitions before page-specific styles.

Recommended structure:

```text
src/app/styles/
  tokens.css       # colors, typography, spacing, radii, shadows, z-index
  reset.css        # base reset and document defaults
  layout.css       # app shell, sidebar, header, content grid
  components.css   # cards, buttons, inputs, badges, tables, tabs
  utilities.css    # small reusable helpers
```

Import order:

```css
@import "./styles/reset.css";
@import "./styles/tokens.css";
@import "./styles/layout.css";
@import "./styles/components.css";
@import "./styles/utilities.css";
```

No page should define its own colors, font stacks, shadows, border radii, or spacing constants. Page CSS may compose layout classes and set grid templates only.

## 4. Design Tokens

Use CSS custom properties as the source of truth.

```css
:root {
  color-scheme: light;

  /* Typography */
  --font-sans: "IBM Plex Sans", "Aptos", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;

  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-md: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.375rem;
  --text-2xl: 1.75rem;

  --leading-tight: 1.2;
  --leading-normal: 1.45;
  --leading-reading: 1.65;

  --weight-regular: 400;
  --weight-medium: 500;
  --weight-semibold: 600;
  --weight-bold: 700;

  /* Surface */
  --color-app: #f8fafc;
  --color-surface: #ffffff;
  --color-surface-subtle: #f8fafc;
  --color-surface-muted: #f1f5f9;
  --color-border: #dfe5ee;
  --color-border-strong: #cbd5e1;

  /* Text */
  --color-text: #0f172a;
  --color-text-muted: #475569;
  --color-text-subtle: #64748b;
  --color-text-inverse: #f8fafc;
  --color-text-inverse-muted: #b6c2d4;

  /* Sidebar */
  --color-sidebar: #061426;
  --color-sidebar-2: #0a1d35;
  --color-sidebar-border: rgba(148, 163, 184, 0.18);
  --color-sidebar-active: #1554c8;
  --color-sidebar-active-2: #0d3f9d;

  /* Brand and semantic states */
  --color-primary: #2563eb;
  --color-primary-strong: #1d4ed8;
  --color-primary-soft: #dbeafe;
  --color-primary-ink: #1e3a8a;

  --color-success: #16a34a;
  --color-success-soft: #dcfce7;
  --color-success-ink: #166534;

  --color-warning: #f97316;
  --color-warning-soft: #ffedd5;
  --color-warning-ink: #9a3412;

  --color-danger: #ef4444;
  --color-danger-soft: #fee2e2;
  --color-danger-ink: #991b1b;

  --color-info: #3b82f6;
  --color-info-soft: #dbeafe;
  --color-info-ink: #1e40af;

  --color-violet: #8b5cf6;
  --color-violet-soft: #ede9fe;
  --color-violet-ink: #5b21b6;

  --color-cyan: #06b6d4;
  --color-amber: #eab308;

  /* Spacing */
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;

  /* Shape */
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --radius-pill: 999px;

  /* Shadows */
  --shadow-card: 0 1px 2px rgba(15, 23, 42, 0.04);
  --shadow-popover: 0 12px 32px rgba(15, 23, 42, 0.16);
  --shadow-focus: 0 0 0 3px rgba(37, 99, 235, 0.18);

  /* Layout */
  --sidebar-width: 232px;
  --content-max: 1600px;
  --header-height: 72px;
  --tab-height: 48px;
  --content-pad-x: 24px;
  --content-pad-y: 20px;
  --card-pad: 16px;
  --grid-gap: 12px;
  --grid-gap-lg: 16px;
}
```

## 5. Base Styles

```css
html {
  font-family: var(--font-sans);
  font-size: 16px;
  letter-spacing: 0;
  background: var(--color-app);
  color: var(--color-text);
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100vh;
  font-size: var(--text-sm);
  line-height: var(--leading-normal);
}

button,
input,
select,
textarea {
  font: inherit;
  letter-spacing: 0;
}

a {
  color: var(--color-primary);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
}
```

## 6. App Shell

Desktop shell:

```css
.app-shell {
  display: grid;
  min-height: 100vh;
  grid-template-columns: var(--sidebar-width) minmax(0, 1fr);
  background: var(--color-app);
}

.app-sidebar {
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  background:
    linear-gradient(180deg, rgba(37, 99, 235, 0.12), transparent 34%),
    linear-gradient(180deg, var(--color-sidebar), var(--color-sidebar-2));
  color: var(--color-text-inverse);
  border-right: 1px solid var(--color-sidebar-border);
  padding: var(--space-5) var(--space-3);
}

.app-main {
  min-width: 0;
  padding: var(--content-pad-y) var(--content-pad-x) var(--space-6);
}

.page-frame {
  max-width: var(--content-max);
  margin: 0 auto;
}
```

Mobile shell:

```css
@media (max-width: 860px) {
  .app-shell {
    display: block;
  }

  .app-sidebar {
    position: sticky;
    z-index: 20;
    top: 0;
    height: auto;
    max-height: 72px;
    overflow: hidden;
    padding: var(--space-3) var(--space-4);
  }

  .app-sidebar[data-open="true"] {
    max-height: 100vh;
    overflow-y: auto;
  }

  .app-main {
    padding: var(--space-4);
  }
}
```

## 7. Sidebar Layout

The sidebar has four stacked zones:

1. Brand lockup.
2. Current bundle selector.
3. Navigation groups.
4. Source card and app version pinned near the bottom on tall screens.

Sizing:

- Sidebar width: `232px`.
- Brand icon: `32px`.
- Nav item height: `40px`.
- Nav item radius: `6px`.
- Nav item gap: `8px`.
- Source card padding: `12px`.

States:

- Default nav text: inverse white.
- Secondary nav text: muted inverse.
- Active nav item: blue gradient background.
- Active nav icon: white.
- Bundle online/status dot: success green.

```css
.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  min-height: 40px;
  padding: 0 var(--space-3);
  border-radius: var(--radius-md);
  color: var(--color-text-inverse);
}

.sidebar-nav-item[aria-current="page"] {
  background: linear-gradient(135deg, var(--color-sidebar-active), var(--color-sidebar-active-2));
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}
```

Use lucide icons for navigation and controls.

## 8. Header and Tabs

The page header sits above the tab bar and search/actions row.

Header content:

- Bundle title.
- Validation status badge.
- Source path.
- Right-side actions: view source, overflow menu, theme toggle.

Tab bar:

- Overview.
- Concepts.
- Graph.
- Indexes.
- Tags.
- Types.
- Validation.

Active tab uses blue text and a 2px blue underline.

```css
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  margin-bottom: var(--space-4);
}

.page-title {
  margin: 0;
  font-size: var(--text-2xl);
  line-height: var(--leading-tight);
  font-weight: var(--weight-bold);
}

.tabs {
  display: flex;
  align-items: center;
  gap: var(--space-5);
  min-height: var(--tab-height);
  border-bottom: 1px solid var(--color-border);
}

.tab {
  display: inline-flex;
  align-items: center;
  height: var(--tab-height);
  border-bottom: 2px solid transparent;
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}

.tab[aria-current="page"] {
  color: var(--color-primary);
  border-bottom-color: var(--color-primary);
}
```

On mobile, tabs become a horizontal scroll strip.

## 9. Common Components

### Cards

Cards should be compact and utilitarian.

```css
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--card-pad) var(--card-pad) 0;
}

.card-body {
  padding: var(--card-pad);
}
```

Do not nest cards inside cards. Use bordered rows or sections inside a card when more structure is needed.

### Buttons

Buttons are icon-first where possible.

```css
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: 0 var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  font-weight: var(--weight-medium);
}

.button:hover {
  border-color: var(--color-border-strong);
  background: var(--color-surface-subtle);
}

.button-icon {
  width: 36px;
  padding: 0;
}
```

### Inputs

```css
.search-input {
  min-height: 36px;
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  color: var(--color-text);
  padding: 0 var(--space-3);
}
```

### Badges

```css
.badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 22px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--weight-medium);
}

.badge-primary {
  color: var(--color-primary-ink);
  background: var(--color-primary-soft);
}

.badge-success {
  color: var(--color-success-ink);
  background: var(--color-success-soft);
}

.badge-warning {
  color: var(--color-warning-ink);
  background: var(--color-warning-soft);
}

.badge-danger {
  color: var(--color-danger-ink);
  background: var(--color-danger-soft);
}

.badge-violet {
  color: var(--color-violet-ink);
  background: var(--color-violet-soft);
}
```

## 10. Overview Layout

Reference: `design/dashboard.png`.

Desktop grid:

```css
.overview-grid {
  display: grid;
  grid-template-columns: minmax(420px, 1.1fr) minmax(420px, 1fr) minmax(280px, 0.65fr);
  gap: var(--grid-gap-lg);
}

.overview-lower-grid {
  display: grid;
  grid-template-columns: minmax(320px, 0.9fr) minmax(420px, 1.25fr) minmax(420px, 1.25fr);
  gap: var(--grid-gap-lg);
  margin-top: var(--grid-gap-lg);
}

.validation-strip {
  margin-top: var(--grid-gap-lg);
}
```

Sections:

- Bundle Summary: top-left card with 12 metric tiles in a 4-column by 3-row grid.
- Distributions: top-middle card with type donut and tag bar chart.
- Recent Activity: top-right card with timestamped vertical activity list.
- Directory Tree: lower-left card with compact folder rows.
- Recently Updated Concepts: lower-middle card with table rows.
- Knowledge Graph Preview: lower-right card with controls, graph preview, legend, and full graph button.
- Validation Summary: full-width bottom strip.

Metric tile:

```css
.metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--space-3);
}

.metric-tile {
  min-height: 78px;
  padding: var(--space-3);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.metric-value {
  margin-top: var(--space-2);
  font-size: var(--text-xl);
  line-height: var(--leading-tight);
  font-weight: var(--weight-bold);
}
```

Responsive behavior:

- Under `1180px`: overview cards become two columns.
- Under `860px`: all overview sections stack in one column.
- Metric grid becomes two columns on tablet and one or two columns on mobile depending on available width.
- Graph preview should collapse to a focused neighborhood or static summary on narrow mobile screens.

```css
@media (max-width: 1180px) {
  .overview-grid,
  .overview-lower-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 860px) {
  .overview-grid,
  .overview-lower-grid {
    grid-template-columns: 1fr;
  }

  .metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
```

## 11. Concept Detail Layout

Reference: `design/subpage.png`.

Desktop structure:

```css
.detail-header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-4);
  align-items: end;
  margin: var(--space-4) 0;
}

.detail-main-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.55fr) minmax(340px, 0.85fr);
  gap: var(--grid-gap-lg);
}

.relationship-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: var(--grid-gap-lg);
  margin-top: var(--grid-gap-lg);
}

.detail-validation-strip {
  margin-top: var(--grid-gap-lg);
}
```

Sections:

- Breadcrumb row above title.
- Title row with document icon, concept title, type badge, validation badge, concept ID, and file path.
- View mode segmented control: rendered Markdown and raw source.
- Action buttons: download/export later, copy path, overflow.
- Main content: rendered Markdown card.
- Side content: metadata table card.
- Relationship row: outgoing links, incoming links, citations, related concepts.
- Validation findings strip at the bottom.

Markdown reading surface:

```css
.markdown-body {
  padding: var(--card-pad);
  font-size: var(--text-sm);
  line-height: var(--leading-reading);
}

.markdown-body h1 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-xl);
  line-height: var(--leading-tight);
}

.markdown-body h2 {
  margin: var(--space-5) 0 var(--space-2);
  font-size: var(--text-lg);
  line-height: var(--leading-tight);
}

.markdown-body p,
.markdown-body ul,
.markdown-body ol {
  margin: 0 0 var(--space-3);
}

.markdown-body code {
  font-family: var(--font-mono);
  font-size: 0.92em;
  background: var(--color-surface-muted);
  border-radius: var(--radius-sm);
  padding: 0.1rem 0.25rem;
}
```

Metadata table:

```css
.metadata-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.metadata-table th,
.metadata-table td {
  padding: var(--space-3);
  border-top: 1px solid var(--color-border);
  vertical-align: top;
  text-align: left;
}

.metadata-table th {
  width: 34%;
  color: var(--color-text-muted);
  font-weight: var(--weight-medium);
}
```

Responsive behavior:

- Under `1180px`: relationship cards become two columns.
- Under `960px`: metadata moves below rendered Markdown.
- Under `640px`: title actions wrap, relationship cards stack, metadata rows become block layout.

## 12. Concept List Layout

The concept list should share the dashboard density.

Desktop:

- Filter sidebar or top filter row depending on available width.
- Search bar above results.
- Results as a table on desktop.
- Results as compact cards on mobile.

Columns:

- Concept.
- Type.
- Tags.
- Updated.
- Links.
- Validation.

Use title fallback logic visibly: if `title` is missing, show derived filename and a muted "derived" badge.

## 13. Validation Layout

Validation should feel actionable, not alarming.

Structure:

- Summary counters: errors, warnings, info, passed.
- Filters for severity, scope, rule, file path, and hidden hygiene rules.
- Findings table grouped by file by default.
- Finding detail drawer for message, affected field, line when available, and suggested remediation.

Severity colors:

- Error: red.
- Warning: amber.
- Info: blue.
- Passed: green.

Errors and hygiene warnings must never be visually conflated.

## 14. Graph Layout

The graph uses the same card language as the overview preview.

Graph controls:

- Filter icon button.
- Type select.
- Tag select.
- Status select.
- Focus mode button.
- Fullscreen button.

Node colors:

```css
:root {
  --graph-concept: #3b82f6;
  --graph-guide: #73b66b;
  --graph-practice: #eab308;
  --graph-other: #8b5cf6;
  --graph-unresolved: #ef4444;
  --graph-edge: #94a3b8;
}
```

Rules:

- Default graph groups by directory hierarchy.
- Unknown types use `--graph-other`.
- Unresolved links use dashed red outlines.
- External URLs are not shown by default.
- Large graphs render focused subgraphs.

## 15. Source Context Layout

Source context covers `index.md`, `log.md`, and `README.md`.

Layout:

- Left list of source context files by directory.
- Main rendered Markdown panel.
- Optional parsed-outline panel for index sections or log dates.

`README.md` must be labeled auxiliary, not concept.

## 16. Responsive Breakpoints

Use three breakpoints consistently:

```css
:root {
  --bp-sm: 640px;
  --bp-md: 860px;
  --bp-lg: 1180px;
}
```

CSS custom properties cannot be used directly in media queries in plain CSS, so duplicate the numeric values in media queries:

- `640px`: phone layout.
- `860px`: sidebar collapses and page grids become single column.
- `1180px`: dense dashboard grids reduce from three columns to two.

No text should rely on viewport-width font scaling. Use fixed token sizes and responsive layout changes instead.

## 17. Accessibility Requirements

- All icon-only buttons need accessible labels and tooltips.
- Navigation uses `aria-current="page"`.
- Tabs use proper tab semantics or links with current-page state.
- Color is never the only indicator of validation severity.
- Focus states use `--shadow-focus`.
- Text contrast must meet WCAG AA.
- Tables need headers.
- Graph nodes need keyboard-reachable list alternatives.

## 18. Implementation Rules

- Use centralized tokens for every color, radius, shadow, and font.
- Use lucide icons for actions and navigation.
- Keep card border radius at `8px` or less.
- Do not put cards inside cards.
- Do not use decorative gradient orbs or bokeh backgrounds.
- Do not create hero sections.
- Keep the first screen as the loaded bundle dashboard.
- Keep operational screens dense but readable.
- Preserve exact source paths and metadata in UI labels.
- Prefer tables for comparable metadata and lists for relationship groups.
