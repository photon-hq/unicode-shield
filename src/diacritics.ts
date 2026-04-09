import type { Finding } from "./types";

export interface DiacriticsResult {
  text: string;
  findings: Finding[];
}

function isCombiningMark(cp: number): boolean {
  return (
    (cp >= 0x0300 && cp <= 0x036f) ||
    (cp >= 0x1ab0 && cp <= 0x1aff) ||
    (cp >= 0x1dc0 && cp <= 0x1dff) ||
    (cp >= 0x20d0 && cp <= 0x20ff) ||
    (cp >= 0xfe20 && cp <= 0xfe2f) ||
    (cp >= 0x0483 && cp <= 0x0489) ||
    (cp >= 0x0591 && cp <= 0x05bd) ||
    (cp >= 0x05bf && cp <= 0x05bf) ||
    (cp >= 0x05c1 && cp <= 0x05c2) ||
    (cp >= 0x05c4 && cp <= 0x05c5) ||
    (cp >= 0x05c7 && cp <= 0x05c7) ||
    (cp >= 0x0610 && cp <= 0x061a) ||
    (cp >= 0x064b && cp <= 0x065f) ||
    (cp >= 0x0670 && cp <= 0x0670) ||
    (cp >= 0x06d6 && cp <= 0x06dc) ||
    (cp >= 0x06df && cp <= 0x06e4) ||
    (cp >= 0x06e7 && cp <= 0x06e8) ||
    (cp >= 0x06ea && cp <= 0x06ed) ||
    (cp >= 0x0730 && cp <= 0x074a) ||
    (cp >= 0x0900 && cp <= 0x0903) ||
    (cp >= 0x093a && cp <= 0x094f) ||
    (cp >= 0x0951 && cp <= 0x0957) ||
    (cp >= 0x0962 && cp <= 0x0963) ||
    (cp >= 0xa8e0 && cp <= 0xa8f1) ||
    (cp >= 0x0e31 && cp <= 0x0e31) ||
    (cp >= 0x0e34 && cp <= 0x0e3a) ||
    (cp >= 0x0e48 && cp <= 0x0e4b) ||
    (cp >= 0x0eb1 && cp <= 0x0eb1) ||
    (cp >= 0x0eb4 && cp <= 0x0eb9) ||
    (cp >= 0x0ebb && cp <= 0x0ebc) ||
    (cp >= 0x0ec8 && cp <= 0x0ecd) ||
    (cp >= 0x0f18 && cp <= 0x0f19) ||
    (cp >= 0x0f35 && cp <= 0x0f35) ||
    (cp >= 0x0f37 && cp <= 0x0f37) ||
    (cp >= 0x0f39 && cp <= 0x0f39) ||
    (cp >= 0x0f71 && cp <= 0x0f84) ||
    (cp >= 0x0f86 && cp <= 0x0f87) ||
    (cp >= 0x0f8d && cp <= 0x0f97) ||
    (cp >= 0x0f99 && cp <= 0x0fbc) ||
    (cp >= 0x0fc6 && cp <= 0x0fc6) ||
    (cp >= 0x102b && cp <= 0x103e) ||
    (cp >= 0x1056 && cp <= 0x1059) ||
    (cp >= 0x105e && cp <= 0x1060) ||
    (cp >= 0x1062 && cp <= 0x1064) ||
    (cp >= 0x1067 && cp <= 0x106d) ||
    (cp >= 0x1071 && cp <= 0x1074) ||
    (cp >= 0x1082 && cp <= 0x108d) ||
    (cp >= 0x135d && cp <= 0x135f) ||
    (cp >= 0x1712 && cp <= 0x1714) ||
    (cp >= 0x1732 && cp <= 0x1734) ||
    (cp >= 0x1752 && cp <= 0x1753) ||
    (cp >= 0x1772 && cp <= 0x1773) ||
    (cp >= 0x302a && cp <= 0x302f) ||
    (cp >= 0x3099 && cp <= 0x309a)
  );
}

export function processDiacritics(
  input: string,
  maxPerBase: number | false,
): DiacriticsResult {
  if (maxPerBase === false) {
    return { text: input, findings: [] };
  }

  const limit = maxPerBase;
  const findings: Finding[] = [];
  let result = "";
  let combiningCount = 0;
  let offset = 0;

  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;

    if (isCombiningMark(cp)) {
      combiningCount++;
      if (combiningCount > limit) {
        findings.push({
          type: "diacritics",
          codepoint: cp,
          index: offset,
          name: `COMBINING_MARK_${cp.toString(16).toUpperCase().padStart(4, "0")}`,
          action: "stripped",
        });
        i += charLen;
        offset++;
        continue;
      }
    } else {
      combiningCount = 0;
    }

    result += input.slice(i, i + charLen);
    i += charLen;
    offset++;
  }

  return { text: result, findings };
}
