import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { extname, join } from "node:path";
import type { ApiErrorResponse } from "../core/okf-types";
import { getBundle } from "./routes/bundle";
import { clearCache } from "./routes/cache";
import { loadGitHubSource, refreshGitHubSource } from "./routes/github-source";
import { loadLocalSource, refreshLocalSource } from "./routes/local-source";
import { cacheStore } from "./services/cache-store";

const distRoot = join(process.cwd(), "dist");

export async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (request.method === "OPTIONS") return json({}, 204);
  try {
    if (url.pathname === "/api/sources/local/load" && request.method === "POST") {
      return json(await loadLocalSource(await request.json(), cacheStore));
    }
    if (url.pathname === "/api/sources/local/refresh" && request.method === "POST") {
      return json(await refreshLocalSource(await request.json(), cacheStore));
    }
    if (url.pathname === "/api/sources/github/load" && request.method === "POST") {
      return json(await loadGitHubSource(await request.json(), cacheStore));
    }
    if (url.pathname === "/api/sources/github/refresh" && request.method === "POST") {
      return json(await refreshGitHubSource(await request.json(), cacheStore));
    }
    if (url.pathname.startsWith("/api/bundles/") && request.method === "GET") {
      return json(
        getBundle(decodeURIComponent(url.pathname.replace("/api/bundles/", "")), cacheStore),
      );
    }
    if (url.pathname === "/api/cache/clear" && request.method === "POST") {
      return json(clearCache(await request.json().catch(() => ({})), cacheStore));
    }
    if (url.pathname.startsWith("/api/"))
      return errorResponse("not_found", "API route not found", 404);
    return serveStatic(url.pathname);
  } catch (error) {
    return errorResponse(
      "request_failed",
      error instanceof Error ? error.message : "Unknown server error",
      400,
    );
  }
}

function json(value: unknown, status = 200): Response {
  return new Response(JSON.stringify(value), {
    status,
    headers: {
      "content-type": "application/json",
      "access-control-allow-origin": "http://127.0.0.1:5173",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    },
  });
}

function errorResponse(code: string, message: string, status: number): Response {
  return json({ error: { code, message } } satisfies ApiErrorResponse, status);
}

async function serveStatic(pathname: string): Promise<Response> {
  const filePath = pathname === "/" ? join(distRoot, "index.html") : join(distRoot, pathname);
  const target = existsSync(filePath) ? filePath : join(distRoot, "index.html");
  if (!existsSync(target))
    return new Response(
      "OKF Dashboard server. Run `bun run app:dev` or `bun run build` for the UI.",
      { status: 200 },
    );
  return new Response(await readFile(target), {
    headers: { "content-type": contentType(extname(target)) },
  });
}

function contentType(extension: string): string {
  if (extension === ".html") return "text/html";
  if (extension === ".css") return "text/css";
  if (extension === ".js") return "text/javascript";
  if (extension === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

if (import.meta.main) {
  Bun.serve({ port: 4174, hostname: "127.0.0.1", fetch: handleRequest });
  console.info("OKF Dashboard server listening on http://127.0.0.1:4174");
}
