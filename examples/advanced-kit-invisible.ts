/**
 * advanced-imessage-kit + Shield: Invisible verification (recommended)
 *
 * The user never sees any verification. Shield wraps a URL through its
 * /r/ route. The iMessage preview looks like the destination site.
 * Verification happens silently via the preview fetch.
 */
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({
  serverUrl: process.env.PHOTON_SERVER_URL!,
  apiKey: process.env.PHOTON_API_KEY!,
});
await sdk.connect();

const { protect } = shield(sdk, {
  onUnverified: "block",
  challengeUrl: "https://your-app.com/welcome",
});

sdk.on("new-message", protect(async (msg) => {
  console.log(`[verified] ${msg.handle?.address}: ${msg.text}`);
  console.log(`  confidence: ${msg.shield.confidence}`);
}));

process.on("SIGINT", async () => {
  await sdk.close();
  process.exit(0);
});
