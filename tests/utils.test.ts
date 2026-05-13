import { describe, expect, it } from "vitest";
import { render } from "../src/utils/fs.js";
import { mergeJson, mergeMakefile, mergeMarkdown } from "../src/utils/merge.js";

describe("render", () => {
  it("substitutes ${VAR} placeholders", () => {
    expect(render("hello ${NAME}", { NAME: "world" })).toBe("hello world");
  });
  it("leaves unknown placeholders untouched", () => {
    expect(render("a ${UNKNOWN} b", {})).toBe("a ${UNKNOWN} b");
  });
  it("substitutes multiple", () => {
    expect(render("${A}-${B}-${A}", { A: "x", B: "y" })).toBe("x-y-x");
  });
});

describe("mergeMarkdown", () => {
  it("appends harness block when no marker", () => {
    const existing = "# My project\n\nSome text.\n";
    const ours = "## Harness section\n";
    const out = mergeMarkdown(existing, ours);
    expect(out).toContain("# My project");
    expect(out).toContain("<!-- harness-kit:begin -->");
    expect(out).toContain("## Harness section");
    expect(out).toContain("<!-- harness-kit:end -->");
  });

  it("replaces existing marker block (idempotent)", () => {
    const existing =
      "# Project\n\n<!-- harness-kit:begin -->\nold content\n<!-- harness-kit:end -->\n";
    const out = mergeMarkdown(existing, "new content\n");
    expect(out).toContain("new content");
    expect(out).not.toContain("old content");
    // exactly one marker block
    expect(out.match(/harness-kit:begin/g)?.length).toBe(1);
  });
});

describe("mergeMakefile", () => {
  it("adds Make markers when not present", () => {
    const existing = "all:\n\techo hi\n";
    const out = mergeMakefile(existing, "check:\n\ttrue\n");
    expect(out).toContain("# harness-kit:begin");
    expect(out).toContain("check:");
    expect(out).toContain("# harness-kit:end");
  });
});

describe("mergeJson", () => {
  it("deep-merges objects", () => {
    const a = JSON.stringify({ a: 1, nested: { x: 1 } });
    const out = JSON.parse(mergeJson(a, { nested: { y: 2 }, b: 2 } as object));
    expect(out).toEqual({ a: 1, nested: { x: 1, y: 2 }, b: 2 });
  });
  it("survives malformed input", () => {
    const out = JSON.parse(mergeJson("not json", { a: 1 }));
    expect(out).toEqual({ a: 1 });
  });
});
