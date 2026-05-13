import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/cli.ts"],
  format: ["cjs"],
  target: "node18",
  platform: "node",
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  shims: true,
  banner: { js: "#!/usr/bin/env node" },
  outExtension: () => ({ js: ".cjs" }),
});
