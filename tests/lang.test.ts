import { describe, expect, it } from "vitest";
import { detectLang, isSupportedLang, normalizeLang } from "../src/utils/lang.js";

describe("normalizeLang", () => {
  it("maps common locale strings to supported codes", () => {
    expect(normalizeLang("en_US.UTF-8")).toBe("en");
    expect(normalizeLang("zh_CN.UTF-8")).toBe("zh");
    expect(normalizeLang("zh_TW")).toBe("zh");
    expect(normalizeLang("ja_JP.UTF-8")).toBe("ja");
    expect(normalizeLang("ko_KR")).toBe("ko");
    expect(normalizeLang("es_ES")).toBe("es");
    expect(normalizeLang("pt_BR")).toBe("pt");
    expect(normalizeLang("fr_FR.UTF-8")).toBe("fr");
    expect(normalizeLang("de_DE")).toBe("de");
  });

  it("returns undefined for unsupported locales", () => {
    expect(normalizeLang("ar_SA")).toBeUndefined();
    expect(normalizeLang("klingon")).toBeUndefined();
    expect(normalizeLang("")).toBeUndefined();
  });

  it("handles short codes too", () => {
    expect(normalizeLang("en")).toBe("en");
    expect(normalizeLang("zh")).toBe("zh");
  });
});

describe("detectLang", () => {
  it("prefers HARNESS_LANG over LANG", () => {
    expect(detectLang({ HARNESS_LANG: "ja", LANG: "en_US.UTF-8" } as NodeJS.ProcessEnv)).toBe("ja");
  });

  it("falls back from LC_ALL to LANG to LANGUAGE", () => {
    expect(detectLang({ LANG: "fr_FR.UTF-8" } as NodeJS.ProcessEnv)).toBe("fr");
    expect(detectLang({ LC_ALL: "de_DE" } as NodeJS.ProcessEnv)).toBe("de");
    expect(detectLang({ LANGUAGE: "ko_KR" } as NodeJS.ProcessEnv)).toBe("ko");
  });

  it("defaults to en when nothing matches", () => {
    expect(detectLang({} as NodeJS.ProcessEnv)).toBe("en");
    expect(detectLang({ LANG: "ar_SA" } as NodeJS.ProcessEnv)).toBe("en");
  });
});

describe("isSupportedLang", () => {
  it("true for the 8 ship languages", () => {
    for (const l of ["en", "zh", "ja", "ko", "es", "pt", "fr", "de"]) {
      expect(isSupportedLang(l)).toBe(true);
    }
  });
  it("false for anything else", () => {
    expect(isSupportedLang("ru")).toBe(false);
    expect(isSupportedLang("klingon")).toBe(false);
    expect(isSupportedLang("")).toBe(false);
  });
});
