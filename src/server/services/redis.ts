import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 5) return null;
        return Math.min(times * 200, 2000);
      },
    });
    redis.on("error", (err) => {
      console.error("[shield:redis] connection error:", err.message);
    });
  }
  return redis;
}

export async function closeRedis(): Promise<void> {
  if (redis) {
    await redis.quit();
    redis = null;
  }
}

// --------------- Challenge Store ---------------

export interface ChallengeRecord {
  phoneNumber: string;
  orgId: string;
  createdAt: number;
  status: "pending" | "verified" | "expired" | "failed";
  verifiedAt?: number;
  redirectUrl?: string;
  requestLog?: Array<{
    timestamp: number;
    userAgent: string;
    ip: string;
    isApple: boolean;
  }>;
}

const CHALLENGE_TTL = Number(process.env.CHALLENGE_TTL_SECONDS ?? 120);

function challengeKey(token: string): string {
  return `shield:challenge:${token}`;
}

export async function createChallenge(
  token: string,
  phoneNumber: string,
  orgId: string,
  redirectUrl?: string,
): Promise<ChallengeRecord> {
  const r = getRedis();
  const record: ChallengeRecord = {
    phoneNumber,
    orgId,
    createdAt: Date.now(),
    status: "pending",
    requestLog: [],
    ...(redirectUrl && { redirectUrl }),
  };
  await r.setex(challengeKey(token), CHALLENGE_TTL, JSON.stringify(record));
  return record;
}

export async function getChallenge(token: string): Promise<ChallengeRecord | null> {
  const r = getRedis();
  const raw = await r.get(challengeKey(token));
  if (!raw) return null;
  return JSON.parse(raw) as ChallengeRecord;
}

export async function updateChallenge(token: string, record: ChallengeRecord): Promise<void> {
  const r = getRedis();
  const ttl = await r.ttl(challengeKey(token));
  if (ttl > 0) {
    await r.setex(challengeKey(token), ttl, JSON.stringify(record));
  }
}

// --------------- Verified Number Store ---------------

export interface VerifiedRecord {
  phoneNumber: string;
  orgId: string;
  verifiedAt: number;
  challengeToken: string;
  confidence: string;
  matchedPattern: string | null;
}

const VERIFICATION_TTL = Number(process.env.VERIFICATION_TTL_SECONDS ?? 7 * 24 * 60 * 60);

function verifiedKey(phoneNumber: string, orgId: string): string {
  return `shield:verified:${orgId}:${phoneNumber}`;
}

export async function markVerified(
  phoneNumber: string,
  orgId: string,
  challengeToken: string,
  confidence: string,
  matchedPattern: string | null,
): Promise<VerifiedRecord> {
  const r = getRedis();
  const record: VerifiedRecord = {
    phoneNumber,
    orgId,
    verifiedAt: Date.now(),
    challengeToken,
    confidence,
    matchedPattern,
  };
  await r.setex(
    verifiedKey(phoneNumber, orgId),
    VERIFICATION_TTL,
    JSON.stringify(record),
  );
  return record;
}

export async function getVerified(
  phoneNumber: string,
  orgId: string,
): Promise<VerifiedRecord | null> {
  const r = getRedis();
  const raw = await r.get(verifiedKey(phoneNumber, orgId));
  if (!raw) return null;
  return JSON.parse(raw) as VerifiedRecord;
}

export async function getVerifiedTTL(
  phoneNumber: string,
  orgId: string,
): Promise<number> {
  const r = getRedis();
  return r.ttl(verifiedKey(phoneNumber, orgId));
}

// --------------- API Key Store ---------------

export interface ApiKeyRecord {
  orgId: string;
  name: string;
  rateLimit: number;
  createdAt: number;
}

function apiKeyKey(key: string): string {
  return `shield:apikey:${key}`;
}

export async function getApiKey(key: string): Promise<ApiKeyRecord | null> {
  const r = getRedis();
  const raw = await r.get(apiKeyKey(key));
  if (!raw) return null;
  return JSON.parse(raw) as ApiKeyRecord;
}

export async function createApiKey(
  key: string,
  orgId: string,
  name: string,
  rateLimit = 100,
): Promise<ApiKeyRecord> {
  const r = getRedis();
  const record: ApiKeyRecord = { orgId, name, rateLimit, createdAt: Date.now() };
  await r.set(apiKeyKey(key), JSON.stringify(record));
  return record;
}
