import type {
  ShieldConfig,
  ShieldClient,
  ShieldMessage,
  ShieldMetadata,
  ChallengeResult,
  VerifyResult,
  ChallengeStatusResult,
  GuardOptions,
} from "./types.ts";

const DEFAULT_SERVER_URL = "https://verify.photon.codes";
const DEFAULT_CHALLENGE_TIMEOUT_MS = 30_000;
const DEFAULT_POLL_INTERVAL_MS = 2_000;

export function createShield(config: ShieldConfig = {}): ShieldClient {
  const serverUrl = (config.serverUrl ?? DEFAULT_SERVER_URL).replace(/\/$/, "");
  const apiKey = config.apiKey ?? "";
  const onUnverified = config.onUnverified ?? "flag";
  const challengeTemplate = config.challengeMessage ?? "{{url}}";
  const challengeTimeoutMs = config.challengeTimeoutMs ?? DEFAULT_CHALLENGE_TIMEOUT_MS;
  const pollIntervalMs = config.pollIntervalMs ?? DEFAULT_POLL_INTERVAL_MS;
  const richLink = config.richLink ?? false;

  function headers(): Record<string, string> {
    const h: Record<string, string> = { "Content-Type": "application/json" };
    if (apiKey) h["x-api-key"] = apiKey;
    return h;
  }

  async function check(phoneNumber: string): Promise<VerifyResult> {
    const res = await fetch(
      `${serverUrl}/api/verify/${encodeURIComponent(phoneNumber)}`,
      { headers: headers() },
    );
    if (!res.ok) {
      throw new Error(`Shield verify request failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<VerifyResult>;
  }

  async function challenge(phoneNumber: string, redirectUrl?: string): Promise<ChallengeResult> {
    const body: Record<string, string> = { phoneNumber };
    if (redirectUrl) body.redirectUrl = redirectUrl;

    const res = await fetch(`${serverUrl}/api/challenges`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      throw new Error(`Shield challenge request failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<ChallengeResult>;
  }

  async function wrapUrl(phoneNumber: string, targetUrl: string): Promise<ChallengeResult> {
    return challenge(phoneNumber, targetUrl);
  }

  async function challengeStatus(challengeId: string): Promise<ChallengeStatusResult> {
    const res = await fetch(
      `${serverUrl}/api/challenges/${encodeURIComponent(challengeId)}/status`,
      { headers: headers() },
    );
    if (!res.ok) {
      throw new Error(`Shield status request failed: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<ChallengeStatusResult>;
  }

  async function waitForVerification(
    challengeId: string,
    timeoutMs = challengeTimeoutMs,
  ): Promise<ChallengeStatusResult> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const status = await challengeStatus(challengeId);
      if (status.status === "verified" || status.status === "failed" || status.status === "expired") {
        return status;
      }
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
    return { status: "expired" };
  }

  function formatChallengeMessage(url: string): string {
    return challengeTemplate.replace(/\{\{url\}\}/g, url);
  }

  function guard<T extends ShieldMessage>(
    handler: (message: T & { shield?: ShieldMetadata }) => void | Promise<void>,
    options?: GuardOptions,
  ): (message: T) => Promise<void> {
    return async (message: T) => {
      if (message.isFromMe) {
        return handler(message);
      }

      const senderAddress = options?.getSenderAddress
        ? options.getSenderAddress(message)
        : message.senderAddress;

      if (!senderAddress) {
        const flagged = message as T & { shield?: ShieldMetadata };
        flagged.shield = {
          verified: false,
          status: "unverified",
          isLikelyAgent: true,
        };
        if (onUnverified === "drop") return;
        return handler(flagged);
      }

      const verifyResult = await check(senderAddress);

      if (verifyResult.verified) {
        const verified = message as T & { shield?: ShieldMetadata };
        verified.shield = {
          verified: true,
          status: "verified",
          confidence: verifyResult.confidence,
          matchedPattern: verifyResult.matchedPattern,
        };
        return handler(verified);
      }

      // Not verified -- handle according to preset
      if (typeof onUnverified === "function") {
        const ctx = { createChallenge: challenge, check, shield: client, wrapUrl };
        return onUnverified(message, ctx);
      }

      switch (onUnverified) {
        case "drop":
          return;

        case "log":
          console.log(`[shield] unverified sender: ${senderAddress}`);
          return handler(message as T & { shield?: ShieldMetadata });

        case "flag": {
          const flagged = message as T & { shield?: ShieldMetadata };
          flagged.shield = {
            verified: false,
            status: "unverified",
            isLikelyAgent: false,
          };
          return handler(flagged);
        }

        case "challenge": {
          if (!options?.sendMessage) {
            console.error(
              "[shield] 'challenge' preset requires sendMessage in guard options",
            );
            const flagged = message as T & { shield?: ShieldMetadata };
            flagged.shield = { verified: false, status: "unverified" };
            return handler(flagged);
          }

          const challengeResult = await challenge(senderAddress);

          if (challengeResult.status === "already_verified") {
            const verified = message as T & { shield?: ShieldMetadata };
            verified.shield = { verified: true, status: "verified" };
            return handler(verified);
          }

          if (challengeResult.url) {
            const chatGuid = options.getChatGuid
              ? options.getChatGuid(message)
              : message.chatGuid;

            const text = formatChallengeMessage(challengeResult.url);
            await options.sendMessage(chatGuid, text, richLink);

            const flagged = message as T & { shield?: ShieldMetadata };
            flagged.shield = {
              verified: false,
              status: "challenged",
              challengeUrl: challengeResult.url,
            };
          }
          return;
        }
      }
    };
  }

  const client: ShieldClient = {
    check,
    challenge,
    challengeStatus,
    wrapUrl,
    guard,
    waitForVerification,
  };

  return client;
}
