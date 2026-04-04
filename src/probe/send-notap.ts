import { SDK } from "@photon-ai/advanced-imessage-kit";

const SERVER_URL = "https://nkk5yy.imsgd.photon.codes";
const API_KEY = "nF7kXwMvC2BKAmYyHQsQvmbX";
const TEST_NUMBER = "+918527438574";

const baseUrl = process.env.PROBE_BASE_URL;
if (!baseUrl) { console.error("Set PROBE_BASE_URL"); process.exit(1); }

const sdk = SDK({ serverUrl: SERVER_URL, apiKey: API_KEY });
await sdk.connect();

const chatGuid = `iMessage;-;${TEST_NUMBER}`;
const ts = Math.floor(Date.now() / 1000);
const url = `${baseUrl}/probe/notap_${ts}`;

console.log(`Sending plain URL (no richLink): ${url}`);
console.log("DO NOT TAP THE LINK. Just let it sit.\n");

await sdk.messages.sendMessage({ chatGuid, message: url });
console.log("Sent. Watching for automatic fetches...");

await sdk.close();
