import { createShield } from "./sdk/index.ts";
import type { ShieldMessage, ShieldMetadata } from "./sdk/index.ts";
import { shield as advancedShield } from "./sdk/advanced.ts";
import { shield as imessageShield } from "./sdk/imessage.ts";

const lowLevel = createShield({
  serverUrl: "http://localhost:3001",
  apiKey: "shield_dev_key",
  onUnverified: "flag",
});

const PHONE = "+918527438574";

async function test(name: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  PASS  ${name}`);
  } catch (err) {
    console.log(`  FAIL  ${name}: ${err}`);
    process.exit(1);
  }
}

function assert(condition: boolean, msg: string) {
  if (!condition) throw new Error(msg);
}

console.log("\n--- Photon Shield Integration Tests ---\n");

await test("1. Fresh phone number is unverified", async () => {
  const result = await lowLevel.check(PHONE);
  assert(!result.verified, `expected unverified, got verified`);
});

await test("2. Create challenge returns URL", async () => {
  const result = await lowLevel.challenge(PHONE);
  assert(result.status === "pending", `expected pending, got ${result.status}`);
  assert(!!result.url, "expected URL");
  assert(!!result.challengeId, "expected challengeId");
});

let challengeUrl: string;
let challengeId: string;

await test("3. Create challenge details", async () => {
  const result = await lowLevel.challenge(PHONE);
  challengeUrl = result.url!;
  challengeId = result.challengeId!;
  assert(challengeUrl.includes("/ch/"), `URL should contain /ch/: ${challengeUrl}`);
});

await test("4. Challenge status is pending", async () => {
  const status = await lowLevel.challengeStatus(challengeId);
  assert(status.status === "pending", `expected pending, got ${status.status}`);
});

await test("5. Simulate Apple iOS preview fetch -> verified", async () => {
  const res = await fetch(challengeUrl, {
    headers: {
      "User-Agent": "NetworkingExtension/8623.1.14.10.9 CFNetwork/3860.300.31 Darwin/25.2.0",
    },
  });
  assert(res.ok, `fetch failed: ${res.status}`);
});

await test("6. Challenge status is now verified", async () => {
  const status = await lowLevel.challengeStatus(challengeId);
  assert(status.status === "verified", `expected verified, got ${status.status}`);
});

await test("7. Phone number is verified", async () => {
  const result = await lowLevel.check(PHONE);
  assert(result.verified, "expected verified");
  assert(result.confidence === "high", `expected high confidence, got ${result.confidence}`);
  assert(result.matchedPattern === "ios-networking-extension", `wrong pattern: ${result.matchedPattern}`);
});

await test("8. Creating challenge for verified number returns already_verified", async () => {
  const result = await lowLevel.challenge(PHONE);
  assert(result.status === "already_verified", `expected already_verified, got ${result.status}`);
});

await test("9. guard() passes verified sender with shield metadata", async () => {
  let received = false;
  const guarded = lowLevel.guard<ShieldMessage & { shield?: ShieldMetadata }>(async (msg) => {
    received = true;
    assert(msg.shield?.verified === true, "expected verified in shield metadata");
    assert(msg.shield?.status === "verified", "expected status=verified");
  });

  await guarded({
    senderAddress: PHONE,
    chatGuid: "test;-;+918527438574",
    text: "hello",
    isFromMe: false,
    raw: {},
  });
  assert(received, "handler was not called");
});

await test("10. guard() flags unverified sender", async () => {
  let received = false;
  const guarded = lowLevel.guard<ShieldMessage & { shield?: ShieldMetadata }>(async (msg) => {
    received = true;
    assert(msg.shield?.verified === false, "expected unverified");
    assert(msg.shield?.status === "unverified", "expected status=unverified");
  });

  await guarded({
    senderAddress: "+19999999999",
    chatGuid: "test;-;+19999999999",
    text: "bot message",
    isFromMe: false,
    raw: {},
  });
  assert(received, "handler was not called for flagged message");
});

await test("11. guard() with 'drop' preset silently discards unverified", async () => {
  const dropShield = createShield({
    serverUrl: "http://localhost:3001",
    apiKey: "shield_dev_key",
    onUnverified: "drop",
  });

  let received = false;
  const guarded = dropShield.guard<ShieldMessage & { shield?: ShieldMetadata }>(async () => {
    received = true;
  });

  await guarded({
    senderAddress: "+19999999998",
    chatGuid: "test;-;+19999999998",
    text: "should be dropped",
    isFromMe: false,
    raw: {},
  });
  assert(!received, "handler should NOT be called for dropped message");
});

await test("12. Bot User-Agent marks challenge as failed", async () => {
  const botResult = await lowLevel.challenge("+10000000000");
  assert(botResult.url !== null, "expected URL");

  await fetch(botResult.url!, {
    headers: { "User-Agent": "python-requests/2.31.0" },
  });

  const status = await lowLevel.challengeStatus(botResult.challengeId!);
  assert(status.status === "failed", `expected failed, got ${status.status}`);
});

await test("13. macOS WebKit UA verifies challenge", async () => {
  const macResult = await lowLevel.challenge("+12222222222");
  assert(macResult.url !== null, "expected URL");

  await fetch(macResult.url!, {
    headers: {
      "User-Agent": "com.apple.WebKit.Networking/21622.2.11.11.9 CFNetwork/3860.200.71 Darwin/25.1.0",
    },
  });

  const status = await lowLevel.challengeStatus(macResult.challengeId!);
  assert(status.status === "verified", `expected verified, got ${status.status}`);
});

await test("14. Legacy facebookexternalhit+Twitterbot UA verifies", async () => {
  const legacyResult = await lowLevel.challenge("+13333333333");
  assert(legacyResult.url !== null, "expected URL");

  await fetch(legacyResult.url!, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_11_1) AppleWebKit/601.2.4 (KHTML, like Gecko) " +
        "Version/9.0.1 Safari/601.2.4 facebookexternalhit/1.1 Facebot Twitterbot/1.0",
    },
  });

  const status = await lowLevel.challengeStatus(legacyResult.challengeId!);
  assert(status.status === "verified", `expected verified, got ${status.status}`);
});

await test("15. guard() skips verification for isFromMe messages", async () => {
  let received = false;
  const guarded = lowLevel.guard<ShieldMessage & { shield?: ShieldMetadata }>(async (msg) => {
    received = true;
    assert(msg.shield === undefined, "isFromMe messages should have no shield metadata");
  });

  await guarded({
    senderAddress: "+19999999997",
    chatGuid: "test;-;+19999999997",
    text: "my own message",
    isFromMe: true,
    raw: {},
  });
  assert(received, "handler should be called for own messages");
});

// ---- Piggyback Redirect Tests ----

console.log("\n--- Piggyback Redirect Tests ---\n");

const REDIRECT_PHONE = "+16666666666";
const TARGET_URL = "https://example.com";

let redirectChallengeUrl: string;
let redirectChallengeId: string;

await test("16. Create redirect challenge returns /r/ URL", async () => {
  const result = await lowLevel.wrapUrl(REDIRECT_PHONE, TARGET_URL);
  assert(result.status === "pending", `expected pending, got ${result.status}`);
  assert(!!result.url, "expected URL");
  assert(result.url!.includes("/r/"), `URL should contain /r/: ${result.url}`);
  assert(!result.url!.includes("/ch/"), `URL should NOT contain /ch/: ${result.url}`);
  redirectChallengeUrl = result.url!;
  redirectChallengeId = result.challengeId!;
});

await test("17. Redirect challenge status is pending", async () => {
  const status = await lowLevel.challengeStatus(redirectChallengeId);
  assert(status.status === "pending", `expected pending, got ${status.status}`);
});

await test("18. Apple automatic UA on /r/ verifies the challenge", async () => {
  const res = await fetch(redirectChallengeUrl, {
    headers: {
      "User-Agent": "NetworkingExtension/8623.1.14.10.9 CFNetwork/3860.300.31 Darwin/25.2.0",
    },
    redirect: "manual",
  });
  assert(res.ok, `fetch failed: ${res.status}`);
  const html = await res.text();
  assert(html.includes("og:title"), "response should contain proxied OG metadata");
  assert(html.includes("example.com") || html.includes("Example"), "response should reference the target domain");
});

await test("19. Redirect challenge is now verified", async () => {
  const status = await lowLevel.challengeStatus(redirectChallengeId);
  assert(status.status === "verified", `expected verified, got ${status.status}`);
});

await test("20. Redirect phone number is verified", async () => {
  const result = await lowLevel.check(REDIRECT_PHONE);
  assert(result.verified, "expected verified");
});

await test("21. Safari UA on /r/ gets 302 redirect to target", async () => {
  const result2 = await lowLevel.wrapUrl("+17777777777", TARGET_URL);
  const url2 = result2.url!;

  const res = await fetch(url2, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (iPhone; CPU iPhone OS 18_4_1 like Mac OS X) " +
        "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.4 Mobile/15E148 Safari/604.1",
    },
    redirect: "manual",
  });
  assert(res.status === 302, `expected 302, got ${res.status}`);
  const location = res.headers.get("location");
  assert(location === TARGET_URL, `expected redirect to ${TARGET_URL}, got ${location}`);
});

await test("22. Regular browser UA on /r/ gets 302 redirect", async () => {
  const result3 = await lowLevel.wrapUrl("+18888888888", TARGET_URL);

  const res = await fetch(result3.url!, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
    redirect: "manual",
  });
  assert(res.status === 302, `expected 302, got ${res.status}`);
  assert(res.headers.get("location") === TARGET_URL, "should redirect to target");
});

await test("23. Bot UA on /r/ fails the challenge", async () => {
  const result4 = await lowLevel.wrapUrl("+10000000001", TARGET_URL);

  await fetch(result4.url!, {
    headers: { "User-Agent": "python-requests/2.31.0" },
    redirect: "manual",
  });

  const status = await lowLevel.challengeStatus(result4.challengeId!);
  assert(status.status === "failed", `expected failed, got ${status.status}`);
});

await test("24. Favicon route on /r/ also verifies", async () => {
  const result5 = await lowLevel.wrapUrl("+14444444444", TARGET_URL);
  const faviconUrl = result5.url! + "/favicon.ico";

  const res = await fetch(faviconUrl, {
    headers: {
      "User-Agent": "com.apple.WebKit.Networking/21622.2.11.11.9 CFNetwork/3860.200.71 Darwin/25.1.0",
    },
    redirect: "manual",
  });
  assert(res.ok || res.status === 302, `favicon fetch failed: ${res.status}`);

  const status = await lowLevel.challengeStatus(result5.challengeId!);
  assert(status.status === "verified", `expected verified, got ${status.status}`);
});

await test("25. Already-verified number with redirectUrl returns original URL", async () => {
  const result = await lowLevel.wrapUrl(REDIRECT_PHONE, "https://other.example.com");
  assert(result.status === "already_verified", `expected already_verified, got ${result.status}`);
  assert(result.url === "https://other.example.com", `expected original URL back, got ${result.url}`);
});

// ---- shield(sdk, config) API tests (advanced-imessage-kit shape) ----

console.log("\n--- shield(sdk, config) API Tests (advanced-imessage-kit) ---\n");

const sentMessages: Array<{ chatGuid: string; message: string }> = [];
const mockAdvancedSdk = {
  config: { apiKey: "shield_dev_key" },
  messages: {
    async sendMessage(opts: { chatGuid: string; message: string }) {
      sentMessages.push(opts);
    },
  },
};

await test("26. advanced shield() protect() passes verified sender", async () => {
  const { protect } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "block",
  });

  let received = false;
  const handler = protect(async (msg) => {
    received = true;
    assert(msg.shield.verified === true, "expected verified");
  });

  await handler({
    handle: { address: PHONE },
    chatGuid: "test;-;+918527438574",
    text: "hello",
    isFromMe: false,
  });
  assert(received, "handler was not called for verified sender");
});

await test("27. advanced shield() protect() skips isFromMe", async () => {
  const { protect } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "flag",
  });

  let received = false;
  const handler = protect(async () => {
    received = true;
  });

  await handler({ handle: { address: "+10000000000" }, isFromMe: true, text: "my msg" });
  assert(!received, "handler should NOT be called for own messages");
});

await test("28. advanced shield() protect() sends challenge for unverified", async () => {
  sentMessages.length = 0;
  const { protect } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "flag",
  });

  let receivedMsg: (typeof sentMessages)[0] | null = null;
  const handler = protect(async (msg) => {
    assert(msg.shield.verified === false, "expected unverified flag");
    receivedMsg = sentMessages[0] ?? null;
  });

  await handler({
    handle: { address: "+19876543210" },
    chatGuid: "test;-;+19876543210",
    text: "unverified msg",
    isFromMe: false,
  });
  assert(sentMessages.length > 0, "should have sent a challenge URL");
});

await test("29. advanced shield() inherits apiKey from sdk.config", async () => {
  const { check } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "flag",
  });
  const result = await check(PHONE);
  assert(result.verified, "should use inherited apiKey for auth");
});

await test("30. advanced shield() wrapUrl works", async () => {
  const { wrapUrl } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "flag",
  });
  const result = await wrapUrl("+11112223333", "https://example.com/test");
  assert(!!result.url, "expected URL");
  assert(result.url!.includes("/r/"), "expected /r/ URL");
});

await test("31. advanced shield() with challengeUrl wraps through /r/", async () => {
  sentMessages.length = 0;
  const { protect } = advancedShield(mockAdvancedSdk, {
    serverUrl: "http://localhost:3001",
    onUnverified: "flag",
    challengeUrl: "https://my-app.com/welcome",
  });

  const handler = protect(async () => {});
  await handler({
    handle: { address: "+19876500001" },
    chatGuid: "test;-;+19876500001",
    text: "hi",
    isFromMe: false,
  });

  assert(sentMessages.length > 0, "should have sent a message");
  assert(sentMessages[0]!.message.includes("/r/"), "sent URL should be /r/ wrapped");
});

// ---- shield(sdk, config) API tests (imessage-kit shape) ----

console.log("\n--- shield(sdk, config) API Tests (imessage-kit) ---\n");

const imSentMessages: Array<{ to: string; content: string }> = [];
const mockImessageSdk = {
  async send(to: string, content: string) {
    imSentMessages.push({ to, content });
  },
};

await test("32. imessage shield() protect() passes verified sender", async () => {
  const { protect } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "block",
  });

  let received = false;
  const handler = protect(async (msg) => {
    received = true;
    assert(msg.shield.verified === true, "expected verified");
  });

  await handler({ sender: PHONE, chatId: "chat1", text: "hello", isFromMe: false });
  assert(received, "handler was not called for verified sender");
});

await test("33. imessage shield() protect() skips isFromMe", async () => {
  const { protect } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "flag",
  });

  let received = false;
  const handler = protect(async () => { received = true; });
  await handler({ sender: "+10000000000", isFromMe: true, text: "self" });
  assert(!received, "handler should NOT be called for own messages");
});

await test("34. imessage shield() sends via sdk.send for unverified", async () => {
  imSentMessages.length = 0;
  const { protect } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "flag",
  });

  const handler = protect(async () => {});
  await handler({
    sender: "+19876540000",
    chatId: "chat-test",
    text: "unverified",
    isFromMe: false,
  });

  assert(imSentMessages.length > 0, "should have sent a challenge via sdk.send");
  assert(imSentMessages[0]!.to === "+19876540000", "should send to sender");
});

await test("35. imessage shield() explicit serverApiKey", async () => {
  const { check } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "flag",
  });
  const result = await check(PHONE);
  assert(result.verified, "should authenticate with explicit serverApiKey");
});

await test("36. imessage shield() wrapUrl works", async () => {
  const { wrapUrl } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "flag",
  });
  const result = await wrapUrl("+14445556666", "https://example.com/page");
  assert(!!result.url, "expected URL");
  assert(result.url!.includes("/r/"), "expected /r/ URL");
});

await test("37. imessage shield() drop preset silences unverified", async () => {
  imSentMessages.length = 0;
  const { protect } = imessageShield(mockImessageSdk, {
    serverUrl: "http://localhost:3001",
    serverApiKey: "shield_dev_key",
    onUnverified: "drop",
  });

  let received = false;
  const handler = protect(async () => { received = true; });
  await handler({
    sender: "+19876541111",
    chatId: "chat-drop",
    text: "should be dropped",
    isFromMe: false,
  });

  assert(!received, "handler should NOT be called for dropped messages");
});

// ---- Auth endpoint tests ----

console.log("\n--- Auth Endpoint Tests ---\n");

await test("38. POST /api/auth/validate with valid Shield key", async () => {
  const res = await fetch("http://localhost:3001/api/auth/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": "shield_dev_key" },
    body: JSON.stringify({ apiKey: "shield_dev_key" }),
  });
  assert(res.ok, `expected 200, got ${res.status}`);
  const data = await res.json() as { valid: boolean; orgId?: string; source?: string };
  assert(data.valid === true, "expected valid");
  assert(data.orgId === "dev-org", `expected dev-org, got ${data.orgId}`);
  assert(data.source === "shield", `expected shield source, got ${data.source}`);
});

await test("39. POST /api/auth/validate with unknown key in dev mode", async () => {
  const res = await fetch("http://localhost:3001/api/auth/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": "shield_dev_key" },
    body: JSON.stringify({ apiKey: "unknown-key-abc" }),
  });
  assert(res.ok, `expected 200, got ${res.status}`);
  const data = await res.json() as { valid: boolean; source?: string };
  assert(data.valid === true, "dev mode should accept any key");
  assert(data.source === "dev", `expected dev source, got ${data.source}`);
});

await test("40. POST /api/auth/register-photon-key + validate", async () => {
  const regRes = await fetch("http://localhost:3001/api/auth/register-photon-key", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": "shield_dev_key" },
    body: JSON.stringify({ apiKey: "photon_test_key_123", orgId: "test-org" }),
  });
  assert(regRes.ok, `register failed: ${regRes.status}`);

  const valRes = await fetch("http://localhost:3001/api/auth/validate", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": "shield_dev_key" },
    body: JSON.stringify({ apiKey: "photon_test_key_123" }),
  });
  assert(valRes.ok, `validate failed: ${valRes.status}`);
  const data = await valRes.json() as { valid: boolean; orgId?: string; source?: string };
  assert(data.valid === true, "registered key should be valid");
  assert(data.orgId === "test-org", `expected test-org, got ${data.orgId}`);
  assert(data.source === "photon", `expected photon source, got ${data.source}`);
});

await test("41. Registered Photon key works in auth middleware", async () => {
  const res = await fetch("http://localhost:3001/api/verify/%2B918527438574", {
    headers: { "x-api-key": "photon_test_key_123" },
  });
  assert(res.ok, `auth should accept registered Photon key, got ${res.status}`);
});

console.log("\n--- All 41 tests passed ---\n");
process.exit(0);
