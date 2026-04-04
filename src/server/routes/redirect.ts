import { Hono } from "hono";
import { verifyTokenSignature } from "../services/token.ts";
import { getChallenge, updateChallenge, markVerified } from "../services/redis.ts";
import { validateUserAgent, isKnownBotUA } from "../services/validator.ts";

const OG_FETCH_TIMEOUT_MS = 5_000;
const OG_CACHE = new Map<string, { og: OGData; fetchedAt: number }>();
const OG_CACHE_TTL_MS = 60_000;

interface OGData {
  title: string;
  description: string;
  image: string | null;
  siteName: string | null;
  favicon: string | null;
  url: string;
}

const redirect = new Hono();

function getRequestMeta(c: { req: { header(name: string): string | undefined } }) {
  return {
    ua: c.req.header("user-agent") ?? "",
    ip: c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "unknown",
  };
}

async function processVerification(
  fullToken: string,
  ua: string,
  ip: string,
  requestType: string,
) {
  const { valid, token } = verifyTokenSignature(fullToken);
  if (!valid) return { valid: false, record: null } as const;

  const record = await getChallenge(token);
  if (!record) return { valid: false, record: null } as const;

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
      `[shield:redirect] VERIFIED ${record.phoneNumber} via ${validation.matchedPattern} ` +
        `(${requestType}, confidence: ${validation.confidence}, ip: ${ip})`,
    );
  } else if (isBotUA) {
    record.status = "failed";
    await updateChallenge(token, record);
    console.log(`[shield:redirect] FAILED (known bot UA) ${record.phoneNumber}: ${ua}`);
  } else {
    await updateChallenge(token, record);
    console.log(
      `[shield:redirect] ${requestType} for ${record.phoneNumber} ` +
        `(apple: ${validation.isAppleDevice}, ua: ${ua.slice(0, 80)})`,
    );
  }

  return { valid: true, record } as const;
}

/**
 * Fetch OG metadata from the target URL by parsing the HTML <head>.
 * Falls back to sensible defaults if the target is unreachable.
 */
async function fetchOGData(targetUrl: string): Promise<OGData> {
  const cached = OG_CACHE.get(targetUrl);
  if (cached && Date.now() - cached.fetchedAt < OG_CACHE_TTL_MS) {
    return cached.og;
  }

  const fallback: OGData = {
    title: new URL(targetUrl).hostname,
    description: "",
    image: null,
    siteName: new URL(targetUrl).hostname,
    favicon: null,
    url: targetUrl,
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OG_FETCH_TIMEOUT_MS);

    const res = await fetch(targetUrl, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PhotonShield/1.0; +https://photon.codes)",
        Accept: "text/html",
      },
      redirect: "follow",
    });
    clearTimeout(timeout);

    if (!res.ok) return fallback;

    const html = await res.text();
    const head = html.match(/<head[^>]*>([\s\S]*?)<\/head>/i)?.[1] ?? html;

    const og: OGData = {
      title: extractMeta(head, "og:title") ?? extractTag(head, "title") ?? fallback.title,
      description: extractMeta(head, "og:description") ?? extractMeta(head, "description") ?? "",
      image: extractMeta(head, "og:image"),
      siteName: extractMeta(head, "og:site_name") ?? new URL(targetUrl).hostname,
      favicon: extractFavicon(head, targetUrl),
      url: targetUrl,
    };

    OG_CACHE.set(targetUrl, { og, fetchedAt: Date.now() });
    return og;
  } catch (err) {
    console.log(`[shield:redirect] OG fetch failed for ${targetUrl}: ${err}`);
    return fallback;
  }
}

function extractMeta(head: string, property: string): string | null {
  const ogMatch = head.match(
    new RegExp(
      `<meta[^>]*(?:property|name)=["']${escapeRegex(property)}["'][^>]*content=["']([^"']*)["']`,
      "i",
    ),
  );
  if (ogMatch) return ogMatch[1]!;

  const reversed = head.match(
    new RegExp(
      `<meta[^>]*content=["']([^"']*)["'][^>]*(?:property|name)=["']${escapeRegex(property)}["']`,
      "i",
    ),
  );
  return reversed?.[1] ?? null;
}

