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
    const top = kleur.cyan(`${"╭─ harness-kit ".padEnd(60, "─")}╮`);
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
