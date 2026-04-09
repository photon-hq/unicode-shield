import type { BidiMode, Finding } from "./types";
import { BIDI_CODEPOINTS } from "./codepoints";

export interface BidiResult {
  text: string;
  findings: Finding[];
}

export function processBidi(input: string, mode: BidiMode): BidiResult {
  if (mode === "ignore") {
    return { text: input, findings: [] };
  }

  const findings: Finding[] = [];
  let result = "";
  let offset = 0;

  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;

    const entry = BIDI_CODEPOINTS.get(cp);
    if (entry) {
      if (mode === "strip") {
        findings.push({
          type: "bidi",
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "stripped",
        });
      } else {
        const escaped = `[U+${cp.toString(16).toUpperCase().padStart(4, "0")}]`;
        result += escaped;
        findings.push({
          type: "bidi",
          codepoint: cp,
          index: offset,
          name: entry.name,
          action: "escaped",
        });
      }
      i += charLen;
      offset++;
      continue;
    }

    result += input.slice(i, i + charLen);
    i += charLen;
    offset++;
  }

  return { text: result, findings };
}
