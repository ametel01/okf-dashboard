# Repository Guidelines

## Project Structure & Module Organization

This is a Bun + Vite React dashboard for browsing Open Knowledge Format bundles. Core parsing, validation, graph, search, cache, and source models live in `src/core/`. The Bun HTTP server, API routes, source loaders, and cache store live in `src/server/`. React UI code and CSS live in `src/app/`. Unit and server tests are under `test/`, with fixtures in `test/fixtures/`. Playwright smoke tests live in `e2e/`. Product, design, technical, and OKF specs are in `docs/`; visual references are in `design/`.

## Build, Test, and Development Commands

Use Bun only; do not install with npm, pnpm, or yarn.

- `bun run server:dev`: start the Bun server on `127.0.0.1:4174`.
- `bun run app:dev`: start the Vite UI on `127.0.0.1:5173`, proxying `/api` to the Bun server.
- `bun run build`: build the React app into `dist/`.
- `bun run check`: run Biome lint and format checks.
- `bun run typecheck`: run strict TypeScript checks.
- `bun run test`: run Bun unit and server tests.
- `bun run verify`: run check, typecheck, unit tests, and build.
- `bun run test:e2e`: build, start the server through Playwright, and run desktop/mobile smoke tests.

## Coding Style & Naming Conventions

TypeScript is strict and ESM-only. Biome enforces 2-space indentation, 100-character lines, double quotes, semicolons, recommended lint rules, and no explicit `any`. Keep pure helpers in `src/core/`, route/server behavior in `src/server/`, and UI-only logic in `src/app/`. Use PascalCase for React components, camelCase for functions and variables, and descriptive test names such as `bundle.test.ts` and `dashboard.pw.ts`.

## Testing Guidelines

Use Bun test for `test/**/*.test.ts` and Playwright for `e2e/**/*.pw.ts`. Update `test/fixtures/` when parser, validation, search, or graph behavior changes. For UI layout or route changes, extend Playwright desktop/mobile coverage. Run `bun run verify` before handoff; run `bun run test:e2e` for rendered UI changes.

## Commit & Pull Request Guidelines

Recent history uses Conventional Commits, for example `feat: link validation summary metrics`, `fix: prevent overview grid overflow`, and `refactor: move recent activity below overview`. Keep commits scoped and imperative. Pull requests should summarize the change, list validation, link relevant issues or specs, and include screenshots for visible UI changes.

## Agent-Specific Instructions

Before editing, read the target file and at least one related caller, test, or type/config file. Preserve user-owned work in a dirty tree. Verify the current directory and command syntax before shell commands, and change approach after failures.
