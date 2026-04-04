/**
 * Sends 3 message variants to test different link preview behaviors:
 *   1. richLink: true  -- sender Mac pre-generates the card
 *   2. Plain URL only  -- just the URL text, no richLink flag
 *   3. URL embedded in text -- "Check this out: https://..."
 */
import { SDK } from "@photon-ai/advanced-imessage-kit";

const SERVER_URL = "https://nkk5yy.imsgd.photon.codes";
const API_KEY = "nF7kXwMvC2BKAmYyHQsQvmbX";
const TEST_NUMBER = "+918527438574";

const baseUrl = process.env.PROBE_BASE_URL;
if (!baseUrl) {
  console.error("ERROR: Set PROBE_BASE_URL env var to the ngrok URL");
  process.exit(1);
}

const sdk = SDK({ serverUrl: SERVER_URL, apiKey: API_KEY });
await sdk.connect();
console.log("Connected.\n");

const chatGuid = `iMessage;-;${TEST_NUMBER}`;
const ts = Math.floor(Date.now() / 1000);

console.log("--- Test 1: richLink: true ---");
const url1 = `${baseUrl}/probe/test1_richlink_${ts}`;
console.log(`  URL: ${url1}`);
await sdk.messages.sendMessage({ chatGuid, message: url1, richLink: true });
console.log("  Sent.\n");

await new Promise(r => setTimeout(r, 3000));

console.log("--- Test 2: Plain URL ---");
const url2 = `${baseUrl}/probe/test2_plain_${ts}`;
console.log(`  URL: ${url2}`);
await sdk.messages.sendMessage({ chatGuid, message: url2 });
console.log("  Sent.\n");

await new Promise(r => setTimeout(r, 3000));

// Test 3: URL embedded in text
console.log("--- Test 3: URL embedded in text ---");
const url3 = `${baseUrl}/probe/test3_embedded_${ts}`;
console.log(`  URL: ${url3}`);
await sdk.messages.sendMessage({ chatGuid, message: `Hey! Check this out: ${url3}` });
console.log("  Sent.\n");

console.log("All 3 sent. Watch the probe server.");
console.log("Each has a unique path so we can tell which message triggered which fetch.\n");

await sdk.close();
