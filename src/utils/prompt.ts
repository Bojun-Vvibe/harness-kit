/**
 * Bootstrap-prompt loading and printing.
 * The prompt is the single biggest UX win after init: paste it into your
 * coding agent and it will fill in all the TODOs in the scaffolding.
 */

import { join } from "node:path";
import { ensureDir, pkgPath, readText, writeText } from "./fs.js";
import type { SupportedLang } from "./lang.js";
import { detectLang } from "./lang.js";
import { c, log } from "./log.js";

const SAVE_PATH = ".harness/bootstrap-prompt.txt";

/**
 * Load the prompt for the requested language. Falls back to English.
 */
export async function loadPrompt(lang: SupportedLang): Promise<string> {
  const path = pkgPath("templates", "prompts", `bootstrap.${lang}.txt`);
  try {
    return await readText(path);
  } catch {
    if (lang !== "en") {
      const en = pkgPath("templates", "prompts", "bootstrap.en.txt");
      return await readText(en);
    }
    throw new Error(`Bootstrap prompt template not found at ${path}`);
  }
}

/**
 * Resolve the lang to use, falling back through CLI flag → env → "en".
 */
export function resolveLang(cliLang?: string): SupportedLang {
  if (cliLang) {
    const norm = cliLang.toLowerCase() as SupportedLang;
    return norm;
  }
  return detectLang();
}

/**
 * Print the prompt to stdout with clear copy boundaries so users can
 * select-copy without grabbing the chrome around it.
 */
export function printPrompt(prompt: string, lang: SupportedLang): void {
  const sepTop = c.cyan("─".repeat(72));
  const sepBot = c.cyan("─".repeat(72));
  log.blank();
  log.step(`Bootstrap prompt (${lang}) — paste this into your AI coding agent`);
  log.dim(
    `The agent will inspect the repo and fill in every TODO marker in the\ngenerated scaffolding. Saved a copy to ${c.cyan(SAVE_PATH)} for later.`,
  );
  log.blank();
  console.log(`${sepTop}  ${c.green("BEGIN PROMPT — copy from next line")}  ${sepTop}`);
  log.blank();
  // Raw text, no chrome — so copy-paste captures exactly the prompt.
  console.log(prompt.trimEnd());
  log.blank();
  console.log(`${sepBot}  ${c.green("END PROMPT")}  ${sepBot}`);
  log.blank();
  log.dim(`Tip: re-read this prompt anytime with ${c.cyan(`cat ${SAVE_PATH}`)}.`);
  log.blank();
}

/**
 * Save a copy of the prompt to .harness/bootstrap-prompt.txt inside the
 * target project, so the user can find it after closing the terminal.
 */
export async function savePrompt(cwd: string, prompt: string): Promise<string> {
  const dest = join(cwd, SAVE_PATH);
  await ensureDir(join(cwd, ".harness"));
  await writeText(dest, prompt);
  return dest;
}
