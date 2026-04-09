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

  // NFKC runs first so collapsed forms get caught by subsequent steps
  const nfkcResult = processNfkc(text, opts.nfkc);

  const stripResult = strip(nfkcResult.text, {
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
