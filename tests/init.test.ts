import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const CLI = join(ROOT, "dist", "cli.cjs");

let tmpDirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(join(tmpdir(), "harness-kit-test-"));
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

describe("harness init", () => {
  it("scaffolds a complete harness in an empty dir (yes mode)", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code,codex,opencode --name test-proj`, {
      stdio: "pipe",
    });

    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "CONSTRAINTS.md"))).toBe(true);
    expect(existsSync(join(dir, "PROGRESS.md"))).toBe(true);
    expect(existsSync(join(dir, "features.json"))).toBe(true);
    expect(existsSync(join(dir, "FEATURES.md"))).toBe(true);
    expect(existsSync(join(dir, "QUALITY.md"))).toBe(true);
    expect(existsSync(join(dir, "Makefile"))).toBe(true);
    expect(existsSync(join(dir, "scripts/exit-clean.sh"))).toBe(true);
    expect(existsSync(join(dir, "scripts/session-init.sh"))).toBe(true);
    expect(existsSync(join(dir, "scripts/validate-feature.sh"))).toBe(true);
    expect(existsSync(join(dir, "docs/templates/sprint-contract.md"))).toBe(true);
    expect(existsSync(join(dir, ".github/workflows/harness.yml"))).toBe(true);
    expect(existsSync(join(dir, ".harnessrc.json"))).toBe(true);

    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".codex/AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, ".opencode/AGENTS.md"))).toBe(true);

    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("test-proj");
    expect(agents).not.toMatch(/\$\{[A-Z_]+\}/);

    const cfg = JSON.parse(readFileSync(join(dir, ".harnessrc.json"), "utf8"));
    expect(cfg.project_name).toBe("test-proj");
    expect(cfg).not.toHaveProperty("stack");
    expect(cfg.agents).toEqual(expect.arrayContaining(["claude-code", "codex", "opencode"]));

    const feats = JSON.parse(readFileSync(join(dir, "features.json"), "utf8"));
    expect(feats.wip_limit).toBe(1);
    expect(feats.features).toEqual([]);
  });

  it("FEATURES.md documents the WIP=1 + verification rules (markdown is the contract)", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name fdoc-test`, {
      stdio: "pipe",
    });
    const md = readFileSync(join(dir, "FEATURES.md"), "utf8");
    expect(md).toMatch(/WIP\s*=\s*1/);
    expect(md).toMatch(/verification/i);
    expect(md).toMatch(/state machine|state transitions/i);
    expect(md).toMatch(/scripts\/validate-feature\.sh/);
  });
});

describe("harness doctor", () => {
  it("scores a freshly init'd repo well above zero", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name d-test`, { stdio: "pipe" });
    const out = execSync(`node ${CLI} doctor ${dir}`, { encoding: "utf8" });
    const m = out.match(/Total:\s+(\d+)\/(\d+)/);
    expect(m).toBeTruthy();
    const got = Number.parseInt(m![1]!, 10);
    const max = Number.parseInt(m![2]!, 10);
    expect(max).toBe(30);
    expect(got).toBeGreaterThanOrEqual(18);
  });

  it("scores at least 25/30 on a freshly init'd repo (regression bar)", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code,codex,opencode --name r-test`, {
      stdio: "pipe",
    });
    const out = execSync(`node ${CLI} doctor ${dir}`, { encoding: "utf8" });
    const m = out.match(/Total:\s+(\d+)\/30/);
    expect(m).toBeTruthy();
    expect(Number.parseInt(m![1]!, 10)).toBeGreaterThanOrEqual(25);
  });
});

describe("harness inject", () => {
  it("produces a dry-run plan without writing", () => {
    const dir = makeTmp();
    execSync(`mkdir -p ${dir} && echo '{"name":"old"}' > ${dir}/package.json`);

    const out = execSync(`node ${CLI} inject ${dir}`, { encoding: "utf8" });
    expect(out).toContain("Planned changes");
    expect(out).toContain("Dry-run only");
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(false);
  });

  it("--apply --force actually writes files and includes FEATURES.md", () => {
    const dir = makeTmp();
    execSync(`mkdir -p ${dir} && echo '{"name":"old"}' > ${dir}/package.json`);
    execSync(`node ${CLI} inject ${dir} --apply --force`, { stdio: "pipe" });
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "Makefile"))).toBe(true);
    expect(existsSync(join(dir, ".harnessrc.json"))).toBe(true);
    expect(existsSync(join(dir, "FEATURES.md"))).toBe(true);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("old");
  });

  it("preserves user edits in if-missing files (CONSTRAINTS.md, docs/, scripts/, etc.)", () => {
    const dir = makeTmp();
    execSync(`mkdir -p ${dir} && echo '{"name":"old"}' > ${dir}/package.json`);
    // First inject: scaffold
    execSync(`node ${CLI} inject ${dir} --apply --force`, { stdio: "pipe" });
    // Simulate user editing several "if-missing" files
    const userMark = "# USER-EDITED — must not be overwritten";
    const filesToEdit = [
      "CONSTRAINTS.md",
      "docs/architecture.md",
      "docs/decisions.md",
      "docs/testing-standards.md",
      "FEATURES.md",
      "QUALITY.md",
      "scripts/exit-clean.sh",
      "scripts/session-init.sh",
      "scripts/validate-feature.sh",
      "scripts/e2e-check.sh",
      "docs/templates/sprint-contract.md",
      "docs/templates/rubric.md",
      ".github/workflows/harness.yml",
    ];
    const { writeFileSync } = require("node:fs");
    for (const f of filesToEdit) {
      writeFileSync(join(dir, f), `${userMark}\n`);
    }
    // Second inject (simulates v0.1.x → v0.2.0 upgrade) — must NOT clobber user's content
    const out = execSync(`node ${CLI} inject ${dir} --apply --force`, {
      encoding: "utf8",
    });
    expect(out).toContain("Planned changes");
    for (const f of filesToEdit) {
      const after = readFileSync(join(dir, f), "utf8");
      expect(after).toContain(userMark);
    }
    // The plan should show SKIP for these
    for (const f of filesToEdit) {
      const escaped = f.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      expect(out).toMatch(new RegExp(`SKIP\\s+${escaped}`));
    }
  });
});

