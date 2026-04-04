/**
 * advanced-imessage-kit + Shield: Direct challenge
 *
 * Sends a direct challenge URL (/ch/...) when no challengeUrl is set.
 * Waits for verification in 'block' mode, then passes through.
 */
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({
  serverUrl: process.env.PHOTON_SERVER_URL!,
  apiKey: process.env.PHOTON_API_KEY!,
});
await sdk.connect();

const { protect } = shield(sdk, {
  onUnverified: "block",
  // no challengeUrl -- sends a direct /ch/ URL
});

sdk.on("new-message", protect(async (msg) => {
  console.log(`[verified] ${msg.handle?.address}: ${msg.text}`);
}));

process.on("SIGINT", async () => {
  await sdk.close();
  process.exit(0);
});
