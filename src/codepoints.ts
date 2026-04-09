import type { FindingType } from "./types";

interface CodepointEntry {
  name: string;
  type: FindingType;
}

export const INVISIBLE_CODEPOINTS = new Map<number, CodepointEntry>([
  [0x200b, { name: "ZERO_WIDTH_SPACE", type: "invisible" }],
  [0x200c, { name: "ZERO_WIDTH_NON_JOINER", type: "invisible" }],
  [0x200d, { name: "ZERO_WIDTH_JOINER", type: "invisible" }],
  [0x00ad, { name: "SOFT_HYPHEN", type: "invisible" }],
  [0x2060, { name: "WORD_JOINER", type: "invisible" }],
  [0xfeff, { name: "BOM_ZERO_WIDTH_NO_BREAK_SPACE", type: "invisible" }],
  [0x180e, { name: "MONGOLIAN_VOWEL_SEPARATOR", type: "invisible" }],
  [0x034f, { name: "COMBINING_GRAPHEME_JOINER", type: "invisible" }],
  [0x061c, { name: "ARABIC_LETTER_MARK", type: "invisible" }],
  [0x200e, { name: "LEFT_TO_RIGHT_MARK", type: "invisible" }],
  [0x200f, { name: "RIGHT_TO_LEFT_MARK", type: "invisible" }],
  [0x2061, { name: "FUNCTION_APPLICATION", type: "invisible" }],
  [0x2062, { name: "INVISIBLE_TIMES", type: "invisible" }],
  [0x2063, { name: "INVISIBLE_SEPARATOR", type: "invisible" }],
  [0x2064, { name: "INVISIBLE_PLUS", type: "invisible" }],
  [0x115f, { name: "HANGUL_CHOSEONG_FILLER", type: "invisible" }],
  [0x1160, { name: "HANGUL_JUNGSEONG_FILLER", type: "invisible" }],
  [0x3164, { name: "HANGUL_FILLER", type: "invisible" }],
  [0xffa0, { name: "HALFWIDTH_HANGUL_FILLER", type: "invisible" }],
  [0x17b4, { name: "KHMER_VOWEL_INHERENT_AQ", type: "invisible" }],
  [0x17b5, { name: "KHMER_VOWEL_INHERENT_AA", type: "invisible" }],
  [0x0e47, { name: "THAI_MAITAIKHU", type: "invisible" }],
  [0x0e4d, { name: "THAI_NIKHAHIT", type: "invisible" }],
  [0x0e4e, { name: "THAI_YAMAKKAN", type: "invisible" }],
  [0x1d159, { name: "MUSICAL_SYMBOL_NULL_NOTEHEAD", type: "invisible" }],
  [0x2800, { name: "BRAILLE_PATTERN_BLANK", type: "invisible" }],
]);

export const BIDI_CODEPOINTS = new Map<number, CodepointEntry>([
  [0x202a, { name: "LEFT_TO_RIGHT_EMBEDDING", type: "bidi" }],
  [0x202b, { name: "RIGHT_TO_LEFT_EMBEDDING", type: "bidi" }],
  [0x202c, { name: "POP_DIRECTIONAL_FORMATTING", type: "bidi" }],
  [0x202d, { name: "LEFT_TO_RIGHT_OVERRIDE", type: "bidi" }],
  [0x202e, { name: "RIGHT_TO_LEFT_OVERRIDE", type: "bidi" }],
  [0x2066, { name: "LEFT_TO_RIGHT_ISOLATE", type: "bidi" }],
  [0x2067, { name: "RIGHT_TO_LEFT_ISOLATE", type: "bidi" }],
  [0x2068, { name: "FIRST_STRONG_ISOLATE", type: "bidi" }],
  [0x2069, { name: "POP_DIRECTIONAL_ISOLATE", type: "bidi" }],
]);

