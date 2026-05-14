import { join } from "node:path";
import * as p from "@clack/prompts";
import type { AgentId, HarnessConfig, InjectOptions } from "../types.js";
import { detectAgents, detectExisting, guessProjectName } from "../utils/detect.js";
import { ensureDir, pathExists, pkgPath, readText, render, writeText } from "../utils/fs.js";
import { c, isHarnessOnPath, log, printInstallHint } from "../utils/log.js";
import { mergeMakefile, mergeMarkdown } from "../utils/merge.js";
import { loadPrompt, printPrompt, resolveLang, savePrompt } from "../utils/prompt.js";
import { renderAgentFiles } from "./_shared.js";

const TEMPLATE_VERSION = "1";

interface PlannedChange {
  path: string;
  action: "create" | "merge" | "skip";
  reason?: string;
}

export async function runInject(opts: InjectOptions): Promise<void> {
  log.banner("inject", "Safely add a harness into an existing repo. Dry-run by default.");

  const cwd = opts.cwd;
  const dryRun = opts.dryRun !== false; // default true

  const projectName = await guessProjectName(cwd);
  const detectedAgents = await detectAgents(cwd);
  const agents: AgentId[] =
    opts.agents ??
    (detectedAgents.length > 0
      ? detectedAgents
      : (["claude-code", "codex", "opencode"] as AgentId[]));
  const existing = await detectExisting(cwd);

  log.dim(
    `project=${projectName}  agents=${agents.join(",") || "(none)"}  git=${
      existing.hasGitRepo ? "yes" : "no"
    }`,
  );

  const vars: Record<string, string> = {
    PROJECT_NAME: projectName,
    YEAR: String(new Date().getUTCFullYear()),
    DATE: new Date().toISOString().slice(0, 10),
    AGENT_LIST: agents.join(", "),
    TEMPLATE_VERSION,
  };

  // Plan
  const plan: PlannedChange[] = [];
  const planFile = async (
    rel: string,
    when: "always" | "if-missing" | "merge-md" | "merge-make",
  ) => {
    plan.push({ path: rel, action: await actionFor(cwd, rel, when, existing) });
  };

  await planFile("AGENTS.md", "merge-md");
  await planFile("CONSTRAINTS.md", "if-missing");
  await planFile("docs/architecture.md", "if-missing");
  await planFile("docs/decisions.md", "if-missing");
  await planFile("docs/testing-standards.md", "if-missing");
  await planFile("PROGRESS.md", "if-missing");
  await planFile("features.json", "if-missing");
  await planFile("FEATURES.md", "if-missing");
  await planFile("QUALITY.md", "if-missing");
  await planFile("Makefile", "merge-make");
  await planFile("scripts/exit-clean.sh", "if-missing");
  await planFile("scripts/session-init.sh", "if-missing");
  await planFile("scripts/validate-feature.sh", "if-missing");
  await planFile("scripts/e2e-check.sh", "if-missing");
  await planFile("docs/templates/sprint-contract.md", "if-missing");
  await planFile("docs/templates/rubric.md", "if-missing");
  await planFile(".github/workflows/harness.yml", "if-missing");
  await planFile(".harnessrc.json", "always");

  log.step("Planned changes");
  for (const item of plan) {
    const tag =
      item.action === "create"
        ? c.green("CREATE")
        : item.action === "merge"
          ? c.yellow(" MERGE")
          : c.gray("  SKIP");
    log.raw(`  ${tag}  ${item.path}${item.reason ? c.dim(`  (${item.reason})`) : ""}`);
  }

  if (dryRun) {
    log.blank();
    log.warn("Dry-run only. Re-run with `--apply` to actually write files.");
    return;
  }

  // Confirm if interactive
  if (!opts.force) {
    const ok = await p.confirm({
      message: `Apply these changes to ${c.cyan(cwd)}?`,
      initialValue: true,
    });
    if (p.isCancel(ok) || !ok) {
      log.warn("Aborted.");
      return;
    }
  }

  log.step("Applying");
  for (const item of plan) {
    if (item.action === "skip") continue;
    const dest = join(cwd, item.path);

    if (item.path === ".harnessrc.json") {
      const cfg: HarnessConfig = {
        version: "1",
        project_name: projectName,
        agents,
        created_at: new Date().toISOString(),
        template_version: TEMPLATE_VERSION,
      };
      await writeText(dest, `${JSON.stringify(cfg, null, 2)}\n`);
      log.ok(`wrote ${c.dim(item.path)}`);
      continue;
    }

    if (item.path === "Makefile" && item.action === "merge") {
      const ours = await loadTpl("feedback/Makefile.tpl", vars);
      const existingTxt = await readText(dest);
      await writeText(dest, mergeMakefile(existingTxt, ours));
      log.ok(`merged ${c.dim(item.path)}`);
      continue;
    }
    if (item.path === "AGENTS.md" && item.action === "merge") {
      const ours = await loadTpl("instructions/AGENTS.md.tpl", vars);
      const existingTxt = await readText(dest);
      await writeText(dest, mergeMarkdown(existingTxt, ours));
      log.ok(`merged ${c.dim(item.path)}`);
      continue;
    }

    // create
    const tplRel = TEMPLATE_MAP[item.path];
    if (!tplRel) {
      log.warn(`no template for ${item.path}; skipped`);
      continue;
    }
    const content = await loadTpl(tplRel, vars);
    await writeText(dest, content);
    log.ok(`created ${c.dim(item.path)}`);
  }

  // per-agent config files (only create, never overwrite)
  await renderAgentFiles(cwd, agents, vars);
  await chmodScripts(cwd);

  log.blank();
  if (!isHarnessOnPath()) {
    printInstallHint();
  }

  // Print and save the bootstrap prompt.
  const lang = resolveLang(opts.lang);
  const promptText = await loadPrompt(lang);
  await savePrompt(cwd, promptText);
  printPrompt(promptText, lang);

  log.ok(`Inject complete. Run ${c.bold("harness doctor")} to score the result.`);
}

