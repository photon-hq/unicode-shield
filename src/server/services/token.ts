import { nanoid } from "nanoid";
import { createHmac } from "crypto";

const SECRET = process.env.SHIELD_SECRET ?? "photon-shield-dev-secret";

export function generateChallengeToken(): string {
  return nanoid(24);
}

export function signToken(token: string): string {
  return createHmac("sha256", SECRET).update(token).digest("hex").slice(0, 12);
}

export function generateSignedToken(): { token: string; signature: string; full: string } {
  const token = generateChallengeToken();
  const signature = signToken(token);
  return { token, signature, full: `${token}.${signature}` };
}

export function verifyTokenSignature(full: string): { valid: boolean; token: string } {
  const parts = full.split(".");
  if (parts.length !== 2) return { valid: false, token: "" };
  const [token, sig] = parts as [string, string];
  const expected = signToken(token);
  return { valid: sig === expected, token };
}
