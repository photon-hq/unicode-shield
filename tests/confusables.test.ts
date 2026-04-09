import { describe, expect, test } from "bun:test";
import { normalize, analyze, createShield } from "../src";

describe("confusable homoglyph normalization", () => {
  test("normalizes Cyrillic а to Latin a", () => {
    expect(normalize("\u0430")).toBe("a"); // Cyrillic small а
  });

  test("normalizes Cyrillic homoglyphs in mixed text", () => {
    // "pаypal" with Cyrillic а(U+0430) instead of Latin a
    const attack = "p\u0430ypal";
    expect(normalize(attack)).toBe("paypal");
  });

  test("normalizes multiple Cyrillic confusables", () => {
    // а(0430) с(0441) е(0435) о(043E) р(0440) х(0445)
    const result = normalize("\u0430\u0441\u0435\u043e\u0440\u0445");
    expect(result).toBe("aceopx");
  });

  test("normalizes Greek confusables", () => {
    // ο(03BF) ν(03BD)
    expect(normalize("\u03bf\u03bd")).toBe("ov");
  });

  test("normalizes Armenian confusables", () => {
    // ո(0578) → n
    expect(normalize("\u0578")).toBe("n");
  });

  test("normalizes Cherokee confusables", () => {
    // Ꭺ(13AA) → A
    expect(normalize("\u13aa")).toBe("A");
  });

  test("analyze reports confusable findings", () => {
    const result = analyze("p\u0430ypal");
    expect(result.dirty).toBe(true);
    const confusableFindings = result.findings.filter((f) => f.type === "confusable");
    expect(confusableFindings.length).toBe(1);
    expect(confusableFindings[0].name).toBe("CYRILLIC_SMALL_A");
    expect(confusableFindings[0].action).toBe("normalized");
  });

  test("can disable confusable normalization", () => {
    const shield = createShield({ confusables: false });
    expect(shield.normalize("\u0430")).toBe("\u0430"); // Cyrillic а passes through
  });

  test("handles mixed Latin + Cyrillic attack string", () => {
    // "google.com" with Cyrillic о(043E) and е(0435)
    const attack = "g\u043e\u043egl\u0435.com";
    expect(normalize(attack)).toBe("google.com");
  });
});
