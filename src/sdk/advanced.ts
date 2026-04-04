/**
 * Shield integration for @photon-ai/advanced-imessage-kit.
 *
 * Usage:
 *   import { SDK, shield } from '@photon-ai/advanced-imessage-kit';
 *
 *   const sdk = SDK({ serverUrl: '...', apiKey: '...' });
 *   const { protect, check, wrapUrl } = shield(sdk, {
 *     challengeUrl: 'https://your-app.com/welcome',
 *   });
 *
 *   sdk.on('new-message', protect(async (msg) => {
 *     // msg.shield.verified is true here
 *   }));
 */

const SHIELD_SERVER_URL = "https://verify.photon.codes";
const DEFAULT_CHALLENGE_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

// ---- Types ----

export interface ShieldConfig {
  serverUrl?: string;
  serverApiKey?: string;
  onUnverified: "block" | "flag" | "drop" | UnverifiedHandler;
  challengeUrl?: string | ((msg: AdvancedMessage) => string);
  challengeTimeoutMs?: number;
  pollIntervalMs?: number;
}

export interface ShieldMetadata {
  verified: boolean;
  status: "verified" | "unverified" | "challenged" | "pending";
  confidence?: string;
  matchedPattern?: string | null;
  challengeUrl?: string;
}

interface ChallengeResult {
  challengeId: string | null;
  url: string | null;
  status: "pending" | "already_verified";
  expiresAt?: number;
}

interface VerifyResult {
  verified: boolean;
  phoneNumber: string;
  verifiedAt?: number;
  expiresIn?: number;
  confidence?: string;
  matchedPattern?: string | null;
}

interface ChallengeStatusResult {
  status: "pending" | "verified" | "expired" | "failed";
  phoneNumber?: string;
  verifiedAt?: number | null;
}

interface ShieldContext {
  check: (phone: string) => Promise<VerifyResult>;
  challenge: (phone: string, redirectUrl?: string) => Promise<ChallengeResult>;
  wrapUrl: (phone: string, targetUrl: string) => Promise<ChallengeResult>;
  waitForVerification: (id: string, timeoutMs?: number) => Promise<ChallengeStatusResult>;
}

type UnverifiedHandler = (
  msg: AdvancedMessage & { shield?: ShieldMetadata },
  ctx: ShieldContext,
) => void | Promise<void>;

interface AdvancedMessage {
  text?: string | null;
  chatGuid?: string;
  isFromMe?: boolean;
  handle?: { address?: string } | null;
  chats?: Array<{ guid?: string }>;
  sender?: string;
  [key: string]: unknown;
}

interface AdvancedSDK {
  config?: { apiKey?: string };
  messages: {
    sendMessage(opts: {
      chatGuid: string;
      message: string;
      richLink?: boolean;
    }): Promise<unknown>;
  };
}

export interface ShieldInstance {
  protect(
    handler: (msg: AdvancedMessage & { shield: ShieldMetadata }) => void | Promise<void>,
  ): (msg: AdvancedMessage) => Promise<void>;

  check(phone: string): Promise<VerifyResult>;
  challenge(phone: string, redirectUrl?: string): Promise<ChallengeResult>;
  wrapUrl(phone: string, targetUrl: string): Promise<ChallengeResult>;
  challengeStatus(id: string): Promise<ChallengeStatusResult>;
  waitForVerification(id: string, timeoutMs?: number): Promise<ChallengeStatusResult>;
}

// ---- Implementation ----

function extractSender(msg: AdvancedMessage): string | undefined {
  return msg.handle?.address ?? msg.sender;
}

function extractChatGuid(msg: AdvancedMessage): string {
  return msg.chatGuid ?? msg.chats?.[0]?.guid ?? "";
}

