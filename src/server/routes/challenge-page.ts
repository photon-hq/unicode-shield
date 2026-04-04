import { Hono } from "hono";
import { verifyTokenSignature } from "../services/token.ts";
import {
  getChallenge,
  updateChallenge,
  markVerified,
} from "../services/redis.ts";
import {
  validateUserAgent,
  isKnownBotUA,
} from "../services/validator.ts";

const challengePage = new Hono();

/**
 * Processes a request associated with a challenge token and runs verification.
 */
async function processVerificationRequest(
  fullToken: string,
  ua: string,
  ip: string,
  requestType: string,
): Promise<{ valid: boolean; record: Awaited<ReturnType<typeof getChallenge>> }> {
  const { valid, token } = verifyTokenSignature(fullToken);

  if (!valid) {
    console.log(`[shield:challenge] invalid token signature: ${fullToken}`);
    return { valid: false, record: null };
  }

  const record = await getChallenge(token);
  if (!record) {
    console.log(`[shield:challenge] token not found (expired): ${token}`);
    return { valid: false, record: null };
  }

  const validation = validateUserAgent(ua);
  const isBotUA = isKnownBotUA(ua);

  record.requestLog ??= [];
  record.requestLog.push({
    timestamp: Date.now(),
    userAgent: ua,
    ip,
    isApple: validation.isAppleDevice,
  });

  if (validation.isAppleDevice && record.status === "pending") {
    record.status = "verified";
    record.verifiedAt = Date.now();
    await updateChallenge(token, record);

    await markVerified(
      record.phoneNumber,
      record.orgId,
      token,
      validation.confidence,
      validation.matchedPattern,
    );

    console.log(
      `[shield:challenge] VERIFIED ${record.phoneNumber} via ${validation.matchedPattern} ` +
        `(${requestType}, confidence: ${validation.confidence}, ip: ${ip})`,
    );
  } else if (isBotUA) {
    record.status = "failed";
    await updateChallenge(token, record);
    console.log(
      `[shield:challenge] FAILED (known bot UA) ${record.phoneNumber}: ${ua}`,
    );
  } else {
    await updateChallenge(token, record);
    console.log(
      `[shield:challenge] ${requestType} logged for ${record.phoneNumber} ` +
        `(apple: ${validation.isAppleDevice}, pattern: ${validation.matchedPattern}, ua: ${ua.slice(0, 80)})`,
    );
  }

  return { valid: true, record };
}

function getRequestMeta(c: { req: { header(name: string): string | undefined } }) {
  return {
    ua: c.req.header("user-agent") ?? "",
    ip:
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown",
  };
}

/**
 * GET /ch/:fullToken
 * The main challenge page. Serves OG meta for link preview rendering.
 */
challengePage.get("/:fullToken", async (c) => {
  const fullToken = c.req.param("fullToken");
  const { ua, ip } = getRequestMeta(c);
  await processVerificationRequest(fullToken, ua, ip, "page");
  return serveOGPage(
    c,
    fullToken,
    "Photon Shield",
    "Identity verification in progress. You can close this page.",
  );
});

/**
 * Apple devices automatically request favicon and apple-touch-icon for any
 * domain they encounter in a URL. These fire on BOTH iOS and macOS without
 * any user interaction -- even when macOS shows "Click to Load Preview".
 *
 * By hosting these at /ch/:token/favicon.ico etc, we can correlate the
 * automatic probe to a specific challenge token and use it as the primary
 * verification signal.
 */
challengePage.get("/:fullToken/favicon.ico", async (c) => {
  const { ua, ip } = getRequestMeta(c);
  await processVerificationRequest(c.req.param("fullToken"), ua, ip, "favicon.ico");
  return serveFaviconSvg(c);
});

challengePage.get("/:fullToken/apple-touch-icon.png", async (c) => {
  const { ua, ip } = getRequestMeta(c);
  await processVerificationRequest(c.req.param("fullToken"), ua, ip, "apple-touch-icon");
  return c.body(null, 204);
});

challengePage.get("/:fullToken/apple-touch-icon-precomposed.png", async (c) => {
  const { ua, ip } = getRequestMeta(c);
  await processVerificationRequest(c.req.param("fullToken"), ua, ip, "apple-touch-icon-precomposed");
  return c.body(null, 204);
});

/**
 * Root-level favicon/icon requests (Apple probes these for the domain root).
 * We can't correlate these to a specific challenge, but we log them.
 * If there's only one active challenge for the requesting IP, we match it.
 */
challengePage.get("/favicon.ico", (c) => {
  logRootAppleSignal(c, "favicon.ico");
  return serveFaviconSvg(c);
});

challengePage.get("/apple-touch-icon.png", (c) => {
  logRootAppleSignal(c, "apple-touch-icon.png");
  return c.body(null, 204);
});

challengePage.get("/apple-touch-icon-precomposed.png", (c) => {
  logRootAppleSignal(c, "apple-touch-icon-precomposed.png");
  return c.body(null, 204);
});

function logRootAppleSignal(
  c: { req: { header(name: string): string | undefined } },
  asset: string,
) {
  const ua = c.req.header("user-agent") ?? "";
  const validation = validateUserAgent(ua);
  if (validation.isAppleDevice) {
    console.log(
      `[shield:signal] Root ${asset} probe from Apple device: ${validation.matchedPattern}`,
    );
  }
}

function serveFaviconSvg(c: { body(data: string, status?: number, headers?: Record<string, string>): Response; header(name: string, value: string): void }) {
  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  return c.body(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>`);
}

function serveOGPage(
  c: { html(content: string): Response | Promise<Response> },
  fullToken: string,
  title: string,
  description: string,
) {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/ch/${fullToken}/favicon.ico" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/ch/${fullToken}/apple-touch-icon.png">
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="https://photon.codes/og-image.png" />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Photon Shield" />
  <meta name="twitter:card" content="summary" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <title>${escapeHtml(title)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro', system-ui, sans-serif;
      background: #0a0a0a;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .card {
      max-width: 400px;
      text-align: center;
    }
    .shield-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    h1 {
      font-size: 1.5rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    p {
      color: #888;
      font-size: 0.95rem;
      line-height: 1.5;
    }
    .badge {
      display: inline-block;
      margin-top: 1.5rem;
      padding: 0.4rem 1rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.06);
      border: 1px solid rgba(255,255,255,0.1);
      font-size: 0.8rem;
      color: #666;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="shield-icon">&#x1F6E1;</div>
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <div class="badge">Powered by Photon</div>
  </div>
</body>
</html>`);
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export { challengePage };
