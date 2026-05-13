import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { c, log } from "../utils/log.js";

interface CleanResult {
  passed: boolean;
  checks: { name: string; ok: boolean; detail?: string }[];
}

/**
 * L12 exit-clean: 5-dimension session-end check.
 * 1. build passes
 * 2. tests pass
 * 3. progress is recorded
 * 4. no stale artifacts (debug logs, .tmp, leftover scratch)
 * 5. standard startup path is callable
 */
export async function runClean(cwd: string): Promise<CleanResult> {
  log.banner("clean", "L12 exit-clean: 5-dimension session-end check.");

  const checks: CleanResult["checks"] = [];
  const have = (cmd: string) => {
    try {
      execSync(`${cmd} >/dev/null 2>&1`, { cwd, stdio: "ignore" });
      return true;
    } catch {
      return false;
    }
  };

  // 1. build
  const buildOk = !existsSync(join(cwd, "Makefile")) || have("make build");
  checks.push({ name: "build", ok: buildOk });

  // 2. test
  const testOk = !existsSync(join(cwd, "Makefile")) || have("make test");
  checks.push({ name: "tests", ok: testOk });

  // 3. progress recorded — PROGRESS.md exists and was updated within 24h
  const progressPath = join(cwd, "PROGRESS.md");
  let progressOk = existsSync(progressPath);
  let progressDetail: string | undefined;
  if (progressOk) {
    const ageHrs = (Date.now() - statSync(progressPath).mtimeMs) / 3_600_000;
    if (ageHrs > 24) {
      progressOk = false;
      progressDetail = `last updated ${Math.round(ageHrs)}h ago`;
    }
  }
  checks.push({ name: "progress", ok: progressOk, detail: progressDetail });

  // 4. stale artifacts — look for common smells
  const stale = findStale(cwd);
  checks.push({
    name: "no-stale-artifacts",
    ok: stale.length === 0,
    detail:
      stale.length > 0
        ? `${stale.length} suspect file(s): ${stale.slice(0, 3).join(", ")}`
        : undefined,
  });

  // 5. startup path
  const startupOk = !existsSync(join(cwd, "Makefile")) || have("make -n setup");
  checks.push({ name: "startup-path", ok: startupOk });

  log.step("Exit-clean checks");
  for (const ch of checks) {
    const tag = ch.ok ? c.green("PASS") : c.red("FAIL");
    log.raw(`  ${tag}  ${ch.name}${ch.detail ? c.dim(`  (${ch.detail})`) : ""}`);
  }

  const passed = checks.every((ch) => ch.ok);
  log.blank();
  if (passed) log.ok("Clean. Safe to end the session.");
  else log.warn("Not clean. Fix the failing checks before handing off to the next session.");
  log.blank();

  return { passed, checks };
}

function findStale(cwd: string): string[] {
  const suspects: string[] = [];
  const patterns = [/^debug-.*\.log$/, /\.tmp$/, /\.swp$/, /^scratch-/, /^TODO\..*$/];
  const skipDirs = new Set([
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    ".next",
    ".venv",
    "__pycache__",
    ".pytest_cache",
  ]);

  function walk(dir: string, depth: number) {
    if (depth > 3) return;
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      return;
    }
    for (const e of entries) {
      if (skipDirs.has(e)) continue;
      const full = join(dir, e);
      let st: ReturnType<typeof statSync>;
      try {
        st = statSync(full);
      } catch {
        continue;
      }
      if (st.isDirectory()) walk(full, depth + 1);
      else if (patterns.some((re) => re.test(e))) suspects.push(full.replace(`${cwd}/`, ""));
    }
  }
  walk(cwd, 0);
  return suspects;
}