function extractTag(head: string, tag: string): string | null {
  const match = head.match(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "i"));
  return match?.[1]?.trim() ?? null;
}

function extractFavicon(head: string, baseUrl: string): string | null {
  const iconLink = head.match(
    /<link[^>]*rel=["'](?:icon|shortcut icon|apple-touch-icon)["'][^>]*href=["']([^"']*)["']/i,
  );
  if (!iconLink?.[1]) return null;

  const href = iconLink[1];
  if (href.startsWith("http")) return href;
  if (href.startsWith("//")) return `https:${href}`;

  const base = new URL(baseUrl);
  return href.startsWith("/")
    ? `${base.origin}${href}`
    : `${base.origin}/${href}`;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * GET /r/:fullToken
 */
redirect.get("/:fullToken", async (c) => {
  const fullToken = c.req.param("fullToken");
  const { ua, ip } = getRequestMeta(c);

  const { valid, record } = await processVerification(fullToken, ua, ip, "redirect-page");

  if (!valid || !record) {
    return c.text("Link expired or invalid", 410);
  }

  if (!record.redirectUrl) {
    return c.text("Not a redirect challenge", 400);
  }

  const validation = validateUserAgent(ua);

  if (!validation.isAutomatic && validation.isAppleDevice) {
    return c.redirect(record.redirectUrl, 302);
  }

  if (!validation.isAppleDevice && !isKnownBotUA(ua) && ua.includes("Mozilla/")) {
    return c.redirect(record.redirectUrl, 302);
  }

  const og = await fetchOGData(record.redirectUrl);

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="icon" href="/r/${fullToken}/favicon.ico">
  <link rel="apple-touch-icon" href="/r/${fullToken}/apple-touch-icon.png">
  <meta property="og:title" content="${escapeHtml(og.title)}" />
  <meta property="og:description" content="${escapeHtml(og.description)}" />
  ${og.image ? `<meta property="og:image" content="${escapeHtml(og.image)}" />` : ""}
  <meta property="og:url" content="${escapeHtml(og.url)}" />
  <meta property="og:type" content="website" />
  ${og.siteName ? `<meta property="og:site_name" content="${escapeHtml(og.siteName)}" />` : ""}
  <meta name="twitter:card" content="${og.image ? "summary_large_image" : "summary"}" />
  <meta name="twitter:title" content="${escapeHtml(og.title)}" />
  <meta name="twitter:description" content="${escapeHtml(og.description)}" />
  ${og.image ? `<meta name="twitter:image" content="${escapeHtml(og.image)}" />` : ""}
  <title>${escapeHtml(og.title)}</title>
  <meta http-equiv="refresh" content="0;url=${escapeHtml(record.redirectUrl)}">
</head>
<body>
  <p>Redirecting to <a href="${escapeHtml(record.redirectUrl)}">${escapeHtml(og.title)}</a>...</p>
</body>
</html>`);
});

redirect.get("/:fullToken/favicon.ico", async (c) => {
  const fullToken = c.req.param("fullToken");
  const { ua, ip } = getRequestMeta(c);
  const { record } = await processVerification(fullToken, ua, ip, "redirect-favicon");

  if (record?.redirectUrl) {
    const og = await fetchOGData(record.redirectUrl);
    if (og.favicon) {
      return c.redirect(og.favicon, 302);
    }
  }

  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  return c.body(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🔗</text></svg>`,
  );
});

redirect.get("/:fullToken/apple-touch-icon.png", async (c) => {
  const fullToken = c.req.param("fullToken");
  const { ua, ip } = getRequestMeta(c);
  const { record } = await processVerification(fullToken, ua, ip, "redirect-apple-touch-icon");

  if (record?.redirectUrl) {
    const og = await fetchOGData(record.redirectUrl);
    if (og.favicon) {
      return c.redirect(og.favicon, 302);
    }
  }

  return c.body(null, 204);
});

redirect.get("/:fullToken/apple-touch-icon-precomposed.png", async (c) => {
  const { ua, ip } = getRequestMeta(c);
  await processVerification(c.req.param("fullToken"), ua, ip, "redirect-apple-touch-icon-precomposed");
  return c.body(null, 204);
});

export { redirect };
