/**
 * imessage-kit + Shield: Manual API
 *
 * No protect() wrapper -- call Shield methods directly.
 */
import { IMessageSDK, shield } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK();

const { check, wrapUrl } = shield(sdk, {
  serverApiKey: process.env.PHOTON_API_KEY!,
  onUnverified: "flag",
});

await sdk.startWatching({
  onDirectMessage: async (msg) => {
    const status = await check(msg.sender);

    if (status.verified) {
      console.log(`[verified] ${msg.sender}: ${msg.text}`);
      return;
    }

    const wrapped = await wrapUrl(msg.sender, "https://your-app.com/help");
    if (wrapped.url) {
      await sdk.send(msg.sender, wrapped.url);
    }
  },
});