export const SPECIAL_SPACE_CODEPOINTS = new Map<number, CodepointEntry>([
  [0x00a0, { name: "NO_BREAK_SPACE", type: "special-space" }],
  [0x1680, { name: "OGHAM_SPACE_MARK", type: "special-space" }],
  [0x2000, { name: "EN_QUAD", type: "special-space" }],
  [0x2001, { name: "EM_QUAD", type: "special-space" }],
  [0x2002, { name: "EN_SPACE", type: "special-space" }],
  [0x2003, { name: "EM_SPACE", type: "special-space" }],
  [0x2004, { name: "THREE_PER_EM_SPACE", type: "special-space" }],
  [0x2005, { name: "FOUR_PER_EM_SPACE", type: "special-space" }],
  [0x2006, { name: "SIX_PER_EM_SPACE", type: "special-space" }],
  [0x2007, { name: "FIGURE_SPACE", type: "special-space" }],
  [0x2008, { name: "PUNCTUATION_SPACE", type: "special-space" }],
  [0x2009, { name: "THIN_SPACE", type: "special-space" }],
  [0x200a, { name: "HAIR_SPACE", type: "special-space" }],
  [0x202f, { name: "NARROW_NO_BREAK_SPACE", type: "special-space" }],
  [0x205f, { name: "MEDIUM_MATHEMATICAL_SPACE", type: "special-space" }],
  [0x3000, { name: "IDEOGRAPHIC_SPACE", type: "special-space" }],
]);

export const SEPARATOR_CODEPOINTS = new Map<number, CodepointEntry>([
  [0x2028, { name: "LINE_SEPARATOR", type: "separator" }],
  [0x2029, { name: "PARAGRAPH_SEPARATOR", type: "separator" }],
]);

export const FORMATTING_CODEPOINTS = new Map<number, CodepointEntry>([
  [0xfff9, { name: "INTERLINEAR_ANNOTATION_ANCHOR", type: "formatting" }],
  [0xfffa, { name: "INTERLINEAR_ANNOTATION_SEPARATOR", type: "formatting" }],
  [0xfffb, { name: "INTERLINEAR_ANNOTATION_TERMINATOR", type: "formatting" }],
  [0x206a, { name: "INHIBIT_SYMMETRIC_SWAPPING", type: "formatting" }],
  [0x206b, { name: "ACTIVATE_SYMMETRIC_SWAPPING", type: "formatting" }],
  [0x206c, { name: "INHIBIT_ARABIC_FORM_SHAPING", type: "formatting" }],
  [0x206d, { name: "ACTIVATE_ARABIC_FORM_SHAPING", type: "formatting" }],
  [0x206e, { name: "NATIONAL_DIGIT_SHAPES", type: "formatting" }],
  [0x206f, { name: "NOMINAL_DIGIT_SHAPES", type: "formatting" }],
  [0xfffc, { name: "OBJECT_REPLACEMENT_CHARACTER", type: "formatting" }],
  [0xfffd, { name: "REPLACEMENT_CHARACTER", type: "formatting" }],
  [0xfffe, { name: "NON_CHARACTER_FFFE", type: "non-character" }],
  [0xffff, { name: "NON_CHARACTER_FFFF", type: "non-character" }],
]);

export function isC0Control(cp: number): boolean {
  return (cp >= 0x0000 && cp <= 0x001f) || cp === 0x007f;
}

export function isC1Control(cp: number): boolean {
  return cp >= 0x0080 && cp <= 0x009f;
}

export function isTagCharacter(cp: number): boolean {
  return cp >= 0xe0000 && cp <= 0xe007f;
}

export function isVariationSelector(cp: number): boolean {
  return (cp >= 0xfe00 && cp <= 0xfe0f) || (cp >= 0xe0100 && cp <= 0xe01ef);
}

export function isMusicalFormatting(cp: number): boolean {
  return cp >= 0x1d173 && cp <= 0x1d17a;
}

export function isShorthandControl(cp: number): boolean {
  return cp >= 0x1bca0 && cp <= 0x1bca3;
}

