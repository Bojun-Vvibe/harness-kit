import { execSync } from "node:child_process";
import kleur from "kleur";

const symbols = {
  info: kleur.cyan("ℹ"),
  ok: kleur.green("✓"),
  warn: kleur.yellow("⚠"),
  err: kleur.red("✗"),
  step: kleur.magenta("▸"),
  arrow: kleur.gray("→"),
};

export const log = {
  info: (msg: string) => console.log(`${symbols.info} ${msg}`),
  ok: (msg: string) => console.log(`${symbols.ok} ${msg}`),
  warn: (msg: string) => console.log(`${symbols.warn} ${kleur.yellow(msg)}`),
  err: (msg: string) => console.error(`${symbols.err} ${kleur.red(msg)}`),
  step: (msg: string) => console.log(`\n${symbols.step} ${kleur.bold(msg)}`),
  dim: (msg: string) => console.log(kleur.gray(msg)),
  raw: (msg: string) => console.log(msg),
  blank: () => console.log(""),
  banner: (title: string, subtitle?: string) => {
    const top = `${kleur.cyan("╭─ harness-kit ".padEnd(60, "─"))}╮`;
    const t = `${`│ ${kleur.bold(title)}`.padEnd(70)} │`;
    console.log("");
    console.log(top);
    console.log(kleur.cyan(t));
    if (subtitle) {
      const s = `${`│ ${kleur.gray(subtitle)}`.padEnd(70)} │`;
      console.log(kleur.cyan(s));
    }
    console.log(kleur.cyan(`${"╰".padEnd(60, "─")}╯`));
  },
};

export const c = kleur;

/**
 * Detect whether the `harness` CLI is callable from the user's PATH.
 * Used to decide whether to print "run `harness doctor`" or a longer
 * "you need to install harness-kit globally first" message.
 */
export function isHarnessOnPath(): boolean {
  try {
    execSync("command -v harness", { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

/**
 * Print a uniform "how to make `harness` available" block when the
 * CLI is not yet on PATH. Used by init/inject completion banners.
 */
export function printInstallHint(): void {
  log.blank();
  log.warn(
    "The `harness` command is not on your PATH yet — but the files we just generated call it directly.",
  );
  log.raw("");
  log.raw("  Install it globally so the generated Makefile / scripts work:");
  log.raw("");
  log.raw(
    `    ${c.cyan("npm install -g harness-kit")}            ${c.dim("# preferred (once published to npm)")}`,
  );
  log.raw(
    `    ${c.cyan("npm install -g <path-to-checkout>")}     ${c.dim("# if you cloned this repo")}`,
  );
  log.raw("");
  log.raw(`  Verify:  ${c.cyan("harness --version")}    ${c.dim("→ should print harness/0.x.x")}`);
  log.blank();
}
