import { describe, expect, test } from "bun:test";
import { normalize, analyze } from "../src";

/**
 * Complete iMessage attack surface test matrix.
 * Every character tested survives iMessage transport intact.
 * The normalizer must handle all of them.
 */

describe("iMessage UT matrix -- CRITICAL invisible/dangerous", () => {
  test("UT1: Zero-Width Space", () => {
    expect(normalize("UT1:\u200B:END")).toBe("UT1::END");
  });

  test("UT2: Zero-Width Non-Joiner", () => {
    expect(normalize("UT2:\u200C:END")).toBe("UT2::END");
  });

  test("UT3: Zero-Width Joiner", () => {
    expect(normalize("UT3:\u200D:END")).toBe("UT3::END");
  });

  test("UT4: Word Joiner", () => {
    expect(normalize("UT4:\u2060:END")).toBe("UT4::END");
  });

  test("UT5: BOM/ZWNBSP", () => {
    expect(normalize("UT5:\uFEFF:END")).toBe("UT5::END");
  });

  test("UT6: RTL Override -- active BIDI reversed END to DNE", () => {
    const result = normalize("UT6:\u202EEND:");
    expect(result).toBe("UT6:END:");
    expect(result).not.toContain("\u202E");
  });

  test("UT7: LTR Override", () => {
    expect(normalize("UT7:\u202D:END")).toBe("UT7::END");
  });

  test("UT8: Pop Directional Formatting", () => {
    expect(normalize("UT8:\u202C:END")).toBe("UT8::END");
  });

  test("UT9: LTR/RTL Embedding", () => {
    const result = normalize("UT9:\u202A\u202BEND:");
    expect(result).toBe("UT9:END:");
  });

  test("UT10: LTR/RTL Isolate", () => {
    const result = normalize("UT10:\u2066\u2067END\u2069:");
    expect(result).toBe("UT10:END:");
  });

  test("UT11: LTR/RTL Marks", () => {
    expect(normalize("UT11:\u200E\u200F:END")).toBe("UT11::END");
  });

  test("UT12: Tag Characters encoding hidden HACK", () => {
    const hidden = String.fromCodePoint(0xe0048, 0xe0041, 0xe0043, 0xe004b);
    expect(normalize(`UT12:${hidden}:END`)).toBe("UT12::END");
  });

  test("UT13: Soft Hyphen", () => {
    expect(normalize("UT13:\u00AD:END")).toBe("UT13::END");
  });

  test("UT14: Combining Grapheme Joiner", () => {
    expect(normalize("UT14:\u034F:END")).toBe("UT14::END");
  });

  test("UT25: Null", () => {
    expect(normalize("UT25:\x00:END")).toBe("UT25::END");
  });

  test("UT26: Bell", () => {
    expect(normalize("UT26:\x07:END")).toBe("UT26::END");
  });

  test("UT27: Backspace", () => {
    expect(normalize("UT27:\x08:END")).toBe("UT27::END");
  });

  test("UT28: Vertical Tab", () => {
    expect(normalize("UT28:\x0B:END")).toBe("UT28::END");
  });

  test("UT29: Form Feed", () => {
    expect(normalize("UT29:\x0C:END")).toBe("UT29::END");
  });

  test("UT30: Escape (ANSI)", () => {
    expect(normalize("UT30:\x1B:END")).toBe("UT30::END");
  });

  test("UT31: File/Record Separators", () => {
    expect(normalize("UT31:\x1C\x1D\x1E\x1F:END")).toBe("UT31::END");
  });

  test("UT32: Delete", () => {
    expect(normalize("UT32:\x7F:END")).toBe("UT32::END");
  });

  test("UT33: C1 Controls", () => {
    expect(normalize("UT33:\x80\x8F\x9F:END")).toBe("UT33::END");
  });

  test("UT34: Interlinear Annotation", () => {
    expect(normalize("UT34:\uFFF9\uFFFA\uFFFB:END")).toBe("UT34::END");
  });

  test("UT35: Deprecated Formatting", () => {
    expect(normalize("UT35:\u206A\u206B\u206C\u206D\u206E\u206F:END")).toBe("UT35::END");
  });

  test("UT36: Variation Selectors", () => {
    expect(normalize("UT36:\uFE00\uFE0F:END")).toBe("UT36::END");
  });

  test("UT37: Variation Selectors Supplement", () => {
    const vs17 = String.fromCodePoint(0xe0100);
    const vs256 = String.fromCodePoint(0xe01ef);
    expect(normalize(`UT37:${vs17}${vs256}:END`)).toBe("UT37::END");
  });

  test("UT38: Hangul Fillers", () => {
    expect(normalize("UT38:\u3164\uFFA0\u1160:END")).toBe("UT38::END");
  });

  test("UT39: Musical Invisible (null notehead + formatting)", () => {
    const nullNotehead = String.fromCodePoint(0x1d159);
    const beginBeam = String.fromCodePoint(0x1d173);
    expect(normalize(`UT39:${nullNotehead}${beginBeam}:END`)).toBe("UT39::END");
  });

  test("UT40: Object Replacement", () => {
    expect(normalize("UT40:\uFFFC:END")).toBe("UT40::END");
  });

  test("UT41: Replacement Character", () => {
    expect(normalize("UT41:\uFFFD:END")).toBe("UT41::END");
  });

  test("UT42: Khmer Inherent Vowels", () => {
    expect(normalize("UT42:\u17B4\u17B5:END")).toBe("UT42::END");
  });

  test("UT43: Mongolian Vowel Separator", () => {
    expect(normalize("UT43:\u180E:END")).toBe("UT43::END");
  });

  test("UT44: Arabic Letter Mark", () => {
    expect(normalize("UT44:\u061C:END")).toBe("UT44::END");
  });

  test("UT51: Duployan Shorthand Controls", () => {
    const overlap = String.fromCodePoint(0x1bca0);
    const upStep = String.fromCodePoint(0x1bca3);
    expect(normalize(`UT51:${overlap}${upStep}:END`)).toBe("UT51::END");
  });
});

