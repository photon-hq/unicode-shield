export type BidiMode = "strip" | "escape" | "ignore";

export interface ShieldOptions {
  /** Strip invisible characters. Default: true */
  invisibles?: boolean;
  /** How to handle bidi control characters. Default: "strip" */
  bidi?: BidiMode;
  /** Strip C0 (U+0000-U+001F, U+007F) and C1 (U+0080-U+009F) control characters. Default: true */
  controls?: boolean;
  /** Strip tag characters (U+E0000-U+E007F). Default: true */
  tags?: boolean;
  /** Strip variation selectors (U+FE00-U+FE0F, U+E0100-U+E01EF). Default: true */
  variationSelectors?: boolean;
  /** Normalize special/exotic whitespace to regular ASCII space. Default: true */
  normalizeWhitespace?: boolean;
  /** Strip line/paragraph separators (U+2028, U+2029). Default: true */
  separators?: boolean;
  /** Strip annotation, deprecated formatting, and non-characters. Default: true */
  formatting?: boolean;
  /** Limit stacked combining marks (Zalgo text). Max marks per base char. 0 = strip all, false = disable. Default: 3 */
  diacritics?: number | false;
  /** Apply NFKC normalization to collapse fullwidth, math alphanumeric, enclosed, superscript/subscript to ASCII equivalents. Default: true */
  nfkc?: boolean;
  /** Detect and normalize confusable homoglyphs (Cyrillic/Greek/etc. lookalikes) to their Latin equivalents. Default: true */
  confusables?: boolean;
  /** Collapse consecutive whitespace (spaces/tabs) to a single space and consecutive newlines to a single newline. Default: false */
  collapseWhitespace?: boolean;
  /** Trim leading and trailing whitespace from the result. Default: false */
  trim?: boolean;
}

export type FindingType =
  | "invisible"
  | "bidi"
  | "control"
  | "tag"
  | "variation-selector"
  | "special-space"
  | "separator"
  | "formatting"
  | "non-character"
  | "diacritics"
  | "confusable"
  | "nfkc";

export interface Finding {
  type: FindingType;
  codepoint: number;
  index: number;
  name: string;
  action: "stripped" | "escaped" | "normalized";
}

export interface AnalyzeResult {
  /** The cleaned/normalized text */
  text: string;
  /** Whether any problematic characters were found */
  dirty: boolean;
  /** Details of every character that was acted on */
  findings: Finding[];
}

export interface Shield {
  normalize(text: string): string;
  analyze(text: string): AnalyzeResult;
}
