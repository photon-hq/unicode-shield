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

    // Detect and handle lone surrogates (invalid UTF-16)
    // High surrogate (0xD800-0xDBFF) must be followed by low surrogate (0xDC00-0xDFFF)
    // Low surrogate without preceding high surrogate is also invalid
    if (cp >= 0xd800 && cp <= 0xdfff) {
      const isHighSurrogate = cp <= 0xdbff;
      const nextCp = i + 1 < input.length ? input.codePointAt(i + 1) ?? -1 : -1;
      const nextIsLowSurrogate = nextCp >= 0xdc00 && nextCp <= 0xdfff;
      const prevCp = i > 0 ? input.codePointAt(i - 1) ?? -1 : -1;
      const prevIsHighSurrogate = prevCp >= 0xd800 && prevCp <= 0xdbff;

      const isValidPair = isHighSurrogate
        ? nextIsLowSurrogate
        : prevIsHighSurrogate;

      if (!isValidPair) {
        findings.push({
          type: "surrogate",
          codepoint: cp,
          index: offset,
          name: isHighSurrogate ? "LONE_HIGH_SURROGATE" : "LONE_LOW_SURROGATE",
          action: "stripped",
        });
        i += charLen;
        offset++;
        continue;
      }
    }

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

    if (options.tags && isTagCharacter(cp)) {
      const decoded = getTagCharDecoded(cp);
      findings.push({
        type: "tag",
        codepoint: cp,
        index: offset,
        name: getTagCharName(cp),
        action: "stripped",
      });
      void decoded;
      i += charLen;
      offset++;
      continue;
    }

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

    result += input.slice(i, i + charLen);
    i += charLen;
    offset++;
  }

  return { text: result, findings };
}
