import { Hono } from "hono";
import { serve } from "bun";
import { nanoid } from "nanoid";

const app = new Hono();

const startTime = Date.now();
const requests: Array<{
  id: string;
  timestamp: string;
  elapsedMs: number;
  method: string;
  path: string;
  query: Record<string, string>;
  headers: Record<string, string>;
  ip: string;
  userAgent: string;
  isApplePreview: boolean;
}> = [];

const APPLE_UA_PATTERN =
  /(facebookexternalhit.*Twitterbot|Twitterbot.*facebookexternalhit)/;

function isApplePreviewRequest(ua: string): boolean {
  return APPLE_UA_PATTERN.test(ua);
}

app.all("/probe/:token", (c) => {
  const ua = c.req.header("user-agent") ?? "";
  const headers: Record<string, string> = {};
  c.req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  const entry = {
    id: nanoid(8),
    timestamp: new Date().toISOString(),
    elapsedMs: Date.now() - startTime,
    method: c.req.method,
    path: c.req.path,
    query: c.req.query() as Record<string, string>,
    headers,
    ip:
      c.req.header("x-forwarded-for") ??
      c.req.header("x-real-ip") ??
      "unknown",
    userAgent: ua,
    isApplePreview: isApplePreviewRequest(ua),
  };

  requests.push(entry);

  const divider = "=".repeat(70);
  console.log(`\n${divider}`);
  console.log(`  REQUEST #${requests.length} [${entry.timestamp}]`);
  console.log(`  ${entry.isApplePreview ? ">>> APPLE PREVIEW DETECTED <<<" : "--- Regular request ---"}`);
  console.log(divider);
  console.log(`  Method:     ${entry.method}`);
  console.log(`  Path:       ${entry.path}`);
  console.log(`  IP:         ${entry.ip}`);
  console.log(`  User-Agent: ${entry.userAgent}`);
  console.log(`  Headers:`);
  for (const [key, value] of Object.entries(headers)) {
    console.log(`    ${key}: ${value}`);
  }
  console.log(divider);

  const token = c.req.param("token");
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta property="og:title" content="Photon Shield Probe" />
  <meta property="og:description" content="Verification probe - token: ${token}" />
  <meta property="og:image" content="https://photon.codes/og-image.png" />
  <meta property="og:type" content="website" />
  <meta property="og:url" content="${c.req.url}" />
  <title>Photon Shield Probe</title>
</head>
<body>
  <h1>Photon Shield - Probe Active</h1>
  <p>Token: ${token}</p>
  <p>Probe active.</p>
</body>
</html>`);
});

app.get("/probe-results", (c) => {
  return c.json({
    totalRequests: requests.length,
    applePreviewCount: requests.filter((r) => r.isApplePreview).length,
    requests,
  });
});

app.get("/health", (c) => c.json({ status: "ok", uptime: Date.now() - startTime }));

const port = Number(process.env.PROBE_PORT ?? 3456);

console.log(`
╔══════════════════════════════════════════════════════════╗
║               PHOTON SHIELD - PROBE SERVER               ║
╠══════════════════════════════════════════════════════════╣
║  Listening on port ${String(port).padEnd(38)}║
║  Probe URL:  http://localhost:${port}/probe/<token>       ║
║  Results:    http://localhost:${port}/probe-results        ║
║                                                          ║
║  Waiting for requests...                                 ║
║  Apple UA pattern: facebookexternalhit + Twitterbot      ║
╚══════════════════════════════════════════════════════════╝
`);

export default {
  port,
  fetch: app.fetch,
};
