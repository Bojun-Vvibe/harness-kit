/**
 * Shared helpers across commands.
 */

import { join } from "node:path";
import type { AgentId } from "../types.js";
import { ensureDir, pathExists, pkgPath, readText, render, writeText } from "../utils/fs.js";
import { c, log } from "../utils/log.js";

/**
 * Render per-agent config files. AGENTS.md is the source of truth;
 * each agent gets its expected file pointing back to it.
 */
export async function renderAgentFiles(
  cwd: string,
  agents: AgentId[],
  vars: Record<string, string>,
): Promise<void> {
  const pointer = await readText(pkgPath("templates", "instructions", "AGENT_POINTER.md.tpl"));
  const rendered = render(pointer, vars);

  for (const agent of agents) {
    const targets = agentTargets(agent);
    for (const target of targets) {
      const dest = join(cwd, target);
      // Skip if already exists; never clobber agent config silently.
      if (await pathExists(dest)) {
        log.warn(`exists, skipped ${c.dim(target)}  ${c.gray("(merge manually if desired)")}`);
        continue;
      }
      await ensureDir(join(cwd, target.split("/").slice(0, -1).join("/") || "."));
      await writeText(dest, rendered);
      log.ok(`wrote ${c.dim(target)}`);
    }
  }
}

function agentTargets(agent: AgentId): string[] {
  switch (agent) {
    case "claude-code":
      return ["CLAUDE.md"];
    case "codex":
      return [".codex/AGENTS.md"];
    case "opencode":
      return [".opencode/AGENTS.md"];
    case "cursor":
      return [".cursorrules"];
    case "aider":
      return [".aider.conf.yml.harness-pointer"];
  }
}