const C0_NAMES: Record<number, string> = {
  0x00: "NULL",
  0x01: "START_OF_HEADING",
  0x02: "START_OF_TEXT",
  0x03: "END_OF_TEXT",
  0x04: "END_OF_TRANSMISSION",
  0x05: "ENQUIRY",
  0x06: "ACKNOWLEDGE",
  0x07: "BELL",
  0x08: "BACKSPACE",
  0x0b: "VERTICAL_TAB",
  0x0c: "FORM_FEED",
  0x0e: "SHIFT_OUT",
  0x0f: "SHIFT_IN",
  0x10: "DATA_LINK_ESCAPE",
  0x11: "DEVICE_CONTROL_ONE",
  0x12: "DEVICE_CONTROL_TWO",
  0x13: "DEVICE_CONTROL_THREE",
  0x14: "DEVICE_CONTROL_FOUR",
  0x15: "NEGATIVE_ACKNOWLEDGE",
  0x16: "SYNCHRONOUS_IDLE",
  0x17: "END_OF_TRANSMISSION_BLOCK",
  0x18: "CANCEL",
  0x19: "END_OF_MEDIUM",
  0x1a: "SUBSTITUTE",
  0x1b: "ESCAPE",
  0x1c: "FILE_SEPARATOR",
  0x1d: "GROUP_SEPARATOR",
  0x1e: "RECORD_SEPARATOR",
  0x1f: "UNIT_SEPARATOR",
  0x7f: "DELETE",
};

const C0_SAFE = new Set([0x09, 0x0a, 0x0d]);

export function isStrippableC0(cp: number): boolean {
  if (C0_SAFE.has(cp)) return false;
  return isC0Control(cp);
}

export function getC0Name(cp: number): string {
  return C0_NAMES[cp] ?? `C0_CONTROL_${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function getC1Name(cp: number): string {
  return `C1_CONTROL_${cp.toString(16).toUpperCase().padStart(4, "0")}`;
}

export function getTagCharName(cp: number): string {
  const ascii = cp - 0xe0000;
  if (ascii >= 0x20 && ascii <= 0x7e) {
    return `TAG_${String.fromCharCode(ascii).toUpperCase()}`;
  }
  if (cp === 0xe0001) return "LANGUAGE_TAG";
  if (cp === 0xe007f) return "CANCEL_TAG";
  return `TAG_CHAR_${cp.toString(16).toUpperCase()}`;
}

export function getTagCharDecoded(cp: number): string | null {
  const ascii = cp - 0xe0000;
  if (ascii >= 0x20 && ascii <= 0x7e) {
    return String.fromCharCode(ascii);
  }
  return null;
}

export function getVariationSelectorName(cp: number): string {
  if (cp >= 0xfe00 && cp <= 0xfe0f) {
    return `VARIATION_SELECTOR_${cp - 0xfe00 + 1}`;
  }
  return `VARIATION_SELECTOR_${cp - 0xe0100 + 17}`;
}

export function getMusicalFormattingName(cp: number): string {
  const names: Record<number, string> = {
    0x1d173: "MUSICAL_SYMBOL_BEGIN_BEAM",
    0x1d174: "MUSICAL_SYMBOL_END_BEAM",
    0x1d175: "MUSICAL_SYMBOL_BEGIN_TIE",
    0x1d176: "MUSICAL_SYMBOL_END_TIE",
    0x1d177: "MUSICAL_SYMBOL_BEGIN_SLUR",
    0x1d178: "MUSICAL_SYMBOL_END_SLUR",
    0x1d179: "MUSICAL_SYMBOL_BEGIN_PHRASE",
    0x1d17a: "MUSICAL_SYMBOL_END_PHRASE",
  };
  return names[cp] ?? `MUSICAL_FORMAT_${cp.toString(16).toUpperCase()}`;
}

export function getShorthandControlName(cp: number): string {
  const names: Record<number, string> = {
    0x1bca0: "SHORTHAND_FORMAT_LETTER_OVERLAP",
    0x1bca1: "SHORTHAND_FORMAT_CONTINUING_OVERLAP",
    0x1bca2: "SHORTHAND_FORMAT_DOWN_STEP",
    0x1bca3: "SHORTHAND_FORMAT_UP_STEP",
  };
  return names[cp] ?? `SHORTHAND_CONTROL_${cp.toString(16).toUpperCase()}`;
}
