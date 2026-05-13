import { join } from "node:path";
import type { DoctorReport } from "../types.js";
import { detectAgents, detectExisting } from "../utils/detect.js";
import { pathExists, readText } from "../utils/fs.js";
import { c, log } from "../utils/log.js";

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
    log.raw(`  ${label.padEnd(16)} ${color(bar)} ${color(`${val}/5`)}`);
  };

  // 1. Instructions subsystem (AGENTS.md + docs/)
  let instructionsScore = 0;
  if (existing.hasAgentsMd) instructionsScore += 2;
  if (await pathExists(join(cwd, "CONSTRAINTS.md"))) instructionsScore += 1;
  if (await pathExists(join(cwd, "docs/architecture.md"))) instructionsScore += 1;
  if (await pathExists(join(cwd, "docs/decisions.md"))) instructionsScore += 1;
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

  // 2. State subsystem
  let stateScore = 0;
  if (existing.hasProgress) stateScore += 2;
  if (existing.hasFeatures) stateScore += 2;
  if (await pathExists(join(cwd, "QUALITY.md"))) stateScore += 1;
  if (!existing.hasFeatures) notes.push("Missing features.json — no harness spine (L08).");
  if (!existing.hasProgress) notes.push("Missing PROGRESS.md — sessions cannot hand off (L05).");

  // 3. Feedback subsystem
  let feedbackScore = 0;
  if (existing.hasMakefile) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    if (/^check\s*:/m.test(mk)) feedbackScore += 2;
    if (/^test\s*:/m.test(mk)) feedbackScore += 1;
    if (/^lint\s*:/m.test(mk)) feedbackScore += 1;
  } else {
    notes.push("Missing Makefile — no canonical verification commands (L02).");
  }
  if (await pathExists(join(cwd, "scripts/exit-clean.sh"))) feedbackScore += 1;

  // 4. Observability subsystem
  let obsScore = 0;
  if (await pathExists(join(cwd, "docs/templates/sprint-contract.md"))) obsScore += 2;
  if (await pathExists(join(cwd, "docs/templates/rubric.md"))) obsScore += 2;
  if (await pathExists(join(cwd, ".harness/traces"))) obsScore += 1;

  // 5. Governance subsystem
  let govScore = 0;
  if (await pathExists(join(cwd, "CONSTRAINTS.md"))) govScore += 2;
  if (await pathExists(join(cwd, ".github/workflows/harness.yml"))) govScore += 2;
  if (await pathExists(join(cwd, ".harnessrc.json"))) govScore += 1;

  log.step("Subsystem scores");
  score("instructions", instructionsScore);
  score("state", stateScore);
  score("feedback", feedbackScore);
  score("observability", obsScore);
  score("governance", govScore);

  // Cold-start test
  log.step("Cold-start test (L03)");
  const cold = await coldStartTest(cwd);
  for (const [q, ok] of Object.entries(cold.can_answer)) {
    log.raw(`  ${ok ? c.green("✓") : c.red("✗")} ${q}`);
  }

  const total = instructionsScore + stateScore + feedbackScore + obsScore + govScore + cold.score;
  const max = 25 + 5;

  log.blank();
  log.step(`Total: ${c.bold(`${total}/${max}`)} (${Math.round((total / max) * 100)}%)`);

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
      observability: obsScore,
      governance: govScore,
    },
    cold_start: cold,
    total,
    notes,
  };
}

async function coldStartTest(cwd: string): Promise<DoctorReport["cold_start"]> {
  const can_answer: Record<string, boolean> = {};
  // Heuristics: a cold-start agent should be able to derive these from the repo alone.

  // Q1: What is this system?
  can_answer["What is this system?"] =
    (await pathExists(join(cwd, "README.md"))) || (await pathExists(join(cwd, "AGENTS.md")));

  // Q2: How is it organized?
  can_answer["How is it organized?"] =
    (await pathExists(join(cwd, "docs/architecture.md"))) ||
    (await pathExists(join(cwd, "ARCHITECTURE.md")));

  // Q3: How do I run it?
  if (await pathExists(join(cwd, "Makefile"))) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    can_answer["How do I run it?"] = /^(setup|dev|run|start)\s*:/m.test(mk);
  } else {
    can_answer["How do I run it?"] = false;
  }

  // Q4: How do I verify it?
  if (await pathExists(join(cwd, "Makefile"))) {
    const mk = await readText(join(cwd, "Makefile")).catch(() => "");
    can_answer["How do I verify it?"] = /^(check|test)\s*:/m.test(mk);
  } else {
    can_answer["How do I verify it?"] = false;
  }

  // Q5: What's the current progress?
  can_answer["What is the current progress?"] =
    (await pathExists(join(cwd, "PROGRESS.md"))) || (await pathExists(join(cwd, "features.json")));

  const score = Object.values(can_answer).filter(Boolean).length;
  return { can_answer, score };
}
