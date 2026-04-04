import { Hono } from "hono";
import { getVerified, getVerifiedTTL } from "../services/redis.ts";

const verify = new Hono();

/**
 * GET /api/verify/:phoneNumber
 * Check if a phone number has been verified.
 */
verify.get("/:phoneNumber", async (c) => {
  const orgId = c.get("orgId") as string;
  const phoneNumber = decodeURIComponent(c.req.param("phoneNumber"));

  const record = await getVerified(phoneNumber, orgId);

  if (!record) {
    return c.json({
      verified: false,
      phoneNumber,
    });
  }

  const ttl = await getVerifiedTTL(phoneNumber, orgId);

  return c.json({
    verified: true,
    phoneNumber: record.phoneNumber,
    verifiedAt: record.verifiedAt,
    expiresIn: ttl,
    confidence: record.confidence,
    matchedPattern: record.matchedPattern,
  });
});

export { verify };