const TEMPLATE_MAP: Record<string, string> = {
  "AGENTS.md": "instructions/AGENTS.md.tpl",
  "CONSTRAINTS.md": "instructions/CONSTRAINTS.md.tpl",
  "docs/architecture.md": "instructions/docs/architecture.md.tpl",
  "docs/decisions.md": "instructions/docs/decisions.md.tpl",
  "docs/testing-standards.md": "instructions/docs/testing-standards.md.tpl",
  "PROGRESS.md": "state/PROGRESS.md.tpl",
  "features.json": "state/features.json.tpl",
  "FEATURES.md": "state/FEATURES.md.tpl",
  "QUALITY.md": "state/QUALITY.md.tpl",
  Makefile: "feedback/Makefile.tpl",
  "scripts/exit-clean.sh": "feedback/scripts/exit-clean.sh.tpl",
  "scripts/session-init.sh": "feedback/scripts/session-init.sh.tpl",
  "scripts/validate-feature.sh": "feedback/scripts/validate-feature.sh.tpl",
  "scripts/e2e-check.sh": "feedback/scripts/e2e-check.sh.tpl",
  "docs/templates/sprint-contract.md": "observability/sprint-contract.md.tpl",
  "docs/templates/rubric.md": "observability/rubric.md.tpl",
  ".github/workflows/harness.yml": "governance/harness.yml.tpl",
};

async function actionFor(
  cwd: string,
  rel: string,
  when: "always" | "if-missing" | "merge-md" | "merge-make",
  existing: ReturnType<typeof detectExisting> extends Promise<infer T> ? T : never,
): Promise<"create" | "merge" | "skip"> {
  if (when === "always") return "create";
  // Special-cased files with explicit existing-state probes:
  if (rel === "AGENTS.md") return existing.hasAgentsMd ? "merge" : "create";
  if (rel === "Makefile") return existing.hasMakefile ? "merge" : "create";
  // Generic "if-missing" semantics for everything else: skip if file exists,
  // create otherwise. This preserves any user edits to CONSTRAINTS.md, docs/,
  // FEATURES.md, scripts/, etc.
  if (when === "if-missing") {
    return (await pathExists(join(cwd, rel))) ? "skip" : "create";
  }
  return "create";
}

async function loadTpl(rel: string, vars: Record<string, string>): Promise<string> {
  const path = pkgPath("templates", rel);
  const raw = await readText(path);
  return render(raw, vars);
}

async function chmodScripts(cwd: string): Promise<void> {
  const { chmod } = await import("node:fs/promises");
  for (const s of [
    "scripts/exit-clean.sh",
    "scripts/session-init.sh",
    "scripts/validate-feature.sh",
    "scripts/e2e-check.sh",
  ]) {
    try {
      await chmod(join(cwd, s), 0o755);
    } catch {
      /* best-effort */
    }
  }
  void ensureDir;
}
