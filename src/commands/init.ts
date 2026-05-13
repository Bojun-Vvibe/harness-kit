import { join } from "node:path";
import * as p from "@clack/prompts";
import type { AgentId, HarnessConfig, InitOptions } from "../types.js";
import { detectAgents, guessProjectName } from "../utils/detect.js";
import { ensureDir, pathExists, pkgPath, readText, render, writeText } from "../utils/fs.js";
import { c, isHarnessOnPath, log, printInstallHint } from "../utils/log.js";
import { loadPrompt, printPrompt, resolveLang, savePrompt } from "../utils/prompt.js";
import { renderAgentFiles } from "./_shared.js";

const TEMPLATE_VERSION = "1";

const AGENT_LABELS: Record<AgentId, string> = {
  "claude-code": "Claude Code",
  codex: "Codex",
  opencode: "OpenCode",
  cursor: "Cursor",
  aider: "Aider",
};

export async function runInit(opts: InitOptions): Promise<void> {
  log.banner("init", "Drop a complete 5-subsystem harness into a fresh project.");

  const cwd = opts.cwd;
  await ensureDir(cwd);

  // 1. Resolve config (interactive unless --yes / opts provided)
  const projectName =
    opts.projectName ?? (opts.yes ? await guessProjectName(cwd) : await askProjectName(cwd));

  const detectedAgents = await detectAgents(cwd);
  const agents: AgentId[] =
    opts.agents ??
    (opts.yes
      ? detectedAgents.length > 0
        ? detectedAgents
        : (["claude-code", "codex", "opencode"] satisfies AgentId[])
      : await askAgents(detectedAgents));

  // 2. Confirm overwrite if .harnessrc.json exists
  const cfgPath = join(cwd, ".harnessrc.json");
  if (await pathExists(cfgPath)) {
    if (!opts.force && !opts.yes) {
      const ok = await p.confirm({
        message: ".harnessrc.json already exists. Overwrite (init from scratch)?",
        initialValue: false,
      });
      if (p.isCancel(ok) || !ok) {
        log.warn("Aborted. Use `harness inject` to add to an existing project safely.");
        return;
      }
    } else if (!opts.force) {
      log.warn(".harnessrc.json exists; pass --force to overwrite, or use `harness inject`.");
      return;
    }
  }

  // 3. Render and write everything
  const vars: Record<string, string> = {
    PROJECT_NAME: projectName,
    YEAR: String(new Date().getUTCFullYear()),
    DATE: new Date().toISOString().slice(0, 10),
    AGENT_LIST: agents.map((a) => AGENT_LABELS[a]).join(", "),
    TEMPLATE_VERSION,
  };

  log.step("Writing harness files");

  const written: string[] = [];
  const writeFile = async (rel: string, content: string) => {
    const dest = join(cwd, rel);
    await writeText(dest, content);
    written.push(rel);
    log.ok(`wrote ${c.dim(rel)}`);
  };

  // 3a. Instructions subsystem
  await writeFile("AGENTS.md", await loadTpl("instructions/AGENTS.md.tpl", vars));
  await writeFile("CONSTRAINTS.md", await loadTpl("instructions/CONSTRAINTS.md.tpl", vars));
  await writeFile(
    "docs/architecture.md",
    await loadTpl("instructions/docs/architecture.md.tpl", vars),
  );
  await writeFile("docs/decisions.md", await loadTpl("instructions/docs/decisions.md.tpl", vars));
  await writeFile(
    "docs/testing-standards.md",
    await loadTpl("instructions/docs/testing-standards.md.tpl", vars),
  );

  // 3b. State subsystem
  await writeFile("PROGRESS.md", await loadTpl("state/PROGRESS.md.tpl", vars));
  await writeFile("features.json", await loadTpl("state/features.json.tpl", vars));
  await writeFile("QUALITY.md", await loadTpl("state/QUALITY.md.tpl", vars));

  // 3c. Feedback subsystem (stack-agnostic Makefile + scripts)
  await writeFile("Makefile", await loadTpl("feedback/Makefile.tpl", vars));
  await writeFile(
    "scripts/exit-clean.sh",
    await loadTpl("feedback/scripts/exit-clean.sh.tpl", vars),
  );
  await writeFile(
    "scripts/session-init.sh",
    await loadTpl("feedback/scripts/session-init.sh.tpl", vars),
  );
  await writeFile(
    "scripts/validate-feature.sh",
    await loadTpl("feedback/scripts/validate-feature.sh.tpl", vars),
  );
  await writeFile("scripts/e2e-check.sh", await loadTpl("feedback/scripts/e2e-check.sh.tpl", vars));

  // 3d. Observability subsystem (templates only; users instantiate per-sprint)
  await writeFile(
    "docs/templates/sprint-contract.md",
    await loadTpl("observability/sprint-contract.md.tpl", vars),
  );
  await writeFile("docs/templates/rubric.md", await loadTpl("observability/rubric.md.tpl", vars));

  // 3e. Governance subsystem
  await writeFile(
    ".github/workflows/harness.yml",
    await loadTpl("governance/harness.yml.tpl", vars),
  );

  // 4. Per-agent config files
  await renderAgentFiles(cwd, agents, vars);

  // 5. .harnessrc.json
  const cfg: HarnessConfig = {
    version: "1",
    project_name: projectName,
    agents,
    created_at: new Date().toISOString(),
    template_version: TEMPLATE_VERSION,
  };
  await writeFile(".harnessrc.json", `${JSON.stringify(cfg, null, 2)}\n`);

  // 6. Make scripts executable
  await chmodScripts(cwd);

  log.blank();
  log.step("Done");
  log.ok(`${written.length} files written to ${c.cyan(cwd)}`);
  log.dim(`agents=${agents.join(",")}`);

  const harnessAvailable = isHarnessOnPath();
  if (!harnessAvailable) {
    printInstallHint();
  }

  // Print the bootstrap prompt and save a copy for later.
  const lang = resolveLang(opts.lang);
  const promptText = await loadPrompt(lang);
  await savePrompt(cwd, promptText);
  printPrompt(promptText, lang);

  log.info("Next steps:");
  log.raw(`  ${c.cyan("1.")} Read ${c.bold("AGENTS.md")} — your harness entry point`);
  log.raw(
    `  ${c.cyan("2.")} Paste the prompt above into your AI agent (Claude Code / Codex / OpenCode / Cursor / Aider)`,
  );
  log.raw("        It will inspect the repo and fill every TODO marker for you.");
  log.raw(`  ${c.cyan("3.")} Run ${c.bold("make check")} to verify the harness is wired up`);
  log.raw(
    `  ${c.cyan("4.")} Run ${c.bold("harness doctor")} for a 5-subsystem health score${
      harnessAvailable ? "" : c.dim("  (install harness-kit globally first — see above)")
    }`,
  );
  log.blank();
}

