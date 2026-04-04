// Per-kit wrappers (shipped inside each SDK package)
export { shield as advancedShield } from "./advanced.ts";
export type {
  ShieldConfig as AdvancedShieldConfig,
  ShieldInstance as AdvancedShieldInstance,
  ShieldMetadata as AdvancedShieldMetadata,
} from "./advanced.ts";

export { shield as imessageShield } from "./imessage.ts";
export type {
  ShieldConfig as ImessageShieldConfig,
  ShieldInstance as ImessageShieldInstance,
  ShieldMetadata as ImessageShieldMetadata,
} from "./imessage.ts";

// Low-level client (standalone, for custom integrations)
export { createShield } from "./shield.ts";
export type {
  ShieldConfig,
  ShieldClient,
  ShieldMessage,
  ShieldMetadata,
  ShieldContext,
  ChallengeResult,
  VerifyResult,
  ChallengeStatusResult,
  UnverifiedHandler,
  GuardOptions,
} from "./types.ts";
