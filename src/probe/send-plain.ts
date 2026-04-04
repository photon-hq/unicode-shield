/**
 * Sends a plain URL (without richLink flag) to observe receiver-side preview fetching.
 */
import { SDK } from "@photon-ai/advanced-imessage-kit";

const SERVER_URL = "https://nkk5yy.imsgd.photon.codes";
const API_KEY = "nF7kXwMvC2BKAmYyHQsQvmbX";
const TEST_NUMBER = "+918527438574";

const probeUrl = process.env.PROBE_URL;
if (!probeUrl) {
  console.error("ERROR: Set PROBE_URL env var");
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

console.log(`Sending PLAIN URL (no richLink) to ${TEST_NUMBER}...`);
console.log(`URL: ${probeUrl}`);

const result = await sdk.messages.sendMessage({
  chatGuid,
  message: probeUrl,
});

console.log(`Sent at ${new Date(sentAt).toISOString()}`);
console.log(`GUID: ${result.guid}`);
console.log("\nWatch probe server for receiver-side preview fetch.");

await sdk.close();