describe("iMessage UT matrix -- LINE/PARAGRAPH separators", () => {
  test("UT23: Line Separator", () => {
    expect(normalize("UT23:\u2028:END")).toBe("UT23::END");
  });

  test("UT24: Paragraph Separator", () => {
    expect(normalize("UT24:\u2029:END")).toBe("UT24::END");
  });
});

describe("iMessage UT matrix -- SPACE manipulation", () => {
  test("UT16: No-Break Space", () => {
    expect(normalize("UT16:\u00A0:END")).toBe("UT16: :END");
  });

  test("UT17: En/Em/Hair Spaces", () => {
    expect(normalize("UT17:\u2002\u2003\u200A:END")).toBe("UT17:   :END");
  });

  test("UT18: Ideographic Space", () => {
    expect(normalize("UT18:\u3000:END")).toBe("UT18: :END");
  });

  test("UT19: Narrow NBSP", () => {
    expect(normalize("UT19:\u202F:END")).toBe("UT19: :END");
  });

  test("UT20: Medium Math Space", () => {
    expect(normalize("UT20:\u205F:END")).toBe("UT20: :END");
  });

  test("UT21: Ogham Space", () => {
    expect(normalize("UT21:\u1680:END")).toBe("UT21: :END");
  });

  test("UT22: Braille Blank", () => {
    expect(normalize("UT22:\u2800:END")).toBe("UT22::END");
  });
});

