import { execSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";

const ROOT = new URL("..", import.meta.url).pathname;
const CLI = join(ROOT, "dist", "cli.cjs");

let tmpDirs: string[] = [];

function makeTmp(): string {
  const d = mkdtempSync(join(tmpdir(), "harness-kit-validate-"));
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

function scaffold(): string {
  const dir = makeTmp();
  execSync(`node ${CLI} init ${dir} --yes --agents claude-code --name vf-test`, {
    stdio: "pipe",
  });
  return dir;
}

function writeFeatures(dir: string, features: object[]): void {
  writeFileSync(
    join(dir, "features.json"),
    `${JSON.stringify({ version: "1", wip_limit: 1, features }, null, 2)}\n`,
  );
}

function runValidate(
  dir: string,
  args: string[],
): { exit: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(`bash scripts/validate-feature.sh ${args.join(" ")}`, {
      cwd: dir,
      stdio: "pipe",
      encoding: "utf8",
    });
    return { exit: 0, stdout, stderr: "" };
  } catch (e) {
    const err = e as { status?: number; stdout?: Buffer | string; stderr?: Buffer | string };
    const stdout =
      (typeof err.stdout === "string" ? err.stdout : (err.stdout?.toString() ?? "")) || "";
    const stderr =
      (typeof err.stderr === "string" ? err.stderr : (err.stderr?.toString() ?? "")) || "";
    return { exit: err.status ?? 1, stdout, stderr };
  }
}

describe("validate-feature.sh — auto_verify branch", () => {
  it("runs auto_verify and exits 0 when the command succeeds", () => {
    const dir = scaffold();
    writeFeatures(dir, [
      {
        id: "F01",
        behavior: "trivial",
        verification: "All tests pass.",
        auto_verify: "true", // shell builtin: always exits 0
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F01"]);
    expect(res.exit).toBe(0);
    expect(res.stdout + res.stderr).toMatch(/auto-verified/);
  });

  it("runs auto_verify and exits non-zero when the command fails", () => {
    const dir = scaffold();
    writeFeatures(dir, [
      {
        id: "F02",
        behavior: "trivial",
        verification: "All tests pass.",
        auto_verify: "false", // shell builtin: always exits 1
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F02"]);
    expect(res.exit).toBeGreaterThan(0);
    expect(res.stdout + res.stderr).toMatch(/failed auto_verify/);
  });

  it("auto_verify can be ANY launcher invocation, not just shell-y commands", () => {
    // Demonstrates that auto_verify is treated as opaque "launch this".
    // We use python here to prove no shell-syntax assumptions.
    const dir = scaffold();
    writeFeatures(dir, [
      {
        id: "F03",
        behavior: "demo",
        verification: "exit 0 on success.",
        auto_verify: 'python3 -c "import sys; sys.exit(0)"',
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F03"]);
    expect(res.exit).toBe(0);
  });
});

describe("validate-feature.sh — description branch (no auto_verify)", () => {
  it("prints description and exits non-zero when --ack is missing", () => {
    const dir = scaffold();
    writeFeatures(dir, [
      {
        id: "F04",
        behavior: "user can drag a card from A to B",
        verification:
          "Open the kanban view, drag any card from column A to column B, refresh the page, the card stays in column B.",
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F04"]);
    expect(res.exit).toBeGreaterThan(0);
    expect(res.stdout + res.stderr).toMatch(/manual verification required/);
    expect(res.stdout + res.stderr).toMatch(/--ack/);
    // Ensure NO ack file got written without --ack
    expect(existsSync(join(dir, ".harness/feature-acks/F04.txt"))).toBe(false);
  });

  it("--ack writes a timestamped ack file with commit sha and exits 0", () => {
    const dir = scaffold();
    // Initialize a git repo so SHA capture works
    execSync(
      "git init -q && git add -A && git -c user.email=t@t -c user.name=t commit -q -m init",
      {
        cwd: dir,
        stdio: "pipe",
      },
    );
    writeFeatures(dir, [
      {
        id: "F05",
        behavior: "dark mode persists",
        verification: "Toggle dark mode, reload, dark theme still active.",
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F05", "--ack"]);
    expect(res.exit).toBe(0);
    const ackPath = join(dir, ".harness/feature-acks/F05.txt");
    expect(existsSync(ackPath)).toBe(true);
    const ack = readFileSync(ackPath, "utf8");
    expect(ack).toMatch(/^ack_at: \d{4}-\d{2}-\d{2}T/);
    expect(ack).toMatch(/^ack_by: /m);
    expect(ack).toMatch(/^commit: /m);
    expect(ack).toContain("dark mode persists");
    expect(ack).toContain("Toggle dark mode, reload, dark theme still active.");
    expect(res.stdout + res.stderr).toMatch(/ack recorded at \.harness\/feature-acks\/F05\.txt/);
  });

  it("a previous ack is shown on subsequent unack'd runs (informational, still exits non-zero)", () => {
    const dir = scaffold();
    execSync(
      "git init -q && git add -A && git -c user.email=t@t -c user.name=t commit -q -m init",
      {
        cwd: dir,
        stdio: "pipe",
      },
    );
    writeFeatures(dir, [
      {
        id: "F06",
        behavior: "demo",
        verification: "Manual flow X.",
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    runValidate(dir, ["F06", "--ack"]);
    const second = runValidate(dir, ["F06"]);
    expect(second.exit).toBeGreaterThan(0);
    expect(second.stdout + second.stderr).toMatch(/a previous ack exists/);
  });
});

describe("validate-feature.sh — error cases", () => {
  it("rejects unknown feature id", () => {
    const dir = scaffold();
    writeFeatures(dir, []);
    const res = runValidate(dir, ["F99"]);
    expect(res.exit).toBeGreaterThan(0);
    expect(res.stdout + res.stderr).toMatch(/not found in features\.json/);
  });

  it("rejects feature with no verification field", () => {
    const dir = scaffold();
    writeFeatures(dir, [
      {
        id: "F07",
        behavior: "missing verification",
        state: "active",
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      },
    ]);
    const res = runValidate(dir, ["F07"]);
    expect(res.exit).toBeGreaterThan(0);
    expect(res.stdout + res.stderr).toMatch(/no verification field/);
  });
});
