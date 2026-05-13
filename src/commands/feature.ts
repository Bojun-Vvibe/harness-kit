import { join } from "node:path";
import * as p from "@clack/prompts";
import type { Feature, FeatureState, FeaturesFile } from "../types.js";
import { pathExists, readText, writeText } from "../utils/fs.js";
import { c, log } from "../utils/log.js";

const FILE = "features.json";

export async function runFeatureAdd(
  cwd: string,
  args: { id?: string; behavior?: string; verification?: string },
): Promise<void> {
  const file = await loadOrInit(cwd);

  const id = args.id ?? (await ask("Feature id (e.g., F03)?", suggestNextId(file)));
  if (file.features.some((f) => f.id === id)) {
    log.err(`Feature ${id} already exists.`);
    process.exit(1);
  }
  const behavior =
    args.behavior ?? (await ask("Behavior (one sentence; what user-visible thing happens)?"));
  const verification =
    args.verification ??
    (await ask(
      "Verification command (must produce exit 0 when feature is truly done)?",
      "make test",
    ));

  if (!behavior.trim() || !verification.trim()) {
    log.err("behavior and verification are both required.");
    process.exit(1);
  }

  const now = new Date().toISOString();
  const feat: Feature = {
    id,
    behavior: behavior.trim(),
    verification: verification.trim(),
    state: "not_started",
    created_at: now,
    updated_at: now,
  };
  file.features.push(feat);
  await save(cwd, file);
  log.ok(`Added ${c.bold(id)} ${c.dim("(state=not_started)")}`);
}

export async function runFeatureList(cwd: string): Promise<void> {
  const file = await loadOrInit(cwd);
  if (file.features.length === 0) {
    log.warn("No features yet. Use `harness feature add` to create one.");
    return;
  }
  log.banner("features", `wip_limit=${file.wip_limit}  total=${file.features.length}`);
  for (const f of file.features) {
    log.raw(`  ${stateBadge(f.state)} ${c.bold(f.id)}  ${f.behavior}`);
    log.raw(`         ${c.dim(`verify: ${f.verification}`)}`);
  }
  log.blank();
}

export async function runFeatureStart(cwd: string, id: string): Promise<void> {
  const file = await loadOrInit(cwd);
  const f = file.features.find((x) => x.id === id);
  if (!f) {
    log.err(`Feature ${id} not found.`);
    process.exit(1);
  }
  // WIP=1 enforcement
  const active = file.features.filter((x) => x.state === "active");
  if (active.length >= file.wip_limit && !active.some((x) => x.id === id)) {
    log.err(
      `WIP limit (${file.wip_limit}) reached. Currently active: ${active
        .map((x) => x.id)
        .join(", ")}. Finish one before starting another (L07).`,
    );
    process.exit(1);
  }
  f.state = "active";
  f.updated_at = new Date().toISOString();
  await save(cwd, file);
  log.ok(`${c.bold(id)} → ${stateColor("active")} ${c.dim(`(${f.behavior})`)}`);
}

export async function runFeatureDone(cwd: string, id: string): Promise<void> {
  const file = await loadOrInit(cwd);
  const f = file.features.find((x) => x.id === id);
  if (!f) {
    log.err(`Feature ${id} not found.`);
    process.exit(1);
  }
  if (!f.verification || f.verification.trim() === "") {
    log.err(`Feature ${id} has no verification command. Set one first (L08/L09).`);
    process.exit(1);
  }

  log.info(`Running verification: ${c.cyan(f.verification)}`);
  const { execSync } = await import("node:child_process");
  try {
    execSync(f.verification, { cwd, stdio: "inherit" });
  } catch {
    log.err(`Verification failed. ${c.bold(id)} stays in state ${stateColor(f.state)}.`);
    log.dim("L09: agent must not declare victory until verification passes.");
    process.exit(1);
  }

  f.state = "passing";
  f.updated_at = new Date().toISOString();
  // best-effort capture commit hash as evidence
  try {
    const { execSync } = await import("node:child_process");
    const sha = execSync("git rev-parse HEAD", { cwd }).toString().trim().slice(0, 12);
    f.evidence = `commit ${sha}`;
  } catch {
    /* not a git repo */
  }
  await save(cwd, file);
  log.ok(`${c.bold(id)} → ${stateColor("passing")} ✓`);
}

export async function runFeatureBlock(cwd: string, id: string, reason: string): Promise<void> {
  const file = await loadOrInit(cwd);
  const f = file.features.find((x) => x.id === id);
  if (!f) {
    log.err(`Feature ${id} not found.`);
    process.exit(1);
  }
  f.state = "blocked";
  f.blocked_reason = reason;
  f.updated_at = new Date().toISOString();
  await save(cwd, file);
  log.ok(`${c.bold(id)} → ${stateColor("blocked")} ${c.dim(`(${reason})`)}`);
}

// ----- helpers -----

async function ask(message: string, defaultValue?: string): Promise<string> {
  const v = await p.text({ message, defaultValue, placeholder: defaultValue });
  if (p.isCancel(v)) {
    log.warn("Cancelled.");
    process.exit(0);
  }
  return (v as string) || defaultValue || "";
}

function suggestNextId(file: FeaturesFile): string {
  const nums = file.features
    .map((f) => f.id.match(/^F(\d+)$/)?.[1])
    .filter((x): x is string => !!x)
    .map((x) => Number.parseInt(x, 10));
  const next = nums.length > 0 ? Math.max(...nums) + 1 : 1;
  return `F${String(next).padStart(2, "0")}`;
}

async function loadOrInit(cwd: string): Promise<FeaturesFile> {
  const path = join(cwd, FILE);
  if (await pathExists(path)) {
    try {
      return JSON.parse(await readText(path)) as FeaturesFile;
    } catch (e) {
      log.err(`features.json is malformed: ${(e as Error).message}`);
      process.exit(1);
    }
  }
  log.warn(`No ${FILE} found; initializing.`);
  return { version: "1", wip_limit: 1, features: [] };
}

async function save(cwd: string, file: FeaturesFile): Promise<void> {
  await writeText(join(cwd, FILE), `${JSON.stringify(file, null, 2)}\n`);
}

function stateBadge(state: FeatureState): string {
  switch (state) {
    case "passing":
      return c.green("[✓ passing  ]");
    case "active":
      return c.yellow("[● active   ]");
    case "blocked":
      return c.red("[⊘ blocked  ]");
    case "not_started":
      return c.gray("[○ pending  ]");
  }
}

function stateColor(state: FeatureState): string {
  switch (state) {
    case "passing":
      return c.green("passing");
    case "active":
      return c.yellow("active");
    case "blocked":
      return c.red("blocked");
    case "not_started":
      return c.gray("not_started");
  }
}