export function shield(sdk: AdvancedSDK, config: ShieldConfig): ShieldInstance {
  const serverUrl = (config.serverUrl ?? SHIELD_SERVER_URL).replace(/\/$/, "");
  const apiKey = config.serverApiKey ?? (sdk.config?.apiKey || "");
  const onUnverified = config.onUnverified;
  const challengeTimeoutMs = config.challengeTimeoutMs ?? DEFAULT_CHALLENGE_TIMEOUT_MS;
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) h["x-api-key"] = apiKey;
    return h;
  }

  async function check(phone: string): Promise<VerifyResult> {
    const res = await fetch(`${serverUrl}/api/verify/${encodeURIComponent(phone)}`, {
      headers: headers(),
    });
    if (!res.ok) throw new Error(`Shield: verify failed (${res.status})`);
    return res.json() as Promise<VerifyResult>;
  }

  async function challenge(phone: string, redirectUrl?: string): Promise<ChallengeResult> {
    const body: Record<string, string> = { phoneNumber: phone };
    if (redirectUrl) body.redirectUrl = redirectUrl;

    const res = await fetch(`${serverUrl}/api/challenges`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Shield: challenge failed (${res.status})`);
    return res.json() as Promise<ChallengeResult>;
  }

  async function wrapUrl(phone: string, targetUrl: string): Promise<ChallengeResult> {
    return challenge(phone, targetUrl);
  }

  async function challengeStatus(id: string): Promise<ChallengeStatusResult> {
    const res = await fetch(
      `${serverUrl}/api/challenges/${encodeURIComponent(id)}/status`,
      { headers: headers() },
    );
    if (!res.ok) throw new Error(`Shield: status failed (${res.status})`);
    return res.json() as Promise<ChallengeStatusResult>;
  }

  async function waitForVerification(
    id: string,
    timeoutMs = challengeTimeoutMs,
  ): Promise<ChallengeStatusResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const s = await challengeStatus(id);
      if (s.status === "verified" || s.status === "failed" || s.status === "expired") return s;
      await new Promise((r) => setTimeout(r, pollIntervalMs));
    }
    return { status: "expired" };
  }

  function resolveChallengeUrl(msg: AdvancedMessage): string | undefined {
    if (!config.challengeUrl) return undefined;
    return typeof config.challengeUrl === "function"
      ? config.challengeUrl(msg)
      : config.challengeUrl;
  }

  function protect(
    handler: (msg: AdvancedMessage & { shield: ShieldMetadata }) => void | Promise<void>,
  ): (msg: AdvancedMessage) => Promise<void> {
    return async (msg: AdvancedMessage) => {
      if (msg.isFromMe) return;

      const sender = extractSender(msg);
      if (!sender) return;

      const chatGuid = extractChatGuid(msg);
      const status = await check(sender);

      if (status.verified) {
        const enriched = msg as AdvancedMessage & { shield: ShieldMetadata };
        enriched.shield = {
          verified: true,
          status: "verified",
          confidence: status.confidence,
          matchedPattern: status.matchedPattern,
        };
        return handler(enriched);
      }

      const redirectTarget = resolveChallengeUrl(msg);
      const result = redirectTarget
        ? await wrapUrl(sender, redirectTarget)
        : await challenge(sender);

      if (result.status === "already_verified") {
        const enriched = msg as AdvancedMessage & { shield: ShieldMetadata };
        enriched.shield = { verified: true, status: "verified" };
        return handler(enriched);
      }

      if (result.url) {
        await sdk.messages.sendMessage({ chatGuid, message: result.url });
      }

      if (typeof onUnverified === "function") {
        const enriched = msg as AdvancedMessage & { shield?: ShieldMetadata };
        enriched.shield = {
          verified: false,
          status: "challenged",
          challengeUrl: result.url ?? undefined,
        };
        return onUnverified(enriched, { check, challenge, wrapUrl, waitForVerification });
      }

      switch (onUnverified) {
        case "block":
          if (result.challengeId) {
            const final = await waitForVerification(result.challengeId);
            if (final.status === "verified") {
              const enriched = msg as AdvancedMessage & { shield: ShieldMetadata };
              enriched.shield = { verified: true, status: "verified" };
              return handler(enriched);
            }
          }
          return;

        case "flag": {
          const flagged = msg as AdvancedMessage & { shield: ShieldMetadata };
          flagged.shield = {
            verified: false,
            status: "challenged",
            challengeUrl: result.url ?? undefined,
          };
          return handler(flagged);
        }

        case "drop":
          return;
      }
    };
  }

  return { protect, check, challenge, wrapUrl, challengeStatus, waitForVerification };
}
