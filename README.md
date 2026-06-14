# OKF Dashboard

OKF Dashboard is a local-first web app for loading, validating, searching, and browsing Open Knowledge Format (OKF) bundles. It is designed for people inspecting OKF Markdown collections and for coding agents or maintainers changing the implementation.

## Audience

- **Users**: open an OKF bundle, inspect concepts, review validation findings, browse source context, and explore the relationship graph.
- **Coding agents and maintainers**: run the Bun/Vite app, update parsing or UI behavior, and verify changes with the repo quality gates.

## What It Loads

The dashboard reads Markdown-based OKF bundles from:

- a browser-selected local folder
- a server-readable local path
- a public GitHub repository, branch/ref, and optional subdirectory

Source files are treated as read-only. The app derives bundle snapshots, validation findings, links, search entries, graph data, metrics, and temporary cache metadata.

## Run the App

Prerequisites:

- Bun `1.3.x` or newer
- a local OKF bundle, a public GitHub OKF bundle, or the included fixture at `test/fixtures/minimal-okf`

Install dependencies with Bun:

```bash
bun install --frozen-lockfile
```

For hot-reload development, run the API server and Vite UI in separate terminals:

```bash
bun run server:dev
bun run app:dev
```

Open the Vite URL:

```text
http://127.0.0.1:5173
```

For a production-style local build:

```bash
bun run build
bun run dev
```

Open:

```text
http://127.0.0.1:4174
```

## Load a Bundle

In the dashboard, use **Choose Folder** for a local bundle selected through the browser. If folder picking is unavailable, use the fallback path field with a path readable by the Bun server. To try the fixture, enter:

```text
test/fixtures/minimal-okf
```

You should see the `minimal-okf` bundle summary, concepts, validation results, source files, and graph views.

## Coding Agent Workflow

Use Bun only; do not use npm, pnpm, or yarn to install dependencies.

| Command | Purpose |
| --- | --- |
| `bun run check` | Run Biome lint and format checks. |
| `bun run format` | Format files with Biome. |
| `bun run typecheck` | Run TypeScript without emitting files. |
| `bun run test` | Run Bun unit and server tests. |
| `bun run build` | Build the React app into `dist/`. |
| `bun run verify` | Run check, typecheck, tests, and build. |
| `bun run test:e2e` | Build and run Playwright desktop/mobile smoke tests. |
| `bun run doctor` | Run React Doctor diagnostics. |

Before editing, read the target file and a related caller, test, type, or config file. Preserve unrelated work in a dirty tree. Run `bun run verify` before handoff unless the change is docs-only; for rendered UI changes, also run `bun run test:e2e`.

## API Smoke Test

With `bun run server:dev` running:

```bash
curl -sS \
  -X POST http://127.0.0.1:4174/api/sources/local/load \
  -H 'content-type: application/json' \
  --data '{"rootPath":"test/fixtures/minimal-okf"}'
```

The response is a `BundleSnapshot` JSON object.

## Repository Map

```text
src/core/      Pure OKF parsing, validation, links, graph, search, and cache helpers.
src/server/    Bun HTTP server, API routes, local/GitHub loaders, and cache store.
src/app/       React dashboard, routes, components, and CSS.
test/          Bun tests and fixture OKF bundles.
e2e/           Playwright rendered UI smoke tests.
docs/          Product, technical, design, and OKF source specifications.
design/        Reference dashboard images.
AGENTS.md      Contributor and coding-agent guide.
```

## Troubleshooting

- If `http://127.0.0.1:4174` shows only a server message, run `bun run build` or use the Vite dev server.
- If a local path does not load, confirm the server is running from the repo root and the path points to Markdown files.
- If Playwright Chromium is missing, run `bunx playwright install chromium`.
