/**
 * imessage-kit + Shield: Flag mode
 *
 * All messages flow through. Unverified senders are flagged.
 */
import { IMessageSDK, shield } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK();

const { protect } = shield(sdk, {
  serverApiKey: process.env.PHOTON_API_KEY!,
  onUnverified: "flag",
  challengeUrl: "https://your-app.com/welcome",
});

await sdk.startWatching({
  onDirectMessage: protect(async (msg) => {
    if (msg.shield.verified) {
      console.log(`[HUMAN] ${msg.sender}: ${msg.text}`);
    } else {
      console.log(`[UNVERIFIED] ${msg.sender}: ${msg.text}`);
    }
  }),
});
