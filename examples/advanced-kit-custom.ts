/**
 * advanced-imessage-kit + Shield: Custom handler
 *
 * Full developer control via a function for onUnverified.
 */
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({
  serverUrl: process.env.PHOTON_SERVER_URL!,
  apiKey: process.env.PHOTON_API_KEY!,
});
await sdk.connect();

const { protect } = shield(sdk, {
  onUnverified: async (msg, ctx) => {
    const sender = msg.handle?.address;
    if (!sender) return;

    const result = await ctx.wrapUrl(sender, "https://your-app.com/help");
    if (result.status === "already_verified") return;

    if (result.url && result.challengeId) {
      await sdk.messages.sendMessage({ chatGuid: msg.chatGuid!, message: result.url });
      const status = await ctx.waitForVerification(result.challengeId, 15_000);
      console.log(`Verification: ${status.status}`);
    }
  },
});

sdk.on("new-message", protect(async (msg) => {
  console.log(`[verified] ${msg.handle?.address}: ${msg.text}`);
}));

process.on("SIGINT", async () => {
  await sdk.close();
  process.exit(0);
});
