import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Resolve a path that ships with the package (templates/, stacks/).
 * Works in both dev (src/) and built (dist/) layouts.
 */
export function pkgPath(...segments: string[]): string {
  // In built CJS the file is dist/cli.cjs; in source it's src/utils/fs.ts.
  // The shipped package layout is package-root/{dist,templates,stacks}.
  // We walk up from this file until we find a directory that contains
  // both `templates/` and `package.json`.
  let here: string;
  try {
    here = fileURLToPath(import.meta.url);
  } catch {
    here = __filename;
  }
  let dir = dirname(here);
  for (let i = 0; i < 6; i++) {
    if (existsSync(join(dir, "package.json")) && existsSync(join(dir, "templates"))) {
      return resolve(dir, ...segments);
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Fallback (should not happen): assume package root is two levels up from src/utils.
  return resolve(dirname(here), "..", "..", ...segments);
}

export async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

export async function isFile(p: string): Promise<boolean> {
  try {
    return (await stat(p)).isFile();
  } catch {
    return false;
  }
}

export async function readText(p: string): Promise<string> {
  return await readFile(p, "utf8");
}

export async function writeText(p: string, content: string): Promise<void> {
  await mkdir(dirname(p), { recursive: true });
  await writeFile(p, content, "utf8");
}

export async function ensureDir(p: string): Promise<void> {
  await mkdir(p, { recursive: true });
}

export function relPath(from: string, to: string): string {
  return relative(from, to) || ".";
}

/**
 * Render a template by replacing ${VAR} placeholders.
 * Variables not present in `vars` are left as-is.
 */
export function render(template: string, vars: Record<string, string>): string {
  return template.replace(/\$\{([A-Z_][A-Z0-9_]*)\}/g, (full, key: string) => {
    return key in vars ? vars[key]! : full;
  });
}
