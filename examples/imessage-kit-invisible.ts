/**
 * imessage-kit + Shield: Invisible verification (recommended)
 *
 * Same invisible flow, wired for the base imessage-kit SDK.
 */
import { IMessageSDK, shield } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK();

const { protect } = shield(sdk, {
  serverApiKey: process.env.PHOTON_API_KEY!,
  onUnverified: "block",
  challengeUrl: "https://your-app.com/welcome",
});

await sdk.startWatching({
  onDirectMessage: protect(async (msg) => {
    console.log(`[verified] ${msg.sender}: ${msg.text}`);
    console.log(`  confidence: ${msg.shield.confidence}`);
  }),
});
