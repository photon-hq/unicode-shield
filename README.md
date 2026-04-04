# Photon Shield

Invisible bot protection for iMessage agents. Zero friction, no CAPTCHAs, no user interaction.

## Quick Start

### `advanced-imessage-kit`

```ts
import { SDK, shield } from "@photon-ai/advanced-imessage-kit";

const sdk = SDK({ serverUrl: "...", apiKey: "..." });
await sdk.connect();

const { protect } = shield(sdk, {
  onUnverified: "block",
  challengeUrl: "https://your-app.com/welcome",
});

sdk.on("new-message", protect(async (msg) => {
  console.log(`${msg.handle?.address}: ${msg.text}`);
}));
```

### `imessage-kit`

```ts
import { IMessageSDK, shield } from "@photon-ai/imessage-kit";

const sdk = new IMessageSDK();

const { protect } = shield(sdk, {
  serverApiKey: "your-photon-api-key",
  onUnverified: "block",
  challengeUrl: "https://your-app.com/welcome",
});

await sdk.startWatching({
  onDirectMessage: protect(async (msg) => {
    console.log(`${msg.sender}: ${msg.text}`);
  }),
});
```

Both use the same `shield(sdk, config?)` pattern.

## Config

```ts
interface ShieldConfig {
  serverUrl?: string;
  serverApiKey?: string;
  onUnverified: 'block' | 'flag' | 'drop' | (msg, ctx) => void;
  challengeUrl?: string | (msg) => string;
  challengeTimeoutMs?: number;
  pollIntervalMs?: number;
}
```

## API

```ts
const { protect, check, wrapUrl, challenge, challengeStatus, waitForVerification } = shield(sdk, config);
```

| Method | Description |
|---|---|
| `protect(handler)` | Wrap a message handler -- only verified senders reach it |
| `check(phone)` | Check if a number is verified |
| `wrapUrl(phone, url)` | Wrap a URL for invisible verification |
| `challenge(phone)` | Create a direct challenge |
| `challengeStatus(id)` | Get challenge status |
| `waitForVerification(id)` | Poll until resolved |

## Auth

- **`advanced-imessage-kit`**: Shield reads `sdk.config.apiKey` automatically.
- **`imessage-kit`**: Pass `serverApiKey` to `shield()`.

## License

MIT
