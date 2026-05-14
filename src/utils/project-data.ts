/**
 * Project-data collector for `harness view`.
 *
 * Reads a harness-kit-scaffolded project from disk and produces a snapshot
 * of its 5 subsystems (per the Learn Harness Engineering L02 split):
 *
 *   指令 Instructions — what the agent reads to know what to do
 *   工具 Tools        — the means the agent uses to operate
 *   环境 Environment  — runtime context (stack, CI, version files)
 *   状态 State        — persistent project state (PROGRESS / features / quality)
 *   反馈 Feedback     — verification & evaluation signals
 *
 * The result is JSON-serializable and consumed by the dashboard UI.
 */

import { execSync } from "node:child_process";
import { stat } from "node:fs/promises";
import { join } from "node:path";
import { detectAgents } from "./detect.js";
import { pathExists, readText } from "./fs.js";

export interface FileEntry {
  path: string;
  exists: boolean;
  size?: number;
  lines?: number;
  modified?: string;
  todoCount?: number;
  preview?: string; // first ~200 chars
  note?: string;
}

export interface TodoEntry {
  line: number;
  text: string;
  kind: "block" | "inline"; // block = `> **TODO**:` markdown form; inline = bare `TODO:` in source
}

export interface TodoFile {
  path: string;
  entries: TodoEntry[];
}

export interface TodoSummary {
  total: number;
  byFile: TodoFile[];
}

export interface SubsystemSnapshot {
  key: "instructions" | "tools" | "environment" | "state" | "feedback";
  zh: string;
  en: string;
  description: string;
  files: FileEntry[];
  notes: string[]; // any subsystem-level observations (e.g., "WIP=1 violated")
}

