import { execSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { c, log } from "../utils/log.js";

const PROGRESS = "PROGRESS.md";

/**
 * L06 session-init: read PROGRESS.md, sanity-check tooling, print a
 * compact "what was the last agent doing" briefing.
 */
export async function runSessionStart(cwd: string): Promise<void> {
  log.banner("session start", "L06 init phase: read state, verify tooling, print briefing.");

  const progressPath = join(cwd, PROGRESS);
  if (!existsSync(progressPath)) {
    log.warn(`No ${PROGRESS}. Run \`harness init\` or \`harness inject\` first.`);
    return;
  }

  // Sanity check
  log.step("Tooling sanity check");
  if (existsSync(join(cwd, "Makefile"))) {
    safeRun(cwd, "make -n setup", "  setup target reachable");
    safeRun(cwd, "make -n test", "  test target reachable");
    safeRun(cwd, "make -n check", "  check target reachable");
  } else {
    log.warn("  no Makefile — feedback subsystem missing (L02)");
  }

  // Briefing from PROGRESS.md
  log.step(`Briefing (from ${PROGRESS})`);
  const txt = readFileSync(progressPath, "utf8");
  log.raw(indent(txt.trim().slice(0, 2000), "  "));
  if (txt.length > 2000) log.dim("  ...(truncated; read the full PROGRESS.md)");

  // Git state
  log.step("Git state");
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", { cwd }).toString().trim();
    const sha = execSync("git rev-parse --short HEAD", { cwd }).toString().trim();
    const dirty = execSync("git status --porcelain", { cwd }).toString().trim();
    log.raw(`  branch: ${c.cyan(branch)}  HEAD: ${c.cyan(sha)}`);
    log.raw(`  working tree: ${dirty ? c.yellow("dirty") : c.green("clean")}`);
  } catch {
    log.warn("  not a git repo");
  }

  log.blank();
  log.ok("Session ready. Pick the next feature with `harness feature list`.");
  log.blank();
}

/**
 * L12 session-end: append summary to PROGRESS.md and run exit-clean.
 */
export async function runSessionEnd(cwd: string, summary?: string): Promise<void> {
  log.banner("session end", "L12 clean state: stamp PROGRESS, run exit-clean.");

  const progressPath = join(cwd, PROGRESS);
  if (!existsSync(progressPath)) {
    log.warn(`No ${PROGRESS}. Skipping stamp.`);
  } else {
    const stamp =
      `\n## Session ${new Date().toISOString()}\n` +
      `${summary ? summary : "(no summary supplied — fill in what you did)"}\n`;
    const cur = readFileSync(progressPath, "utf8");
    writeFileSync(progressPath, `${cur.trimEnd()}\n${stamp}`);
    log.ok(`Stamped ${PROGRESS}.`);
  }

  // Run exit-clean script if present
  const script = join(cwd, "scripts/exit-clean.sh");
  if (existsSync(script)) {
    log.step("Running scripts/exit-clean.sh");
    try {
      execSync("bash scripts/exit-clean.sh", { cwd, stdio: "inherit" });
      log.ok("Exit-clean passed.");
    } catch {
      log.err("Exit-clean failed. Fix issues before next handoff.");
      process.exit(1);
    }
  } else {
    log.warn("No scripts/exit-clean.sh; running built-in clean instead.");
    const { runClean } = await import("./clean.js");
    const res = await runClean(cwd);
    if (!res.passed) process.exit(1);
  }
}

function safeRun(cwd: string, cmd: string, label: string): void {
  try {
    execSync(`${cmd} >/dev/null 2>&1`, { cwd });
    log.ok(label);
  } catch {
    log.warn(`${label} ${c.gray("(not reachable)")}`);
  }
}

function indent(text: string, prefix: string): string {
  return text
    .split("\n")
    .map((l) => `${prefix}${l}`)
    .join("\n");
}