async function askProjectName(cwd: string): Promise<string> {
  const guess = await guessProjectName(cwd);
  const value = await p.text({
    message: "Project name?",
    placeholder: guess,
    defaultValue: guess,
  });
  if (p.isCancel(value)) {
    log.warn("Cancelled.");
    process.exit(0);
  }
  return (value as string).trim() || guess;
}

async function askAgents(detected: AgentId[]): Promise<AgentId[]> {
  const initial =
    detected.length > 0 ? detected : (["claude-code", "codex", "opencode"] as AgentId[]);
  const value = await p.multiselect({
    message: `Which AI agents will use this repo? ${c.dim("(space=toggle, enter=confirm)")}`,
    initialValues: initial,
    options: [
      { value: "claude-code", label: "Claude Code" },
      { value: "codex", label: "Codex" },
      { value: "opencode", label: "OpenCode" },
      { value: "cursor", label: "Cursor" },
      { value: "aider", label: "Aider" },
    ],
    required: true,
  });
  if (p.isCancel(value)) {
    log.warn("Cancelled.");
    process.exit(0);
  }
  return value as AgentId[];
}

async function loadTpl(rel: string, vars: Record<string, string>): Promise<string> {
  const path = pkgPath("templates", rel);
  const raw = await readText(path);
  return render(raw, vars);
}

async function chmodScripts(cwd: string): Promise<void> {
  const { chmod } = await import("node:fs/promises");
  const scripts = [
    "scripts/exit-clean.sh",
    "scripts/session-init.sh",
    "scripts/validate-feature.sh",
    "scripts/e2e-check.sh",
  ];
  for (const s of scripts) {
    try {
      await chmod(join(cwd, s), 0o755);
    } catch {
      /* best-effort */
    }
  }
}
