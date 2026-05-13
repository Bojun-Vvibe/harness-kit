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

    // Spot-check files from each subsystem
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

    // per-agent pointers
    expect(existsSync(join(dir, "CLAUDE.md"))).toBe(true);
    expect(existsSync(join(dir, ".codex/AGENTS.md"))).toBe(true);
    expect(existsSync(join(dir, ".opencode/AGENTS.md"))).toBe(true);

    // Variable substitution worked, no leftover ${VAR}
    const agents = readFileSync(join(dir, "AGENTS.md"), "utf8");
    expect(agents).toContain("test-proj");
    expect(agents).not.toMatch(/\$\{[A-Z_]+\}/);

    // .harnessrc.json is well-formed and stack-free
    const cfg = JSON.parse(readFileSync(join(dir, ".harnessrc.json"), "utf8"));
    expect(cfg.project_name).toBe("test-proj");
    expect(cfg).not.toHaveProperty("stack");
    expect(cfg.agents).toEqual(expect.arrayContaining(["claude-code", "codex", "opencode"]));

    // features.json starts with WIP=1 + empty
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

    // Trying to start F02 while F01 is active → must fail
    let blocked = false;
    try {
      execSync(`node ${CLI} feature start F02`, { stdio: "pipe", cwd: dir });
    } catch {
      blocked = true;
    }
    expect(blocked).toBe(true);

    // feature done F01 with verification "true" should succeed
    execSync(`node ${CLI} feature done F01`, { stdio: "pipe", cwd: dir });
    const feats = JSON.parse(readFileSync(join(dir, "features.json"), "utf8"));
    const f01 = feats.features.find((f: { id: string }) => f.id === "F01");
    expect(f01.state).toBe("passing");
  });
});
