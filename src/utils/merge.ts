/**
 * Safe mergers for files that may already exist in the target project.
 * Strategy: never silently overwrite. Append a clearly delimited section
 * with a stable marker so re-running is idempotent.
 */

const MARK_BEGIN = "<!-- harness-kit:begin -->";
const MARK_END = "<!-- harness-kit:end -->";
const MAKE_MARK_BEGIN = "# harness-kit:begin";
const MAKE_MARK_END = "# harness-kit:end";

/**
 * Merge a markdown block into existing content. If the marker block
 * already exists, replace it. Otherwise append.
 */
export function mergeMarkdown(existing: string, ours: string): string {
  const block = `${MARK_BEGIN}\n${ours.trim()}\n${MARK_END}`;
  const re = new RegExp(`${escapeRe(MARK_BEGIN)}[\\s\\S]*?${escapeRe(MARK_END)}`, "m");
  if (re.test(existing)) {
    return existing.replace(re, block);
  }
  const sep = existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${sep}${block}\n`;
}

/**
 * Merge harness Makefile targets into existing Makefile.
 */
export function mergeMakefile(existing: string, ours: string): string {
  const block = `${MAKE_MARK_BEGIN}\n${ours.trim()}\n${MAKE_MARK_END}`;
  const re = new RegExp(`${escapeRe(MAKE_MARK_BEGIN)}[\\s\\S]*?${escapeRe(MAKE_MARK_END)}`, "m");
  if (re.test(existing)) {
    return existing.replace(re, block);
  }
  const sep = existing.endsWith("\n") ? "\n" : "\n\n";
  return `${existing}${sep}${block}\n`;
}

/**
 * Merge a JSON file by deep-merging into existing object. Arrays are replaced.
 * Returns pretty-printed JSON.
 */
export function mergeJson(existing: string, ours: object): string {
  let base: Record<string, unknown> = {};
  try {
    base = JSON.parse(existing);
    if (typeof base !== "object" || Array.isArray(base) || base === null) base = {};
  } catch {
    base = {};
  }
  const merged = deepMerge(base, ours as Record<string, unknown>);
  return `${JSON.stringify(merged, null, 2)}\n`;
}

function deepMerge(
  a: Record<string, unknown>,
  b: Record<string, unknown>,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...a };
  for (const [k, v] of Object.entries(b)) {
    const av = out[k];
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      av &&
      typeof av === "object" &&
      !Array.isArray(av)
    ) {
      out[k] = deepMerge(av as Record<string, unknown>, v as Record<string, unknown>);
    } else {
      out[k] = v;
    }
  }
  return out;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
