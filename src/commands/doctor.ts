import { join } from "node:path";
import type { DoctorReport } from "../types.js";
import { detectAgents, detectExisting } from "../utils/detect.js";
import { pathExists, readText } from "../utils/fs.js";
import { c, log } from "../utils/log.js";

/**
 * 5-subsystem health score, aligned with the canonical L02 split:
 *   指令 instructions / 工具 tools / 环境 environment / 状态 state / 反馈 feedback
 *
 * Same labels as `harness view` so users learn one taxonomy.
 */
export async function runDoctor(cwd: string): Promise<DoctorReport> {
  log.banner("doctor", "5-subsystem health score + cold-start test.");

  const existing = await detectExisting(cwd);
  const agents = await detectAgents(cwd);

  log.dim(`agents=${agents.join(",") || "(none)"}`);
  log.blank();

  const notes: string[] = [];
  const score = (label: string, val: number) => {
    const bar = "█".repeat(val) + "░".repeat(5 - val);
    const color = val >= 4 ? c.green : val >= 2 ? c.yellow : c.red;
    log.raw(`  ${label.padEnd(22)} ${color(bar)} ${color(`${val}/5`)}`);
  };

  // ── 指令 instructions ────────────────────────────────────────────────
  // What the agent reads to know what to do.
  let instructionsScore = 0;
  if (existing.hasAgentsMd) instructionsScore += 2;
  if (await pathExists(join(cwd, "CONSTRAINTS.md"))) instructionsScore += 1;
  if (await pathExists(join(cwd, "FEATURES.md"))) instructionsScore += 1;
  if (
    (await pathExists(join(cwd, "docs/architecture.md"))) ||
    (await pathExists(join(cwd, "docs/decisions.md"))) ||
    (await pathExists(join(cwd, "docs/testing-standards.md")))
  ) {
    instructionsScore += 1;
  }
  if (existing.hasAgentsMd) {
    const txt = await readText(join(cwd, "AGENTS.md")).catch(() => "");
    const lines = txt.split("\n").length;
    if (lines > 400) {
      notes.push(`AGENTS.md is ${lines} lines — consider splitting (L04 mid-context loss).`);
      instructionsScore = Math.max(1, instructionsScore - 1);
    }
  } else {
    notes.push("Missing AGENTS.md — agents have no entry point (L02/L03).");
  }
  if (!(await pathExists(join(cwd, "FEATURES.md")))) {
    notes.push("Missing FEATURES.md — agents have no rulebook for editing features.json (L08).");
  }

  // ── 工具 tools ──────────────────────────────────────────────────────
  // Callable surface — Makefile + bash scripts the agent uses to operate.
  let toolsScore = 0;
  if (existing.hasMakefile) toolsScore += 2;
  if (await pathExists(join(cwd, "scripts/exit-clean.sh"))) toolsScore += 1;
  if (await pathExists(join(cwd, "scripts/session-init.sh"))) toolsScore += 1;
  if (await pathExists(join(cwd, "scripts/validate-feature.sh"))) toolsScore += 1;
  if (existing.hasMakefile) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    if (/TODO: replace with your/.test(mk)) {
      notes.push("Makefile still has placeholder TODO targets — fill in real commands.");
      toolsScore = Math.max(1, toolsScore - 1);
    }
  } else {
    notes.push("Missing Makefile — no canonical command surface (L02).");
  }

  // ── 环境 environment ────────────────────────────────────────────────
  // Runtime context — stack manifests, version files, CI workflow.
  let environmentScore = 0;
  const stackChecks = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
    "composer.json",
    "mix.exs",
    "build.gradle",
    "pom.xml",
  ];
  let stackFound = false;
  for (const f of stackChecks) {
    if (await pathExists(join(cwd, f))) {
      stackFound = true;
      break;
    }
  }
  if (stackFound) environmentScore += 1;
  else notes.push("No stack manifest detected (package.json / pyproject.toml / etc).");
  if (await pathExists(join(cwd, ".gitignore"))) environmentScore += 1;
  else notes.push("Missing .gitignore — runtime artifacts may leak into commits.");
  if (await pathExists(join(cwd, ".github/workflows/harness.yml"))) environmentScore += 2;
  else notes.push("Missing CI workflow — `make check` is not enforced on push/PR.");
  if (await pathExists(join(cwd, ".harnessrc.json"))) environmentScore += 1;

  // ── 状态 state ──────────────────────────────────────────────────────
  // Persistent project state — diary, feature spine, quality grades.
  let stateScore = 0;
  if (existing.hasProgress) stateScore += 2;
  else notes.push("Missing PROGRESS.md — sessions cannot hand off (L05).");
  if (existing.hasFeatures) stateScore += 2;
  else notes.push("Missing features.json — no harness spine (L08).");
  if (await pathExists(join(cwd, "QUALITY.md"))) stateScore += 1;

  // ── 反馈 feedback ───────────────────────────────────────────────────
  // Verification + evaluation signals — make check, e2e, sprint-contract, rubric.
  let feedbackScore = 0;
  if (existing.hasMakefile) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    if (/^check\s*:/m.test(mk)) feedbackScore += 2;
    if (/^test\s*:/m.test(mk)) feedbackScore += 1;
    if (/^lint\s*:/m.test(mk)) feedbackScore += 1;
  }
  if (await pathExists(join(cwd, "docs/templates/sprint-contract.md"))) feedbackScore += 0.5;
  if (await pathExists(join(cwd, "docs/templates/rubric.md"))) feedbackScore += 0.5;
  feedbackScore = Math.min(5, Math.round(feedbackScore));

  log.step("Subsystem scores (指令 / 工具 / 环境 / 状态 / 反馈)");
  score("指令 instructions", instructionsScore);
  score("工具 tools", toolsScore);
  score("环境 environment", environmentScore);
  score("状态 state", stateScore);
  score("反馈 feedback", feedbackScore);

  // ── cold-start test ─────────────────────────────────────────────────
  log.step("Cold-start test (L03)");
  const cold = await coldStartTest(cwd);
  for (const [q, ok] of Object.entries(cold.can_answer)) {
    log.raw(`  ${ok ? c.green("✓") : c.red("✗")} ${q}`);
  }

  const total =
    instructionsScore + toolsScore + environmentScore + stateScore + feedbackScore + cold.score;
  const max = 30;

  log.blank();
  log.step(`Total: ${c.bold(`${total}/${max}`)} (${Math.round((total / max) * 100)}%)`);
  log.dim("Run `harness view` for an interactive dashboard with the same 5 subsystems.");

  if (notes.length > 0) {
    log.step("Notes");
    for (const n of notes) log.raw(`  ${c.yellow("•")} ${n}`);
  } else {
    log.ok("No issues found.");
  }
  log.blank();

  return {
    scores: {
      instructions: instructionsScore,
      state: stateScore,
      feedback: feedbackScore,
      observability: 0, // legacy field; kept to preserve type. Use `tools` + `environment`.
      governance: 0,
    },
    cold_start: cold,
    total,
    notes,
  };
}

async function coldStartTest(cwd: string): Promise<DoctorReport["cold_start"]> {
  const can_answer: Record<string, boolean> = {};

  can_answer["What is this system?"] =
    (await pathExists(join(cwd, "README.md"))) || (await pathExists(join(cwd, "AGENTS.md")));

  can_answer["How is it organized?"] =
    (await pathExists(join(cwd, "docs/architecture.md"))) ||
    (await pathExists(join(cwd, "ARCHITECTURE.md")));

  if (await pathExists(join(cwd, "Makefile"))) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    can_answer["How do I run it?"] = /^(setup|dev|run|start)\s*:/m.test(mk);
  } else {
    can_answer["How do I run it?"] = false;
  }

  if (await pathExists(join(cwd, "Makefile"))) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    can_answer["How do I verify it?"] = /^(check|test)\s*:/m.test(mk);
  } else {
    can_answer["How do I verify it?"] = false;
  }

  can_answer["What is the current progress?"] =
    (await pathExists(join(cwd, "PROGRESS.md"))) || (await pathExists(join(cwd, "features.json")));

  const score = Object.values(can_answer).filter(Boolean).length;
  return { can_answer, score };
}
