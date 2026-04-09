import type { Finding } from "./types";

export interface NfkcResult {
  text: string;
  findings: Finding[];
}

function isMathAlphanumeric(cp: number): boolean {
  return cp >= 0x1d400 && cp <= 0x1d7ff;
}

function isFullwidthAscii(cp: number): boolean {
  return cp >= 0xff01 && cp <= 0xff5e;
}

function isEnclosedAlphanumeric(cp: number): boolean {
  return (
    (cp >= 0x2460 && cp <= 0x24ff) ||
    (cp >= 0x1f100 && cp <= 0x1f1ff) ||
    (cp >= 0x1f200 && cp <= 0x1f2ff)
  );
}

function isSuperscriptSubscript(cp: number): boolean {
  return (
    (cp >= 0x2070 && cp <= 0x209f) ||
    cp === 0x00b2 || // ²
    cp === 0x00b3 || // ³
    cp === 0x00b9    // ¹
  );
}

function classifyNfkcChar(cp: number): string | null {
  if (isFullwidthAscii(cp)) return "FULLWIDTH";
  if (isMathAlphanumeric(cp)) return "MATH_ALPHANUMERIC";
  if (isEnclosedAlphanumeric(cp)) return "ENCLOSED_ALPHANUMERIC";
  if (isSuperscriptSubscript(cp)) return "SUPERSCRIPT_SUBSCRIPT";
  return null;
}

export function processNfkc(input: string, enabled: boolean): NfkcResult {
  if (!enabled) {
    return { text: input, findings: [] };
  }

  const findings: Finding[] = [];
  let needsNormalization = false;

  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;
    if (classifyNfkcChar(cp) !== null) {
      needsNormalization = true;
      break;
    }
    i += charLen;
  }

  if (!needsNormalization) {
    return { text: input, findings: [] };
  }

  let offset = 0;
  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;
    const category = classifyNfkcChar(cp);
    if (category !== null) {
      findings.push({
        type: "nfkc",
        codepoint: cp,
        index: offset,
        name: `${category}_${cp.toString(16).toUpperCase().padStart(4, "0")}`,
        action: "normalized",
      });
    }
    i += charLen;
    offset++;
  }

  const normalized = input.normalize("NFKC");
  return { text: normalized, findings };
}
