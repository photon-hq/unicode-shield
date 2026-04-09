import { describe, expect, test } from "bun:test";
import { normalize, analyze } from "../src";

describe("invisible character stripping", () => {
  test("strips zero-width space", () => {
    expect(normalize("hello\u200Bworld")).toBe("helloworld");
  });

  test("strips zero-width non-joiner", () => {
    expect(normalize("hello\u200Cworld")).toBe("helloworld");
  });

  test("strips zero-width joiner", () => {
    expect(normalize("hello\u200Dworld")).toBe("helloworld");
  });

  test("strips soft hyphen", () => {
    expect(normalize("hel\u00ADlo")).toBe("hello");
  });

  test("strips word joiner", () => {
    expect(normalize("hello\u2060world")).toBe("helloworld");
  });

  test("strips BOM", () => {
    expect(normalize("\uFEFFhello")).toBe("hello");
  });

  test("strips mongolian vowel separator", () => {
    expect(normalize("hello\u180Eworld")).toBe("helloworld");
  });

  test("strips combining grapheme joiner", () => {
    expect(normalize("hello\u034Fworld")).toBe("helloworld");
  });

  test("strips arabic letter mark", () => {
    expect(normalize("hello\u061Cworld")).toBe("helloworld");
  });

  test("strips LR/RL marks", () => {
    expect(normalize("hello\u200E\u200Fworld")).toBe("helloworld");
  });

  test("strips math invisible operators", () => {
    expect(normalize("x\u2061y\u2062z\u2063w\u2064v")).toBe("xyzwv");
  });

  test("strips hangul fillers", () => {
    expect(normalize("a\u115Fb\u1160c\u3164d\uFFA0e")).toBe("abcde");
  });

  test("strips khmer inherent vowels", () => {
    expect(normalize("a\u17B4b\u17B5c")).toBe("abc");
  });

  test("strips thai combining chars", () => {
    expect(normalize("a\u0E47b\u0E4Dc\u0E4Ed")).toBe("abcd");
  });

  test("strips musical symbol null notehead", () => {
    expect(normalize("a\uD834\uDD59b")).toBe("ab"); // U+1D159
  });

  test("strips braille blank pattern", () => {
    expect(normalize("a\u2800b")).toBe("ab");
  });

  test("strips multiple invisible chars in sequence", () => {
    expect(normalize("\u200B\u200C\u200Dhello\u2060\uFEFF")).toBe("hello");
  });
});

describe("control character stripping", () => {
  test("strips C0 control chars except tab/newline/CR", () => {
    expect(normalize("hello\x00world")).toBe("helloworld");
    expect(normalize("hello\x01world")).toBe("helloworld");
    expect(normalize("hello\x07world")).toBe("helloworld");
    expect(normalize("hello\x1Fworld")).toBe("helloworld");
    expect(normalize("hello\x7Fworld")).toBe("helloworld");
  });

  test("preserves tab, newline, carriage return", () => {
    expect(normalize("hello\tworld")).toBe("hello\tworld");
    expect(normalize("hello\nworld")).toBe("hello\nworld");
    expect(normalize("hello\rworld")).toBe("hello\rworld");
  });

  test("strips C1 control chars", () => {
    expect(normalize("hello\x80world")).toBe("helloworld");
    expect(normalize("hello\x8Fworld")).toBe("helloworld");
    expect(normalize("hello\x9Fworld")).toBe("helloworld");
  });
});

describe("tag character stripping", () => {
  test("strips tag characters encoding hidden ASCII", () => {
    // U+E0068 U+E0065 U+E006C U+E006C U+E006F = hidden "hello"
    const hidden = String.fromCodePoint(0xe0068, 0xe0065, 0xe006c, 0xe006c, 0xe006f);
    expect(normalize(`visible${hidden}text`)).toBe("visibletext");
  });

  test("strips language tag and cancel tag", () => {
    const tag = String.fromCodePoint(0xe0001, 0xe007f);
    expect(normalize(`hello${tag}world`)).toBe("helloworld");
  });
});