export interface FeatureItem {
  id: string;
  behavior: string;
  verification: string;
  auto_verify?: string;
  state: string;
  evidence?: string;
  blocked_reason?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeaturesView {
  wip_limit: number;
  total: number;
  by_state: Record<string, number>;
  wip_violation: boolean;
  items: FeatureItem[];
}

export interface MakefileTarget {
  name: string;
  isHarnessStandard: boolean;
  isStillTodo: boolean; // body still mentions TODO placeholder
  bodyPreview?: string;
}

export interface ProjectSnapshot {
  project: {
    name: string;
    cwd: string;
    git?: { branch?: string; head?: string; dirty?: boolean };
  };
  harness: {
    version?: string;
    template_version?: string;
    agents: string[];
    created_at?: string;
  };
  features: FeaturesView;
  makefile: { exists: boolean; targets: MakefileTarget[] };
  stack: { manifests: string[]; description: string };
  bootstrapPrompt: { saved: boolean; sizeBytes?: number };
  subsystems: SubsystemSnapshot[];
  todos: TodoSummary;
}

const HARNESS_STANDARD_TARGETS = new Set([
  "setup",
  "dev",
  "test",
  "e2e",
  "lint",
  "typecheck",
  "build",
  "check",
  "clean",
]);

export async function collectProjectData(cwd: string): Promise<ProjectSnapshot> {
  // 1. project + git
  const project = {
    name: await readProjectName(cwd),
    cwd,
    git: gitInfo(cwd),
  };

  // 2. harness config
  const harnessConfig = await readJsonSafe<{
    version: string;
    template_version: string;
    project_name: string;
    agents: string[];
    created_at: string;
  }>(join(cwd, ".harnessrc.json"));
  const harness = {
    version: harnessConfig?.version,
    template_version: harnessConfig?.template_version,
    agents: (harnessConfig?.agents as string[] | undefined) ?? (await detectAgents(cwd)),
    created_at: harnessConfig?.created_at,
  };

  // 3. features
  const features = await collectFeatures(cwd);

  // 4. makefile parse
  const makefile = await collectMakefile(cwd);

  // 5. stack
  const stack = await collectStack(cwd);

  // 6. bootstrap prompt
  const promptPath = join(cwd, ".harness/bootstrap-prompt.txt");
  const bootstrapPrompt = (await pathExists(promptPath))
    ? { saved: true, sizeBytes: (await stat(promptPath)).size }
    : { saved: false };

  // 7. the 5 subsystems
  const subsystems: SubsystemSnapshot[] = [
    await collectInstructions(cwd),
    await collectTools(cwd),
    await collectEnvironment(cwd, stack),
    await collectState(cwd, features),
    await collectFeedback(cwd, makefile),
  ];

  // 8. todos across all surfaced files (de-duped + sorted)
  const todoSeen = new Set<string>();
  const todoSourceFiles: string[] = [];
  for (const sub of subsystems) {
    for (const f of sub.files) {
      if (f.exists && !f.note && !todoSeen.has(f.path)) {
        todoSeen.add(f.path);
        todoSourceFiles.push(f.path);
      }
    }
  }
  const todos = await collectTodos(cwd, todoSourceFiles);

  return {
    project,
    harness,
    features,
    makefile,
    stack,
    bootstrapPrompt,
    subsystems,
    todos,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Subsystem collectors
// ────────────────────────────────────────────────────────────────────────────

async function collectInstructions(cwd: string): Promise<SubsystemSnapshot> {
  const candidates = [
    "AGENTS.md",
    "CONSTRAINTS.md",
    "FEATURES.md",
    "docs/architecture.md",
    "docs/decisions.md",
    "docs/testing-standards.md",
    "docs/templates/sprint-contract.md",
    "docs/templates/rubric.md",
    // per-agent pointer files
    "CLAUDE.md",
    ".codex/AGENTS.md",
    ".opencode/AGENTS.md",
    ".cursorrules",
    ".aider.conf.yml.harness-pointer",
  ];
  const files = await Promise.all(candidates.map((p) => fileEntry(cwd, p)));
  const notes: string[] = [];
  const agentsMd = files.find((f) => f.path === "AGENTS.md");
  if (agentsMd?.exists && (agentsMd.lines ?? 0) > 400) {
    notes.push(`AGENTS.md is ${agentsMd.lines} lines — consider splitting (L04 mid-context loss).`);
  }
  if (!agentsMd?.exists) notes.push("Missing AGENTS.md — agents have no entry point (L02/L03).");
  return {
    key: "instructions",
    zh: "指令",
    en: "Instructions",
    description: "Markdown the agent reads to know what to do, what's allowed, how things work.",
    files: files.filter((f) => f.exists),
    notes,
  };
}

async function collectTools(cwd: string): Promise<SubsystemSnapshot> {
  const candidates = [
    "Makefile",
    "scripts/exit-clean.sh",
    "scripts/session-init.sh",
    "scripts/validate-feature.sh",
    "scripts/e2e-check.sh",
    ".harnessrc.json",
  ];
  const files = await Promise.all(candidates.map((p) => fileEntry(cwd, p)));
  const notes: string[] = [];
  const mk = files.find((f) => f.path === "Makefile");
  if (!mk?.exists) {
    notes.push("Missing Makefile — no canonical command surface (L02).");
  } else if (mk.preview && /TODO: replace with your/.test(mk.preview)) {
    notes.push("Makefile still has placeholder TODO targets — fill in real commands.");
  }
  return {
    key: "tools",
    zh: "工具",
    en: "Tools",
    description: "Callable surface — Makefile targets and bash scripts the agent uses to operate.",
    files: files.filter((f) => f.exists),
    notes,
  };
}

async function collectEnvironment(
  cwd: string,
  stack: { manifests: string[]; description: string },
): Promise<SubsystemSnapshot> {
  const candidates = [
    "package.json",
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "pyproject.toml",
    "requirements.txt",
    "uv.lock",
    "Cargo.toml",
    "go.mod",
    "Gemfile",
    "composer.json",
    ".nvmrc",
    ".python-version",
    ".tool-versions",
    ".gitignore",
    ".editorconfig",
    ".github/workflows/harness.yml",
    "Dockerfile",
    "docker-compose.yml",
  ];
  const files = await Promise.all(candidates.map((p) => fileEntry(cwd, p)));
  const present = files.filter((f) => f.exists);
  const notes: string[] = [];
  if (!present.find((f) => f.path === ".gitignore")) {
    notes.push("Missing .gitignore — runtime artifacts may leak into commits.");
  }
  if (!present.find((f) => f.path === ".github/workflows/harness.yml")) {
    notes.push("Missing CI workflow — `make check` is not enforced on push/PR.");
  }
  if (stack.manifests.length === 0) {
    notes.push("No stack manifest detected (package.json / pyproject.toml / Cargo.toml / etc).");
  }
  return {
    key: "environment",
    zh: "环境",
    en: "Environment",
    description: "Runtime context — stack manifests, version files, CI workflow, container config.",
    files: present,
    notes,
  };
}

async function collectState(cwd: string, features: FeaturesView): Promise<SubsystemSnapshot> {
  const candidates = ["PROGRESS.md", "features.json", "QUALITY.md"];
  const files = await Promise.all(candidates.map((p) => fileEntry(cwd, p)));
  const notes: string[] = [];
  const progress = files.find((f) => f.path === "PROGRESS.md");
  if (progress?.exists && progress.modified) {
    const ageHrs = (Date.now() - new Date(progress.modified).getTime()) / 3_600_000;
    if (ageHrs > 24) {
      notes.push(`PROGRESS.md last touched ${Math.round(ageHrs)}h ago — likely stale.`);
    }
  } else {
    notes.push("Missing PROGRESS.md — sessions cannot hand off (L05).");
  }
  if (!files.find((f) => f.path === "features.json" && f.exists)) {
    notes.push("Missing features.json — no harness spine (L08).");
  }
  if (features.wip_violation) {
    notes.push(
      `WIP=1 violated: ${features.by_state.active ?? 0} features in 'active' (limit ${features.wip_limit}).`,
    );
  }
  return {
    key: "state",
    zh: "状态",
    en: "State",
    description: "Persistent project state — diary, feature spine, per-module quality grades.",
    files: files.filter((f) => f.exists),
    notes,
  };
}

async function collectFeedback(
  cwd: string,
  makefile: { exists: boolean; targets: MakefileTarget[] },
): Promise<SubsystemSnapshot> {
  const candidates = [
    "scripts/exit-clean.sh",
    "scripts/e2e-check.sh",
    "scripts/validate-feature.sh",
    "docs/templates/sprint-contract.md",
    "docs/templates/rubric.md",
    ".github/workflows/harness.yml",
  ];
  const files = await Promise.all(candidates.map((p) => fileEntry(cwd, p)));
  const present = files.filter((f) => f.exists);
  const notes: string[] = [];
  if (!makefile.exists) {
    notes.push("Missing Makefile — no `make check` to run feedback through.");
  } else {
    const checkT = makefile.targets.find((t) => t.name === "check");
    if (!checkT) notes.push("`make check` target missing — agents can't get a single pass/fail.");
    const todoTargets = makefile.targets
      .filter((t) => t.isHarnessStandard && t.isStillTodo)
      .map((t) => t.name);
    if (todoTargets.length > 0) {
      notes.push(
        `Targets still placeholder TODOs (no real feedback signal): ${todoTargets.join(", ")}.`,
      );
    }
  }
  if (!present.find((f) => f.path === "docs/templates/rubric.md")) {
    notes.push("Missing review rubric — evaluator agent has no scoring contract (L11).");
  }
  return {
    key: "feedback",
    zh: "反馈",
    en: "Feedback",
    description:
      "Verification + evaluation signals — exit-clean, e2e check, sprint contract, rubric, CI.",
    files: present,
    notes,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────────

async function fileEntry(cwd: string, rel: string): Promise<FileEntry> {
  const full = join(cwd, rel);
  if (!(await pathExists(full))) return { path: rel, exists: false };
  let st: Awaited<ReturnType<typeof stat>>;
  try {
    st = await stat(full);
  } catch {
    return { path: rel, exists: false };
  }
  if (st.isDirectory()) return { path: rel, exists: true, size: 0, note: "(directory)" };
  let text = "";
  try {
    text = await readText(full);
  } catch {
    return {
      path: rel,
      exists: true,
      size: st.size,
      modified: st.mtime.toISOString(),
      note: "(binary)",
    };
  }
  const lines = text.split("\n").length;
  const todoCount = countTodos(text);
  const preview = text.slice(0, 240);
  return {
    path: rel,
    exists: true,
    size: st.size,
    lines,
    modified: st.mtime.toISOString(),
    todoCount,
    preview,
  };
}

function countTodos(text: string): number {
  // Match the standard `> **TODO**:` markers AND raw `TODO:` mentions in source.
  const a = (text.match(/>\s*\*\*TODO\*\*:/g) ?? []).length;
  const b = (text.match(/\bTODO\b\s*\(?[^)]*\)?\s*:/g) ?? []).length;
  // Avoid double-counting when both forms overlap.
  return Math.max(a, b);
}

const TODO_BLOCK_RE = />\s*\*\*TODO\*\*:/;
const TODO_INLINE_RE = /\bTODO\b\s*\(?[^)]*\)?\s*:/;

/**
 * Walk a list of files and collect every TODO marker per file with line + text.
 * Only files relative to cwd are inspected (the caller passes a vetted list).
 * Files we can't read are silently skipped.
 */
async function collectTodos(cwd: string, files: string[]): Promise<TodoSummary> {
  const byFile: TodoFile[] = [];
  let total = 0;
  for (const rel of files) {
    const full = join(cwd, rel);
    let text = "";
    try {
      text = await readText(full);
    } catch {
      continue;
    }
    const lines = text.split("\n");
    const entries: TodoEntry[] = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i] ?? "";
      const isBlock = TODO_BLOCK_RE.test(line);
      const isInline = !isBlock && TODO_INLINE_RE.test(line);
      if (!isBlock && !isInline) continue;
      entries.push({
        line: i + 1,
        text: line.length > 240 ? `${line.slice(0, 240)}…` : line,
        kind: isBlock ? "block" : "inline",
      });
    }
    if (entries.length > 0) {
      byFile.push({ path: rel, entries });
      total += entries.length;
    }
  }
  // Stable order: most TODOs first, then alphabetical
  byFile.sort((a, b) => b.entries.length - a.entries.length || a.path.localeCompare(b.path));
  return { total, byFile };
}

async function readJsonSafe<T>(path: string): Promise<T | undefined> {
  if (!(await pathExists(path))) return undefined;
  try {
    return JSON.parse(await readText(path)) as T;
  } catch {
    return undefined;
  }
}

async function readProjectName(cwd: string): Promise<string> {
  const cfg = await readJsonSafe<{ project_name?: string }>(join(cwd, ".harnessrc.json"));
  if (cfg?.project_name) return cfg.project_name;
  const pkg = await readJsonSafe<{ name?: string }>(join(cwd, "package.json"));
  if (pkg?.name) return pkg.name;
  return cwd.split("/").filter(Boolean).pop() ?? "(unknown)";
}

function gitInfo(cwd: string): { branch?: string; head?: string; dirty?: boolean } | undefined {
  try {
    const branch = execSync("git rev-parse --abbrev-ref HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const head = execSync("git rev-parse --short HEAD", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    const status = execSync("git status --porcelain", {
      cwd,
      stdio: ["ignore", "pipe", "ignore"],
    }).toString();
    return { branch, head, dirty: status.trim().length > 0 };
  } catch {
    return undefined;
  }
}

