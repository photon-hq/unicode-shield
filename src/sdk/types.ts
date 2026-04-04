export interface ShieldConfig {
  serverUrl?: string;
  apiKey?: string;
  onUnverified?:
    | "challenge"
    | "flag"
    | "drop"
    | "log"
    | UnverifiedHandler;
  challengeMessage?: string;
  challengeTimeoutMs?: number;
  pollIntervalMs?: number;
  richLink?: boolean;
}

export type UnverifiedHandler = (
  message: ShieldMessage,
  context: ShieldContext,
) => void | Promise<void>;

export interface ShieldMessage {
  senderAddress: string | undefined;
  chatGuid: string;
  text: string | null | undefined;
  isFromMe: boolean;
  raw: unknown;
}

export interface ShieldContext {
  createChallenge: (phoneNumber: string, redirectUrl?: string) => Promise<ChallengeResult>;
  wrapUrl: (phoneNumber: string, targetUrl: string) => Promise<ChallengeResult>;
  check: (phoneNumber: string) => Promise<VerifyResult>;
  shield: ShieldClient;
}

export interface ChallengeResult {
  challengeId: string | null;
  url: string | null;
  status: "pending" | "already_verified";
  expiresAt?: number;
  verifiedAt?: number;
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
  createdAt?: number;
  verifiedAt?: number | null;
  requestLog?: Array<{
    timestamp: number;
    userAgent: string;
    ip: string;
    isApple: boolean;
  }>;
}

export interface ShieldMetadata {
  verified: boolean;
  status: "verified" | "pending" | "unverified" | "challenged";
  confidence?: string;
  matchedPattern?: string | null;
  isLikelyAgent?: boolean;
  challengeUrl?: string;
}

export interface ShieldClient {
  check(phoneNumber: string): Promise<VerifyResult>;
  challenge(phoneNumber: string, redirectUrl?: string): Promise<ChallengeResult>;
  challengeStatus(challengeId: string): Promise<ChallengeStatusResult>;
  wrapUrl(phoneNumber: string, targetUrl: string): Promise<ChallengeResult>;
  guard<T extends ShieldMessage>(
    handler: (message: T & { shield?: ShieldMetadata }) => void | Promise<void>,
    options?: GuardOptions,
  ): (message: T) => Promise<void>;
  waitForVerification(
    challengeId: string,
    timeoutMs?: number,
  ): Promise<ChallengeStatusResult>;
}

export interface GuardOptions {
  sendMessage?: (chatGuid: string, message: string, richLink?: boolean) => Promise<void>;
  getSenderAddress?: (msg: ShieldMessage) => string | undefined;
  getChatGuid?: (msg: ShieldMessage) => string;
}
