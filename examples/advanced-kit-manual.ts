/**
 * advanced-imessage-kit + Shield: Manual API
 *
 * No protect() wrapper -- call Shield methods directly.
 */
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({
  serverUrl: process.env.PHOTON_SERVER_URL!,
  apiKey: process.env.PHOTON_API_KEY!,
});
await sdk.connect();

const { check, wrapUrl, challenge } = shield(sdk, { onUnverified: "flag" });

sdk.on("new-message", async (message) => {
  if (message.isFromMe) return;

  const sender = message.handle?.address;
  if (!sender) return;

  const chatGuid = message.chats?.[0]?.guid ?? `iMessage;-;${sender}`;
  const status = await check(sender);

  if (status.verified) {
    console.log(`[verified] ${sender}: ${message.text}`);
    return;
  }

  const wrapped = await wrapUrl(sender, "https://your-app.com/order/123");
  if (wrapped.url) {
    await sdk.messages.sendMessage({ chatGuid, message: wrapped.url });
  }
});

process.on("SIGINT", async () => {
  await sdk.close();
  process.exit(0);
});
