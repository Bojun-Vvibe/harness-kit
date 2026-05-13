import { join } from "node:path";
import type { AgentId } from "../types.js";
import { pathExists } from "./fs.js";

/**
 * Detect agent config files already present in the project.
 * Returns the union of agents that have any footprint.
 */
export async function detectAgents(cwd: string): Promise<AgentId[]> {
  const found = new Set<AgentId>();

  const checks: Array<[string, AgentId]> = [
    ["CLAUDE.md", "claude-code"],
    [".claude/CLAUDE.md", "claude-code"],
    [".claude/settings.json", "claude-code"],
    [".codex/AGENTS.md", "codex"],
    [".codex/config.toml", "codex"],
    [".opencode/AGENTS.md", "opencode"],
    ["opencode.json", "opencode"],
    [".config/opencode/config.json", "opencode"],
    [".cursorrules", "cursor"],
    [".cursor/rules", "cursor"],
    [".aider.conf.yml", "aider"],
    [".aider.conf.yml.harness-pointer", "aider"],
  ];

  for (const [path, id] of checks) {
    if (await pathExists(join(cwd, path))) {
      found.add(id);
    }
  }

  return [...found];
}

export interface ExistingHarness {
  hasAgentsMd: boolean;
  hasMakefile: boolean;
  hasProgress: boolean;
  hasFeatures: boolean;
  hasHarnessConfig: boolean;
  hasGitRepo: boolean;
}

export async function detectExisting(cwd: string): Promise<ExistingHarness> {
  const has = (f: string) => pathExists(join(cwd, f));
  const [agentsMd, makefile, progress, features, harnessConfig, gitDir] = await Promise.all([
    has("AGENTS.md"),
    has("Makefile"),
    has("PROGRESS.md"),
    has("features.json"),
    has(".harnessrc.json"),
    has(".git"),
  ]);
  return {
    hasAgentsMd: agentsMd,
    hasMakefile: makefile,
    hasProgress: progress,
    hasFeatures: features,
    hasHarnessConfig: harnessConfig,
    hasGitRepo: gitDir,
  };
}

/**
 * Best-effort guess of project name from package.json or directory name.
 */
export async function guessProjectName(cwd: string): Promise<string> {
  try {
    const pkgPath = join(cwd, "package.json");
    if (await pathExists(pkgPath)) {
      const txt = await (await import("node:fs/promises")).readFile(pkgPath, "utf8");
      const obj = JSON.parse(txt);
      if (typeof obj?.name === "string" && obj.name.length > 0) return obj.name;
    }
    const pyproject = join(cwd, "pyproject.toml");
    if (await pathExists(pyproject)) {
      const txt = await (await import("node:fs/promises")).readFile(pyproject, "utf8");
      const m = txt.match(/^\s*name\s*=\s*["']([^"']+)["']/m);
      if (m) return m[1]!;
    }
  } catch {
    /* fall through */
  }
  return cwd.split("/").pop() || "my-project";
}
