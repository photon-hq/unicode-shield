/**
 * advanced-imessage-kit + Shield: Flag mode
 *
 * All messages pass through immediately. Unverified senders
 * have msg.shield.verified = false. Good for logging/analytics
 * without blocking any traffic.
 */
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({
  serverUrl: process.env.PHOTON_SERVER_URL!,
  apiKey: process.env.PHOTON_API_KEY!,
});
await sdk.connect();

const { protect } = shield(sdk, {
  onUnverified: "flag",
  challengeUrl: "https://your-app.com/welcome",
});

sdk.on("new-message", protect(async (msg) => {
  if (msg.shield.verified) {
    console.log(`[HUMAN] ${msg.handle?.address}: ${msg.text}`);
  } else {
    console.log(`[UNVERIFIED] ${msg.handle?.address}: ${msg.text}`);
  }
}));

process.on("SIGINT", async () => {
  await sdk.close();
  process.exit(0);
});
