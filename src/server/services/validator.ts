/**
 * Request origin classification.
 */

export interface ValidationResult {
  isAppleDevice: boolean;
  confidence: "high" | "medium" | "low";
  matchedPattern: string | null;
  rawUserAgent: string;
  isAutomatic: boolean;
}

const APPLE_PATTERNS: Array<{
  name: string;
  regex: RegExp;
  confidence: "high" | "medium";
  automatic: boolean;
}> = [
  {
    name: "ios-networking-extension",
    regex: /NetworkingExtension\/\d+.*CFNetwork\/\d+.*Darwin\/\d+/,
    confidence: "high",
    automatic: true,
  },
  {
    name: "macos-webkit-networking",
    regex: /com\.apple\.WebKit\.Networking\/\d+.*CFNetwork\/\d+.*Darwin\/\d+/,
    confidence: "high",
    automatic: true,
  },
  {
    name: "legacy-facebook-twitter-spoof",
    regex: /(facebookexternalhit.*Twitterbot|Twitterbot.*facebookexternalhit)/,
    confidence: "high",
    automatic: true,
  },
  {
    name: "cfnetwork-darwin-generic",
    regex: /CFNetwork\/\d+.*Darwin\/\d+/,
    confidence: "medium",
    automatic: true,
  },
  {
    name: "iphone-safari",
    regex: /\(iPhone;.*CPU iPhone OS.*\).*AppleWebKit\/\d+.*Mobile.*Safari\/\d+/,
    confidence: "medium",
    automatic: false,
  },
  {
    name: "macos-safari",
    regex: /\(Macintosh;.*Mac OS X.*\).*AppleWebKit\/605\.1\.15.*Version\/.*Safari\/605\.1/,
    confidence: "medium",
    automatic: false,
  },
];

export function validateUserAgent(userAgent: string): ValidationResult {
  for (const pattern of APPLE_PATTERNS) {
    if (pattern.regex.test(userAgent)) {
      return {
        isAppleDevice: true,
        confidence: pattern.confidence,
        matchedPattern: pattern.name,
        rawUserAgent: userAgent,
        isAutomatic: pattern.automatic,
      };
    }
  }

  return {
    isAppleDevice: false,
    confidence: "low",
    matchedPattern: null,
    rawUserAgent: userAgent,
    isAutomatic: false,
  };
}

const BOT_UA_PATTERNS = [
  /python-requests/i,
  /axios/i,
  /node-fetch/i,
  /got\//i,
  /curl\//i,
  /wget\//i,
  /httpie\//i,
  /postman/i,
  /insomnia/i,
];

export function isKnownBotUA(userAgent: string): boolean {
  return BOT_UA_PATTERNS.some((p) => p.test(userAgent));
}
