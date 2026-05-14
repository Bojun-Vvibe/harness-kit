import { execSync } from "node:child_process";
import { existsSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const CLI = join(ROOT, "dist", "cli.cjs");

let tmpDirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(join(tmpdir(), "harness-kit-view-"));
  tmpDirs.push(d);
  return d;
}

beforeAll(() => {
  if (!existsSync(CLI)) {
    throw new Error(`CLI not built at ${CLI}. Run \`npm run build\` first.`);
  }
});

afterEach(async () => {
  const { rm } = await import("node:fs/promises");
  for (const d of tmpDirs) {
    try {
      await rm(d, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  }
  tmpDirs = [];
});

interface SpawnedView {
  url: string;
  child: ReturnType<typeof import("node:child_process").spawn>;
  stop: () => Promise<void>;
}

async function spawnView(cwd: string, extraArgs: string[] = []): Promise<SpawnedView> {
  const { spawn } = await import("node:child_process");
  const child = spawn("node", [CLI, "view", cwd, "--no-open", "--port", "0", ...extraArgs], {
    stdio: ["ignore", "pipe", "pipe"],
  });
  const url = await new Promise<string>((resolve, reject) => {
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(
      () => reject(new Error(`view did not boot in time: ${stdout}\n${stderr}`)),
      7000,
    );
    child.stdout?.on("data", (b) => {
      stdout += b.toString();
      const m = stdout.match(/http:\/\/localhost:(\d+)/);
      if (m) {
        clearTimeout(timer);
        resolve(`http://localhost:${m[1]}`);
      }
    });
    child.stderr?.on("data", (b) => {
      stderr += b.toString();
    });
    child.once("exit", (code) => {
      if (code !== 0) {
        clearTimeout(timer);
        reject(new Error(`view exited ${code} before printing URL: ${stdout}\n${stderr}`));
      }
    });
  });
  return {
    url,
    child,
    stop: () =>
      new Promise<void>((res) => {
        child.once("exit", () => res());
        child.kill("SIGTERM");
        setTimeout(() => {
          if (!child.killed) child.kill("SIGKILL");
          res();
        }, 1500);
      }),
  };
}

describe("harness view", () => {
  it("starts a server, prints a localhost URL, and serves /api/project with 5 subsystems", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name v-proj --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      expect(v.url).toMatch(/^http:\/\/localhost:\d+$/);
      // hit /api/project
      const r = await fetch(`${v.url}/api/project`);
      expect(r.status).toBe(200);
      const data = (await r.json()) as { subsystems: { key: string; zh: string; en: string }[] };
      const keys = data.subsystems.map((s) => s.key);
      expect(keys).toEqual(["instructions", "tools", "environment", "state", "feedback"]);
      // also check zh/en labels are populated and in expected order
      const zhLabels = data.subsystems.map((s) => s.zh);
      expect(zhLabels).toEqual(["指令", "工具", "环境", "状态", "反馈"]);
    } finally {
      await v.stop();
    }
  });

  it("serves the dashboard HTML at /", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name v-html --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      const r = await fetch(`${v.url}/`);
      expect(r.status).toBe(200);
      expect(r.headers.get("content-type") ?? "").toContain("text/html");
      const html = await r.text();
      expect(html).toContain("<title>harness — dashboard</title>");
      // dashboard chrome must be present (labels are populated via /api/project at runtime)
      expect(html).toContain('id="subsystems"');
      expect(html).toContain('id="features"');
      expect(html).toContain('id="summary"');
      expect(html).toContain("/api/project");
    } finally {
      await v.stop();
    }
  });

  it("/api/file returns the requested file content; rejects path traversal", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name v-file --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      // good case
      const ok = await fetch(`${v.url}/api/file?path=AGENTS.md`);
      expect(ok.status).toBe(200);
      const txt = await ok.text();
      expect(txt).toContain("v-file");
      // path traversal
      const bad = await fetch(`${v.url}/api/file?path=../../etc/passwd`);
      expect(bad.status).toBe(400);
      // missing file
      const miss = await fetch(`${v.url}/api/file?path=does-not-exist.md`);
      expect(miss.status).toBe(404);
    } finally {
      await v.stop();
    }
  });

  it("/api/project includes harness metadata, features view, and subsystem notes", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code,codex --name v-meta --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      const r = await fetch(`${v.url}/api/project`);
      const data = (await r.json()) as {
        project: { name: string };
        harness: { agents: string[]; version: string };
        features: { wip_limit: number; total: number; items: unknown[]; wip_violation: boolean };
        bootstrapPrompt: { saved: boolean };
        subsystems: { key: string; files: { path: string }[]; notes: string[] }[];
      };
      expect(data.project.name).toBe("v-meta");
      expect(data.harness.agents).toEqual(expect.arrayContaining(["claude-code", "codex"]));
      expect(data.harness.version).toBe("1");
      expect(data.features.wip_limit).toBe(1);
      expect(data.features.total).toBe(0);
      expect(data.features.wip_violation).toBe(false);
      expect(data.bootstrapPrompt.saved).toBe(true);
      // Instructions subsystem must include AGENTS.md and FEATURES.md
      const ins = data.subsystems.find((s) => s.key === "instructions");
      expect(ins).toBeDefined();
      const insPaths = ins!.files.map((f) => f.path);
      expect(insPaths).toContain("AGENTS.md");
      expect(insPaths).toContain("FEATURES.md");
      // Tools subsystem must include Makefile
      const tools = data.subsystems.find((s) => s.key === "tools");
      expect(tools!.files.map((f) => f.path)).toContain("Makefile");
    } finally {
      await v.stop();
    }
  });

  it("/api/project includes a todos summary with file/line/text entries", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name v-todos --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      const r = await fetch(`${v.url}/api/project`);
      const data = (await r.json()) as {
        todos: {
          total: number;
          byFile: {
            path: string;
            entries: { line: number; text: string; kind: "block" | "inline" }[];
          }[];
        };
      };
      // A freshly init'd repo has plenty of `> **TODO**:` markers in the
      // generated docs (CONSTRAINTS.md, architecture.md, etc.).
      expect(data.todos.total).toBeGreaterThan(0);
      expect(data.todos.byFile.length).toBeGreaterThan(0);
      // Every file group has at least one entry, and each entry is well-shaped.
      for (const file of data.todos.byFile) {
        expect(file.entries.length).toBeGreaterThan(0);
        for (const e of file.entries) {
          expect(e.line).toBeGreaterThanOrEqual(1);
          expect(typeof e.text).toBe("string");
          expect(["block", "inline"]).toContain(e.kind);
        }
      }
      // CONSTRAINTS.md ships with TODO markers — must be in the list.
      const constraints = data.todos.byFile.find((f) => f.path === "CONSTRAINTS.md");
      expect(constraints).toBeDefined();
      expect(constraints!.entries.length).toBeGreaterThan(0);
      // Sort order: most-TODO files first.
      for (let i = 1; i < data.todos.byFile.length; i++) {
        expect(data.todos.byFile[i - 1]!.entries.length).toBeGreaterThanOrEqual(
          data.todos.byFile[i]!.entries.length,
        );
      }
    } finally {
      await v.stop();
    }
  });

  it("the dashboard HTML wires up a TODOs section + line-jump support in the file modal", async () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name v-html-todos --lang en`, {
      stdio: "pipe",
    });
    const v = await spawnView(dir);
    try {
      const r = await fetch(`${v.url}/`);
      const html = await r.text();
      expect(html).toContain('id="todos"');
      expect(html).toContain("TODOs to fill in");
      // line-jump infrastructure
      expect(html).toContain('class="line"');
      expect(html).toContain('"highlighted"');
      // the TODO list renderer references kind + line/text
      expect(html).toContain('"kind"');
    } finally {
      await v.stop();
    }
  });
});
