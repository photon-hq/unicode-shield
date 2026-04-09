import type { Finding } from "./types";
import {
  INVISIBLE_CODEPOINTS,
  SPECIAL_SPACE_CODEPOINTS,
  SEPARATOR_CODEPOINTS,
  FORMATTING_CODEPOINTS,
  isStrippableC0,
  isC1Control,
  isTagCharacter,
  isVariationSelector,
  isMusicalFormatting,
  isShorthandControl,
  getC0Name,
  getC1Name,
  getTagCharName,
  getTagCharDecoded,
  getVariationSelectorName,
  getMusicalFormattingName,
  getShorthandControlName,
} from "./codepoints";

interface StripOptions {
  invisibles: boolean;
  controls: boolean;
  tags: boolean;
  variationSelectors: boolean;
  normalizeWhitespace: boolean;
  separators: boolean;
  formatting: boolean;
}

export interface StripResult {
  text: string;
  findings: Finding[];
}

export function strip(input: string, options: StripOptions): StripResult {
  const findings: Finding[] = [];
  let result = "";
  let offset = 0;

  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;

    // ── Invisible characters ───────────────────────────────────────────
    if (options.invisibles) {
      const entry = INVISIBLE_CODEPOINTS.get(cp);
      if (entry) {
        findings.push({
          type: entry.type,
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "stripped",
        });
        i += charLen;
        offset++;
        continue;
      }
    }

    // ── Special whitespace → ASCII space ───────────────────────────────
    if (options.normalizeWhitespace) {
      const entry = SPECIAL_SPACE_CODEPOINTS.get(cp);
      if (entry) {
        findings.push({
          type: entry.type,
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "normalized",
        });
        result += " ";
        i += charLen;
        offset++;
        continue;
      }
    }

    // ── Line/paragraph separators ──────────────────────────────────────
    if (options.separators) {
      const entry = SEPARATOR_CODEPOINTS.get(cp);
      if (entry) {
        findings.push({
          type: entry.type,
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "stripped",
        });
        i += charLen;
        offset++;
        continue;
      }
    }

    // ── C0 control characters (preserve \t \n \r) ─────────────────────
    if (options.controls && isStrippableC0(cp)) {
      findings.push({
        type: "control",
        codepoint: cp,
        index: offset,
        name: getC0Name(cp),
        action: "stripped",
      });
      i += charLen;
      offset++;
      continue;
    }

    // ── C1 control characters ──────────────────────────────────────────
    if (options.controls && isC1Control(cp)) {
      findings.push({
        type: "control",
        codepoint: cp,
        index: offset,
        name: getC1Name(cp),
        action: "stripped",
      });
      i += charLen;
      offset++;
      continue;
    }

    // ── Tag characters (U+E0000-U+E007F) ──────────────────────────────
    if (options.tags && isTagCharacter(cp)) {
      const decoded = getTagCharDecoded(cp);
      findings.push({
        type: "tag",
        codepoint: cp,
        index: offset,
        name: getTagCharName(cp),
        action: "stripped",
      });
      // Tag characters encode hidden ASCII -- we strip them entirely
      // but the decoded content is available via the name field
      void decoded;
      i += charLen;
      offset++;
      continue;
    }

    // ── Variation selectors ────────────────────────────────────────────
    if (options.variationSelectors && isVariationSelector(cp)) {
      findings.push({
        type: "variation-selector",
        codepoint: cp,
        index: offset,
        name: getVariationSelectorName(cp),
        action: "stripped",
      });
      i += charLen;
      offset++;
      continue;
    }

    // ── Musical formatting ─────────────────────────────────────────────
    if (options.formatting && isMusicalFormatting(cp)) {
      findings.push({
        type: "formatting",
        codepoint: cp,
        index: offset,
        name: getMusicalFormattingName(cp),
        action: "stripped",
      });
      i += charLen;
      offset++;
      continue;
    }

    // ── Shorthand format controls ──────────────────────────────────────
    if (options.formatting && isShorthandControl(cp)) {
      findings.push({
        type: "formatting",
        codepoint: cp,
        index: offset,
        name: getShorthandControlName(cp),
        action: "stripped",
      });
      i += charLen;
      offset++;
      continue;
    }

    // ── Annotation, deprecated formatting, non-characters ──────────────
    if (options.formatting) {
      const entry = FORMATTING_CODEPOINTS.get(cp);
      if (entry) {
        findings.push({
          type: entry.type,
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "stripped",
        });
        i += charLen;
        offset++;
        continue;
      }
    }

    // ── Pass through ───────────────────────────────────────────────────
    result += input.slice(i, i + charLen);
    i += charLen;
    offset++;
  }

  return { text: result, findings };
}
