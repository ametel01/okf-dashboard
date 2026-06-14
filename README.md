# OKF Dashboard

Local-first dashboard for loading, validating, searching, and browsing Open Knowledge Format (OKF) bundles.

The app runs as:

- a Bun HTTP server on `http://127.0.0.1:4174`
- a Vite React dev server on `http://127.0.0.1:5173` when using hot-reload UI development

## Prerequisites

- Bun `1.3.x` or newer
- macOS, Linux, or another environment that can run Bun and Vite
- A local OKF bundle path, or the fixture bundle included in this repo

For rendered e2e tests, install Playwright's Chromium browser once:

```bash
bunx playwright install chromium
```

## Install Dependencies

From the repo root:

```bash
bun install --frozen-lockfile
```

Use Bun only. Do not use `npm install`, `pnpm install`, or `yarn install` in this repo.

## Run Locally With Hot Reload

Use this mode while developing the UI or server.

Terminal 1: start the Bun API/local source server.

```bash
bun run server:dev
```

Expected output:

```text
OKF Dashboard server listening on http://127.0.0.1:4174
```

Terminal 2: start the Vite React dev server.

```bash
bun run app:dev
```

Open the Vite URL in your browser:

```text
http://127.0.0.1:5173
```

Vite proxies `/api/*` requests to `http://127.0.0.1:4174`.

## Run Locally From a Production Build

Use this mode to test the built app served by the Bun server.

```bash
bun run build
bun run dev
```

Open:

```text
http://127.0.0.1:4174
```

`bun run dev` is an alias for `bun run server:dev`. If `dist/` does not exist yet, the server will only return a message telling you to run `bun run app:dev` or `bun run build`.

## Load a Local Bundle

After opening the dashboard, click **Choose Folder** and select an OKF bundle directory.

This uses your browser's local folder picker. The dashboard reads Markdown files from the selected folder in the browser session and does not require the bundle to live inside this repository.

If your browser does not support the native local folder picker, the same button falls back to a browser file selection flow. You can also use the fallback path field. The fallback path must be readable by the Bun server process.

## Load the Included Fixture Bundle

To test with the included fixture through the fallback path field, enter:

```text
test/fixtures/minimal-okf
```

Because the server resolves paths from the repo root when started there, this relative path works for local development. An absolute path also works, for example:

```text
/Users/alexmetelli/source/okf-dashboard/test/fixtures/minimal-okf
```

Click **Load Path**.

You should see:

- bundle name `minimal-okf`
- overview metrics for Markdown files, concepts, indexes, logs, directories, links, and findings
- concept browsing for `Orders`, `Customers`, and `Revenue`
- graph, validation, and source context views

## Validate the Project

Run the standard gate:

```bash
bun run verify
```

This runs:

```bash
bun run check
bun run typecheck
bun run test
bun run build
```

Run rendered browser smoke tests:

```bash
bun run test:e2e
```

`test:e2e` builds the app, starts the Bun server through Playwright, loads the fixture bundle through the UI, and verifies desktop and mobile dashboard flows.

## Useful Commands

| Command | Purpose |
| --- | --- |
| `bun run server:dev` | Start the Bun server on `127.0.0.1:4174`. |
| `bun run app:dev` | Start the Vite React dev server on `127.0.0.1:5173`. |
| `bun run dev` | Alias for `bun run server:dev`. |
| `bun run check` | Run Biome lint/format checks. |
| `bun run format` | Format files with Biome. |
| `bun run typecheck` | Run strict TypeScript checks. |
| `bun run test` | Run Bun unit and server tests. |
| `bun run build` | Build the React app into `dist/`. |
| `bun run verify` | Run check, typecheck, unit tests, and build. |
| `bun run test:e2e` | Build and run Playwright rendered UI smoke tests. |

## API Smoke Test

With `bun run server:dev` running, load the fixture through the API:

```bash
curl -sS \
  -X POST http://127.0.0.1:4174/api/sources/local/load \
  -H 'content-type: application/json' \
  --data '{"rootPath":"test/fixtures/minimal-okf"}'
```

The response is a `BundleSnapshot` JSON object containing parsed concepts, findings, graph data, search entries, metrics, and cache metadata.

## Troubleshooting

### The page at `4174` only shows a text message

Build the UI first:

```bash
bun run build
bun run dev
```

For hot reload, use `bun run app:dev` and open `http://127.0.0.1:5173`.

### The app cannot load a local bundle path

Check that:

- the Bun server is running from the repo root
- the path exists
- the path points to a directory containing Markdown files
- symlinked Markdown files are expected to be skipped

### The folder picker does not open

The **Choose Folder** button should stay clickable. If your browser does not expose a native local directory picker, it falls back to a browser file selection flow.

If no picker appears, use the fallback path field with `bun run server:dev`, or open the app in a Chromium-based browser on `localhost`.

### Playwright says Chromium is missing

Install the browser binary:

```bash
bunx playwright install chromium
```

Then rerun:

```bash
bun run test:e2e
```

### Port conflicts

The Bun server uses `127.0.0.1:4174`.

The Vite dev server uses `127.0.0.1:5173` by default. If that port is busy, Vite may choose another port and print it in the terminal.

## Repository Map

```text
src/core/      Pure OKF parsing, validation, links, graph, search, and cache helpers.
src/server/    Bun HTTP server, API routes, local loader, GitHub loader, and cache store.
src/app/       React dashboard, routes, components, and CSS design system.
test/          Bun unit/server tests and fixture OKF bundle.
e2e/           Playwright rendered UI smoke tests.
docs/          Product, technical, design, and OKF source specifications.
design/        Reference dashboard and subpage images.
```
