import type { ShieldOptions, AnalyzeResult, Shield } from "./types";
import { strip } from "./strip";
import { processBidi } from "./bidi";
import { processDiacritics } from "./diacritics";
import { processConfusables } from "./confusables";
import { processNfkc } from "./nfkc";

const DEFAULTS: Required<ShieldOptions> = {
  invisibles: true,
  bidi: "strip",
  controls: true,
  tags: true,
  variationSelectors: true,
  normalizeWhitespace: true,
  separators: true,
  formatting: true,
  diacritics: 3,
  nfkc: true,
  confusables: true,
  collapseWhitespace: false,
  trim: false,
};

function resolveOptions(options?: ShieldOptions): Required<ShieldOptions> {
  if (!options) return DEFAULTS;
  return { ...DEFAULTS, ...options };
}

function runPipeline(text: string, opts: Required<ShieldOptions>): AnalyzeResult {
  if (!text) {
    return { text: "", dirty: false, findings: [] };
  }

  // Strip first: remove invisibles, controls, tags, etc.
  const stripResult = strip(text, {
    invisibles: opts.invisibles,
    controls: opts.controls,
    tags: opts.tags,
    variationSelectors: opts.variationSelectors,
    normalizeWhitespace: opts.normalizeWhitespace,
    separators: opts.separators,
    formatting: opts.formatting,
  });

  const bidiResult = processBidi(stripResult.text, opts.bidi);
  const diacriticsResult = processDiacritics(bidiResult.text, opts.diacritics);
  const confusablesResult = processConfusables(diacriticsResult.text, opts.confusables);

  // NFKC runs LAST so it cannot manufacture dangerous ASCII that bypasses
  // the stripping/confusable filters. Any ASCII produced by NFKC (e.g. backtick,
  // backslash) will have already passed through the security filters, but since
  // NFKC only normalizes to ASCII letters/digits/punctuation, the risk is lower.
  const nfkcResult = processNfkc(confusablesResult.text, opts.nfkc);

  let finalText = nfkcResult.text;
  if (opts.collapseWhitespace) {
    finalText = finalText
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      .replace(/\n+/g, "\n")
      .replace(/[ \t]+/g, " ");
  }
  if (opts.trim) {
    finalText = finalText.trim();
  }

  const allFindings = [
    ...stripResult.findings,
    ...bidiResult.findings,
    ...diacriticsResult.findings,
    ...confusablesResult.findings,
    ...nfkcResult.findings,
  ];

  return {
    text: finalText,
    dirty: allFindings.length > 0,
    findings: allFindings,
  };
}

export function normalize(text: string, options?: ShieldOptions): string {
  const opts = resolveOptions(options);
  return runPipeline(text, opts).text;
}

export function analyze(text: string, options?: ShieldOptions): AnalyzeResult {
  const opts = resolveOptions(options);
  return runPipeline(text, opts);
}

export function createShield(options?: ShieldOptions): Shield {
  const opts = resolveOptions(options);
  return {
    normalize: (text: string) => runPipeline(text, opts).text,
    analyze: (text: string) => runPipeline(text, opts),
  };
}