describe("harness CLI surface (v0.2.0)", () => {
  it("only registers init / inject / doctor / clean", () => {
    const out = execSync(`node ${CLI} --help`, { encoding: "utf8" });
    expect(out).toContain("init");
    expect(out).toContain("inject");
    expect(out).toContain("doctor");
    expect(out).toContain("clean");
    // removed in v0.2.0 — must not appear as a *registered* command
    // (i.e. at the start of an indented help line, not just substring in a description):
    expect(out).not.toMatch(/^\s+feature-(add|list|start|done|block)\b/m);
    expect(out).not.toMatch(/^\s+session-(start|end)\b/m);
    expect(out).not.toMatch(/^\s+prompt\b/m);
  });

  it("typo'd command exits non-zero with a 'did you mean' suggestion", () => {
    let combined = "";
    let exit = 0;
    try {
      execSync(`node ${CLI} docter`, { encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      const err = e as { status: number; stderr: Buffer | string; stdout: Buffer | string };
      exit = err.status;
      const errStr =
        typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString("utf8") ?? "");
      const outStr =
        typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString("utf8") ?? "");
      combined = errStr + outStr;
    }
    expect(exit).toBeGreaterThan(0);
    expect(combined).toMatch(/Unknown command/);
    expect(combined).toMatch(/Did you mean: doctor/);
  });

  it("a removed v0.1.x command (e.g. `prompt`) prints the v0.2.0 migration hint", () => {
    let combined = "";
    let exit = 0;
    try {
      execSync(`node ${CLI} prompt`, { encoding: "utf8", stdio: "pipe" });
    } catch (e) {
      const err = e as { status: number; stderr: Buffer | string; stdout: Buffer | string };
      exit = err.status;
      const errStr =
        typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString("utf8") ?? "");
      const outStr =
        typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString("utf8") ?? "");
      combined = errStr + outStr;
    }
    expect(exit).toBeGreaterThan(0);
    expect(combined).toMatch(/removed in v0\.2\.0/);
    expect(combined).toMatch(/FEATURES\.md/);
  });

  it("--help exits 0 with usage block", () => {
    const out = execSync(`node ${CLI} --help`, { encoding: "utf8" });
    expect(out).toContain("Usage:");
    expect(out).toContain("init");
    expect(out).toContain("doctor");
  });

  it("no args exits 0 with usage block", () => {
    const out = execSync(`node ${CLI}`, { encoding: "utf8" });
    expect(out).toContain("Usage:");
  });
});

describe("harness bootstrap prompt (printed at init/inject; cat the file later)", () => {
  it("init prints the bootstrap prompt with copy markers and saves it", () => {
    const dir = makeTmp();
    const out = execSync(
      `node ${CLI} init ${dir} --yes --agents claude-code --name p-test --lang en`,
      { encoding: "utf8" },
    );
    expect(out).toContain("BEGIN PROMPT");
    expect(out).toContain("END PROMPT");
    expect(out).toContain("You are working in a repo that just had harness-kit initialized");
    expect(existsSync(join(dir, ".harness/bootstrap-prompt.txt"))).toBe(true);
  });

  it("--lang zh prints the Chinese version", () => {
    const dir = makeTmp();
    const out = execSync(
      `node ${CLI} init ${dir} --yes --agents claude-code --name p-zh --lang zh`,
      { encoding: "utf8" },
    );
    expect(out).toContain("你现在在一个刚被 harness-kit 初始化过的仓库里工作");
    const saved = readFileSync(join(dir, ".harness/bootstrap-prompt.txt"), "utf8");
    expect(saved).toContain("你现在在一个刚被");
  });

  it("inject --apply also prints and saves the bootstrap prompt", () => {
    const dir = makeTmp();
    execSync(`mkdir -p ${dir} && echo '{"name":"old"}' > ${dir}/package.json`);
    const out = execSync(`node ${CLI} inject ${dir} --apply --force --lang en`, {
      encoding: "utf8",
    });
    expect(out).toContain("BEGIN PROMPT");
    expect(out).toContain("END PROMPT");
    expect(existsSync(join(dir, ".harness/bootstrap-prompt.txt"))).toBe(true);
  });

  it("the saved copy contains the latest v0.2.0 step 7 (no more `harness session end`)", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name p-fresh --lang en`, {
      stdio: "pipe",
    });
    const saved = readFileSync(join(dir, ".harness/bootstrap-prompt.txt"), "utf8");
    expect(saved).not.toMatch(/harness session/);
    expect(saved).not.toMatch(/harness feature/);
    expect(saved).toMatch(/bash scripts\/exit-clean\.sh/);
  });
});
