import { describe, expect, test } from "bun:test";
import { normalize, analyze, createShield } from "../src";

describe("stacked diacritics / Zalgo text", () => {
  test("limits combining marks to 3 per base character by default", () => {
    // t + 4 combining marks: grave, acute, circumflex, tilde
    const zalgo = "t\u0300\u0301\u0302\u0303";
    const result = normalize(zalgo);
    // Should keep 3, strip the 4th
    expect(result).toBe("t\u0300\u0301\u0302");
  });

  test("strips extreme Zalgo text", () => {
    // 20 combining marks on a single character
    const marks = "\u0300\u0301\u0302\u0303\u0304\u0305\u0306\u0307\u0308\u0309\u030A\u030B\u030C\u030D\u030E\u030F\u0310\u0311\u0312\u0313";
    const zalgo = `H${marks}ello`;
    const result = normalize(zalgo);
    // Should keep only 3 marks on H
    expect(result).toBe("H\u0300\u0301\u0302ello");
  });

  test("preserves normal accented characters", () => {
    // Single combining marks per base character are preserved (within limit of 3)
    // NFC-precomposed accented chars pass through both NFKC and diacritics limiter
    expect(normalize("caf\u00E9")).toBe("caf\u00E9"); // precomposed é
    expect(normalize("na\u00EFve")).toBe("na\u00EFve"); // precomposed ï
  });

  test("analyze reports stripped diacritics", () => {
    const zalgo = "t\u0300\u0301\u0302\u0303\u0304";
    const result = analyze(zalgo);
    expect(result.dirty).toBe(true);
    const diacriticFindings = result.findings.filter((f) => f.type === "diacritics");
    expect(diacriticFindings.length).toBe(2); // 4th and 5th mark stripped
    expect(diacriticFindings[0].action).toBe("stripped");
  });

  test("custom limit of 1 is very aggressive", () => {
    const shield = createShield({ diacritics: 1 });
    const result = shield.normalize("t\u0300\u0301");
    expect(result).toBe("t\u0300");
  });

  test("limit of 0 strips all combining marks", () => {
    const shield = createShield({ diacritics: 0 });
    const result = shield.normalize("t\u0300\u0301\u0302");
    expect(result).toBe("t");
  });

  test("can disable diacritics limiting", () => {
    const shield = createShield({ diacritics: false });
    const marks = "\u0300\u0301\u0302\u0303\u0304\u0305";
    const result = shield.normalize(`t${marks}`);
    expect(result).toBe(`t${marks}`);
  });

  test("resets count for each base character", () => {
    // Each character gets its own count
    const text = "a\u0300\u0301\u0302\u0303b\u0300\u0301\u0302\u0303";
    const result = normalize(text);
    // a keeps 3, strips 1; b keeps 3, strips 1
    expect(result).toBe("a\u0300\u0301\u0302b\u0300\u0301\u0302");
  });
});
