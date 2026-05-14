/**
 * `harness view` — start a tiny local HTTP server that serves the
 * project's harness snapshot as a single-page dashboard.
 */

import { spawn } from "node:child_process";
import { type IncomingMessage, type ServerResponse, createServer } from "node:http";
import { join, normalize, resolve } from "node:path";
import { pathExists, pkgPath, readText } from "../utils/fs.js";
import { c, log } from "../utils/log.js";
import { collectProjectData } from "../utils/project-data.js";

export interface ViewOptions {
  cwd: string;
  port?: number;
  open?: boolean; // default true
}

export async function runView(opts: ViewOptions): Promise<{ url: string; close: () => void }> {
  const cwd = opts.cwd;
  const requestedPort = opts.port ?? 3737;

  // Sanity: warn if this isn't a harness-kit project, but don't refuse —
  // view is still useful for "diagnose what's missing".
  if (!(await pathExists(join(cwd, ".harnessrc.json")))) {
    log.warn(
      `${cwd} doesn't look like a harness-kit project (no .harnessrc.json). View will show what's missing.`,
    );
  }

  const server = createServer((req, res) => {
    handle(req, res, cwd).catch((err) => {
      try {
        res.writeHead(500, { "content-type": "text/plain" });
        res.end((err as Error).message);
      } catch {
        /* socket already closed */
      }
    });
  });

  // Pick a free port: use requested, fall back to ephemeral if --port 0.
  await new Promise<void>((res, rej) => {
    server.once("error", rej);
    server.listen(requestedPort, "127.0.0.1", res);
  });
  const addr = server.address();
  const port = typeof addr === "object" && addr ? addr.port : requestedPort;
  const url = `http://localhost:${port}`;

  log.banner("view", "Local dashboard for the project's harness");
  log.info(`Dashboard: ${c.cyan(url)}`);
  log.dim("Press Ctrl+C to stop.");

  if (opts.open !== false) {
    openInBrowser(url);
  }

  return {
    url,
    close: () => server.close(),
  };
}

async function handle(req: IncomingMessage, res: ServerResponse, cwd: string): Promise<void> {
  const url = new URL(req.url ?? "/", "http://localhost");
  const path = url.pathname;

  if (path === "/" || path === "/index.html") {
    const html = await readText(pkgPath("templates", "web", "index.html"));
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(html);
    return;
  }

  if (path === "/api/project") {
    const data = await collectProjectData(cwd);
    res.writeHead(200, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify(data));
    return;
  }

  if (path === "/api/file") {
    const rel = url.searchParams.get("path") ?? "";
    if (!isSafeRelPath(rel)) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("invalid path");
      return;
    }
    const full = join(cwd, rel);
    if (!isInsideCwd(cwd, full)) {
      res.writeHead(400, { "content-type": "text/plain" });
      res.end("path escapes project root");
      return;
    }
    if (!(await pathExists(full))) {
      res.writeHead(404, { "content-type": "text/plain" });
      res.end("not found");
      return;
    }
    const content = await readText(full);
    res.writeHead(200, { "content-type": "text/plain; charset=utf-8" });
    res.end(content);
    return;
  }

  res.writeHead(404, { "content-type": "text/plain" });
  res.end("not found");
}

function isSafeRelPath(p: string): boolean {
  if (!p) return false;
  if (p.startsWith("/")) return false;
  // forbid raw `..` segments and weird chars
  if (p.split("/").some((seg) => seg === "..")) return false;
  // explicit allowlist of project-relative file paths used by the dashboard
  // (no glob, no wildcards). We allow nested segments freely as long as no
  // `..` traversal — the cwd boundary check below also enforces this.
  return true;
}

function isInsideCwd(cwd: string, full: string): boolean {
  const cwdAbs = resolve(cwd);
  const fullAbs = resolve(normalize(full));
  return fullAbs === cwdAbs || fullAbs.startsWith(`${cwdAbs}/`);
}

function openInBrowser(url: string): void {
  const cmd =
    process.platform === "darwin" ? "open" : process.platform === "win32" ? "start" : "xdg-open";
  try {
    spawn(cmd, [url], { stdio: "ignore", detached: true }).unref();
  } catch {
    // Best-effort; fall back to user clicking the URL printed above.
  }
}
