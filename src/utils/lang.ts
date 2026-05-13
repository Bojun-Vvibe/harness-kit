/**
 * Language detection for the bootstrap prompt printer.
 * Maps OS locale → one of the 8 README languages we ship.
 */

export type SupportedLang = "en" | "zh" | "ja" | "ko" | "es" | "pt" | "fr" | "de";

export const SUPPORTED_LANGS: SupportedLang[] = ["en", "zh", "ja", "ko", "es", "pt", "fr", "de"];

/**
 * Detect a supported language from environment variables.
 * Order: $HARNESS_LANG → $LC_ALL → $LANG → $LANGUAGE → "en".
 */
export function detectLang(env: NodeJS.ProcessEnv = process.env): SupportedLang {
  const candidates = [env.HARNESS_LANG, env.LC_ALL, env.LANG, env.LANGUAGE];
  for (const raw of candidates) {
    if (!raw) continue;
    const lang = normalizeLang(raw);
    if (lang) return lang;
  }
  return "en";
}

/**
 * Normalize a locale string like "zh_CN.UTF-8" or "pt_BR" to one of
 * SUPPORTED_LANGS. Returns undefined if no mapping found.
 */
export function normalizeLang(raw: string): SupportedLang | undefined {
  // Trim encoding suffix and lowercase the first chunk.
  const head = raw.toLowerCase().split(/[._@]/)[0] ?? "";
  // Direct supported codes
  if ((SUPPORTED_LANGS as string[]).includes(head)) return head as SupportedLang;
  // Common locale prefixes
  const prefix = head.split("-")[0] ?? head;
  if ((SUPPORTED_LANGS as string[]).includes(prefix)) return prefix as SupportedLang;
  // Special-case mappings (Chinese variants, etc.)
  if (prefix === "zh" || prefix === "zho" || prefix === "chi") return "zh";
  if (prefix === "ja" || prefix === "jpn") return "ja";
  if (prefix === "ko" || prefix === "kor") return "ko";
  if (prefix === "es" || prefix === "spa") return "es";
  if (prefix === "pt" || prefix === "por") return "pt";
  if (prefix === "fr" || prefix === "fra") return "fr";
  if (prefix === "de" || prefix === "deu" || prefix === "ger") return "de";
  return undefined;
}

export function isSupportedLang(s: string): s is SupportedLang {
  return (SUPPORTED_LANGS as string[]).includes(s);
}
