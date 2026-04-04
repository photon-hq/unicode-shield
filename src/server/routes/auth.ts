import { Hono } from "hono";
import { getApiKey, getRedis } from "../services/redis.ts";

const auth = new Hono();

const PHOTON_KEY_PREFIX = "shield:photon-key:";

auth.post("/validate", async (c) => {
  const body = await c.req.json<{ apiKey?: string }>().catch(() => ({}));
  const apiKey = body.apiKey;

  if (!apiKey) {
    return c.json({ valid: false, error: "apiKey required" }, 400);
  }

  const record = await getApiKey(apiKey);
  if (record) {
    return c.json({ valid: true, orgId: record.orgId, source: "shield" });
  }

  const r = getRedis();
  const cached = await r.get(`${PHOTON_KEY_PREFIX}${apiKey}`);
  if (cached) {
    const data = JSON.parse(cached) as { orgId: string };
    return c.json({ valid: true, orgId: data.orgId, source: "photon" });
  }

  if (process.env.SHIELD_DEV === "true") {
    return c.json({ valid: true, orgId: "dev-org", source: "dev" });
  }

  return c.json({ valid: false });
});

auth.post("/register-photon-key", async (c) => {
  const body = await c.req.json<{
    apiKey?: string;
    orgId?: string;
  }>().catch(() => ({}));

  if (!body.apiKey || !body.orgId) {
    return c.json({ error: "apiKey and orgId required" }, 400);
  }

  const r = getRedis();
  await r.setex(
    `${PHOTON_KEY_PREFIX}${body.apiKey}`,
    7 * 24 * 3600,
    JSON.stringify({ orgId: body.orgId, registeredAt: Date.now() }),
  );

  return c.json({ registered: true, orgId: body.orgId });
});

export { auth };
