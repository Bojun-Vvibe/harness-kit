import { resolve } from "node:path";
import { cac } from "cac";
import { runClean } from "./commands/clean.js";
import { runDoctor } from "./commands/doctor.js";
import {
  runFeatureAdd,
  runFeatureBlock,
  runFeatureDone,
  runFeatureList,
  runFeatureStart,
} from "./commands/feature.js";
import { runInit } from "./commands/init.js";
import { runInject } from "./commands/inject.js";
import { runSessionEnd, runSessionStart } from "./commands/session.js";
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

/**
 * cac doesn't natively support multi-word commands.
 * Rewrite `harness feature add ...` → `harness feature-add ...` etc.
 * We do this at the argv level so the public UX stays natural.
 */
function rewriteArgv(argv: string[]): string[] {
  const out = [...argv];
  // process.argv = [node, cli.cjs, ...userArgs]
  if (out.length >= 4) {
    const a = out[2];
    const b = out[3];
    const groups: Record<string, string[]> = {
      feature: ["add", "list", "start", "done", "block"],
      session: ["start", "end"],
    };
    if (a && b && groups[a]?.includes(b)) {
      out.splice(2, 2, `${a}-${b}`);
    }
  }
  return out;
}

async function main(): Promise<void> {
  process.argv = rewriteArgv(process.argv);
  if (process.env.HARNESS_DEBUG) {
    console.error("[debug] argv after rewrite:", process.argv);
  }
  const cli = cac("harness");
  const version = await getVersion();

  cli
    .command("init [dir]", "Drop a complete harness into a new project (interactive)")
    .option("--name <name>", "Project name")
    .option(
      "--agents <agents>",
      "Comma-separated agent ids: claude-code,codex,opencode,cursor,aider",
    )
    .option("-y, --yes", "Skip prompts; use detected/default values")
    .option("-f, --force", "Overwrite existing .harnessrc.json")
    .action(async (dir: string | undefined, opts) => {
      await runInit({
        cwd: resolve(dir ?? "."),
        projectName: opts.name,
        agents: parseAgents(opts.agents),
        yes: opts.yes,
        force: opts.force,
      });
    });

  cli
    .command("inject [dir]", "Add a harness to an existing repo (dry-run by default)")
    .option("--apply", "Actually write changes (default is dry-run)")
    .option("--agents <agents>", "Comma-separated agent ids")
    .option("-f, --force", "Skip confirmation prompt when applying")
    .action(async (dir: string | undefined, opts) => {
      await runInject({
        cwd: resolve(dir ?? "."),
        dryRun: !opts.apply,
        force: opts.force,
        agents: parseAgents(opts.agents),
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

  cli
    .command("feature-add", "Add a new feature item (id, behavior, verification)")
    .option("--id <id>", "Feature id, e.g., F03")
    .option("--behavior <text>", "One-sentence behavior description")
    .option("--verification <cmd>", "Shell command that exits 0 when feature is done")
    .action(async (opts) => {
      await runFeatureAdd(resolve("."), {
        id: opts.id,
        behavior: opts.behavior,
        verification: opts.verification,
      });
    });

  cli.command("feature-list", "List all features and their states").action(async () => {
    await runFeatureList(resolve("."));
  });

  cli
    .command("feature-start <id>", "Mark a feature as active (enforces WIP=1)")
    .action(async (id: string) => {
      await runFeatureStart(resolve("."), id);
    });

  cli
    .command("feature-done <id>", "Run verification and mark feature as passing")
    .action(async (id: string) => {
      await runFeatureDone(resolve("."), id);
    });

  cli
    .command("feature-block <id> <reason>", "Mark feature as blocked with reason")
    .action(async (id: string, reason: string) => {
      await runFeatureBlock(resolve("."), id, reason);
    });

  cli
    .command("session-start", "L06 init phase: read state + sanity check + briefing")
    .action(async () => {
      await runSessionStart(resolve("."));
    });

  cli
    .command("session-end [summary]", "L12 stamp PROGRESS + run exit-clean")
    .action(async (summary: string | undefined) => {
      await runSessionEnd(resolve("."), summary);
    });

  cli.help();
  cli.version(version);
  cli.parse(process.argv);

  // cac silently exits 0 for unknown or no commands. Make it loud and helpful.
  const userArgs = process.argv.slice(2);
  // If user just typed `harness` with no command, show the help block.
  if (userArgs.length === 0) {
    cli.outputHelp();
    return;
  }
  // If user passed --help or --version, cac already handled it.
  if (userArgs.some((a) => ["-h", "--help", "-v", "--version"].includes(a))) {
    return;
  }
  // matchedCommand is set by cac iff a command was matched.
  // biome-ignore lint/suspicious/noExplicitAny: cac internal field
  const matched = (cli as any).matchedCommand !== undefined;
  if (!matched) {
    const typed = userArgs[0] ?? "";
    const all = [
      "init",
      "inject",
      "doctor",
      "clean",
      "feature add",
      "feature list",
      "feature start",
      "feature done",
      "feature block",
      "session start",
      "session end",
    ];
    const suggestion = closest(typed, all);
    log.err(`Unknown command: ${typed}`);
    if (suggestion) {
      log.warn(`Did you mean: ${suggestion}?`);
    }
    log.dim("Run `harness --help` to see all commands.");
    process.exit(2);
  }
} /**
 * Cheap edit-distance based suggestion. Returns the closest candidate
 * within 3 edits, or undefined.
 */
function closest(input: string, candidates: string[]): string | undefined {
  let best: { name: string; dist: number } | undefined;
  for (const c of candidates) {
    const d = editDistance(input, c.split(" ")[0]!);
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
