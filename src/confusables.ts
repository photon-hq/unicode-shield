import type { Finding } from "./types";

export interface ConfusablesResult {
  text: string;
  findings: Finding[];
}

const CYRILLIC_TO_LATIN = new Map<number, [string, string]>([
  [0x0430, ["a", "CYRILLIC_SMALL_A"]],
  [0x0410, ["A", "CYRILLIC_CAPITAL_A"]],
  [0x0441, ["c", "CYRILLIC_SMALL_ES"]],
  [0x0421, ["C", "CYRILLIC_CAPITAL_ES"]],
  [0x0435, ["e", "CYRILLIC_SMALL_IE"]],
  [0x0415, ["E", "CYRILLIC_CAPITAL_IE"]],
  [0x043e, ["o", "CYRILLIC_SMALL_O"]],
  [0x041e, ["O", "CYRILLIC_CAPITAL_O"]],
  [0x0440, ["p", "CYRILLIC_SMALL_ER"]],
  [0x0420, ["P", "CYRILLIC_CAPITAL_ER"]],
  [0x0445, ["x", "CYRILLIC_SMALL_HA"]],
  [0x0425, ["X", "CYRILLIC_CAPITAL_HA"]],
  [0x0443, ["y", "CYRILLIC_SMALL_U"]],
  [0x0423, ["Y", "CYRILLIC_CAPITAL_U"]],
  [0x0455, ["s", "CYRILLIC_SMALL_DZE"]],
  [0x0405, ["S", "CYRILLIC_CAPITAL_DZE"]],
  [0x0456, ["i", "CYRILLIC_SMALL_BYELORUSSIAN_I"]],
  [0x0406, ["I", "CYRILLIC_CAPITAL_BYELORUSSIAN_I"]],
  [0x0458, ["j", "CYRILLIC_SMALL_JE"]],
  [0x0408, ["J", "CYRILLIC_CAPITAL_JE"]],
  [0x04bb, ["h", "CYRILLIC_SMALL_SHHA"]],
  [0x04ba, ["H", "CYRILLIC_CAPITAL_SHHA"]],
  [0x0432, ["B", "CYRILLIC_SMALL_VE"]],
  [0x043a, ["k", "CYRILLIC_SMALL_KA"]],
  [0x041a, ["K", "CYRILLIC_CAPITAL_KA"]],
  [0x043c, ["m", "CYRILLIC_SMALL_EM"]],
  [0x041c, ["M", "CYRILLIC_CAPITAL_EM"]],
  [0x0442, ["t", "CYRILLIC_SMALL_TE"]],
  [0x0422, ["T", "CYRILLIC_CAPITAL_TE"]],
]);

const GREEK_TO_LATIN = new Map<number, [string, string]>([
  [0x03bf, ["o", "GREEK_SMALL_OMICRON"]],
  [0x039f, ["O", "GREEK_CAPITAL_OMICRON"]],
  [0x03b1, ["a", "GREEK_SMALL_ALPHA"]],
  [0x0391, ["A", "GREEK_CAPITAL_ALPHA"]],
  [0x03b2, ["b", "GREEK_SMALL_BETA"]],
  [0x0392, ["B", "GREEK_CAPITAL_BETA"]],
  [0x03b5, ["e", "GREEK_SMALL_EPSILON"]],
  [0x0395, ["E", "GREEK_CAPITAL_EPSILON"]],
  [0x0397, ["H", "GREEK_CAPITAL_ETA"]],
  [0x0399, ["I", "GREEK_CAPITAL_IOTA"]],
  [0x039a, ["K", "GREEK_CAPITAL_KAPPA"]],
  [0x039c, ["M", "GREEK_CAPITAL_MU"]],
  [0x039d, ["N", "GREEK_CAPITAL_NU"]],
  [0x03bd, ["v", "GREEK_SMALL_NU"]],
  [0x03c1, ["p", "GREEK_SMALL_RHO"]],
  [0x03a1, ["P", "GREEK_CAPITAL_RHO"]],
  [0x03a4, ["T", "GREEK_CAPITAL_TAU"]],
  [0x03a5, ["Y", "GREEK_CAPITAL_UPSILON"]],
  [0x03a7, ["X", "GREEK_CAPITAL_CHI"]],
  [0x03b6, ["Z", "GREEK_SMALL_ZETA"]],
  [0x0396, ["Z", "GREEK_CAPITAL_ZETA"]],
]);

const ARMENIAN_TO_LATIN = new Map<number, [string, string]>([
  [0x0570, ["h", "ARMENIAN_SMALL_HO"]],
  [0x0578, ["n", "ARMENIAN_SMALL_VO"]],
  [0x057d, ["u", "ARMENIAN_SMALL_SEH"]],
  [0x0585, ["o", "ARMENIAN_SMALL_OH"]],
]);

const CHEROKEE_TO_LATIN = new Map<number, [string, string]>([
  [0x13aa, ["A", "CHEROKEE_GO"]],
  [0x13a9, ["D", "CHEROKEE_GI"]],
  [0x13b3, ["W", "CHEROKEE_LA"]],
  [0x13a1, ["E", "CHEROKEE_E"]],
  [0x13ac, ["G", "CHEROKEE_GV"]],
  [0x13b0, ["H", "CHEROKEE_HA"]],
  [0x13c3, ["R", "CHEROKEE_SA"]],
  [0x13cb, ["S", "CHEROKEE_TSI"]],
  [0x13d4, ["Z", "CHEROKEE_WI"]],
  [0x13a2, ["J", "CHEROKEE_SV"]],
]);

function buildLookup(): Map<number, [string, string]> {
  const map = new Map<number, [string, string]>();
  for (const source of [CYRILLIC_TO_LATIN, GREEK_TO_LATIN, ARMENIAN_TO_LATIN, CHEROKEE_TO_LATIN]) {
    for (const [cp, entry] of source) {
      map.set(cp, entry);
    }
  }
  return map;
}

const CONFUSABLE_LOOKUP = buildLookup();

export function processConfusables(input: string, enabled: boolean): ConfusablesResult {
  if (!enabled) {
    return { text: input, findings: [] };
  }

  const findings: Finding[] = [];
  let result = "";
  let offset = 0;

  for (let i = 0; i < input.length; ) {
    const cp = input.codePointAt(i)!;
    const charLen = cp > 0xffff ? 2 : 1;

    const entry = CONFUSABLE_LOOKUP.get(cp);
    if (entry) {
      const [latin, name] = entry;
      result += latin;
      findings.push({
        type: "confusable",
        codepoint: cp,
        index: offset,
        name,
        action: "normalized",
      });
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
