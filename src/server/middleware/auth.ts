import type { Context, Next } from "hono";
import { getApiKey, getRedis } from "../services/redis.ts";

const PHOTON_KEY_PREFIX = "shield:photon-key:";
const PHOTON_KEY_TTL = 3600;

async function cachePhotonKey(apiKey: string, orgId: string): Promise<void> {
  const r = getRedis();
  await r.setex(
    `${PHOTON_KEY_PREFIX}${apiKey}`,
    PHOTON_KEY_TTL,
    JSON.stringify({ orgId, validatedAt: Date.now() }),
  );
}

async function getCachedPhotonKey(
  apiKey: string,
): Promise<{ orgId: string } | null> {
  const r = getRedis();
  const raw = await r.get(`${PHOTON_KEY_PREFIX}${apiKey}`);
  if (!raw) return null;
  return JSON.parse(raw);
}

async function validatePhotonKey(
  apiKey: string,
): Promise<{ orgId: string } | null> {
  const cached = await getCachedPhotonKey(apiKey);
  if (cached) return cached;

  const backendUrl = process.env.PHOTON_BACKEND_URL;
  if (!backendUrl) return null;

  try {
    const res = await fetch(`${backendUrl}/api/auth/validate-key`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apiKey }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as { valid: boolean; orgId?: string };
    if (data.valid && data.orgId) {
      await cachePhotonKey(apiKey, data.orgId);
      return { orgId: data.orgId };
    }
  } catch {
    // Photon backend unreachable -- fall through
  }
  return null;
}

export async function authMiddleware(c: Context, next: Next) {
  const apiKey =
    c.req.header("x-api-key") ??
    c.req.header("authorization")?.replace(/^Bearer\s+/, "") ??
    null;

  const isDev = process.env.SHIELD_DEV === "true";

  if (!apiKey) {
    if (isDev) {
      c.set("orgId", "dev-org");
      c.set("apiKeyRecord", { orgId: "dev-org", name: "dev", rateLimit: 1000, createdAt: 0 });
      return next();
    }
    return c.json({ error: "Missing API key" }, 401);
  }

  // 1. Shield-native key lookup
  const record = await getApiKey(apiKey);
  if (record) {
    c.set("orgId", record.orgId);
    c.set("apiKeyRecord", record);
    return next();
  }

  // 2. Photon API key validation
  const photon = await validatePhotonKey(apiKey);
  if (photon) {
    c.set("orgId", photon.orgId);
    c.set("apiKeyRecord", { orgId: photon.orgId, name: "photon", rateLimit: 100, createdAt: 0 });
    return next();
  }

  // 3. Dev mode fallback
  if (isDev) {
    c.set("orgId", "dev-org");
    c.set("apiKeyRecord", { orgId: "dev-org", name: "dev", rateLimit: 1000, createdAt: 0 });
    return next();
  }

  return c.json({ error: "Invalid API key" }, 401);
}
