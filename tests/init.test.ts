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
  // Ensure CLI is built. Fail loudly if not.
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
    expect(existsSync(join(dir, "QUALITY.md"))).toBe(true);
    expect(existsSync(join(dir, "Makefile"))).toBe(true);
    expect(existsSync(join(dir, "scripts/exit-clean.sh"))).toBe(true);
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

  it("--apply --force actually writes files", () => {
    const dir = makeTmp();
    execSync(`mkdir -p ${dir} && echo '{"name":"old"}' > ${dir}/package.json`);
    execSync(`node ${CLI} inject ${dir} --apply --force`, { stdio: "pipe" });
    expect(existsSync(join(dir, "AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, "Makefile"))).toBe(true);
    expect(existsSync(join(dir, ".harnessrc.json"))).toBe(true);
    const pkg = JSON.parse(readFileSync(join(dir, "package.json"), "utf8"));
    expect(pkg.name).toBe("old");
  });
});

describe("harness feature", () => {
  it("add then list shows the feature; WIP=1 is enforced", () => {
    const dir = makeTmp();
    execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name f-test`, { stdio: "pipe" });
    execSync(`node ${CLI} feature add --id F01 --behavior "first thing" --verification "true"`, {
      stdio: "pipe",
      cwd: dir,
    });
    execSync(`node ${CLI} feature add --id F02 --behavior "second thing" --verification "true"`, {
      stdio: "pipe",
      cwd: dir,
    });
    execSync(`node ${CLI} feature start F01`, { stdio: "pipe", cwd: dir });

    let blocked = false;
    try {
      execSync(`node ${CLI} feature start F02`, { stdio: "pipe", cwd: dir });
    } catch {
      blocked = true;
    }
    expect(blocked).toBe(true);

    execSync(`node ${CLI} feature done F01`, { stdio: "pipe", cwd: dir });
    const feats = JSON.parse(readFileSync(join(dir, "features.json"), "utf8"));
    const f01 = feats.features.find((f: { id: string }) => f.id === "F01");
    expect(f01.state).toBe("passing");
  });
});

describe("harness CLI: unknown command handling", () => {
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