describe("variation selector stripping", () => {
  test("strips basic variation selectors (FE00-FE0F)", () => {
    expect(normalize("a\uFE00b\uFE0Fc")).toBe("abc");
  });

  test("strips supplementary variation selectors (E0100-E01EF)", () => {
    const vs17 = String.fromCodePoint(0xe0100);
    const vs256 = String.fromCodePoint(0xe01ef);
    expect(normalize(`a${vs17}b${vs256}c`)).toBe("abc");
  });
});

describe("special whitespace normalization", () => {
  test("normalizes no-break space to regular space", () => {
    expect(normalize("hello\u00A0world")).toBe("hello world");
  });

  test("normalizes ogham space", () => {
    expect(normalize("hello\u1680world")).toBe("hello world");
  });

  test("normalizes ideographic space", () => {
    expect(normalize("hello\u3000world")).toBe("hello world");
  });

  test("normalizes thin/hair spaces", () => {
    expect(normalize("hello\u2009\u200Aworld")).toBe("hello  world");
  });

  test("normalizes medium mathematical space", () => {
    expect(normalize("hello\u205Fworld")).toBe("hello world");
  });

  test("normalizes narrow no-break space", () => {
    expect(normalize("hello\u202Fworld")).toBe("hello world");
  });

  test("normalizes en/em spaces and quads", () => {
    expect(normalize("a\u2000b\u2001c\u2002d\u2003e")).toBe("a b c d e");
  });
});

describe("separator stripping", () => {
  test("strips line separator", () => {
    expect(normalize("hello\u2028world")).toBe("helloworld");
  });

  test("strips paragraph separator", () => {
    expect(normalize("hello\u2029world")).toBe("helloworld");
  });
});

describe("formatting/annotation stripping", () => {
  test("strips interlinear annotation chars", () => {
    expect(normalize("hello\uFFF9hidden\uFFFAsep\uFFFBworld")).toBe("hellohiddensepworld");
  });

  test("strips deprecated formatting controls", () => {
    expect(normalize("a\u206Ab\u206Bc\u206Cd\u206De\u206Ef\u206Fg")).toBe("abcdefg");
  });

  test("strips object replacement character", () => {
    expect(normalize("hello\uFFFCworld")).toBe("helloworld");
  });

  test("strips non-characters", () => {
    expect(normalize("hello\uFFFEworld")).toBe("helloworld");
    expect(normalize("hello\uFFFFworld")).toBe("helloworld");
  });

  test("strips musical formatting chars", () => {
    const beam = String.fromCodePoint(0x1d173);
    const endPhrase = String.fromCodePoint(0x1d17a);
    expect(normalize(`a${beam}b${endPhrase}c`)).toBe("abc");
  });

  test("strips shorthand format controls", () => {
    const overlap = String.fromCodePoint(0x1bca0);
    const upStep = String.fromCodePoint(0x1bca3);
    expect(normalize(`a${overlap}b${upStep}c`)).toBe("abc");
  });
});

describe("clean text passes through", () => {
  test("returns plain ASCII unchanged", () => {
    expect(normalize("Hello, World!")).toBe("Hello, World!");
  });

  test("returns empty string for empty input", () => {
    expect(normalize("")).toBe("");
  });

  test("preserves regular unicode (emoji, CJK, etc.)", () => {
    expect(normalize("Hello 🌍 世界")).toBe("Hello 🌍 世界");
  });

  test("preserves accented characters", () => {
    expect(normalize("café résumé naïve")).toBe("café résumé naïve");
  });
});

describe("analyze mode for strip findings", () => {
  test("reports all invisible chars found", () => {
    const result = analyze("a\u200Bb\u200Cc");
    expect(result.dirty).toBe(true);
    expect(result.text).toBe("abc");
    expect(result.findings).toHaveLength(2);
    expect(result.findings[0].name).toBe("ZERO_WIDTH_SPACE");
    expect(result.findings[0].type).toBe("invisible");
    expect(result.findings[0].codepoint).toBe(0x200b);
    expect(result.findings[1].name).toBe("ZERO_WIDTH_NON_JOINER");
  });

  test("reports clean text as not dirty", () => {
    const result = analyze("Hello World");
    expect(result.dirty).toBe(false);
    expect(result.findings).toHaveLength(0);
    expect(result.text).toBe("Hello World");
  });
});
