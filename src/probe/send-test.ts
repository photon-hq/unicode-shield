/**
 * Sends a probe URL to the test phone number via the Photon advanced-imessage-kit.
 * The probe server must be running and publicly accessible (via tunnel) before running this.
 *
 * Usage:
 *   PROBE_URL=https://your-tunnel.ngrok.io/probe/test123 bun run src/probe/send-test.ts
 */
import { SDK } from "@photon-ai/advanced-imessage-kit";

const SERVER_URL = "https://nkk5yy.imsgd.photon.codes";
const API_KEY = "nF7kXwMvC2BKAmYyHQsQvmbX";
const TEST_NUMBER = "+918527438574";

const probeUrl = process.env.PROBE_URL;
if (!probeUrl) {
  console.error("ERROR: Set PROBE_URL env var to the public tunnel URL");
  console.error("Example: PROBE_URL=https://abc123.ngrok.io/probe/test1 bun run src/probe/send-test.ts");
  process.exit(1);
}

const sdk = SDK({
  serverUrl: SERVER_URL,
  apiKey: API_KEY,
});

await sdk.connect();
console.log("Connected to Photon test instance");

const chatGuid = `iMessage;-;${TEST_NUMBER}`;
const sentAt = Date.now();

console.log(`Sending probe URL to ${TEST_NUMBER}...`);
console.log(`URL: ${probeUrl}`);

const result = await sdk.messages.sendMessage({
  chatGuid,
  message: probeUrl,
  richLink: true,
});

console.log(`Message sent at ${new Date(sentAt).toISOString()}`);
console.log(`Message GUID: ${result.guid}`);
console.log("\nWatching for incoming requests...");

await sdk.close();
