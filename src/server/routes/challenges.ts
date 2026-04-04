import { Hono } from "hono";
import { generateSignedToken } from "../services/token.ts";
import {
  createChallenge,
  getChallenge,
  getVerified,
  getVerifiedTTL,
} from "../services/redis.ts";

const CHALLENGE_BASE_URL =
  process.env.CHALLENGE_BASE_URL ?? "http://localhost:3001";

const challenges = new Hono();

/**
 * POST /api/challenges
 * Create a new challenge for a phone number.
 */
challenges.post("/", async (c) => {
  const orgId = c.get("orgId") as string;
  const body = await c.req.json<{
    phoneNumber: string;
    redirectUrl?: string;
    callbackUrl?: string;
  }>();

  if (!body.phoneNumber) {
    return c.json({ error: "phoneNumber is required" }, 400);
  }

  const phone = body.phoneNumber.trim();
  const redirectUrl = body.redirectUrl?.trim();

  const existing = await getVerified(phone, orgId);
  if (existing) {
    const ttl = await getVerifiedTTL(phone, orgId);
    return c.json({
      challengeId: null,
      url: redirectUrl ?? null,
      status: "already_verified",
      verifiedAt: existing.verifiedAt,
      expiresIn: ttl,
    });
  }

  const { token, full } = generateSignedToken();
  const baseUrl = CHALLENGE_BASE_URL.replace(/\/ch\/?$/, "");

  const challengeUrl = redirectUrl
    ? `${baseUrl}/r/${full}`
    : `${baseUrl}/ch/${full}`;

  const record = await createChallenge(token, phone, orgId, redirectUrl);

  console.log(
    `[shield] challenge created: ${phone} -> ${challengeUrl}` +
      (redirectUrl ? ` (redirect: ${redirectUrl})` : ""),
  );

  return c.json({
    challengeId: token,
    url: challengeUrl,
    status: "pending",
    expiresAt: record.createdAt + Number(process.env.CHALLENGE_TTL_SECONDS ?? 120) * 1000,
  });
});

/**
 * GET /api/challenges/:id/status
 * Check the status of a challenge.
 */
challenges.get("/:id/status", async (c) => {
  const token = c.req.param("id");
  const record = await getChallenge(token);

  if (!record) {
    return c.json({ status: "expired", message: "Challenge not found or expired" });
  }

  return c.json({
    status: record.status,
    phoneNumber: record.phoneNumber,
    createdAt: record.createdAt,
    verifiedAt: record.verifiedAt ?? null,
    requestLog: record.requestLog ?? [],
  });
});

export { challenges };
