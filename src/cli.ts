import { resolve } from "node:path";
import { cac } from "cac";
import { runClean } from "./commands/clean.js";
import { runDoctor } from "./commands/doctor.js";
import { runInit } from "./commands/init.js";
import { runInject } from "./commands/inject.js";
import type { AgentId } from "./types.js";
import { log } from "./utils/log.js";

// Read version from package.json at runtime so tsup doesn't bake a stale value.
async function getVersion(): Promise<string> {
  try {
    const { readFileSync } = await import("node:fs");
    const { fileURLToPath } = await import("node:url");
    const { dirname, join } = await import("node:path");
    let here: string;
    try {
      here = fileURLToPath(import.meta.url);
    } catch {
      here = __filename;
    }
    let dir = dirname(here);
    for (let i = 0; i < 6; i++) {
      try {
        const txt = readFileSync(join(dir, "package.json"), "utf8");
        const obj = JSON.parse(txt);
        if (obj?.name === "harness-kit") return obj.version as string;
      } catch {
        /* not here */
      }
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  } catch {
    /* fall through */
  }
  return "0.0.0";
}

async function main(): Promise<void> {
  const cli = cac("harness");
  const version = await getVersion();

  cli
    .command("init [dir]", "Drop a complete harness into a new project (interactive)")
    .option("--name <name>", "Project name")
    .option(
      "--agents <agents>",
      "Comma-separated agent ids: claude-code,codex,opencode,cursor,aider",
    )
    .option("--lang <lang>", "Bootstrap-prompt language: en|zh|ja|ko|es|pt|fr|de")
    .option("-y, --yes", "Skip prompts; use detected/default values")
    .option("-f, --force", "Overwrite existing .harnessrc.json")
    .action(async (dir: string | undefined, opts) => {
      await runInit({
        cwd: resolve(dir ?? "."),
        projectName: opts.name,
        agents: parseAgents(opts.agents),
        yes: opts.yes,
        force: opts.force,
        lang: opts.lang,
      });
    });

  cli
    .command("inject [dir]", "Add a harness to an existing repo (dry-run by default)")
    .option("--apply", "Actually write changes (default is dry-run)")
    .option("--agents <agents>", "Comma-separated agent ids")
    .option("--lang <lang>", "Bootstrap-prompt language: en|zh|ja|ko|es|pt|fr|de")
    .option("-f, --force", "Skip confirmation prompt when applying")
    .action(async (dir: string | undefined, opts) => {
      await runInject({
        cwd: resolve(dir ?? "."),
        dryRun: !opts.apply,
        force: opts.force,
        agents: parseAgents(opts.agents),
        lang: opts.lang,
      });
    });

  cli
    .command("doctor [dir]", "Score the harness across 5 subsystems + cold-start test")
    .action(async (dir: string | undefined) => {
      await runDoctor(resolve(dir ?? "."));
    });

  cli
    .command("clean [dir]", "L12 exit-clean: 5-dimension session-end check")
    .action(async (dir: string | undefined) => {
      const res = await runClean(resolve(dir ?? "."));
      if (!res.passed) process.exit(1);
    });

  cli.help();
  cli.version(version);
  cli.parse(process.argv);

  // cac silently exits 0 for unknown or no commands. Make it loud and helpful.
  const userArgs = process.argv.slice(2);
  if (userArgs.length === 0) {
    cli.outputHelp();
    return;
  }
  if (userArgs.some((a) => ["-h", "--help", "-v", "--version"].includes(a))) {
    return;
  }
  // biome-ignore lint/suspicious/noExplicitAny: cac internal field
  const matched = (cli as any).matchedCommand !== undefined;
  if (!matched) {
    const typed = userArgs[0] ?? "";
    const all = ["init", "inject", "doctor", "clean"];
    const suggestion = closest(typed, all);
    log.err(`Unknown command: ${typed}`);
    if (suggestion) {
      log.warn(`Did you mean: ${suggestion}?`);
    }
    log.dim("Run `harness --help` to see all commands.");
    log.dim(
      "Note: feature/session/prompt subcommands were removed in v0.2.0. " +
        "Workflow lives in markdown (FEATURES.md, AGENTS.md) + scripts/.",
    );
    process.exit(2);
  }
}

/**
 * Cheap edit-distance based suggestion. Returns the closest candidate
 * within 3 edits, or undefined.
 */
function closest(input: string, candidates: string[]): string | undefined {
  let best: { name: string; dist: number } | undefined;
  for (const c of candidates) {
    const d = editDistance(input, c);
    if (d <= 3 && (!best || d < best.dist)) {
      best = { name: c, dist: d };
    }
  }
  return best?.name;
}

function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) m[i]![0] = i;
  for (let j = 0; j <= b.length; j++) m[0]![j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      m[i]![j] = Math.min(m[i - 1]![j]! + 1, m[i]![j - 1]! + 1, m[i - 1]![j - 1]! + cost);
    }
  }
  return m[a.length]![b.length]!;
}

function parseAgents(input?: string): AgentId[] | undefined {
  if (!input) return undefined;
  const valid: AgentId[] = ["claude-code", "codex", "opencode", "cursor", "aider"];
  return input
    .split(",")
    .map((s) => s.trim())
    .filter((s): s is AgentId => valid.includes(s as AgentId));
}

main().catch((err) => {
  log.err((err as Error).message);
  if (process.env.DEBUG) console.error(err);
  process.exit(1);
});
