import { join } from "node:path";
import { pathExists, readText } from "../utils/fs.js";
import { type SupportedLang, isSupportedLang } from "../utils/lang.js";
import { c, log } from "../utils/log.js";
import { loadPrompt, printPrompt, resolveLang } from "../utils/prompt.js";

const SAVE_PATH = ".harness/bootstrap-prompt.txt";

export async function runPrompt(cwd: string, lang?: string): Promise<void> {
  // Validate explicit --lang argument
  if (lang && !isSupportedLang(lang)) {
    log.err(`Unsupported language: ${lang}`);
    log.dim("Supported: en, zh, ja, ko, es, pt, fr, de");
    process.exit(2);
  }

  // Prefer the cached copy from .harness/bootstrap-prompt.txt if present
  // — that's the exact prompt the user saw at init time. Fall back to
  // loading fresh from the package templates.
  const savedPath = join(cwd, SAVE_PATH);
  if (!lang && (await pathExists(savedPath))) {
    const text = await readText(savedPath);
    // We don't know the language of the saved copy, but it's whatever
    // init/inject picked at the time. Show with the same chrome.
    const detected = resolveLang(undefined);
    printPrompt(text, detected);
    log.dim(`Loaded from ${c.cyan(SAVE_PATH)} (cached at scaffold time).`);
    return;
  }

  const resolved: SupportedLang = (lang as SupportedLang | undefined) ?? resolveLang(undefined);
  const prompt = await loadPrompt(resolved);
  printPrompt(prompt, resolved);
}
