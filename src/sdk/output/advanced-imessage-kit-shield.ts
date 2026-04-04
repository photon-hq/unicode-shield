/**
 * Photon Shield -- Invisible bot protection for iMessage agents.
 *
 * This file ships inside @photon-ai/advanced-imessage-kit.
 * It provides a single `shield(sdk, config?)` function that integrates
 * Shield verification seamlessly with the SDK.
 *
 * Usage:
 *   import { SDK, shield } from '@photon-ai/advanced-imessage-kit';
 *
 *   const sdk = SDK({ serverUrl: '...', apiKey: '...' });
 *   await sdk.connect();
 *
 *   const { protect } = shield(sdk, {
 *     onUnverified: 'block',
 *     challengeUrl: 'https://your-app.com/welcome',
 *   });
 *
 *   sdk.on('new-message', protect(async (msg) => {
 *     console.log(msg.handle?.address, msg.text);
 *   }));
 */

import type { AdvancedIMessageKit, MessageResponse, SendMessageOptions } from "./index";

const SHIELD_SERVER_URL = "https://verify.photon.codes";
const DEFAULT_CHALLENGE_TIMEOUT_MS = 20_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

// ---- Public Types ----

export interface ShieldConfig {
  serverUrl?: string;
  serverApiKey?: string;
  onUnverified: "block" | "flag" | "drop" | UnverifiedHandler;
  challengeUrl?: string | ((msg: MessageResponse) => string);
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

export interface ChallengeResult {
  challengeId: string | null;
  url: string | null;
  status: "pending" | "already_verified";
  expiresAt?: number;
}

export interface VerifyResult {
  verified: boolean;
  phoneNumber: string;
  verifiedAt?: number;
  expiresIn?: number;
  confidence?: string;
  matchedPattern?: string | null;
}

export interface ChallengeStatusResult {
  status: "pending" | "verified" | "expired" | "failed";
  phoneNumber?: string;
  verifiedAt?: number | null;
}

export interface ShieldContext {
  check: (phone: string) => Promise<VerifyResult>;
  challenge: (phone: string, redirectUrl?: string) => Promise<ChallengeResult>;
  wrapUrl: (phone: string, targetUrl: string) => Promise<ChallengeResult>;
  waitForVerification: (id: string, timeoutMs?: number) => Promise<ChallengeStatusResult>;
}

export type UnverifiedHandler = (
  msg: MessageResponse & { shield?: ShieldMetadata },
  ctx: ShieldContext,
) => void | Promise<void>;

export interface ShieldInstance {
  protect(
    handler: (msg: MessageResponse & { shield: ShieldMetadata }) => void | Promise<void>,
  ): (msg: MessageResponse) => Promise<void>;
  check(phone: string): Promise<VerifyResult>;
  challenge(phone: string, redirectUrl?: string): Promise<ChallengeResult>;
  wrapUrl(phone: string, targetUrl: string): Promise<ChallengeResult>;
  challengeStatus(id: string): Promise<ChallengeStatusResult>;
  waitForVerification(id: string, timeoutMs?: number): Promise<ChallengeStatusResult>;
}

// ---- Implementation ----

function extractSender(msg: MessageResponse): string | undefined {
  return msg.handle?.address;
}

function extractChatGuid(msg: MessageResponse): string {
  return msg.chats?.[0]?.guid ?? "";
}

export function shield(sdk: AdvancedIMessageKit, config: ShieldConfig): ShieldInstance {
  const serverUrl = (config.serverUrl ?? SHIELD_SERVER_URL).replace(/\/$/, "");
  const apiKey = config.serverApiKey ?? sdk.config.apiKey ?? "";
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

  function resolveChallengeUrl(msg: MessageResponse): string | undefined {
    if (!config.challengeUrl) return undefined;
    return typeof config.challengeUrl === "function"
      ? config.challengeUrl(msg)
      : config.challengeUrl;
  }

  function protect(
    handler: (msg: MessageResponse & { shield: ShieldMetadata }) => void | Promise<void>,
  ): (msg: MessageResponse) => Promise<void> {
    return async (msg: MessageResponse) => {
      if (msg.isFromMe) return;

      const sender = extractSender(msg);
      if (!sender) return;

      const chatGuid = extractChatGuid(msg);
      const status = await check(sender);

      if (status.verified) {
        const enriched = msg as MessageResponse & { shield: ShieldMetadata };
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
        const enriched = msg as MessageResponse & { shield: ShieldMetadata };
        enriched.shield = { verified: true, status: "verified" };
        return handler(enriched);
      }

      if (result.url && chatGuid) {
        await sdk.messages.sendMessage({ chatGuid, message: result.url });
      }

      if (typeof onUnverified === "function") {
        const enriched = msg as MessageResponse & { shield?: ShieldMetadata };
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
              const enriched = msg as MessageResponse & { shield: ShieldMetadata };
              enriched.shield = { verified: true, status: "verified" };
              return handler(enriched);
            }
          }
          return;

        case "flag": {
          const flagged = msg as MessageResponse & { shield: ShieldMetadata };
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