async function collectFeatures(cwd: string): Promise<FeaturesView> {
  const f = await readJsonSafe<{
    version: string;
    wip_limit: number;
    features: FeatureItem[];
  }>(join(cwd, "features.json"));
  if (!f) {
    return {
      wip_limit: 1,
      total: 0,
      by_state: {},
      wip_violation: false,
      items: [],
    };
  }
  const by_state: Record<string, number> = {};
  for (const item of f.features) {
    by_state[item.state] = (by_state[item.state] ?? 0) + 1;
  }
  const activeCount = by_state.active ?? 0;
  return {
    wip_limit: f.wip_limit ?? 1,
    total: f.features.length,
    by_state,
    wip_violation: activeCount > (f.wip_limit ?? 1),
    items: f.features.map((it) => ({
      ...it,
      auto_verify: it.auto_verify ?? undefined,
    })),
  };
}

async function collectMakefile(
  cwd: string,
): Promise<{ exists: boolean; targets: MakefileTarget[] }> {
  const path = join(cwd, "Makefile");
  if (!(await pathExists(path))) return { exists: false, targets: [] };
  const text = await readText(path);
  const targets: MakefileTarget[] = [];
  // crude parser: lines that look like `name:` at column 0, not preceded by `#`.
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (line.startsWith("#")) continue;
    const m = line.match(/^([a-z][a-zA-Z0-9_-]*)\s*:(?!=)/);
    if (!m) continue;
    const name = m[1]!;
    if (name === "PHONY") continue;
    // Capture body until next non-indented non-blank line
    const bodyLines: string[] = [];
    for (let j = i + 1; j < lines.length; j++) {
      const bl = lines[j] ?? "";
      if (bl.startsWith("\t") || bl.trim() === "") {
        if (bl.startsWith("\t")) bodyLines.push(bl);
      } else {
        break;
      }
    }
    const bodyPreview = bodyLines.join("\n").slice(0, 200);
    const isStillTodo = /TODO:\s*replace/.test(bodyPreview);
    targets.push({
      name,
      isHarnessStandard: HARNESS_STANDARD_TARGETS.has(name),
      isStillTodo,
      bodyPreview,
    });
  }
  return { exists: true, targets };
}

async function collectStack(cwd: string): Promise<{ manifests: string[]; description: string }> {
  const checks: Array<[string, string]> = [
    ["package.json", "Node / TypeScript"],
    ["pyproject.toml", "Python (pyproject)"],
    ["requirements.txt", "Python (requirements.txt)"],
    ["Cargo.toml", "Rust"],
    ["go.mod", "Go"],
    ["Gemfile", "Ruby"],
    ["composer.json", "PHP (composer)"],
    ["mix.exs", "Elixir"],
    ["build.gradle", "Java/Kotlin (Gradle)"],
    ["pom.xml", "Java (Maven)"],
  ];
  const found: string[] = [];
  const langs: string[] = [];
  for (const [file, lang] of checks) {
    if (await pathExists(join(cwd, file))) {
      found.push(file);
      langs.push(lang);
    }
  }
  return {
    manifests: found,
    description: langs.length === 0 ? "polyglot or unknown" : langs.join(" + "),
  };
}
