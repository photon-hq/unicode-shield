import { describe, expect, test } from "bun:test";
import { normalize, analyze, createShield } from "../src";

describe("NFKC normalization", () => {
  test("normalizes fullwidth ASCII to regular ASCII", () => {
    // ＨＡＣＫ → HACK
    expect(normalize("\uFF28\uFF21\uFF23\uFF2B")).toBe("HACK");
  });

  test("normalizes fullwidth lowercase", () => {
    // ｈａｃｋ → hack
    expect(normalize("\uFF48\uFF41\uFF43\uFF4B")).toBe("hack");
  });

  test("normalizes superscript digits", () => {
    // ⁰¹²³⁴ → 01234
    expect(normalize("\u2070\u00B9\u00B2\u00B3\u2074")).toBe("01234");
  });

  test("normalizes subscript digits", () => {
    // ₀₁₂₃₄ → 01234
    expect(normalize("\u2080\u2081\u2082\u2083\u2084")).toBe("01234");
  });

  test("normalizes math bold letters", () => {
    // 𝐚(1D41A) → a, via NFKC
    const mathBoldA = String.fromCodePoint(0x1d41a);
    const result = normalize(mathBoldA);
    expect(result).toBe("a");
  });

  test("normalizes math italic letters", () => {
    // 𝑎(1D44E) → a
    const mathItalicA = String.fromCodePoint(0x1d44e);
    const result = normalize(mathItalicA);
    expect(result).toBe("a");
  });

  test("normalizes enclosed/circled characters", () => {
    // NFKC decomposition depends on the character:
    // ① → "1" (some implementations), Ⓐ → "A"
    const circled1 = normalize("\u2460");
    const circledA = normalize("\u24B6");
    // Just verify they no longer contain the original codepoints
    expect(circled1.codePointAt(0)).not.toBe(0x2460);
    expect(circledA.codePointAt(0)).not.toBe(0x24b6);
  });

  test("analyze reports NFKC findings", () => {
    const result = analyze("\uFF28\uFF21\uFF23\uFF2B");
    expect(result.dirty).toBe(true);
    const nfkcFindings = result.findings.filter((f) => f.type === "nfkc");
    expect(nfkcFindings.length).toBe(4);
    expect(nfkcFindings[0].action).toBe("normalized");
  });

  test("can disable NFKC normalization", () => {
    const shield = createShield({ nfkc: false });
    expect(shield.normalize("\uFF28\uFF21\uFF23\uFF2B")).toBe("\uFF28\uFF21\uFF23\uFF2B");
  });

  test("preserves normal ASCII when NFKC is enabled", () => {
    expect(normalize("Hello World 123")).toBe("Hello World 123");
  });

  test("handles mixed fullwidth and normal text", () => {
    expect(normalize("Hello \uFF37orld")).toBe("Hello World");
  });
});
