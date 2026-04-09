import { describe, expect, test } from "bun:test";
import { normalize, analyze, createShield } from "../src";

describe("bidi stripping (default)", () => {
  test("strips right-to-left override", () => {
    expect(normalize("hello\u202Eworld")).toBe("helloworld");
  });

  test("strips left-to-right override", () => {
    expect(normalize("hello\u202Dworld")).toBe("helloworld");
  });

  test("strips all directional embeddings", () => {
    expect(normalize("\u202Ahello\u202Bworld\u202C")).toBe("helloworld");
  });

  test("strips all directional isolates", () => {
    expect(normalize("\u2066hello\u2067world\u2068test\u2069")).toBe("helloworldtest");
  });

  test("strips bidi chars used to reverse displayed text", () => {
    const attack = "Click here: \u202Emoc.elgoog.www\u202C";
    const cleaned = normalize(attack);
    expect(cleaned).toBe("Click here: moc.elgoog.www");
    expect(cleaned).not.toContain("\u202E");
    expect(cleaned).not.toContain("\u202C");
  });
});

describe("bidi escape mode", () => {
  test("replaces bidi chars with [U+XXXX] placeholders", () => {
    const shield = createShield({ bidi: "escape" });
    expect(shield.normalize("hello\u202Eworld")).toBe("hello[U+202E]world");
  });

  test("escapes all bidi control types", () => {
    const shield = createShield({ bidi: "escape" });
    const result = shield.normalize("\u202A\u2066");
    expect(result).toBe("[U+202A][U+2066]");
  });

  test("analyze reports escaped action", () => {
    const shield = createShield({ bidi: "escape" });
    const result = shield.analyze("a\u202Eb");
    expect(result.findings[0].action).toBe("escaped");
    expect(result.findings[0].name).toBe("RIGHT_TO_LEFT_OVERRIDE");
  });
});

describe("bidi ignore mode", () => {
  test("passes bidi chars through unchanged", () => {
    const shield = createShield({ bidi: "ignore" });
    expect(shield.normalize("hello\u202Eworld")).toBe("hello\u202Eworld");
  });

  test("analyze reports no bidi findings", () => {
    const shield = createShield({ bidi: "ignore" });
    const result = shield.analyze("hello\u202Eworld");
    // still might have findings from other modules, but no bidi ones
    const bidiFindings = result.findings.filter((f) => f.type === "bidi");
    expect(bidiFindings).toHaveLength(0);
  });
});