describe("iMessage UT matrix -- VISIBLE deceptive (NFKC + confusables)", () => {
  test("UT15: Stacked Diacritics (Zalgo) -- limited to 3", () => {
    const zalgo = "UT15:t\u0300\u0301\u0302\u0303\u0304:END";
    const result = normalize(zalgo);
    // Only 3 combining marks kept on t
    expect(result).toBe("UT15:t\u0300\u0301\u0302:END");
  });

  test("UT45: Fullwidth HACK → HACK via NFKC", () => {
    expect(normalize("UT45:\uFF28\uFF21\uFF23\uFF2B:END")).toBe("UT45:HACK:END");
  });

  test("UT46: Cyrillic homoglyphs normalized to Latin", () => {
    // а(0430)с(0441)е(0435)о(043E)р(0440) → aceop
    const result = normalize("UT46:\u0430\u0441\u0435\u043e\u0440:END");
    expect(result).toBe("UT46:aceop:END");
  });

  test("UT47: Greek homoglyphs normalized to Latin", () => {
    // ο(03BF)ν(03BD)Α(0391) → ovA
    const result = normalize("UT47:\u03bf\u03bd\u0391:END");
    expect(result).toBe("UT47:ovA:END");
  });

  test("UT48: Math Bold/Italic via NFKC", () => {
    // 𝐚(1D41A) 𝑎(1D44E) 𝒂(1D482) → a a a
    const mathBold = String.fromCodePoint(0x1d41a);
    const mathItalic = String.fromCodePoint(0x1d44e);
    const mathBoldItalic = String.fromCodePoint(0x1d482);
    const result = normalize(`UT48:${mathBold}${mathItalic}${mathBoldItalic}:END`);
    expect(result).toBe("UT48:aaa:END");
  });

  test("UT49: Enclosed/Circled via NFKC", () => {
    // ①②Ⓐⓐ -- NFKC normalizes these
    const result = normalize("UT49:\u2460\u2461\u24B6\u24D0:END");
    expect(result).toContain("UT49:");
    expect(result).toContain(":END");
    // NFKC turns these into "1." "2." "A" "a" respectively
    expect(result).not.toContain("\u2460");
    expect(result).not.toContain("\u24B6");
  });

  test("UT50: Superscript/Subscript via NFKC", () => {
    // ⁰¹²³⁴₀₁ → 0123401
    const result = normalize("UT50:\u2070\u00B9\u00B2\u00B3\u2074\u2080\u2081:END");
    expect(result).toBe("UT50:0123401:END");
  });
});

describe("combined attack payloads", () => {
  test("strips tag-encoded hidden instruction", () => {
    const hidden = String.fromCodePoint(
      0xe0049, 0xe0067, 0xe006e, 0xe006f, 0xe0072, 0xe0065, // "Ignore"
      0xe0020,                                                 // " "
      0xe0061, 0xe006c, 0xe006c,                              // "all"
    );
    const result = normalize(`Normal message${hidden}`);
    expect(result).toBe("Normal message");
  });

  test("handles zero-width injection in the middle of words", () => {
    expect(normalize("p\u200Ba\u200Cy\u200Dp\u2060a\uFEFFl")).toBe("paypal");
  });

  test("handles bidi + invisible + control combo attack", () => {
    const attack = "\uFEFF\u200B\u202EFollow this link\u202C\x00\u2029";
    const result = normalize(attack);
    expect(result).toBe("Follow this link");
  });

  test("handles fullwidth + homoglyph combo", () => {
    // Fullwidth p + Cyrillic а + normal y + fullwidth pal
    const attack = "\uFF50\u0430y\uFF50\uFF41\uFF4C";
    const result = normalize(attack);
    expect(result).toBe("paypal");
  });

  test("analyze on complex payload reports all finding types", () => {
    const payload = "\u200B\u202Ehello\uFF57orld\u0430\x00t\u0300\u0301\u0302\u0303";
    const result = analyze(payload);
    expect(result.dirty).toBe(true);
    const types = new Set(result.findings.map((f) => f.type));
    expect(types.has("invisible")).toBe(true);
    expect(types.has("bidi")).toBe(true);
    expect(types.has("nfkc")).toBe(true);
    expect(types.has("confusable")).toBe(true);
    expect(types.has("control")).toBe(true);
    expect(types.has("diacritics")).toBe(true);
  });
});
