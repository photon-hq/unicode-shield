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

  // Step 1: NFKC normalization (fullwidth, math alphanumeric, enclosed, super/subscript)
  // Must run before character-level stripping so collapsed forms get caught
  const nfkcResult = processNfkc(text, opts.nfkc);

  // Step 2: strip invisible chars, controls, tags, variation selectors,
  //         normalize whitespace, strip separators, strip formatting
  const stripResult = strip(nfkcResult.text, {
    invisibles: opts.invisibles,
    controls: opts.controls,
    tags: opts.tags,
    variationSelectors: opts.variationSelectors,
    normalizeWhitespace: opts.normalizeWhitespace,
    separators: opts.separators,
    formatting: opts.formatting,
  });

  // Step 3: handle bidi control characters
  const bidiResult = processBidi(stripResult.text, opts.bidi);

  // Step 4: limit stacked combining marks (Zalgo text)
  const diacriticsResult = processDiacritics(bidiResult.text, opts.diacritics);

  // Step 5: normalize confusable homoglyphs
  const confusablesResult = processConfusables(diacriticsResult.text, opts.confusables);

  // Step 6: collapse whitespace and trim (post-processing)
  let finalText = confusablesResult.text;
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
    ...nfkcResult.findings,
    ...stripResult.findings,
    ...bidiResult.findings,
    ...diacriticsResult.findings,
    ...confusablesResult.findings,
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
