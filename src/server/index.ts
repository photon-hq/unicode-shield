import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { challenges } from "./routes/challenges.ts";
import { verify } from "./routes/verify.ts";
import { auth } from "./routes/auth.ts";
import { challengePage } from "./routes/challenge-page.ts";
import { redirect } from "./routes/redirect.ts";
import { authMiddleware } from "./middleware/auth.ts";
import { rateLimitMiddleware } from "./middleware/rate-limit.ts";
import { getRedis, closeRedis, createApiKey } from "./services/redis.ts";

const app = new Hono();

app.use("*", logger());
app.use("*", cors());

app.get("/", (c) =>
  c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Photon Shield</title>
  <meta property="og:title" content="Photon Shield" />
  <meta property="og:description" content="Invisible bot protection for iMessage agents." />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="Photon" />
  <link rel="icon" href="/favicon.ico" type="image/svg+xml">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
      background: #09090b;
      color: #fafafa;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 2rem;
    }
    .container { max-width: 480px; text-align: center; }
    .icon { font-size: 4rem; margin-bottom: 1.5rem; }
    h1 { font-size: 1.75rem; font-weight: 600; margin-bottom: 0.5rem; letter-spacing: -0.02em; }
    .subtitle { color: #a1a1aa; font-size: 1rem; line-height: 1.6; margin-bottom: 2rem; }
    .divider { width: 48px; height: 1px; background: #27272a; margin: 0 auto 2rem; }
    .info { color: #71717a; font-size: 0.85rem; line-height: 1.6; }
    .info a { color: #a1a1aa; text-decoration: none; border-bottom: 1px solid #3f3f46; }
    .info a:hover { color: #fafafa; border-color: #71717a; }
    .badge {
      display: inline-block;
      margin-top: 2rem;
      padding: 0.35rem 0.9rem;
      border-radius: 999px;
      background: rgba(255,255,255,0.04);
      border: 1px solid #27272a;
      font-size: 0.75rem;
      color: #52525b;
      letter-spacing: 0.02em;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="icon">&#x1F6E1;</div>
    <h1>Photon Shield</h1>
    <p class="subtitle">Invisible bot protection for iMessage agents.</p>
    <div class="divider"></div>
    <p class="info">
      This server provides verification services for Photon iMessage agents.
    </p>
    <p class="info" style="margin-top: 1rem;">
      If you're a developer, visit <a href="https://photon.codes">photon.codes</a>
      to integrate Shield into your agent.
    </p>
    <div class="badge">v1.0.0</div>
  </div>
</body>
</html>`),
);

app.get("/health", (c) =>
  c.json({ status: "ok", service: "photon-shield", version: "1.0.0" }),
);

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">🛡️</text></svg>`;

app.get("/favicon.ico", (c) => {
  c.header("Content-Type", "image/svg+xml");
  c.header("Cache-Control", "no-cache, no-store, must-revalidate");
  return c.body(FAVICON_SVG);
});
app.get("/apple-touch-icon.png", (c) => c.body(null, 204));
app.get("/apple-touch-icon-precomposed.png", (c) => c.body(null, 204));

app.route("/ch", challengePage);
app.route("/r", redirect);

// Protected API routes
const api = new Hono();
api.use("*", authMiddleware);
api.use("*", rateLimitMiddleware);
api.route("/challenges", challenges);
api.route("/verify", verify);
api.route("/auth", auth);

app.route("/api", api);

// Dev: seed a test API key on startup
async function seedDevData() {
  if (process.env.SHIELD_DEV === "true") {
    try {
      await createApiKey("shield_dev_key", "dev-org", "Development Key", 1000);
      console.log("[shield] dev API key seeded: shield_dev_key");
    } catch {
      // Redis might not be up yet; non-fatal
    }
  }
}

const port = Number(process.env.PORT ?? 3001);

console.log(`
╔════════════════════════════════════════════════════════════╗
║                  PHOTON SHIELD SERVER                      ║
╠════════════════════════════════════════════════════════════╣
║  Port:          ${String(port).padEnd(41)}║
║  Redis:         ${(process.env.REDIS_URL ?? "redis://localhost:6379").padEnd(41)}║
║  Base URL:      ${(process.env.CHALLENGE_BASE_URL ?? `http://localhost:${port}`).padEnd(41)}║
║  Dev mode:      ${(process.env.SHIELD_DEV ?? "false").padEnd(41)}║
╚════════════════════════════════════════════════════════════╝
`);

// Verify Redis connectivity
try {
  const r = getRedis();
  await r.ping();
  console.log("[shield] Redis connected");
} catch (err) {
  console.error("[shield] Redis connection failed:", err);
  console.error("[shield] Server will start but challenges will fail without Redis.");
}

await seedDevData();

process.on("SIGINT", async () => {
  console.log("\n[shield] shutting down...");
  await closeRedis();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n[shield] shutting down...");
  await closeRedis();
  process.exit(0);
});

export default {
  port,
  hostname: "0.0.0.0",
  fetch: app.fetch,
};
