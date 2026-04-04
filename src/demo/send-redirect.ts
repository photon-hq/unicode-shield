/**
 * Demo: Send a wrapped URL via iMessage and watch Shield verify the recipient.
 *
 * Usage:
 *   PHOTON_SERVER_URL=https://xxx.imsgd.photon.codes \
 *   PHOTON_API_KEY=your-key \
 *   SHIELD_SERVER_URL=http://localhost:3001 \
 *   SHIELD_API_KEY=shield_dev_key \
 *   TARGET_PHONE=+1234567890 \
 *   TARGET_URL=https://example.com \
 *   bun run src/demo/send-redirect.ts
 */
import { SDK } from "@photon-ai/advanced-imessage-kit";
import { createShield } from "../sdk/index.ts";

const PHOTON_SERVER = process.env.PHOTON_SERVER_URL;
const PHOTON_API_KEY = process.env.PHOTON_API_KEY;
const SHIELD_SERVER = process.env.SHIELD_SERVER_URL ?? "http://localhost:3001";
const SHIELD_API_KEY = process.env.SHIELD_API_KEY ?? "shield_dev_key";
const TARGET_PHONE = process.env.TARGET_PHONE;
const TARGET_URL = process.env.TARGET_URL ?? "https://example.com";

if (!PHOTON_SERVER || !PHOTON_API_KEY || !TARGET_PHONE) {
  console.error("Required env vars: PHOTON_SERVER_URL, PHOTON_API_KEY, TARGET_PHONE");
  process.exit(1);
}

const shield = createShield({
  serverUrl: SHIELD_SERVER,
  apiKey: SHIELD_API_KEY,
});

console.log(`\n[demo] Creating wrapped URL for ${TARGET_URL}...`);
const result = await shield.wrapUrl(TARGET_PHONE, TARGET_URL);

if (!result.url) {
  console.error("[demo] Failed to create wrapped URL:", result);
  process.exit(1);
}

console.log(`[demo] Shield URL: ${result.url}`);
console.log(`[demo] Challenge ID: ${result.challengeId}`);
console.log(`[demo] Status: ${result.status}\n`);

const sdk = SDK({ serverUrl: PHOTON_SERVER, apiKey: PHOTON_API_KEY });
await sdk.connect();

const chatGuid = `iMessage;-;${TARGET_PHONE}`;

console.log(`[demo] Sending to ${TARGET_PHONE}...`);
await sdk.messages.sendMessage({ chatGuid, message: result.url });
console.log("[demo] Sent! Watching for verification...\n");

const TIMEOUT_MS = 120_000;
const POLL_MS = 2_000;
const deadline = Date.now() + TIMEOUT_MS;
let verified = false;

while (Date.now() < deadline) {
  const status = await shield.challengeStatus(result.challengeId!);

  if (status.status === "verified") {
    console.log("\n========================================");
    console.log("  VERIFIED - HUMAN CONFIRMED");
    console.log("========================================");
    console.log(`  Phone: ${status.phoneNumber}`);
    console.log(`  Verified at: ${new Date(status.verifiedAt!).toISOString()}`);
    console.log(`  Request log:`);
    for (const entry of status.requestLog ?? []) {
      console.log(
        `    ${entry.isApple ? "APPLE" : "OTHER"} | ${entry.userAgent.slice(0, 80)}`,
      );
    }
    console.log("========================================\n");
    verified = true;
    break;
  }

  if (status.status === "failed") {
    console.log("\n========================================");
    console.log("  FAILED - BOT DETECTED");
    console.log("========================================\n");
    break;
  }

  const elapsed = Math.round((Date.now() - (deadline - TIMEOUT_MS)) / 1000);
  process.stdout.write(`\r[demo] Waiting... ${elapsed}s (status: ${status.status})`);
  await new Promise((r) => setTimeout(r, POLL_MS));
}

if (!verified) {
  console.log("\n[demo] Timed out waiting for verification.");
}

await sdk.close();
process.exit(0);
